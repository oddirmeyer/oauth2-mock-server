/**
 * Copyright (c) AXA Assistance France
 *
 * Licensed under the AXA Assistance France License (the "License"); you
 * may not use this file except in compliance with the License.
 * A copy of the License can be found in the LICENSE.md file distributed
 * together with this file.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * OAuth2 Service library
 *
 * @module lib/oauth2-service
 */

import { IncomingMessage } from 'http';
import express, { RequestHandler, Express } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import basicAuth from 'basic-auth';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

import { OAuth2Issuer } from './oauth2-issuer';
import { assertIsString, assertIsValidTokenRequest } from './helpers';
import type {
  JwtTransform,
  MutableAuthorizeRedirectUri,
  MutableResponse,
  MutableToken,
  ScopesOrTransform,
} from './types';
import { InternalEvents, PublicEvents } from './types';

const OPENID_CONFIGURATION_PATH = '/.well-known/openid-configuration';
const TOKEN_ENDPOINT_PATH = '/token';
const JWKS_URI_PATH = '/jwks';
const AUTHORIZE_PATH = '/authorize';
const USERINFO_PATH = '/userinfo';
const REVOKE_PATH = '/revoke';

/**
 * Provides a request handler for an OAuth 2 server.
 */
export class OAuth2Service extends EventEmitter {
  /**
   * Creates a new instance of OAuth2Server.
   *
   * @param {OAuth2Issuer} oauth2Issuer The OAuth2Issuer instance
   *     that will be offered through the service.
   */

  #issuer: OAuth2Issuer;
  #requestHandler: Express;
  #nonce: Record<string, string>;

  constructor(oauth2Issuer: OAuth2Issuer) {
    super();
    this.#issuer = oauth2Issuer;

    this.#requestHandler = this.buildRequestHandler();

    this.#nonce = {};
  }

  /**
   * Returns the OAuth2Issuer instance bound to this service.
   *
   * @type {OAuth2Issuer}
   */
  get issuer(): OAuth2Issuer {
    return this.#issuer;
  }

  /**
   * Builds a JWT with a key in the keystore. The key will be selected in a round-robin fashion.
   *
   * @param {boolean} signed A value that indicates whether or not to sign the JWT.
   * @param {ScopesOrTransform} [scopesOrTransform] A scope, array of scopes,
   *     or JWT transformation callback.
   * @param {number} [expiresIn] Time in seconds for the JWT to expire. Default: 3600 seconds.
   * @param {IncomingMessage} req The incoming HTTP request.
   * @returns {string} The produced JWT.
   * @fires OAuth2Service#beforeTokenSigning
   */
  buildToken(
    signed: boolean,
    scopesOrTransform: ScopesOrTransform | undefined,
    expiresIn: number,
    req: IncomingMessage
  ): string {
    this.issuer.once(InternalEvents.BeforeSigning, (token: MutableToken) => {
      /**
       * Before token signing event.
       *
       * @event OAuth2Service#beforeTokenSigning
       * @param {MutableToken} token The unsigned JWT header and payload.
       * @param {IncomingMessage} req The incoming HTTP request.
       */
      this.emit(PublicEvents.BeforeTokenSigning, token, req);
    });

    return this.issuer.buildToken(
      signed,
      undefined,
      scopesOrTransform,
      expiresIn
    );
  }

  /**
   * Returns a request handler to be used as a callback for http.createServer().
   *
   * @type {Function}
   */
  get requestHandler(): Express {
    return this.#requestHandler;
  }

  private buildRequestHandler = () => {
    const app = express();
    app.disable('x-powered-by');
    app.use(cors());
    app.get(OPENID_CONFIGURATION_PATH, this.openidConfigurationHandler);
    app.get(JWKS_URI_PATH, this.jwksHandler);
    app.post(
      TOKEN_ENDPOINT_PATH,
      bodyParser.urlencoded({ extended: false }),
      this.tokenHandler
    );
    app.get(AUTHORIZE_PATH, this.authorizeHandler);
    app.get(USERINFO_PATH, this.userInfoHandler);
    app.post(REVOKE_PATH, this.revokeHandler);

    return app;
  };

