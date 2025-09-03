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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyService = void 0;
/**
 * Idempotency Service - Prevents duplicate operations
 * Manages idempotency keys and cached responses
 */
const idempotency_model_1 = __importDefault(require("../model/idempotency.model"));
class IdempotencyService {
    static checkKey(key, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield idempotency_model_1.default.findOne({ key, userId });
        });
    }
    static saveResponse(key_1, userId_1, response_1) {
        return __awaiter(this, arguments, void 0, function* (key, userId, response, expiresInHours = 24) {
            const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
            yield idempotency_model_1.default.create({
                key,
                userId,
                response,
                expiresAt
            });
        });
    }
    static cleanExpired() {
        return __awaiter(this, void 0, void 0, function* () {
            yield idempotency_model_1.default.deleteMany({
                expiresAt: { $lt: new Date() }
            });
        });
    }
}
exports.IdempotencyService = IdempotencyService;
