"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityLogsQuerySchema = exports.updateAdminPermissionsSchema = exports.transactionQuerySchema = exports.flaggedQuerySchema = exports.profitReportQuerySchema = exports.businessReportQuerySchema = exports.loanListQuerySchema = exports.rejectLoanSchema = exports.disburseLoanSchema = exports.bulkLoanActionSchema = exports.getUsersQuerySchema = exports.activateUserReqBodySchema = exports.activateAdminReqBodySchema = exports.createAdminAccountSchema = void 0;
// src/validations/admin.validation.ts
const joi_1 = __importDefault(require("joi"));
/**
 * Joi validation schemas for Admin endpoints
 */
/**
 * Body schema for creating an admin account
 */
exports.createAdminAccountSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    name: joi_1.default.string().min(2).max(100).required(),
    surname: joi_1.default.string().min(1).max(100).required(),
    password: joi_1.default.string().min(6).required(),
    phone: joi_1.default.string().pattern(/^\+?\d{7,15}$/).required(),
    is_super_admin: joi_1.default.boolean().optional().default(false),
    permissions: joi_1.default.array().items(joi_1.default.string()).optional()
});
/**
 * Body schema for activating/deactivating an admin
 */
exports.activateAdminReqBodySchema = joi_1.default.object({
    adminId: joi_1.default.string().required(),
    status: joi_1.default.string().valid("active", "inactive").required()
});
/**
 * Body schema for activating/deactivating a user
 */
exports.activateUserReqBodySchema = joi_1.default.object({
    userId: joi_1.default.string().required(),
    status: joi_1.default.string().valid("active", "inactive").required()
});
/**
 * Query schema for listing users (admin)
 */
exports.getUsersQuerySchema = joi_1.default.object({
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(200).default(20),
    status: joi_1.default.string().valid("active", "inactive").optional(),
    search: joi_1.default.string().optional()
});
/**
 * Schema for bulk loan action (approve|reject)
 */
exports.bulkLoanActionSchema = joi_1.default.object({
    loanIds: joi_1.default.array().items(joi_1.default.string().trim()).min(1).required(),
    action: joi_1.default.string().valid("approve", "reject").required(),
    reason: joi_1.default.string().allow("", null).optional()
});
/**
 * Schema for disbursing a loan (admin)
 */
exports.disburseLoanSchema = joi_1.default.object({
    loanId: joi_1.default.string().required(),
    amount: joi_1.default.number().positive().optional()
});
/**
 * Schema for rejecting a loan (admin)
 */
exports.rejectLoanSchema = joi_1.default.object({
    reason: joi_1.default.string().min(1).required()
});
/**
 * Query schema for loan list filters
 */
exports.loanListQuerySchema = joi_1.default.object({
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(200).default(20),
    status: joi_1.default.string().valid("pending", "accepted", "rejected").optional()
});
/**
 * Query schema for business report & profit endpoints
 */
exports.businessReportQuerySchema = joi_1.default.object({
    from: joi_1.default.date().iso().optional(),
    to: joi_1.default.date().iso().optional()
});
exports.profitReportQuerySchema = joi_1.default.object({
    from: joi_1.default.date().iso().optional(),
    to: joi_1.default.date().iso().optional(),
    service: joi_1.default.string().optional()
});
/**
 * Query schema for flagged transactions (pagination)
 */
exports.flaggedQuerySchema = joi_1.default.object({
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(200).default(20)
});
exports.transactionQuerySchema = joi_1.default.object({
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(200).default(20),
    search: joi_1.default.string(),
    type: joi_1.default.string(),
    status: joi_1.default.string(),
});
/**
 * Schema for updating admin permissions (body)
 */
exports.updateAdminPermissionsSchema = joi_1.default.object({
    permissions: joi_1.default.array().items(joi_1.default.string().trim()).min(1).required()
});
/**
 * Query schema for activity logs
 */
exports.activityLogsQuerySchema = joi_1.default.object({
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(200).default(50),
    adminId: joi_1.default.string().optional()
});
