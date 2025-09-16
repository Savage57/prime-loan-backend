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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerService = void 0;
/**
 * Ledger Service - Core financial ledger operations
 * Manages all ledger entries and ensures double-entry bookkeeping principles
 */
const LedgerEntry_model_1 = require("./LedgerEntry.model");
class LedgerService {
    /**
     * Create a ledger entry within a session
     */
    static createEntry(params, session) {
        return __awaiter(this, void 0, void 0, function* () {
            const entry = Object.assign(Object.assign({}, params), { currency: params.currency || 'NGN', status: params.status || 'PENDING' });
            const [ledgerEntry] = yield LedgerEntry_model_1.LedgerEntry.create([entry], { session });
            return ledgerEntry;
        });
    }
    /**
     * Create double-entry ledger entries (debit + credit)
     */
    static createDoubleEntry(traceId_1, debitAccount_1, creditAccount_1, amount_1, category_1) {
        return __awaiter(this, arguments, void 0, function* (traceId, debitAccount, creditAccount, amount, category, options = {}) {
            const { session } = options, commonParams = __rest(options, ["session"]);
            const debit = yield this.createEntry(Object.assign({ traceId, account: debitAccount, entryType: 'DEBIT', category,
                amount }, commonParams), session);
            const credit = yield this.createEntry(Object.assign({ traceId, account: creditAccount, entryType: 'CREDIT', category,
                amount }, commonParams), session);
            return { debit, credit };
        });
    }
    /**
     * Get ledger entries by trace ID
     */
    static getByTraceId(traceId) {
        return __awaiter(this, void 0, void 0, function* () {
            return LedgerEntry_model_1.LedgerEntry.find({ traceId }).sort({ createdAt: 1 });
        });
    }
    /**
     * Update ledger entry status
     */
    static updateStatus(entryId, status, session) {
        return __awaiter(this, void 0, void 0, function* () {
            yield LedgerEntry_model_1.LedgerEntry.findByIdAndUpdate(entryId, {
                status,
                processedAt: status !== 'PENDING' ? new Date() : undefined
            }, { session });
        });
    }
    /**
     * Get user wallet balance from ledger
     */
    static getUserWalletBalance(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const result = yield LedgerEntry_model_1.LedgerEntry.aggregate([
                {
                    $match: {
                        account: `user_wallet:${userId}`,
                        status: 'COMPLETED'
                    }
                },
                {
                    $group: {
                        _id: null,
                        balance: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$entryType', 'CREDIT'] },
                                    '$amount',
                                    { $multiply: ['$amount', -1] }
                                ]
                            }
                        }
                    }
                }
            ]);
            return ((_a = result[0]) === null || _a === void 0 ? void 0 : _a.balance) || 0;
        });
    }
    /**
     * Find reconciliation inconsistencies
     */
    static findInconsistencies() {
        return __awaiter(this, void 0, void 0, function* () {
            return LedgerEntry_model_1.LedgerEntry.aggregate([
                {
                    $match: { status: 'COMPLETED' }
                },
                {
                    $group: {
                        _id: '$traceId',
                        totalDebits: {
                            $sum: {
                                $cond: [{ $eq: ['$entryType', 'DEBIT'] }, '$amount', 0]
                            }
                        },
                        totalCredits: {
                            $sum: {
                                $cond: [{ $eq: ['$entryType', 'CREDIT'] }, '$amount', 0]
                            }
                        },
                        entries: { $push: '$$ROOT' }
                    }
                },
                {
                    $match: {
                        $expr: { $ne: ['$totalDebits', '$totalCredits'] }
                    }
                }
            ]);
        });
    }
}
exports.LedgerService = LedgerService;
