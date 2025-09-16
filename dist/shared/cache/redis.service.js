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
exports.RedisService = void 0;
/**
 * Redis Cache Service
 * Centralized caching functionality with TTL support
 */
const ioredis_1 = __importDefault(require("ioredis"));
class RedisService {
    static getInstance() {
        if (!this.instance) {
            this.instance = new ioredis_1.default(Number(process.env.REDIS_PORT) || 6379, process.env.REDIS_HOST || 'redis://localhost', {
                maxLoadingRetryTime: 100,
                maxRetriesPerRequest: 3,
                lazyConnect: true
            });
            this.instance.on('error', (error) => {
                console.error('Redis connection error:', error);
            });
            this.instance.on('connect', () => {
                console.log('Redis connected successfully');
            });
        }
        return this.instance;
    }
    /**
     * Set cache with TTL
     */
    static set(key_1, value_1) {
        return __awaiter(this, arguments, void 0, function* (key, value, ttlSeconds = 3600) {
            const redis = this.getInstance();
            const serializedValue = JSON.stringify(value);
            yield redis.setex(key, ttlSeconds, serializedValue);
        });
    }
    /**
     * Get cache value
     */
    static get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const redis = this.getInstance();
            const value = yield redis.get(key);
            if (!value)
                return null;
            try {
                return JSON.parse(value);
            }
            catch (error) {
                console.error('Error parsing cached value:', error);
                return null;
            }
        });
    }
    /**
     * Delete cache key
     */
    static del(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const redis = this.getInstance();
            yield redis.del(key);
        });
    }
    /**
     * Check if key exists
     */
    static exists(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const redis = this.getInstance();
            const result = yield redis.exists(key);
            return result === 1;
        });
    }
    /**
     * Set cache with pattern-based expiry
     */
    static setWithPattern(pattern_1, key_1, value_1) {
        return __awaiter(this, arguments, void 0, function* (pattern, key, value, ttlSeconds = 3600) {
            const fullKey = `${pattern}:${key}`;
            yield this.set(fullKey, value, ttlSeconds);
        });
    }
    /**
     * Get cache with pattern
     */
    static getWithPattern(pattern, key) {
        return __awaiter(this, void 0, void 0, function* () {
            const fullKey = `${pattern}:${key}`;
            return this.get(fullKey);
        });
    }
    /**
     * Delete all keys matching pattern
     */
    static delPattern(pattern) {
        return __awaiter(this, void 0, void 0, function* () {
            const redis = this.getInstance();
            const keys = yield redis.keys(`${pattern}:*`);
            if (keys.length > 0) {
                yield redis.del(...keys);
            }
        });
    }
    /**
     * Increment counter
     */
    static incr(key, ttlSeconds) {
        return __awaiter(this, void 0, void 0, function* () {
            const redis = this.getInstance();
            const result = yield redis.incr(key);
            if (ttlSeconds && result === 1) {
                yield redis.expire(key, ttlSeconds);
            }
            return result;
        });
    }
    /**
     * Cache function result
     */
    static cacheFunction(key_1, fn_1) {
        return __awaiter(this, arguments, void 0, function* (key, fn, ttlSeconds = 3600) {
            const cached = yield this.get(key);
            if (cached !== null) {
                return cached;
            }
            const result = yield fn();
            yield this.set(key, result, ttlSeconds);
            return result;
        });
    }
}
exports.RedisService = RedisService;
