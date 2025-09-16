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
exports.SavingsService = void 0;
/**
 * Savings Application Service
 * Manages savings plans with interest calculations and penalties
 */
const savings_plan_model_1 = require("./savings.plan.model");
const LedgerService_1 = require("../ledger/LedgerService");
const db_1 = require("../../shared/db");
const uuid_1 = require("../../shared/utils/uuid");
const user_model_1 = __importDefault(require("../users/user.model"));
const vfd_provider_1 = require("../../shared/providers/vfd.provider");
const middleware_1 = require("../../shared/idempotency/middleware");
const transfer_service_1 = require("../transfers/transfer.service");
const js_sha512_1 = require("js-sha512");
const settings_service_1 = require("../admin/settings.service");
class SavingsService {
    static createPlan(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield db_1.DatabaseService.startSession();
            try {
                return yield db_1.DatabaseService.withTransaction(session, () => __awaiter(this, void 0, void 0, function* () {
                    const vfdProvider = new vfd_provider_1.VfdProvider();
                    const maturityDate = params.durationDays
                        ? new Date(Date.now() + params.durationDays * 24 * 60 * 60 * 1000)
                        : undefined;
                    const userId = params.userId;
                    const user = yield user_model_1.default.findById(userId);
                    const from = (yield vfdProvider.getAccountInfo(user ? user.user_metadata.accountNo : "trx-user")).data;
                    const to = (yield vfdProvider.getPrimeAccountInfo()).data;
                    // 1. Create transfer record + ledger entry (PENDING)
                    const trxn = yield transfer_service_1.TransferService.initiateTransfer({
                        fromAccount: from.accountNo,
                        userId,
                        toAccount: to.accountNo,
                        amount: params.amount,
                        transferType: "intra",
                        bankCode: "999999",
                        remark: `Initiated ${params.planType} plan intiated for ${params.planName}`,
                        naration: `
            Initiated ${params.planType} plan for ${params.planName}, with 
            ${params.amount} to get ${params.targetAmount} at ${params.interestRate} 
            for a duration of ${params.durationDays} days successfully.
          `,
                        idempotencyKey: params.idempotencyKey,
                    }, "savings-deposit");
                    // 2. Send transfer to VFD
                    const transferReq = {
                        uniqueSenderAccountId: from.accountId,
                        fromAccount: from.accountNo,
                        fromClientId: from.clientId,
                        fromClient: from.client,
                        fromSavingsId: from.accountId,
                        toAccount: to.accountNo,
                        toClient: to.client,
                        toSession: to.accountId,
                        toClientId: to.clientId,
                        toSavingsId: to.accountId,
                        toBank: "999999",
                        signature: js_sha512_1.sha512.hex(`${from.accountNo}${to.accountNo}`),
                        amount: params.amount,
                        remark: `Initiated ${params.planType} plan intiated for ${params.planName}`,
                        transferType: "intra",
                        reference: trxn.reference,
                    };
                    const providerRes = yield vfdProvider.transfer(transferReq);
                    if (providerRes.status == "00") {
                        const trxnRes = yield transfer_service_1.TransferService.completeTransfer(trxn.reference, "savings-deposit");
                        const setting = yield settings_service_1.SettingsService.getSettings();
                        const [plan] = yield savings_plan_model_1.SavingsPlan.create([{
                                userId: params.userId,
                                planType: params.planType,
                                planName: params.planName,
                                targetAmount: params.targetAmount ? params.targetAmount : undefined,
                                durationDays: params.durationDays,
                                principal: params.amount,
                                interestRate: Number(setting.savingsInterestRate) * Number((params === null || params === void 0 ? void 0 : params.durationDays) || 0),
                                locked: params.planType === 'LOCKED',
                                maturityDate,
                                status: 'ACTIVE',
                                meta: {
                                    penaltyRate: setting.savingsPenalty,
                                    autoRenew: params.renew,
                                    compoundingFrequency: 'maturity'
                                }
                            }], { session });
                        const result = {
                            planId: plan._id,
                            planType: plan.planType,
                            interestRate: plan.interestRate,
                            maturityDate: plan.maturityDate
                        };
                        yield LedgerService_1.LedgerService.createDoubleEntry((trxnRes === null || trxnRes === void 0 ? void 0 : trxnRes.traceId) || "", `user_wallet:${params.userId}`, 'savings_pool', params.amount, 'savings', {
                            userId: params.userId,
                            subtype: 'deposit',
                            idempotencyKey: params.idempotencyKey,
                            session,
                            meta: {
                                planId: plan._id,
                                transactionId: (trxnRes === null || trxnRes === void 0 ? void 0 : trxnRes.transferId) || ""
                            }
                        });
                        yield (0, middleware_1.saveIdempotentResponse)(params.idempotencyKey, params.userId, result);
                        return result;
                    }
                    yield transfer_service_1.TransferService.failTransfer(trxn.reference);
                    return null;
                }));
            }
            finally {
                yield session.endSession();
            }
        });
    }
    static completePlan(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const traceId = uuid_1.UuidService.generateTraceId();
            const amount = params.amount;
            const session = yield db_1.DatabaseService.startSession();
            try {
                return yield db_1.DatabaseService.withTransaction(session, () => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    const vfdProvider = new vfd_provider_1.VfdProvider();
                    const plan = yield savings_plan_model_1.SavingsPlan.findById(params.planId).session(session);
                    if (!plan)
                        throw new Error('Savings plan not found');
                    if (plan.userId !== params.userId)
                        throw new Error('Unauthorized');
                    let penalty = 0;
                    let netAmount = amount;
                    // Calculate penalty for early withdrawal
                    if (plan.locked && plan.maturityDate && new Date() < plan.maturityDate) {
                        const penaltyRate = ((_a = plan.meta) === null || _a === void 0 ? void 0 : _a.penaltyRate) || 0.05; // 5% default
                        penalty = Math.floor(amount * penaltyRate);
                        netAmount = amount - penalty;
                    }
                    if (plan.maturityDate && new Date() > plan.maturityDate) {
                        netAmount = amount + Math.floor((plan.principal * (plan.interestRate * (plan.durationDays || 0))) * 100);
                    }
                    const user = yield user_model_1.default.findById(plan.userId);
                    const to = (yield vfdProvider.getAccountInfo(user ? user.user_metadata.accountNo : "trx-user")).data;
                    const from = (yield vfdProvider.getPrimeAccountInfo()).data;
                    // 1. Create transfer record + ledger entry (PENDING)
                    const trxn = yield transfer_service_1.TransferService.initiateTransfer({
                        fromAccount: from.accountNo,
                        userId: plan.userId,
                        toAccount: to.accountNo,
                        amount: params.amount,
                        transferType: "intra",
                        bankCode: "999999",
                        remark: `${plan.planType} plan intiated for ${plan.planName} withrawal`,
                        idempotencyKey: params.idempotencyKey,
                        meta: {
                            earlyWithdrawal: plan.locked && plan.maturityDate && new Date() < plan.maturityDate,
                            penalty
                        }
                    }, "savings-withdrawal");
                    // 2. Send transfer to VFD
                    const transferReq = {
                        uniqueSenderAccountId: from.accountId,
                        fromAccount: from.accountNo,
                        fromClientId: from.clientId,
                        fromClient: from.client,
                        fromSavingsId: from.accountId,
                        toAccount: to.accountNo,
                        toClient: to.client,
                        toSession: to.accountId,
                        toClientId: to.clientId,
                        toSavingsId: to.accountId,
                        toBank: "999999",
                        signature: js_sha512_1.sha512.hex(`${from.accountNo}${to.accountNo}`),
                        amount: params.amount,
                        remark: `${plan.planType} plan intiated for ${plan.planName} withrawal`,
                        transferType: "intra",
                        reference: trxn.reference,
                    };
                    const providerRes = yield vfdProvider.transfer(transferReq);
                    if (providerRes.status == "00") {
                        const trxnRes = yield transfer_service_1.TransferService.completeTransfer(trxn.reference, "savings-withdrawal");
                        // Create ledger entries for withdrawal
                        yield LedgerService_1.LedgerService.createDoubleEntry((trxnRes === null || trxnRes === void 0 ? void 0 : trxnRes.traceId) || "", 'savings_pool', `user_wallet:${params.userId}`, netAmount, 'savings', {
                            userId: params.userId,
                            subtype: 'withdrawal',
                            idempotencyKey: params.idempotencyKey,
                            session
                        });
                        // Create penalty ledger entry if applicable
                        if (penalty > 0) {
                            yield LedgerService_1.LedgerService.createEntry({
                                traceId,
                                userId: params.userId,
                                account: 'platform_revenue',
                                entryType: 'CREDIT',
                                category: 'savings',
                                subtype: 'penalty',
                                amount: penalty,
                                status: 'COMPLETED'
                            }, session);
                        }
                        // Update plan principal
                        plan.principal -= amount;
                        if (plan.principal <= 0) {
                            plan.status = 'COMPLETED';
                            plan.completedAt = new Date();
                        }
                        yield plan.save({ session });
                        const result = {
                            traceId,
                            transactionId: (trxn === null || trxn === void 0 ? void 0 : trxn.transferId) || "",
                            withdrawnAmount: amount,
                            penalty,
                            netAmount,
                            newPrincipal: plan.principal
                        };
                        yield (0, middleware_1.saveIdempotentResponse)(params.idempotencyKey, params.userId, result);
                        return result;
                    }
                    yield transfer_service_1.TransferService.failTransfer(trxn.reference);
                    return null;
                }));
            }
            finally {
                yield session.endSession();
            }
        });
    }
    static getUserPlans(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, page = 1, limit = 20) {
            const skip = (page - 1) * limit;
            return savings_plan_model_1.SavingsPlan.find({ userId })
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });
        });
    }
    static getAllPlans() {
        return __awaiter(this, arguments, void 0, function* (page = 1, limit = 20) {
            const skip = (page - 1) * limit;
            return savings_plan_model_1.SavingsPlan.find()
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });
        });
    }
    static getAdminSavingsStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            // Fetch all savings plans
            const plans = yield savings_plan_model_1.SavingsPlan.find({}, {
                principal: 1,
                interestRate: 1,
                durationDays: 1,
                maturityDate: 1,
                status: 1,
                createdAt: 1
            });
            let totalPlans = 0;
            let totalPrincipal = 0;
            let totalInterestExpected = 0;
            let realizedProfit = 0;
            let unrealizedProfit = 0;
            let activePlans = 0;
            let maturedPlans = 0;
            let withdrawnPlans = 0;
            for (const plan of plans) {
                totalPlans++;
                totalPrincipal += plan.principal || 0;
                // Calculate expected interest (simple: principal * rate * (duration/365))
                const duration = plan.durationDays || 0;
                const expectedInterest = Math.floor((plan.principal || 0) * (plan.interestRate / 100) * (duration / 365));
                totalInterestExpected += expectedInterest;
                if (plan.status === "ACTIVE") {
                    activePlans++;
                    if (plan.maturityDate && plan.maturityDate <= now) {
                        maturedPlans++;
                    }
                }
                if (plan.status === "COMPLETED") {
                    withdrawnPlans++;
                    // Assume realized profit = expectedInterest
                    realizedProfit += expectedInterest;
                }
                else {
                    unrealizedProfit += expectedInterest;
                }
            }
            return {
                totalPlans,
                totalPrincipal,
                totalInterestExpected,
                realizedProfit,
                unrealizedProfit,
                activePlans,
                maturedPlans,
                withdrawnPlans
            };
        });
    }
    /**
     * Get savings by category for admin
     */
    static getSavingsByCategory(category_1) {
        return __awaiter(this, arguments, void 0, function* (category, page = 1, limit = 20) {
            const now = new Date();
            let filter = {};
            if (category === "active") {
                filter.status = "ACTIVE";
            }
            else if (category === "matured") {
                filter.status = "ACTIVE";
                filter.maturityDate = { $lte: now };
            }
            else if (category === "withdrawn") {
                filter.status = { $in: ["WITHDRAWN", "COMPLETED"] };
            }
            const skip = (page - 1) * limit;
            const [plans, total] = yield Promise.all([
                savings_plan_model_1.SavingsPlan.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
                savings_plan_model_1.SavingsPlan.countDocuments(filter)
            ]);
            // Join with user details
            const userIds = plans.map(p => p.userId);
            const users = yield user_model_1.default.find({ _id: { $in: userIds } }, { email: 1, user_metadata: 1 });
            return {
                plans,
                users,
                total,
                page,
                pages: Math.max(1, Math.ceil(total / limit))
            };
        });
    }
}
exports.SavingsService = SavingsService;
