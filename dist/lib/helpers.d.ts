/// <reference types="node" />
import type jwt from 'jsonwebtoken';
import type { AddressInfo } from 'net';
import type { TokenRequest } from './types';
export declare function assertIsString(input: unknown, errorMessage: string): asserts input is string;
export declare const supportedAlgs: string[];
export declare function assertIsAlgorithm(input: string): asserts input is jwt.Algorithm;
export declare function assertIsAddressInfo(input: string | null | AddressInfo): asserts input is AddressInfo;
export declare function assertIsPlainObject(obj: unknown, errMessage: string): asserts obj is Record<string, unknown>;
export declare function assertIsValidTokenRequest(body: unknown): asserts body is TokenRequest;
export declare function shift(arr: (string | undefined)[]): string;
