"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jambSchema = exports.internetSchema = exports.bettingSchema = exports.powerSchema = exports.tvSchema = exports.waecSchema = exports.dataSchema = exports.airtimeSchema = void 0;
const joi_1 = __importDefault(require("joi"));
// Airtime
exports.airtimeSchema = joi_1.default.object({
    amount: joi_1.default.number().positive().required(),
    mobileNumber: joi_1.default.string().required(),
    mobileNetwork: joi_1.default.string().required(),
    bonusType: joi_1.default.string().optional()
});
// Data
exports.dataSchema = joi_1.default.object({
    dataPlan: joi_1.default.string().required(),
    mobileNumber: joi_1.default.string().required(),
    mobileNetwork: joi_1.default.string().required(),
    amount: joi_1.default.number().positive().required()
});
// WAEC
exports.waecSchema = joi_1.default.object({
    examType: joi_1.default.string().required(),
    phoneNo: joi_1.default.string().required(),
    amount: joi_1.default.number().positive().required()
});
// TV
exports.tvSchema = joi_1.default.object({
    cableTV: joi_1.default.string().required(),
    pkg: joi_1.default.string().required(),
    smartCardNo: joi_1.default.string().required(),
    phoneNo: joi_1.default.string().required(),
    amount: joi_1.default.number().positive().required()
});
// Power
exports.powerSchema = joi_1.default.object({
    electricCompany: joi_1.default.string().required(),
    meterType: joi_1.default.string().valid("01", "02").required(),
    meterNo: joi_1.default.string().required(),
    amount: joi_1.default.number().positive().required(),
    phoneNo: joi_1.default.string().required()
});
// Betting
exports.bettingSchema = joi_1.default.object({
    bettingCompany: joi_1.default.string().required(),
    customerId: joi_1.default.string().required(),
    amount: joi_1.default.number().positive().required()
});
// Internet
exports.internetSchema = joi_1.default.object({
    mobileNetwork: joi_1.default.string().required(),
    dataPlan: joi_1.default.string().required(),
    mobileNumber: joi_1.default.string().required(),
    amount: joi_1.default.number().positive().required()
});
// JAMB
exports.jambSchema = joi_1.default.object({
    examType: joi_1.default.string().required(),
    phoneNo: joi_1.default.string().required(),
    amount: joi_1.default.number().positive().required()
});
