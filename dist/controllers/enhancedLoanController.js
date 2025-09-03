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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedCreateLoan = exports.enhancedRepayLoan = void 0;
const services_1 = require("../services");
const ledger_service_1 = require("../services/ledger.service");
const uuid_1 = require("../utils/uuid");
const money_1 = require("../utils/money");
const config_1 = require("../config");
const loanReminder_1 = require("../jobs/loanReminder");
const mongoose_1 = __importDefault(require("mongoose"));
const { find, update, getWalletBalance, updateWalletBalance } = new services_1.UserService();
const { create: createLoan, update: updateLoan, findById: findLoanById, addRepaymentHistory } = new services_1.LoanService();
const { createWithTrace } = new services_1.TransactionService();
const enhancedRepayLoan = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amount, transactionId, outstanding } = req.body;
        const { user } = req;
        const idempotencyKey = req.headers['idempotency-key'];
        if (!user || !user._id) {
            return res.status(404).json({
                status: "User not found.",
                data: null
            });
        }
        // Check idempotency
        if (idempotencyKey) {
            const existingResponse = yield services_1.IdempotencyService.checkKey(idempotencyKey, user._id);
            if (existingResponse) {
                return res.status(200).json(existingResponse.response);
            }
        }
        const userBalance = yield getWalletBalance(user._id);
        if (userBalance < Number(outstanding)) {
            return res.status(409).json({
                status: "Insufficient Funds.",
                data: null
            });
        }
        const foundLoan = yield findLoanById(transactionId);
        if (!foundLoan) {
            return res.status(404).json({
                status: "Loan not found.",
                data: null
            });
        }
        const traceId = uuid_1.UuidService.generateTraceId();
        const session = yield mongoose_1.default.startSession();
        try {
            yield session.withTransaction(() => __awaiter(void 0, void 0, void 0, function* () {
                var _a;
                const repaymentAmount = Number(outstanding);
                const newOutstanding = Math.max(0, Number(foundLoan.outstanding) - repaymentAmount);
                // Create ledger entries if feature enabled
                if (config_1.FEATURE_LEDGER) {
                    yield ledger_service_1.LedgerService.createDoubleEntry(traceId, `user_wallet:${user._id}`, 'platform_revenue', money_1.Money.toKobo(repaymentAmount), 'loan', {
                        userId: user._id,
                        subtype: 'repayment',
                        idempotencyKey,
                        session,
                        meta: { loanId: foundLoan._id }
                    });
                }
                // Update loan
                const repaymentEntry = {
                    amount: repaymentAmount,
                    outstanding: newOutstanding,
                    action: "repayment",
                    date: new Date().toISOString()
                };
                yield updateLoan(foundLoan._id, {
                    loan_payment_status: newOutstanding <= 0 ? "complete" : "in-progress",
                    outstanding: newOutstanding,
                    repayment_history: [...(foundLoan.repayment_history || []), repaymentEntry],
                    traceId
                });
                // Update user wallet
                yield updateWalletBalance(user._id, userBalance - repaymentAmount);
                // Create transaction record
                yield createWithTrace({
                    name: "Loan Repayment",
                    category: "debit",
                    type: "loan",
                    user: user._id,
                    details: "Loan repayment",
                    transaction_number: `REPAY_${uuid_1.UuidService.generate().substring(0, 8)}`,
                    amount: repaymentAmount,
                    outstanding: newOutstanding,
                    bank: "Prime Finance",
                    receiver: "Prime Finance",
                    account_number: "platform",
                    session_id: traceId,
                    status: "success",
                    traceId
                });
                // Update credit score on successful repayment
                if (newOutstanding <= 0) {
                    const currentScore = ((_a = user.user_metadata) === null || _a === void 0 ? void 0 : _a.creditScore) || 500;
                    yield update(user._id, "user_metadata.creditScore", Math.min(850, currentScore + 10));
                }
            }));
            const response = {
                status: "success",
                data: {
                    traceId,
                    amountPaid: repaymentAmount,
                    remainingOutstanding: Math.max(0, Number(foundLoan.outstanding) - repaymentAmount)
                }
            };
            // Save idempotent response
            if (idempotencyKey) {
                yield services_1.IdempotencyService.saveResponse(idempotencyKey, user._id, response);
            }
            res.status(200).json(response);
        }
        finally {
            yield session.endSession();
        }
    }
    catch (error) {
        console.log("Error in enhanced loan repayment:", error);
        next(error);
    }
});
exports.enhancedRepayLoan = enhancedRepayLoan;
const enhancedCreateLoan = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const _a = req.body, { amount } = _a, loanData = __rest(_a, ["amount"]);
        const { user } = req;
        const idempotencyKey = req.headers['idempotency-key'];
        if (!user || !user._id) {
            throw new Error("User not found.");
        }
        // Check idempotency
        if (idempotencyKey) {
            const existingResponse = yield services_1.IdempotencyService.checkKey(idempotencyKey, user._id);
            if (existingResponse) {
                return res.status(200).json(existingResponse.response);
            }
        }
        const traceId = uuid_1.UuidService.generateTraceId();
        const amountKobo = money_1.Money.toKobo(Number(amount));
        // Check auto-approval eligibility
        const canAutoApprove = amountKobo <= config_1.LOAN_AUTO_APPROVAL_MAX_KOBO;
        const initialStatus = canAutoApprove ? "pending" : "pending"; // Still requires manual review
        const loan = yield createLoan(Object.assign(Object.assign({}, loanData), { amount, requested_amount: amount, userId: user._id, status: initialStatus, traceId, credit_message: "available", loan_payment_status: "not-started" }));
        // Send notifications
        yield (0, loanReminder_1.sendEmail)(user.email, "Loan Application Received", `Dear ${user.user_metadata.first_name},\n\nYour loan application has been received. We will review it and get back to you shortly.\n\nThank you,\nPrime Finance`);
        const response = {
            status: "success",
            data: Object.assign(Object.assign({}, loan), { traceId, autoApprovalEligible: canAutoApprove })
        };
        // Save idempotent response
        if (idempotencyKey) {
            yield services_1.IdempotencyService.saveResponse(idempotencyKey, user._id, response);
        }
        res.status(200).json(response);
    }
    catch (error) {
        console.log("Error in enhanced loan creation:", error);
        next(error);
    }
});
exports.enhancedCreateLoan = enhancedCreateLoan;
