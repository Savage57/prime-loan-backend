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
const counter_model_1 = __importDefault(require("../model/counter.model"));
class CounterService {
    /**
     * Find and update counter atomically
     * @param filter Query filter
     * @param update Update operations
     * @returns Updated counter document
     */
    findOneAndUpdate(filter, update) {
        return __awaiter(this, void 0, void 0, function* () {
            return counter_model_1.default.findOneAndUpdate(filter, update, {
                new: true,
                upsert: true
            });
        });
    }
    /**
     * Get current count value for a specific counter
     * @param counterName Name of the counter to get
     * @returns Current count value
     */
    getCount(counterName) {
        return __awaiter(this, void 0, void 0, function* () {
            const counter = yield counter_model_1.default.findOne({ name: counterName });
            return counter ? counter.count : 0;
        });
    }
}
exports.default = CounterService;
