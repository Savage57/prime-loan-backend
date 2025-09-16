"use strict";
/**
 * src/modules/transfers/transfer.validation.ts
 *
 * Joi validation schemas and small middleware helpers for the Transfers module.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletAlertsSchema = exports.transfersListQuerySchema = exports.transferStatusQuerySchema = exports.transferInitiateSchema = void 0;
const joi_1 = __importDefault(require("joi"));
/**
 * Request body for /transfers/initiate
 * Matches the fields used by TransferController.initiate
 */
exports.transferInitiateSchema = joi_1.default.object({
    fromAccount: joi_1.default.string().required().description("Sender account number"),
    fromClientId: joi_1.default.string().optional(),
    fromClient: joi_1.default.string().optional(),
    fromSavingsId: joi_1.default.string().optional(),
    fromBvn: joi_1.default.string().optional(),
    toClient: joi_1.default.string().optional(),
    toClientId: joi_1.default.string().optional(),
    toSession: joi_1.default.string().optional(),
    toAccount: joi_1.default.string().required().description("Beneficiary account number"),
    toSavingsId: joi_1.default.string().optional(),
    toBvn: joi_1.default.string().optional(),
    toBank: joi_1.default.string().optional().description('Bank code; use "999999" for intra/provider internal transfers'),
    toKyc: joi_1.default.alternatives().try(joi_1.default.string(), joi_1.default.object(), joi_1.default.boolean()).optional(),
    amount: joi_1.default.number().positive().required().description("Amount in Naira"),
    transferType: joi_1.default.string().valid("intra", "inter").required(),
    remark: joi_1.default.string().optional().allow(""),
    idempotencyKey: joi_1.default.string().optional(),
});
/**
 * Query for /transfers/status
 * At least one of reference or sessionId is required.
 */
exports.transferStatusQuerySchema = joi_1.default.object({
    reference: joi_1.default.string().optional(),
    sessionId: joi_1.default.string().optional(),
}).or("reference", "sessionId");
/**
 * Query for listing transfers: /transfers?page=&limit=
 */
exports.transfersListQuerySchema = joi_1.default.object({
    page: joi_1.default.number().integer().min(1).optional(),
    limit: joi_1.default.number().integer().min(1).max(100).optional(),
});
/**
 * Wallet alerts webhook body (public endpoint)
 */
exports.walletAlertsSchema = joi_1.default.object({
    account_number: joi_1.default.string().required(),
    amount: joi_1.default.number().positive().required(),
    originator_account_name: joi_1.default.string().optional().allow(""),
    originator_account_number: joi_1.default.string().optional().allow(""),
    originator_bank: joi_1.default.string().optional().allow(""),
    originator_narration: joi_1.default.string().optional().allow(""),
    reference: joi_1.default.string().required(),
    session_id: joi_1.default.string().required(),
});
