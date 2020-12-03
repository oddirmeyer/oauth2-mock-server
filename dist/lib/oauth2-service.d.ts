/// <reference types="node" />
import { IncomingMessage } from 'http';
import { Express } from 'express';
import { EventEmitter } from 'events';
import { OAuth2Issuer } from './oauth2-issuer';
import type { ScopesOrTransform } from './types';
export declare class OAuth2Service extends EventEmitter {
    #private;
    constructor(oauth2Issuer: OAuth2Issuer);
    get issuer(): OAuth2Issuer;
    buildToken(signed: boolean, scopesOrTransform: ScopesOrTransform | undefined, expiresIn: number, req: IncomingMessage): string;
    get requestHandler(): Express;
    private buildRequestHandler;
    private openidConfigurationHandler;
    private jwksHandler;
    private tokenHandler;
    private authorizeHandler;
    private userInfoHandler;
    private revokeHandler;
}
