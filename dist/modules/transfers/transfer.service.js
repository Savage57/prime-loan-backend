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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransferService = void 0;
/**
 * Transfer Application Service
 * Orchestrates transfer operations with ledger + idempotency
 */
const LedgerService_1 = require("../ledger/LedgerService");
const db_1 = require("../../shared/db");
const uuid_1 = require("../../shared/utils/uuid");
const transfer_model_1 = require("./transfer.model");
const middleware_1 = require("../../shared/idempotency/middleware");
const user_model_1 = __importDefault(require("../users/user.model"));
const js_sha512_1 = require("js-sha512");
const vfd_provider_1 = require("../../shared/providers/vfd.provider");
const counter_model_1 = __importDefault(require("../users/counter.model"));
const notification_service_1 = require("../notifications/notification.service");
class TransferService {
    /**
     * Initiate transfer (pending debit entry)
     */
    static initiateTransfer(request_1) {
        return __awaiter(this, arguments, void 0, function* (request, type = "transfer") {
            const traceId = uuid_1.UuidService.generateTraceId();
            const reference = `TXN_${uuid_1.UuidService.generate().substring(0, 8).toUpperCase()}`;
            const session = yield db_1.DatabaseService.startSession();
            try {
                return yield db_1.DatabaseService.withTransaction(session, () => __awaiter(this, void 0, void 0, function* () {
                    // Create transfer record
                    const [transfer] = yield transfer_model_1.Transfer.create([{
                            userId: request.userId,
                            traceId,
                            fromAccount: request.fromAccount,
                            toAccount: request.toAccount,
                            amount: request.amount,
                            transferType: request.transferType,
                            status: 'PENDING',
                            reference,
                            remark: request.remark,
                            bankCode: request.bankCode,
                            meta: request.meta,
                            naration: request.naration
                        }], { session });
                    if (transfer.transferType === 'intra') {
                        const user = yield user_model_1.default.findOne({ "user_metadata.accountNo": transfer.fromAccount }).session(session);
                        if (user) {
                            if (type == "transfer") {
                                // Create debit ledger entry
                                yield LedgerService_1.LedgerService.createEntry({
                                    traceId,
                                    userId: user._id,
                                    account: `user_wallet:${user._id}`,
                                    entryType: 'DEBIT',
                                    category: 'transfer',
                                    amount: request.amount,
                                    status: 'PENDING',
                                    idempotencyKey: request.idempotencyKey,
                                    meta: { transferId: transfer._id, toAccount: request.toAccount }
                                }, session);
                            }
                            user.user_metadata.wallet = String(Number(user.user_metadata.wallet || 0) - Number(transfer.amount));
                            yield user.save();
                        }
                    }
                    const result = {
                        traceId,
                        status: 'PENDING',
                        transferId: String(transfer._id),
                        reference
                    };
                    if (request.idempotencyKey) {
                        yield (0, middleware_1.saveIdempotentResponse)(request.idempotencyKey, request.userId, result);
                    }
                    return result;
                }));
            }
            finally {
                yield session.endSession();
            }
        });
    }
    /**
     * Mark transfer as completed (credit side + finalize)
     */
    static completeTransfer(reference_1) {
        return __awaiter(this, arguments, void 0, function* (reference, type = "transfer") {
            const session = yield db_1.DatabaseService.startSession();
            try {
                return yield db_1.DatabaseService.withTransaction(session, () => __awaiter(this, void 0, void 0, function* () {
                    const transfer = yield transfer_model_1.Transfer.findOne({ reference }).session(session);
                    if (!transfer)
                        return null;
                    // Update debit ledger entry
                    const ledger = yield LedgerService_1.LedgerService.getByTraceId(transfer.traceId);
                    if (ledger[0]) {
                        yield LedgerService_1.LedgerService.updateStatus(ledger[0]._id, 'COMPLETED', session);
                    }
                    // Credit beneficiary account (for intra-bank)
                    if (transfer.transferType === 'intra') {
                        const user = yield user_model_1.default.findOne({ "user_metadata.accountNo": transfer.toAccount }).session(session);
                        if (user) {
                            if (type == "transfer") {
                                yield LedgerService_1.LedgerService.createEntry({
                                    userId: user._id,
                                    traceId: transfer.traceId,
                                    account: `user_wallet:${transfer.toAccount}`,
                                    entryType: 'CREDIT',
                                    category: 'transfer',
                                    amount: transfer.amount,
                                    status: 'COMPLETED',
                                    relatedTo: String(transfer._id)
                                }, session);
                            }
                            user.user_metadata.wallet = String(Number(user.user_metadata.wallet || 0) + Number(transfer.amount));
                            yield user.save();
                            const fromuser = yield user_model_1.default.findOne({ "user_metadata.accountNo": transfer.fromAccount }).session(session);
                            yield notification_service_1.NotificationService.sendCreditAlert(user, transfer.amount, `${fromuser === null || fromuser === void 0 ? void 0 : fromuser.user_metadata.first_name} ${fromuser === null || fromuser === void 0 ? void 0 : fromuser.user_metadata.surname}`, transfer.reference);
                        }
                    }
                    transfer.status = 'COMPLETED';
                    yield transfer.save({ session });
                    const result = {
                        traceId: transfer.traceId,
                        status: 'COMPLETED',
                        transferId: String(transfer._id),
                        reference: transfer.reference
                    };
                    const user = yield user_model_1.default.findById(transfer.userId);
                    if (user && type == "transfer") {
                        yield notification_service_1.NotificationService.sendDebitAlert(user, transfer.amount);
                    }
                    return result;
                }));
            }
            finally {
                yield session.endSession();
            }
        });
    }
    /**
     * Mark transfer as failed (credit side + finalize)
     */
    static failTransfer(reference) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield db_1.DatabaseService.startSession();
            try {
                return yield db_1.DatabaseService.withTransaction(session, () => __awaiter(this, void 0, void 0, function* () {
                    const transfer = yield transfer_model_1.Transfer.findOne({ reference }).session(session);
                    if (!transfer)
                        return null;
                    // Update debit ledger entry
                    const ledger = yield LedgerService_1.LedgerService.getByTraceId(transfer.traceId);
                    if (ledger[0]) {
                        yield LedgerService_1.LedgerService.updateStatus(ledger[0]._id, 'FAILED', session);
                    }
                    transfer.status = 'FAILED';
                    yield transfer.save({ session });
                    const result = {
                        traceId: transfer.traceId,
                        status: 'FAILED',
                        transferId: String(transfer._id),
                        reference: transfer.reference
                    };
                    const user = yield user_model_1.default.findById(transfer.userId);
                    if (user) {
                        user.user_metadata.wallet = String(Number(user.user_metadata.wallet || 0) + Number(transfer.amount));
                        yield user.save();
                    }
                    return result;
                }));
            }
            finally {
                yield session.endSession();
            }
        });
    }
    /**
     * create user bonus
     */
    static createUserBonus(userId, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield db_1.DatabaseService.startSession();
            try {
                yield db_1.DatabaseService.withTransaction(session, () => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    if (((_a = (yield counter_model_1.default.findOne({ name: 'signupBonus' }))) === null || _a === void 0 ? void 0 : _a.count) || 0 <= 100) {
                        const user = yield user_model_1.default.findById(userId).session(session);
                        if (!user)
                            throw new Error("User not found");
                        const userAccountRes = yield TransferService.vfdProvider.getAccountInfo(user.user_metadata.accountNo || "");
                        if (!userAccountRes.data)
                            throw new Error(`User account not found`);
                        const userAccountData = userAccountRes.data;
                        const userBalance = Number(userAccountData.accountBalance);
                        // 3. Enquire prime account (admin)
                        const adminAccountRes = yield TransferService.vfdProvider.getPrimeAccountInfo();
                        if (!adminAccountRes.data)
                            throw new Error("Prime account not found");
                        const adminAccountData = adminAccountRes.data;
                        const res = yield TransferService.initiateTransfer({
                            fromAccount: adminAccountData.accountNo,
                            toAccount: userAccountData.accountNo,
                            amount: userBalance,
                            bankCode: "999999",
                            transferType: "intra",
                            userId: String(user._id)
                        });
                        const transferBody = {
                            fromAccount: adminAccountData.accountNo,
                            uniqueSenderAccountId: "",
                            fromClientId: adminAccountData.clientId,
                            fromClient: adminAccountData.client,
                            fromSavingsId: adminAccountData.accountId,
                            toClientId: userAccountData.clientId,
                            toClient: userAccountData.client,
                            toSavingsId: userAccountData.accountId,
                            toSession: userAccountData.accountId,
                            toAccount: userAccountData.accountNo,
                            toBank: "999999",
                            signature: js_sha512_1.sha512.hex(`${adminAccountData.accountNo}${userAccountData.accountNo}`),
                            amount: amount,
                            remark: "Signup Bonus",
                            transferType: "intra",
                            reference: res.reference,
                        };
                        const response = yield TransferService.vfdProvider.transfer(transferBody);
                        if (response.status === "00") {
                            yield TransferService.completeTransfer(res.reference);
                        }
                        user.user_metadata.signupBonusReceived = true;
                        user.user_metadata.wallet = String(Number(user.user_metadata.wallet || 0) + Number(amount));
                        yield user.save({ session });
                        counter_model_1.default.findOneAndUpdate({ name: 'signupBonus' }, { $inc: { count: 1 } });
                    }
                }));
            }
            finally {
                yield session.endSession();
            }
        });
    }
    /**
     * Transfer by id
    */
    static transfer(transactionId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!transactionId)
                return null;
            const transaction = yield transfer_model_1.Transfer.findOne({ _id: transactionId });
            if (!transaction)
                return null;
            return transaction;
        });
    }
    /**
     * Paginated transfers for a user
    */
    static transfers(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, page = 1, limit = 10) {
            const skip = (page - 1) * limit;
            // Run queries in parallel
            const [transactions, total] = yield Promise.all([
                transfer_model_1.Transfer.find({ userId })
                    .sort({ createdAt: -1 }) // newest first
                    .skip(skip)
                    .limit(limit),
                transfer_model_1.Transfer.countDocuments({ userId })
            ]);
            return {
                data: transactions,
                total,
                page,
                pages: Math.ceil(total / limit)
            };
        });
    }
    /**
     * Handle incoming wallet credit alerts (webhook style)
     */
    static walletAlerts(body) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield user_model_1.default.findOne({ "user_metadata.accountNo": body.account_number });
            if (!user)
                return null;
            const traceId = body.session_id;
            // Ledger credit
            yield LedgerService_1.LedgerService.createEntry({
                traceId,
                userId: String(user._id),
                account: `user_wallet:${user._id}`,
                entryType: 'CREDIT',
                category: 'transfer',
                amount: body.amount,
                status: 'COMPLETED',
                relatedTo: body.reference,
                meta: {
                    originatorName: body.originator_account_name,
                    originatorAccount: body.originator_account_number,
                    bank: body.originator_bank
                }
            });
            // Transfer record
            const txn = yield transfer_model_1.Transfer.create({
                userId: user._id,
                traceId,
                fromAccount: body.originator_account_number,
                toAccount: body.account_number,
                amount: body.amount,
                transferType: 'intra',
                status: 'COMPLETED',
                reference: body.reference,
                remark: body.originator_narration,
                bankCode: body.originator_bank,
                providerRef: body.session_id
            });
            user.user_metadata.wallet = String(Number(user.user_metadata.wallet || 0) + Number(body.amount));
            yield user.save();
            yield notification_service_1.NotificationService.sendCreditAlert(user, body.amount, body.originator_account_name, body.reference);
            return txn;
        });
    }
}
exports.TransferService = TransferService;
TransferService.vfdProvider = new vfd_provider_1.VfdProvider();
