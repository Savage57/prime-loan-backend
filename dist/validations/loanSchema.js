"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.repayLoanSchema = exports.createClientLoanSchema = void 0;
const joi_1 = __importDefault(require("joi"));
/**
 * LOANS
 */
exports.createClientLoanSchema = joi_1.default.object({
    first_name: joi_1.default.string().required(),
    last_name: joi_1.default.string().required(),
    dob: joi_1.default.string().required(),
    doi: joi_1.default.string().optional(),
    nin: joi_1.default.string().length(11).required(),
    tin: joi_1.default.string().optional(),
    email: joi_1.default.string().email().required(),
    bvn: joi_1.default.string().length(11).required(),
    phone: joi_1.default.string().required(),
    address: joi_1.default.string().required(),
    company: joi_1.default.string().required(),
    company_address: joi_1.default.string().required(),
    annual_income: joi_1.default.string().required(),
    guarantor_1_name: joi_1.default.string().required(),
    guarantor_1_phone: joi_1.default.string().required(),
    guarantor_2_name: joi_1.default.string().optional(),
    guarantor_2_phone: joi_1.default.string().optional(),
    amount: joi_1.default.string().required(),
    reason: joi_1.default.string().required(),
    base64Image: joi_1.default.string().optional(),
    outstanding: joi_1.default.string().optional(),
    category: joi_1.default.string().required(),
    type: joi_1.default.string().required(),
    status: joi_1.default.string().required(),
    duration: joi_1.default.string().required(),
    repayment_amount: joi_1.default.string().required(),
    percentage: joi_1.default.string().required(),
    loan_date: joi_1.default.string().required(),
    repayment_date: joi_1.default.string().required(),
    acknowledgment: joi_1.default.boolean().required(),
});
exports.repayLoanSchema = joi_1.default.object({
    transactionId: joi_1.default.string().required(),
    amount: joi_1.default.string().required(),
    outstanding: joi_1.default.string().required(),
});
