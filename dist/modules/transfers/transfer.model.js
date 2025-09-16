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
exports.Transfer = exports.Transaction = void 0;
const mongoose_1 = __importStar(require("mongoose"));
/**
 * Legacy Transaction Schema (do not alter, thousands of existing docs depend on it)
 */
const TransactionSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    user: { type: String, required: true },
    type: { type: String, required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    outstanding: { type: Number, required: true },
    activity: { type: Number },
    details: { type: String, required: true },
    transaction_number: { type: String, required: true, unique: true },
    session_id: { type: String, required: true },
    status: { type: String, required: true },
    message: { type: String },
    receiver: { type: String, required: true },
    bank: { type: String, required: true },
    account_number: { type: String, required: true },
}, { timestamps: true, collection: 'transactions' });
exports.Transaction = mongoose_1.default.model('Transaction', TransactionSchema);
/**
 * New Transfer Schema (v2, structured transfers)
 */
const TransferSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    traceId: { type: String, required: true, index: true },
    fromAccount: { type: String, required: true },
    toAccount: { type: String, required: true },
    amount: { type: Number, required: true },
    transferType: { type: String, enum: ['intra', 'inter'], required: true },
    status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], required: true, index: true },
    providerRef: { type: String },
    beneficiaryName: { type: String },
    bankCode: { type: String },
    reference: { type: String, required: true, unique: true },
    remark: { type: String },
    naration: { type: String },
    processedAt: { type: Date },
    meta: { type: mongoose_1.Schema.Types.Mixed }
}, { timestamps: true, collection: 'transfers_v2' });
TransferSchema.index({ status: 1, createdAt: 1 });
TransferSchema.index({ providerRef: 1 });
TransferSchema.index({ reference: 1 });
exports.Transfer = mongoose_1.default.model('Transfer', TransferSchema);
