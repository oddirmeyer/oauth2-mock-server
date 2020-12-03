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
var _keys;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuth2Issuer = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const events_1 = require("events");
const jwk_store_1 = require("./jwk-store");
const helpers_1 = require("./helpers");
const types_1 = require("./types");
class OAuth2Issuer extends events_1.EventEmitter {
    constructor() {
        super();
        _keys.set(this, void 0);
        this.url = null;
        __classPrivateFieldSet(this, _keys, new jwk_store_1.JWKStore());
    }
    get keys() {
        return __classPrivateFieldGet(this, _keys);
    }
    buildToken(signed, kid, scopesOrTransform, expiresIn = 3600) {
        const key = this.keys.get(kid);
        if (!key) {
            throw new Error('Cannot build token: Unknown key.');
        }
        const timestamp = Math.floor(Date.now() / 1000);
        const header = {
            kid: key.kid,
        };
        helpers_1.assertIsString(this.url, 'Unknown issuer url');
        const payload = {
            iss: this.url,
            iat: timestamp,
            exp: timestamp + expiresIn,
            nbf: timestamp - 10,
        };
        if (typeof scopesOrTransform === 'string') {
            payload.scope = scopesOrTransform;
        }
        else if (Array.isArray(scopesOrTransform)) {
            payload.scope = scopesOrTransform.join(' ');
        }
        else if (typeof scopesOrTransform === 'function') {
            scopesOrTransform(header, payload);
        }
        const token = {
            header,
            payload,
        };
        this.emit(types_1.InternalEvents.BeforeSigning, token);
        const options = {
            algorithm: arguments.length === 0 || signed ? getKeyAlg(key) : 'none',
            header: token.header,
        };
        return jsonwebtoken_1.default.sign(token.payload, getSecret(key), options);
    }
}
exports.OAuth2Issuer = OAuth2Issuer;
_keys = new WeakMap();
function getKeyAlg(key) {
    if (key.alg) {
        helpers_1.assertIsAlgorithm(key.alg);
        return key.alg;
    }
    switch (key.kty) {
        case 'RSA':
            return 'RS256';
        case 'EC': {
            const length = key.length & 0xfff0;
            const alg = `ES${length}`;
            helpers_1.assertIsAlgorithm(alg);
            return alg;
        }
        default:
            return 'HS256';
    }
}
function getSecret(key) {
    switch (key.kty) {
        case 'RSA':
        case 'EC':
            return key.toPEM(true);
        default:
            return key.toJSON(true).k;
    }
}
