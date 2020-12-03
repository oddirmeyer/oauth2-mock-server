/// <reference types="node" />
import { Server, RequestListener } from 'http';
import type { AddressInfo } from 'net';
export declare class HttpServer {
    #private;
    constructor(requestListener: RequestListener);
    get listening(): boolean;
    address(): AddressInfo;
    start(port?: number, host?: string): Promise<Server>;
    stop(): Promise<void>;
}
