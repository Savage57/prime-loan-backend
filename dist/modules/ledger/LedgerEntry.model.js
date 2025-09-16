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
exports.LedgerEntry = void 0;
/**
 * Ledger Entry Model - Single source of truth for all financial transactions
 * Every money movement in the system must create corresponding ledger entries
 */
const mongoose_1 = __importStar(require("mongoose"));
const LedgerEntrySchema = new mongoose_1.Schema({
    traceId: { type: String, required: true, index: true },
    userId: { type: String, index: true },
    account: { type: String, required: true, index: true },
    entryType: { type: String, enum: ['DEBIT', 'CREDIT'], required: true },
    category: {
        type: String,
        enum: ['bill-payment', 'transfer', 'loan', 'savings', 'fee', 'refund', 'settlement', 'escrow'],
        required: true,
        index: true
    },
    subtype: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'NGN' },
    balanceBefore: { type: Number },
    balanceAfter: { type: Number },
    status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], required: true, index: true },
    relatedTo: { type: String },
    meta: { type: mongoose_1.Schema.Types.Mixed },
    idempotencyKey: { type: String, index: true },
    processedAt: { type: Date }
}, {
    timestamps: true,
    collection: 'ledger_entries'
});
// Compound indexes for efficient queries
LedgerEntrySchema.index({ traceId: 1, createdAt: -1 });
LedgerEntrySchema.index({ userId: 1, category: 1, createdAt: -1 });
LedgerEntrySchema.index({ status: 1, category: 1, createdAt: 1 });
exports.LedgerEntry = mongoose_1.default.model('LedgerEntry', LedgerEntrySchema);
