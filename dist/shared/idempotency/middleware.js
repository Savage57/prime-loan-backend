"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveIdempotentResponse = exports.idempotencyMiddleware = void 0;
const model_1 = require("./model");
const idempotencyMiddleware = () => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const idempotencyKey = req.headers['idempotency-key'];
        if (!idempotencyKey) {
            return res.status(400).json({
                status: 'error',
                message: 'Idempotency-Key header is required for this operation'
            });
        }
        try {
            // Check if we've seen this key before
            const existingKey = yield model_1.IdempotencyKey.findOne({
                key: idempotencyKey,
                userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id
            });
            if (existingKey) {
                // Return cached response
                return res.status(200).json(existingKey.response);
            }
            // Store the key and userId for later use
            req.idempotencyKey = idempotencyKey;
            next();
        }
        catch (error) {
            next(error);
        }
    });
};
exports.idempotencyMiddleware = idempotencyMiddleware;
const saveIdempotentResponse = (idempotencyKey, userId, response) => __awaiter(void 0, void 0, void 0, function* () {
    yield model_1.IdempotencyKey.create({
        key: idempotencyKey,
        userId,
        response,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });
});
exports.saveIdempotentResponse = saveIdempotentResponse;
