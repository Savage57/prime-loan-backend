import Joi from "joi";

/**
 * Create Savings Plan Validation
 */
export const createPlanSchema = Joi.object({
  planType: Joi.string().valid("LOCKED", "FLEXIBLE").required(),
  planName: Joi.string().min(3).max(100).required(),
  targetAmount: Joi.number().positive().optional(),
  durationDays: Joi.number().integer().positive().optional(),
  amount: Joi.number().positive().required(),
  interestRate: Joi.number().min(0).required(),
  renew: Joi.boolean().required(),
});

/**
 * Withdraw from Savings Plan Validation
 */
export const withdrawSchema = Joi.object({
  amount: Joi.number().positive().required(),
});

/**
 * User Plans Query Validation
 */
export const userPlansQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

/**
 * Admin Plans Query Validation
 */
export const adminPlansQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

/**
 * Admin Savings By Category Query Validation
 */
export const savingsByCategoryQuerySchema = Joi.object({
  category: Joi.string().valid("active", "matured", "withdrawn").required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});
