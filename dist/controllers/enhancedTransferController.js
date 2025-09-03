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
exports.enhancedTransfer = void 0;
const services_1 = require("../services");
const ledger_service_1 = require("../services/ledger.service");
const uuid_1 = require("../utils/uuid");
const money_1 = require("../utils/money");
const config_1 = require("../config");
const httpClient_1 = require("../utils/httpClient");
const js_sha512_1 = require("js-sha512");
const loanReminder_1 = require("../jobs/loanReminder");
const mongoose_1 = __importDefault(require("mongoose"));
const { find, update, getWalletBalance, updateWalletBalance } = new services_1.UserService();
const { createWithTrace } = new services_1.TransactionService();
const enhancedTransfer = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const _a = req.body, { fromAccount, toAccount, amount, remark, reference, toBank, bank, toClient } = _a, transferData = __rest(_a, ["fromAccount", "toAccount", "amount", "remark", "reference", "toBank", "bank", "toClient"]);
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
        if (userBalance < Number(amount)) {
            return res.status(409).json({
                status: "Insufficient Funds.",
                data: null
            });
        }
        const traceId = uuid_1.UuidService.generateTraceId();
        const session = yield mongoose_1.default.startSession();
        try {
            yield session.withTransaction(() => __awaiter(void 0, void 0, void 0, function* () {
                const transferAmount = Number(amount);
                const amountKobo = money_1.Money.toKobo(transferAmount);
                // Create pending ledger entry if feature enabled
                if (config_1.FEATURE_LEDGER) {
                    yield ledger_service_1.LedgerService.createEntry({
                        traceId,
                        userId: user._id,
                        account: `user_wallet:${user._id}`,
                        entryType: 'DEBIT',
                        category: 'transfer',
                        amount: amountKobo,
                        status: 'PENDING',
                        idempotencyKey,
                        meta: {
                            toAccount,
                            transferType: toBank === '999999' ? 'intra' : 'inter',
                            reference
                        }
                    }, session);
                }
                // Call provider API
                const apiResponse = yield (0, httpClient_1.httpClient)("/wallet2/transfer", "POST", Object.assign(Object.assign({}, transferData), { fromAccount,
                    toAccount,
                    toBank,
                    amount,
                    remark, signature: js_sha512_1.sha512.hex(`${fromAccount}${toAccount}`), transferType: toBank === '999999' ? "intra" : "inter", reference }));
                if (apiResponse.data && apiResponse.data.status === "00") {
                    // Update user wallet
                    yield updateWalletBalance(user._id, userBalance - transferAmount);
                    // Handle intra-bank transfers (credit beneficiary)
                    if (toBank === '999999') {
                        const beneficiary = yield find({ "user_metadata.accountNo": toAccount }, "one");
                        if (beneficiary && !Array.isArray(beneficiary) && beneficiary._id) {
                            const beneficiaryBalance = yield getWalletBalance(beneficiary._id);
                            yield updateWalletBalance(beneficiary._id, beneficiaryBalance + transferAmount);
                            // Create beneficiary transaction
                            yield createWithTrace({
                                name: "Deposit-" + reference,
                                category: "credit",
                                type: "transfer",
                                user: beneficiary._id,
                                details: remark || "Transfer received",
                                transaction_number: `${apiResponse.data.data.txnId}-received` || "no-txnId",
                                amount: transferAmount,
                                bank: bank || "Prime Finance",
                                receiver: toClient || "Beneficiary",
                                account_number: toAccount,
                                outstanding: 0,
                                session_id: `${apiResponse.data.data.sessionId}-received` || "no-sessionId",
                                status: "success",
                                traceId
                            });
                            // Create credit ledger entry for beneficiary
                            if (config_1.FEATURE_LEDGER) {
                                yield ledger_service_1.LedgerService.createEntry({
                                    traceId,
                                    userId: beneficiary._id,
                                    account: `user_wallet:${beneficiary._id}`,
                                    entryType: 'CREDIT',
                                    category: 'transfer',
                                    amount: amountKobo,
                                    status: 'COMPLETED'
                                }, session);
                            }
                            // Send notification to beneficiary
                            yield (0, loanReminder_1.sendEmail)(beneficiary.email, 'Wallet Alert – Funds Credited', `Dear ${beneficiary.user_metadata.first_name},\n\nYour wallet has been credited with ₦${transferAmount} from ${user.user_metadata.first_name}.\n\nTransaction Details:\n- Amount: ₦${transferAmount}\n- Reference: ${reference}\n\nThank you for using Prime Finance!`);
                        }
                    }
                    // Complete the debit ledger entry
                    if (config_1.FEATURE_LEDGER) {
                        yield ledger_service_1.LedgerService.updateStatus(traceId, 'COMPLETED', session);
                    }
                    // Create sender transaction
                    yield createWithTrace({
                        name: "Withdrawal-" + reference,
                        category: "debit",
                        type: "transfer",
                        user: user._id,
                        details: remark || "Transfer sent",
                        transaction_number: apiResponse.data.data.txnId || "no-txnId",
                        amount: transferAmount,
                        bank: bank || "External Bank",
                        receiver: toClient || "Beneficiary",
                        account_number: toAccount,
                        outstanding: 0,
                        session_id: apiResponse.data.data.sessionId || "no-sessionId",
                        status: "success",
                        traceId
                    });
                    // Send confirmation to sender
                    yield (0, loanReminder_1.sendEmail)(user.email, 'Transfer Successful', `Dear ${user.user_metadata.first_name},\n\nYour transfer of ₦${transferAmount} has been successfully processed.\n\nTransaction Details:\n- Amount: ₦${transferAmount}\n- Reference: ${reference}\n- To Account: ${toAccount}\n\nThank you for using Prime Finance!`);
                }
            }));
            const response = {
                status: "success",
                data: Object.assign(Object.assign({}, apiResponse.data.data), { traceId, ledgerEnabled: config_1.FEATURE_LEDGER })
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
        console.log("Error in enhanced transfer:", error);
        next(error);
    }
});
exports.enhancedTransfer = enhancedTransfer;
