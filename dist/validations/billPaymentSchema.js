"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jambVerifySchema = exports.smileVerifySchema = exports.bettingVerifySchema = exports.powerVerifySchema = exports.tvVerifySchema = exports.billPaymentSchema = void 0;
const joi_1 = __importDefault(require("joi"));
/**
 * -----------------------------
 * BILL PAYMENT VALIDATION
 * - Generic `billPaymentSchema` matches BillPaymentService.initiateBillPayment
 * - extras enforced conditionally based on serviceType
 * -----------------------------
 */
exports.billPaymentSchema = joi_1.default.object({
    amount: joi_1.default.number().positive().required().messages({
        "number.base": "amount must be a number",
        "number.positive": "amount must be greater than 0",
    }),
    serviceType: joi_1.default.string()
        .valid("airtime", "data", "tv", "power", "betting", "internet", "waec", "jamb")
        .required(),
    serviceId: joi_1.default.string().allow("", null), // provider/service-specific id; may be required depending on serviceType (enforced in extras switch)
    customerReference: joi_1.default.string().required().messages({
        "string.empty": "customerReference (target account/phone/meter) is required",
    }),
    extras: joi_1.default.alternatives().conditional(joi_1.default.ref("serviceType"), {
        switch: [
            {
                is: "airtime",
                then: joi_1.default.object({
                    mobileNetwork: joi_1.default.string().required(),
                    bonusType: joi_1.default.string().optional(),
                }).required(),
            },
            {
                is: "data",
                then: joi_1.default.object({
                    mobileNetwork: joi_1.default.string().required(),
                }).required(),
            },
            {
                is: "tv",
                then: joi_1.default.object({
                    pkg: joi_1.default.string().required(),
                }).required(),
            },
            {
                is: "power",
                then: joi_1.default.object({
                    meterType: joi_1.default.string().valid("01", "02").required(), // 01 = prepaid, 02 = postpaid
                }).required(),
            },
            {
                is: "internet",
                then: joi_1.default.object({
                    internetNetwork: joi_1.default.string().valid("smile-direct", "spectranet").required(),
                }).required(),
            },
            {
                is: "betting",
                then: joi_1.default.object().optional(),
            },
            {
                is: "waec",
                then: joi_1.default.object().optional(),
            },
            {
                is: "jamb",
                then: joi_1.default.object().optional(),
            },
        ],
        otherwise: joi_1.default.forbidden().messages({
            "any.unknown": "Unsupported serviceType",
        }),
    }),
    idempotencyKey: joi_1.default.string().optional(),
});
/**
 * Per-endpoint verification schemas (used by verify endpoints)
 */
exports.tvVerifySchema = joi_1.default.object({
    cableTV: joi_1.default.string().required(),
    smartCardNo: joi_1.default.string().required(),
});
exports.powerVerifySchema = joi_1.default.object({
    electricCompany: joi_1.default.string().required(),
    meterNo: joi_1.default.string().required(),
});
exports.bettingVerifySchema = joi_1.default.object({
    bettingCompany: joi_1.default.string().required(),
    customerId: joi_1.default.string().required(),
});
exports.smileVerifySchema = joi_1.default.object({
    mobileNumber: joi_1.default.string().required(),
});
exports.jambVerifySchema = joi_1.default.object({
    examType: joi_1.default.string().required(),
    profileId: joi_1.default.string().required(),
});
