/// <reference types="node" />
import { EventEmitter } from 'events';
import { JWKStore } from './jwk-store';
import type { ScopesOrTransform } from './types';
export declare class OAuth2Issuer extends EventEmitter {
    #private;
    url: string | null;
    constructor();
    get keys(): JWKStore;
    buildToken(signed: boolean, kid?: string, scopesOrTransform?: ScopesOrTransform, expiresIn?: number): string;
}
