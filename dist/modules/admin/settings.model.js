"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Settings = void 0;
const mongoose_1 = require("mongoose");
const SettingsSchema = new mongoose_1.Schema({
    autoLoanApproval: { type: Boolean, default: true },
    maxLoanAmount: { type: Number, default: 50000 }, // ₦50,000 default
    minCreditScore: { type: Number, default: 0.4 },
    transferEnabled: { type: Boolean, default: true },
    transferDailyLimit: { type: Number, default: 500000 }, // ₦1,000,000 default
    loanEnabled: { type: Boolean, default: true },
    savingsPenalty: { type: Number, default: 0.15 },
    savingsEnabled: { type: Boolean, default: true },
    savingsInterestRate: { type: Number, default: 0.025 }, // 2.5% default
    billPaymentEnabled: { type: Boolean, default: true },
    updatedBy: { type: String, required: true },
    updatedAt: { type: Date, default: Date.now }
}, { collection: "settings" });
// Ensure only one settings doc exists
SettingsSchema.index({}, { unique: true });
exports.Settings = (0, mongoose_1.model)("Settings", SettingsSchema);
