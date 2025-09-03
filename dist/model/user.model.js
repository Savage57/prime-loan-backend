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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const updateSchema = new mongoose_1.Schema({
    pin: { type: Number, required: true },
    type: { type: String, enum: ["pin", "password"], required: true },
    status: { type: String, enum: ["validated", "invalid", "awaiting_validation"], required: true },
    created_at: { type: String, required: true },
});
// Define the schema for linked accounts
const linkedAccountSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    ref: { type: String, required: true },
    bank: { type: String, required: true },
    account_number: { type: String, required: true },
}, { _id: false } // Prevent Mongoose from adding an extra _id field to each subdocument
);
const userSchema = new mongoose_1.Schema({
    confirmation_sent_at: { type: String, required: false },
    confirmed_at: { type: String, required: false },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: { type: String, required: true },
    email_confirmed_at: { type: String, required: false },
    refresh_tokens: { type: [String], required: true },
    is_anonymous: { type: Boolean, required: true },
    last_sign_in_at: { type: String, required: false },
    phone: { type: String, required: false },
    role: { type: String, enum: ["user", "admin"], required: true },
    status: { type: String, enum: ["active", "inactive"], required: true },
    user_metadata: {
        bvn: { type: String, required: false },
        nin: { type: String, required: false },
        sub: { type: String, required: false },
        email: { type: String, required: false },
        gender: { type: String, required: false },
        phone: { type: String, required: false },
        surname: { type: String, required: false },
        wallet: { type: String, required: false },
        first_name: { type: String, required: false },
        dateOfBirth: { type: String, required: false },
        email_verified: { type: Boolean, required: false },
        signupBonusReceived: { type: Boolean, required: false },
        phone_verified: { type: Boolean, required: false },
        ladderIndex: { type: Number, required: false, default: 0 },
        creditScore: { type: Number, required: false, default: 500 },
        accountNo: { type: String, required: false },
        address: { type: String, required: false },
        pin: { type: String, required: false },
        file: { type: String, required: false },
        profile_photo: { type: String, required: false },
        types: { type: String, required: false },
        verified_address: {
            type: String,
            enum: ["verified", "pending", "unverified"],
            required: false,
        },
    },
    linked_accounts: { type: [linkedAccountSchema], default: [] }, // <-- added here
    updates: { type: [updateSchema], default: [] },
    is_super_admin: { type: Boolean, required: false, default: null },
}, { timestamps: true });
const User = (0, mongoose_1.model)('users', userSchema);
(() => __awaiter(void 0, void 0, void 0, function* () {
    yield User.syncIndexes();
}))();
exports.default = User;
