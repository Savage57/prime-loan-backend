"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.savingsByCategoryQuerySchema = exports.adminPlansQuerySchema = exports.userPlansQuerySchema = exports.withdrawSchema = exports.createPlanSchema = void 0;
const joi_1 = __importDefault(require("joi"));
/**
 * Create Savings Plan Validation
 */
exports.createPlanSchema = joi_1.default.object({
    planType: joi_1.default.string().valid("LOCKED", "FLEXIBLE").required(),
    planName: joi_1.default.string().min(3).max(100).required(),
    targetAmount: joi_1.default.number().positive().optional(),
    durationDays: joi_1.default.number().integer().positive().optional(),
    amount: joi_1.default.number().positive().required(),
    interestRate: joi_1.default.number().min(0).required(),
    renew: joi_1.default.boolean().required(),
});
/**
 * Withdraw from Savings Plan Validation
 */
exports.withdrawSchema = joi_1.default.object({
    amount: joi_1.default.number().positive().required(),
});
/**
 * User Plans Query Validation
 */
exports.userPlansQuerySchema = joi_1.default.object({
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(20),
});
/**
 * Admin Plans Query Validation
 */
exports.adminPlansQuerySchema = joi_1.default.object({
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(20),
});
/**
 * Admin Savings By Category Query Validation
 */
exports.savingsByCategoryQuerySchema = joi_1.default.object({
    category: joi_1.default.string().valid("active", "matured", "withdrawn").required(),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(20),
});
