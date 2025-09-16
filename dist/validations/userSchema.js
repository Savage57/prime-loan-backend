"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.updatePasswordOrPinSchema = exports.validateResetSchema = exports.initiateResetSchema = exports.updateUserSchema = exports.loginSchema = exports.createClientAccountSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createClientAccountSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    name: joi_1.default.string().required(),
    surname: joi_1.default.string().required(),
    password: joi_1.default.string().min(6).required(),
    phone: joi_1.default.string()
        .pattern(/^(\+234|234|0)[789][01]\d{8}$/)
        .required()
        .messages({
        "string.pattern.base": "Phone must be a valid Nigerian number",
    }),
    bvn: joi_1.default.string().length(11).pattern(/^\d+$/).required(),
    pin: joi_1.default.string().length(4).pattern(/^\d+$/).required(),
    nin: joi_1.default.string().length(11).pattern(/^\d+$/).required(),
    dob: joi_1.default.string()
        .pattern(/^([0-2][0-9]|3[0-1])\/(0[1-9]|1[0-2])\/\d{4}$/)
        .required()
        .messages({
        "string.pattern.base": "Date of Birth must be dd/mm/yyyy",
    }),
});
exports.loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().required(),
});
exports.updateUserSchema = joi_1.default.object({
    field: joi_1.default.string()
        .valid("user_metadata.phone", "user_metadata.address", "user_metadata.profile_photo", "user_metadata.first_name", "user_metadata.surname")
        .required(),
    value: joi_1.default.alternatives().try(joi_1.default.string(), joi_1.default.number()).required(),
});
exports.initiateResetSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    type: joi_1.default.string().valid("password", "pin").required(),
});
exports.validateResetSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    pin: joi_1.default.string().length(6).required(),
});
exports.updatePasswordOrPinSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    newPassword: joi_1.default.string().min(8),
    newPin: joi_1.default.string().length(4).pattern(/^\d+$/),
}).or("newPassword", "newPin");
exports.changePasswordSchema = joi_1.default.object({
    oldPassword: joi_1.default.string().required(),
    newPassword: joi_1.default.string().min(8).required(),
});
