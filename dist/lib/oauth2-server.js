"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuth2Server = void 0;
const url_1 = require("url");
const net_1 = require("net");
const http_server_1 = require("./http-server");
const oauth2_issuer_1 = require("./oauth2-issuer");
const oauth2_service_1 = require("./oauth2-service");
const helpers_1 = require("./helpers");
class OAuth2Server extends http_server_1.HttpServer {
    constructor() {
        const iss = new oauth2_issuer_1.OAuth2Issuer();
        const serv = new oauth2_service_1.OAuth2Service(iss);
        super(serv.requestHandler);
        this._issuer = iss;
        this._service = serv;
    }
    get issuer() {
        return this._issuer;
    }
    get service() {
        return this._service;
    }
    get listening() {
        return super.listening;
    }
    address() {
        const address = super.address();
        helpers_1.assertIsAddressInfo(address);
        return address;
    }
    async start(port, host) {
        const server = await super.start(port, host);
        if (!this.issuer.url) {
            this.issuer.url = buildIssuerUrl(host, this.address().port);
        }
        return server;
    }
    async stop() {
        await super.stop();
        this._issuer.url = null;
    }
}
exports.OAuth2Server = OAuth2Server;
function buildIssuerUrl(host, port) {
    const url = new url_1.URL(`http://localhost:${port}`);
    if (host && !coversLocalhost(host)) {
        url.hostname = host.includes(':') ? `[${host}]` : host;
    }
    return url.origin;
}
function coversLocalhost(address) {
    switch (net_1.isIP(address)) {
        case 4:
            return address === '0.0.0.0' || address.startsWith('127.');
        case 6:
            return address === '::' || address === '::1';
        default:
            return false;
    }
}