  private openidConfigurationHandler: RequestHandler = (_req, res) => {
    assertIsString(this.issuer.url, 'Unknown issuer url.');

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

  private jwksHandler: RequestHandler = (_req, res) => {
    res.json(this.issuer.keys);
  };

  private tokenHandler: RequestHandler = (req, res) => {
    const tokenTtl = 3600;

    res.set({
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
    });

    let xfn: ScopesOrTransform | undefined;

    assertIsValidTokenRequest(req.body);
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
    const body: Record<string, unknown> = {
      access_token: token,
      token_type: 'Bearer',
      expires_in: tokenTtl,
      scope,
    };
    if (req.body.grant_type !== 'client_credentials') {
      const credentials = basicAuth(req);
      const clientId = credentials ? credentials.name : req.body.client_id;

      const xfn: JwtTransform = (_header, payload) => {
        Object.assign(payload, {
          sub: 'johndoe',
          aud: clientId,
        });
        if (reqBody.code !== undefined && this.#nonce[reqBody.code]) {
          Object.assign(payload, {
            nonce: this.#nonce[reqBody.code],
          });
          delete this.#nonce[reqBody.code];
        }
      };

      body.id_token = this.buildToken(true, xfn, tokenTtl, req);
      body.refresh_token = uuidv4();
    }

    const tokenEndpointResponse: MutableResponse = {
      body,
      statusCode: 200,
    };

    /**
     * Before token response event.
     *
     * @event OAuth2Service#beforeResponse
     * @param {MutableResponse} response The response body and status code.
     * @param {IncomingMessage} req The incoming HTTP request.
     */
    this.emit(PublicEvents.BeforeResponse, tokenEndpointResponse, req);

    return res
      .status(tokenEndpointResponse.statusCode)
      .json(tokenEndpointResponse.body);
  };

  private authorizeHandler: RequestHandler = (req, res) => {
    let { scope, state } = req.query;
    const responseType = req.query.response_type;
    const redirectUri = req.query.redirect_uri;
    const code = uuidv4();

    let queryNonce: string | undefined;

    if ('nonce' in req.query) {
      assertIsString(req.query.nonce, 'Invalid nonce type');
      queryNonce = req.query.nonce;
    }

    assertIsString(redirectUri, 'Invalid redirectUri type');

    if (typeof scope !== 'string' || !scope) {
      scope = 'dummy';
    }
    if (typeof state !== 'string' || !state) {
      state = 'dummy';
    }

    const url = new URL(redirectUri);

    if (responseType === 'code') {
      if (queryNonce !== undefined) {
        this.#nonce[code] = queryNonce;
      }
      url.searchParams.set('code', code);
      url.searchParams.set('scope', scope);
      url.searchParams.set('state', state);
    } else {
      url.searchParams.set('error', 'unsupported_response_type');
      url.searchParams.set(
        'error_description',
        'The authorization server does not support obtaining an access token using this response_type.'
      );
      url.searchParams.set('state', state);
    }

    const authorizeRedirectUri: MutableAuthorizeRedirectUri = { url };

    /**
     * Before authorize redirect event.
     *
     * @event OAuth2Service#beforeAuthorizeRedirect
     * @param {MutableAuthorizeRedirectUri} authorizeRedirectUri The redirect uri and query params to redirect to.
     * @param {IncomingMessage} req The incoming HTTP request.
     */
    this.emit(PublicEvents.BeforeAuthorizeRedirect, authorizeRedirectUri, req);

    // Note: This is a textbook definition of an "open redirect" vuln
    // cf. https://cwe.mitre.org/data/definitions/601.html
    //
    // However, this whole library is expected to be used as a test helper,
    // so there's no real point in making the exposed API more complex (by
    // exposing an endpoint to preregister whitelisted urls, for instance)
    // for the sake of security.
    //
    // This is *not* a real oAuth2 server. This is *not* to be run in production.
    res.redirect(url.href); // lgtm[js/server-side-unvalidated-url-redirection]
  };

  private userInfoHandler: RequestHandler = (req, res) => {
    const userInfoResponse: MutableResponse = {
      body: {
        sub: 'johndoe',
      },
      statusCode: 200,
    };

    /**
     * Before user info event.
     *
     * @event OAuth2Service#beforeUserinfo
     * @param {MutableResponse} response The response body and status code.
     * @param {IncomingMessage} req The incoming HTTP request.
     */
    this.emit(PublicEvents.BeforeUserinfo, userInfoResponse, req);

    res.status(userInfoResponse.statusCode).json(userInfoResponse.body);
  };

  private revokeHandler: RequestHandler = (req, res) => {
    const revokeResponse: MutableResponse = {
      body: null,
      statusCode: 200,
    };

    /**
     * Before revoke event.
     *
     * @event OAuth2Service#beforeRevoke
     * @param {MutableResponse} response The response body and status code.
     * @param {IncomingMessage} req The incoming HTTP request.
     */
    this.emit(PublicEvents.BeforeRevoke, revokeResponse, req);

    return res.status(revokeResponse.statusCode).json(revokeResponse.body);
  };
}
