"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _issuer, _requestHandler, _nonce;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuth2Service = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const basic_auth_1 = __importDefault(require("basic-auth"));
const events_1 = require("events");
const uuid_1 = require("uuid");
const helpers_1 = require("./helpers");
const types_1 = require("./types");
const OPENID_CONFIGURATION_PATH = '/.well-known/openid-configuration';
const TOKEN_ENDPOINT_PATH = '/token';
const JWKS_URI_PATH = '/jwks';
const AUTHORIZE_PATH = '/authorize';
const USERINFO_PATH = '/userinfo';
const REVOKE_PATH = '/revoke';
class OAuth2Service extends events_1.EventEmitter {
    constructor(oauth2Issuer) {
        super();
        _issuer.set(this, void 0);
        _requestHandler.set(this, void 0);
        _nonce.set(this, void 0);
        this.buildRequestHandler = () => {
            const app = express_1.default();
            app.disable('x-powered-by');
            app.use(cors_1.default());
            app.get(OPENID_CONFIGURATION_PATH, this.openidConfigurationHandler);
            app.get(JWKS_URI_PATH, this.jwksHandler);
            app.post(TOKEN_ENDPOINT_PATH, body_parser_1.default.urlencoded({ extended: false }), this.tokenHandler);
            app.get(AUTHORIZE_PATH, this.authorizeHandler);
            app.get(USERINFO_PATH, this.userInfoHandler);
            app.post(REVOKE_PATH, this.revokeHandler);
            return app;
        };
        this.openidConfigurationHandler = (_req, res) => {
            helpers_1.assertIsString(this.issuer.url, 'Unknown issuer url.');
            const openidConfig = {
                issuer: this.issuer.url,
                token_endpoint: `${this.issuer.url}${TOKEN_ENDPOINT_PATH}`,
                authorization_endpoint: `${this.issuer.url}${AUTHORIZE_PATH}`,
                userinfo_endpoint: `${this.issuer.url}${USERINFO_PATH}`,
                token_endpoint_auth_methods_supported: ['none'],
                jwks_uri: `${this.issuer.url}${JWKS_URI_PATH}`,
                response_types_supported: ['code'],
                grant_types_supported: [
                    'client_credentials',
                    'authorization_code',
                    'password',
                ],
                token_endpoint_auth_signing_alg_values_supported: ['RS256'],
                response_modes_supported: ['query'],
                id_token_signing_alg_values_supported: ['RS256'],
                revocation_endpoint: `${this.issuer.url}${REVOKE_PATH}`,
            };
            return res.json(openidConfig);
        };
        this.jwksHandler = (_req, res) => {
            res.json(this.issuer.keys);
        };
        this.tokenHandler = (req, res) => {
            const tokenTtl = 3600;
            res.set({
                'Cache-Control': 'no-store',
                Pragma: 'no-cache',
            });
            let xfn;
            helpers_1.assertIsValidTokenRequest(req.body);
            const reqBody = req.body;
            let { scope } = reqBody;
            switch (req.body.grant_type) {
                case 'client_credentials':
                    xfn = scope;
                    break;
                case 'password':
                    xfn = (_header, payload) => {
                        Object.assign(payload, {
                            sub: reqBody.username,
                            amr: ['pwd'],
                            scope,
                        });
                    };
                    break;
                case 'authorization_code':
                    scope = 'dummy';
                    xfn = (_header, payload) => {
                        Object.assign(payload, {
                            sub: 'johndoe',
                            amr: ['pwd'],
                            scope,
                        });
                    };
                    break;
                case 'refresh_token':
                    scope = 'dummy';
                    xfn = (_header, payload) => {
                        Object.assign(payload, {
                            sub: 'johndoe',
                            amr: ['pwd'],
                            scope,
                        });
                    };
                    break;
                default:
                    return res.status(400).json({
                        error: 'invalid_grant',
                    });
            }
            const token = this.buildToken(true, xfn, tokenTtl, req);
            const body = {
                access_token: token,
                token_type: 'Bearer',
                expires_in: tokenTtl,
                scope,
            };
            if (req.body.grant_type !== 'client_credentials') {
                const credentials = basic_auth_1.default(req);
                const clientId = credentials ? credentials.name : req.body.client_id;
                const xfn = (_header, payload) => {
                    Object.assign(payload, {
                        sub: 'johndoe',
                        aud: clientId,
                    });
                    if (reqBody.code !== undefined && __classPrivateFieldGet(this, _nonce)[reqBody.code]) {
                        Object.assign(payload, {
                            nonce: __classPrivateFieldGet(this, _nonce)[reqBody.code],
                        });
                        delete __classPrivateFieldGet(this, _nonce)[reqBody.code];
                    }
                };
                body.id_token = this.buildToken(true, xfn, tokenTtl, req);
                body.refresh_token = uuid_1.v4();
            }
            const tokenEndpointResponse = {
                body,
                statusCode: 200,
            };
            this.emit(types_1.PublicEvents.BeforeResponse, tokenEndpointResponse, req);
            return res
                .status(tokenEndpointResponse.statusCode)
                .json(tokenEndpointResponse.body);
        };
        this.authorizeHandler = (req, res) => {
            let { scope, state } = req.query;
            const responseType = req.query.response_type;
            const redirectUri = req.query.redirect_uri;
            const code = uuid_1.v4();
            let queryNonce;
            if ('nonce' in req.query) {
                helpers_1.assertIsString(req.query.nonce, 'Invalid nonce type');
                queryNonce = req.query.nonce;
            }
            helpers_1.assertIsString(redirectUri, 'Invalid redirectUri type');
            if (typeof scope !== 'string' || !scope) {
                scope = 'dummy';
            }
            if (typeof state !== 'string' || !state) {
                state = 'dummy';
            }
            const url = new URL(redirectUri);
            if (responseType === 'code') {
                if (queryNonce !== undefined) {
                    __classPrivateFieldGet(this, _nonce)[code] = queryNonce;
                }
                url.searchParams.set('code', code);
                url.searchParams.set('scope', scope);
                url.searchParams.set('state', state);
            }
            else {
                url.searchParams.set('error', 'unsupported_response_type');
                url.searchParams.set('error_description', 'The authorization server does not support obtaining an access token using this response_type.');
                url.searchParams.set('state', state);
            }
            const authorizeRedirectUri = { url };
            this.emit(types_1.PublicEvents.BeforeAuthorizeRedirect, authorizeRedirectUri, req);
            res.redirect(url.href);
        };
        this.userInfoHandler = (req, res) => {
            const userInfoResponse = {
                body: {
                    sub: 'johndoe',
                },
                statusCode: 200,
            };
            this.emit(types_1.PublicEvents.BeforeUserinfo, userInfoResponse, req);
            res.status(userInfoResponse.statusCode).json(userInfoResponse.body);
        };
        this.revokeHandler = (req, res) => {
            const revokeResponse = {
                body: null,
                statusCode: 200,
            };
            this.emit(types_1.PublicEvents.BeforeRevoke, revokeResponse, req);
            return res.status(revokeResponse.statusCode).json(revokeResponse.body);
        };
        __classPrivateFieldSet(this, _issuer, oauth2Issuer);
        __classPrivateFieldSet(this, _requestHandler, this.buildRequestHandler());
        __classPrivateFieldSet(this, _nonce, {});
    }
    get issuer() {
        return __classPrivateFieldGet(this, _issuer);
    }
    buildToken(signed, scopesOrTransform, expiresIn, req) {
        this.issuer.once(types_1.InternalEvents.BeforeSigning, (token) => {
            this.emit(types_1.PublicEvents.BeforeTokenSigning, token, req);
        });
        return this.issuer.buildToken(signed, undefined, scopesOrTransform, expiresIn);
    }
    get requestHandler() {
        return __classPrivateFieldGet(this, _requestHandler);
    }
}
exports.OAuth2Service = OAuth2Service;
_issuer = new WeakMap(), _requestHandler = new WeakMap(), _nonce = new WeakMap();
