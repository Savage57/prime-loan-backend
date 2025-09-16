"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SavingsPlan = void 0;
/**
 * Savings Plan Model - User savings accounts
 * Supports both locked and flexible savings with interest calculations
 */
const mongoose_1 = __importStar(require("mongoose"));
const SavingsPlanSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    planName: { type: String, required: true },
    planType: { type: String, enum: ['LOCKED', 'FLEXIBLE'], required: true },
    principal: { type: Number, required: true, default: 0 },
    interestEarned: { type: Number, default: 0 },
    targetAmount: { type: Number },
    durationDays: { type: Number },
    interestRate: { type: Number, required: true }, // annual percentage
    status: {
        type: String,
        enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
        default: 'ACTIVE',
        index: true
    },
    maturityDate: { type: Date },
    locked: { type: Boolean, required: true },
    completedAt: { type: Date },
    meta: {
        autoRenew: { type: Boolean, default: false },
        penaltyRate: { type: Number },
        compoundingFrequency: { type: String, enum: ['daily', 'monthly', 'maturity'], default: 'maturity' }
    }
}, {
    timestamps: true,
    collection: 'savings_plans'
});
SavingsPlanSchema.index({ userId: 1, status: 1 });
SavingsPlanSchema.index({ maturityDate: 1, status: 1 });
exports.SavingsPlan = mongoose_1.default.model('SavingsPlan', SavingsPlanSchema);
