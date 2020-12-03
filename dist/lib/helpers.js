"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shift = exports.assertIsValidTokenRequest = exports.assertIsPlainObject = exports.assertIsAddressInfo = exports.assertIsAlgorithm = exports.supportedAlgs = exports.assertIsString = void 0;
const assert_1 = require("assert");
const lodash_isplainobject_1 = __importDefault(require("lodash.isplainobject"));
function assertIsString(input, errorMessage) {
    if (typeof input !== 'string') {
        throw new assert_1.AssertionError({ message: errorMessage });
    }
}
exports.assertIsString = assertIsString;
exports.supportedAlgs = [
    'HS256',
    'HS384',
    'HS512',
    'RS256',
    'RS384',
    'RS512',
    'ES256',
    'ES384',
    'ES512',
    'PS256',
    'PS384',
    'PS512',
    'none',
];
function assertIsAlgorithm(input) {
    if (!exports.supportedAlgs.includes(input)) {
        throw new assert_1.AssertionError({ message: `Unssuported algorithm '${input}'` });
    }
}
exports.assertIsAlgorithm = assertIsAlgorithm;
function assertIsAddressInfo(input) {
    if (input === null || typeof input === 'string') {
        throw new assert_1.AssertionError({ message: 'Unexpected address type' });
    }
}
exports.assertIsAddressInfo = assertIsAddressInfo;
function assertIsPlainObject(obj, errMessage) {
    if (!lodash_isplainobject_1.default(obj)) {
        throw new assert_1.AssertionError({ message: errMessage });
    }
}
exports.assertIsPlainObject = assertIsPlainObject;
function assertIsValidTokenRequest(body) {
    assertIsPlainObject(body, 'Invalid token request body');
    if ('scope' in body) {
        assertIsString(body.scope, "Invalid 'scope' type");
    }
    assertIsString(body.grant_type, "Invalid 'grant_type' type");
    if ('code' in body) {
        assertIsString(body.code, "Invalid 'code' type");
    }
}
exports.assertIsValidTokenRequest = assertIsValidTokenRequest;
function shift(arr) {
    if (arr.length === 0) {
        throw new assert_1.AssertionError({ message: 'Empty array' });
    }
    const val = arr.shift();
    if (val === undefined) {
        throw new assert_1.AssertionError({ message: 'Empty value' });
    }
    return val;
}
exports.shift = shift;
