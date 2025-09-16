"use strict";
/**
 * Simple circuit breaker implementation for provider calls
 * Prevents cascading failures by temporarily blocking calls to failing services
 */
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
exports.CircuitBreaker = void 0;
class CircuitBreaker {
    constructor(options) {
        this.options = options;
        this.failures = 0;
        this.lastFailureTime = 0;
        this.state = 'CLOSED';
    }
    execute(operation) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.state === 'OPEN') {
                if (Date.now() - this.lastFailureTime > this.options.resetTimeout) {
                    this.state = 'HALF_OPEN';
                }
                else {
                    throw new Error('Circuit breaker is OPEN');
                }
            }
            try {
                const result = yield operation();
                this.onSuccess();
                return result;
            }
            catch (error) {
                this.onFailure();
                throw error;
            }
        });
    }
    onSuccess() {
        this.failures = 0;
        this.state = 'CLOSED';
    }
    onFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.failures >= this.options.failureThreshold) {
            this.state = 'OPEN';
        }
    }
    getState() {
        return this.state;
    }
}
exports.CircuitBreaker = CircuitBreaker;
