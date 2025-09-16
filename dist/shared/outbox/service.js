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
exports.OutboxService = void 0;
/**
 * Outbox Service - Reliable event publishing
 * Implements transactional outbox pattern for reliable external communication
 */
const model_1 = require("./model");
class OutboxService {
    /**
     * Create outbox event within a transaction
     */
    static createEvent(session, topic, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const [event] = yield model_1.OutboxEvent.create([{
                    topic,
                    payload,
                    processed: false
                }], { session });
            return event;
        });
    }
    /**
     * Get unprocessed events for publishing
     */
    static getUnprocessedEvents() {
        return __awaiter(this, arguments, void 0, function* (limit = 100) {
            return model_1.OutboxEvent.find({ processed: false })
                .sort({ createdAt: 1 })
                .limit(limit);
        });
    }
    /**
     * Mark event as processed
     */
    static markProcessed(eventId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield model_1.OutboxEvent.findByIdAndUpdate(eventId, {
                processed: true,
                processedAt: new Date()
            });
        });
    }
    /**
     * Mark event as failed with error
     */
    static markFailed(eventId, error) {
        return __awaiter(this, void 0, void 0, function* () {
            yield model_1.OutboxEvent.findByIdAndUpdate(eventId, {
                $inc: { retryCount: 1 },
                lastError: error
            });
        });
    }
}
exports.OutboxService = OutboxService;
