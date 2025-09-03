"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = void 0;
const uuid_1 = require("../utils/uuid");
const requestIdMiddleware = (req, res, next) => {
    req.requestId = uuid_1.UuidService.generate();
    req.traceId = uuid_1.UuidService.generateTraceId();
    // Add to response headers for client debugging
    res.setHeader('X-Request-ID', req.requestId);
    res.setHeader('X-Trace-ID', req.traceId);
    next();
};
exports.requestIdMiddleware = requestIdMiddleware;
