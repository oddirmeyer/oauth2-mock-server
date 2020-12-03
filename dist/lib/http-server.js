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
var _server;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpServer = void 0;
const http_1 = require("http");
const helpers_1 = require("./helpers");
class HttpServer {
    constructor(requestListener) {
        _server.set(this, void 0);
        __classPrivateFieldSet(this, _server, http_1.createServer(requestListener));
    }
    get listening() {
        return __classPrivateFieldGet(this, _server).listening;
    }
    address() {
        if (!this.listening) {
            throw new Error('Server is not started.');
        }
        const address = __classPrivateFieldGet(this, _server).address();
        helpers_1.assertIsAddressInfo(address);
        return address;
    }
    async start(port, host) {
        if (this.listening) {
            throw new Error('Server has already been started.');
        }
        return new Promise((resolve, reject) => {
            __classPrivateFieldGet(this, _server).listen(port, host)
                .on('listening', resolve)
                .on('error', reject);
        });
    }
    async stop() {
        if (!this.listening) {
            throw new Error('Server is not started.');
        }
        return new Promise((resolve, reject) => {
            __classPrivateFieldGet(this, _server).close((err) => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }
}
exports.HttpServer = HttpServer;
_server = new WeakMap();
