import { JWK } from 'node-jose';
export declare class JWKStore {
    #private;
    constructor();
    generateRSA(size?: number, kid?: string, use?: string): Promise<JWK.Key>;
    add(jwk: JWK.Key): Promise<JWK.Key>;
    addPEM(pem: string, kid?: string, use?: string): Promise<JWK.Key>;
    get(kid?: string): JWK.Key | null;
    toJSON(isPrivate?: boolean): Record<string, unknown>;
}
