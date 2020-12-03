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
var _store, _keyRotator, _keys;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWKStore = void 0;
const node_jose_1 = require("node-jose");
class JWKStore {
    constructor() {
        _store.set(this, void 0);
        _keyRotator.set(this, void 0);
        __classPrivateFieldSet(this, _store, node_jose_1.JWK.createKeyStore());
        __classPrivateFieldSet(this, _keyRotator, new KeyRotator());
    }
    async generateRSA(size, kid, use = 'sig') {
        const key = await __classPrivateFieldGet(this, _store).generate('RSA', size, { kid, use });
        __classPrivateFieldGet(this, _keyRotator).add(key);
        return key;
    }
    async add(jwk) {
        const jwkUse = { ...jwk };
        if (!('use' in jwkUse)) {
            Object.assign(jwkUse, { use: 'sig' });
        }
        const key = await __classPrivateFieldGet(this, _store).add(jwkUse);
        __classPrivateFieldGet(this, _keyRotator).add(key);
        return key;
    }
    async addPEM(pem, kid, use = 'sig') {
        const key = await __classPrivateFieldGet(this, _store).add(pem, 'pem', { kid, use });
        __classPrivateFieldGet(this, _keyRotator).add(key);
        return key;
    }
    get(kid) {
        return __classPrivateFieldGet(this, _keyRotator).next(kid);
    }
    toJSON(isPrivate) {
        return __classPrivateFieldGet(this, _store).toJSON(isPrivate);
    }
}
exports.JWKStore = JWKStore;
_store = new WeakMap(), _keyRotator = new WeakMap();
class KeyRotator {
    constructor() {
        _keys.set(this, []);
    }
    add(key) {
        if (!__classPrivateFieldGet(this, _keys).includes(key)) {
            __classPrivateFieldGet(this, _keys).push(key);
        }
    }
    next(kid) {
        const i = this.findNext(kid);
        if (i === -1) {
            return null;
        }
        return this.moveToTheEnd(i);
    }
    findNext(kid) {
        if (__classPrivateFieldGet(this, _keys).length === 0) {
            return -1;
        }
        if (!kid) {
            return 0;
        }
        return __classPrivateFieldGet(this, _keys).findIndex((x) => x.kid === kid);
    }
    moveToTheEnd(i) {
        const [key] = __classPrivateFieldGet(this, _keys).splice(i, 1);
        __classPrivateFieldGet(this, _keys).push(key);
        return key;
    }
}
_keys = new WeakMap();
