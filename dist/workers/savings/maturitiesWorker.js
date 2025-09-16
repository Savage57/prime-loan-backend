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
exports.SavingsMaturitiesWorker = void 0;
/**
 * Savings Maturities Worker
 * Processes matured savings plans and applies interest
 */
const queue_1 = require("../../shared/queue");
const savings_plan_model_1 = require("../../modules/savings/savings.plan.model");
const LedgerService_1 = require("../../modules/ledger/LedgerService");
const db_1 = require("../../shared/db");
const uuid_1 = require("../../shared/utils/uuid");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'savings-maturities' });
class SavingsMaturitiesWorker {
    static start() {
        return __awaiter(this, void 0, void 0, function* () {
            yield db_1.DatabaseService.connect();
            // Run hourly
            const worker = queue_1.QueueService.createWorker('savings-maturities', (job) => __awaiter(this, void 0, void 0, function* () {
                yield this.processMaturedPlans();
            }), {
                repeat: { pattern: '0 * * * *' }, // Every hour
                removeOnComplete: 5,
                removeOnFail: 10
            });
            logger.info('Savings maturities worker started');
            process.on('SIGTERM', () => __awaiter(this, void 0, void 0, function* () {
                yield worker.close();
                yield queue_1.QueueService.closeAll();
            }));
        });
    }
    static processMaturedPlans() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const maturedPlans = yield savings_plan_model_1.SavingsPlan.find({
                    status: 'ACTIVE',
                    maturityDate: { $lte: new Date() }
                });
                logger.info(`Processing ${maturedPlans.length} matured savings plans`);
                for (const plan of maturedPlans) {
                    try {
                        yield this.processMaturedPlan(plan);
                    }
                    catch (error) {
                        logger.error({
                            planId: plan._id,
                            error: error.message
                        }, 'Error processing matured plan');
                    }
                }
            }
            catch (error) {
                logger.error({ error: error.message }, 'Error in savings maturities worker');
            }
        });
    }
    static processMaturedPlan(plan) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield db_1.DatabaseService.startSession();
            try {
                yield db_1.DatabaseService.withTransaction(session, () => __awaiter(this, void 0, void 0, function* () {
                    // Calculate interest
                    const daysActive = plan.durationDays || 30;
                    const annualRate = plan.interestRate / 100;
                    const dailyRate = annualRate / 365;
                    const interestAmount = Math.floor(plan.principal * dailyRate * daysActive);
                    const traceId = uuid_1.UuidService.generateTraceId();
                    // Create interest ledger entries
                    yield LedgerService_1.LedgerService.createDoubleEntry(traceId, 'interest_pool', `user_wallet:${plan.userId}`, interestAmount, 'savings', {
                        userId: plan.userId,
                        subtype: 'interest',
                        session,
                        meta: {
                            planId: plan._id,
                            principal: plan.principal,
                            interestRate: plan.interestRate,
                            daysActive
                        }
                    });
                    // Return principal to user
                    yield LedgerService_1.LedgerService.createDoubleEntry(traceId, 'savings_pool', `user_wallet:${plan.userId}`, plan.principal, 'savings', {
                        userId: plan.userId,
                        subtype: 'principal_return',
                        session,
                        meta: {
                            planId: plan._id
                        }
                    });
                    // Update plan status
                    plan.status = 'COMPLETED';
                    plan.completedAt = new Date();
                    plan.interestEarned = interestAmount;
                    yield plan.save({ session });
                    logger.info({
                        planId: plan._id,
                        userId: plan.userId,
                        principal: plan.principal,
                        interestEarned: interestAmount
                    }, 'Savings plan matured and processed');
                }));
            }
            finally {
                yield session.endSession();
            }
        });
    }
}
exports.SavingsMaturitiesWorker = SavingsMaturitiesWorker;
// Start the worker if this file is run directly
if (require.main === module) {
    SavingsMaturitiesWorker.start().catch(console.error);
}
