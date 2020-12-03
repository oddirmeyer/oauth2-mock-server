/// <reference types="node" />
import { AddressInfo } from 'net';
import { Server } from 'http';
import { HttpServer } from './http-server';
import { OAuth2Issuer } from './oauth2-issuer';
import { OAuth2Service } from './oauth2-service';
export declare class OAuth2Server extends HttpServer {
    private _service;
    private _issuer;
    constructor();
    get issuer(): OAuth2Issuer;
    get service(): OAuth2Service;
    get listening(): boolean;
    address(): AddressInfo;
    start(port?: number, host?: string): Promise<Server>;
    stop(): Promise<void>;
}
