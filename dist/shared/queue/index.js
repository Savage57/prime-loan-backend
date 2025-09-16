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
exports.QueueService = void 0;
/**
 * Queue Service - BullMQ wrapper for job processing
 * Manages background jobs for polling, penalties, and other async operations
 */
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
class QueueService {
    static getQueue(name) {
        if (!this.queues.has(name)) {
            this.queues.set(name, new bullmq_1.Queue(name, { connection: redis }));
        }
        return this.queues.get(name);
    }
    static createWorker(queueName, processor, options = {}) {
        const worker = new bullmq_1.Worker(queueName, processor, Object.assign({ connection: redis }, options));
        this.workers.set(queueName, worker);
        return worker;
    }
    static addJob(queueName_1, jobName_1, data_1) {
        return __awaiter(this, arguments, void 0, function* (queueName, jobName, data, options = {}) {
            const queue = this.getQueue(queueName);
            return queue.add(jobName, data, options);
        });
    }
    static addRecurringJob(queueName, jobName, data, cronPattern) {
        return __awaiter(this, void 0, void 0, function* () {
            const queue = this.getQueue(queueName);
            return queue.add(jobName, data, {
                repeat: { pattern: cronPattern }
            });
        });
    }
    static closeAll() {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                ...Array.from(this.queues.values()).map(q => q.close()),
                ...Array.from(this.workers.values()).map(w => w.close())
            ]);
            yield redis.quit();
        });
    }
}
exports.QueueService = QueueService;
QueueService.queues = new Map();
QueueService.workers = new Map();
