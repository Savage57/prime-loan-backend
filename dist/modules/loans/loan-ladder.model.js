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
exports.LoanLadder = void 0;
/**
 * Loan Ladder Model - OCR extracted income ladder for loan eligibility
 * Stores extracted amounts from calculator images for loan approval decisions
 */
const mongoose_1 = __importStar(require("mongoose"));
const LoanLadderSchema = new mongoose_1.Schema({
    step: { type: Number, required: true, unique: true },
    amount: { type: Number, required: true },
    verifiedBy: { type: String },
    meta: {
        adminNotes: { type: String }
    }
}, {
    timestamps: true,
    collection: 'loan_ladders'
});
LoanLadderSchema.index({ userId: 1, createdAt: -1 });
LoanLadderSchema.index({ trusted: 1, source: 1 });
exports.LoanLadder = mongoose_1.default.model('LoanLadder', LoanLadderSchema);
