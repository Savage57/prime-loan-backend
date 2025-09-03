"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UuidService = void 0;
/**
 * UUID utilities for generating trace IDs and unique identifiers
 */
const uuid_1 = require("uuid");
class UuidService {
    static generate() {
        return (0, uuid_1.v4)();
    }
    static generateTraceId() {
        return `trace_${(0, uuid_1.v4)()}`;
    }
    static generateIdempotencyKey() {
        return `idem_${(0, uuid_1.v4)()}`;
    }
}
exports.UuidService = UuidService;
