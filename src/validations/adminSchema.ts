// src/validations/admin.validation.ts
import Joi from "joi";

/**
 * Joi validation schemas for Admin endpoints
 */

/**
 * Body schema for creating an admin account
 */
export const createAdminAccountSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(100).required(),
  surname: Joi.string().min(1).max(100).required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().pattern(/^\+?\d{7,15}$/).required(),
  is_super_admin: Joi.boolean().optional().default(false),
  permissions: Joi.array().items(Joi.string()).optional()
});

/**
 * Body schema for activating/deactivating an admin
 */
export const activateAdminReqBodySchema = Joi.object({
  adminId: Joi.string().required(),
  status: Joi.string().valid("active", "inactive").required()
});

/**
 * Body schema for activating/deactivating a user
 */
export const activateUserReqBodySchema = Joi.object({
  userId: Joi.string().required(),
  status: Joi.string().valid("active", "inactive").required()
});

/**
 * Query schema for listing users (admin)
 */
export const getUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(20),
  status: Joi.string().valid("active", "inactive").optional(),
  search: Joi.string().optional()
});

/**
 * Schema for bulk loan action (approve|reject)
 */
export const bulkLoanActionSchema = Joi.object({
  loanIds: Joi.array().items(Joi.string().trim()).min(1).required(),
  action: Joi.string().valid("approve", "reject").required(),
  reason: Joi.string().allow("", null).optional()
});

/**
 * Schema for disbursing a loan (admin)
 */
export const disburseLoanSchema = Joi.object({
  loanId: Joi.string().required(),
  amount: Joi.number().positive().optional()
});

/**
 * Schema for rejecting a loan (admin)
 */
export const rejectLoanSchema = Joi.object({
  reason: Joi.string().min(1).required()
});

/**
 * Query schema for loan list filters
 */
export const loanListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(20),
  status: Joi.string().valid("pending", "accepted", "rejected").optional()
});

/**
 * Query schema for business report & profit endpoints
 */
export const businessReportQuerySchema = Joi.object({
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional()
});

export const profitReportQuerySchema = Joi.object({
  from: Joi.date().iso().optional(),
  to: Joi.date().iso().optional(),
  service: Joi.string().optional()
});

/**
 * Query schema for flagged transactions (pagination)
 */
export const flaggedQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(20)
});

export const transactionQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(20),
  search: Joi.string(),
  type: Joi.string(),
  status: Joi.string(),
});

/**
 * Schema for updating admin permissions (body)
 */
export const updateAdminPermissionsSchema = Joi.object({
  permissions: Joi.array().items(Joi.string().trim()).min(1).required()
});

/**
 * Query schema for activity logs
 */
export const activityLogsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50),
  adminId: Joi.string().optional()
});
