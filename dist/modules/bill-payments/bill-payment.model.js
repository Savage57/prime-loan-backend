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
exports.BillPayment = void 0;
/**
 * Bill Payment Model - Tracks bill payment transactions
 * Extended from existing structure with v2 fields
 */
const mongoose_1 = __importStar(require("mongoose"));
const BillPaymentSchema = new mongoose_1.Schema({
    userId: { type: String, required: true, index: true },
    traceId: { type: String, required: true, index: true }, // v2 addition
    serviceType: { type: String, required: true },
    serviceId: { type: String, required: true },
    customerReference: { type: String, required: true },
    amount: { type: Number, required: true },
    status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'FAILED'],
        required: true,
        index: true
    },
    providerRef: { type: String },
    processedAt: { type: Date },
    meta: { type: mongoose_1.Schema.Types.Mixed }
}, {
    timestamps: true,
    collection: 'bill_payments'
});
BillPaymentSchema.index({ status: 1, createdAt: 1 });
BillPaymentSchema.index({ providerRef: 1 });
exports.BillPayment = mongoose_1.default.model('BillPayment', BillPaymentSchema);
