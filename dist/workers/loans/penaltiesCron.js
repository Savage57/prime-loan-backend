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
exports.LoanPenaltiesCron = void 0;
/**
 * Loan Penalties & Reminder Cron Worker
 * - Applies daily penalties to overdue loans
 * - Sends reminders for loans due today and tomorrow
 */
const queue_1 = require("../../shared/queue");
const loan_model_1 = __importDefault(require("../../modules/loans/loan.model"));
const LedgerService_1 = require("../../modules/ledger/LedgerService");
const db_1 = require("../../shared/db");
const uuid_1 = require("../../shared/utils/uuid");
const notification_service_1 = require("../../modules/notifications/notification.service");
const user_service_1 = require("../../modules/users/user.service");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'loan-penalties-cron' });
class LoanPenaltiesCron {
    static start() {
        return __awaiter(this, void 0, void 0, function* () {
            yield db_1.DatabaseService.connect();
            // Run daily at midnight
            const worker = queue_1.QueueService.createWorker('loan-penalties', () => __awaiter(this, void 0, void 0, function* () {
                yield this.processLoans();
            }), {
                repeat: { pattern: '0 0 * * *' }, // Every midnight
                removeOnComplete: 5,
                removeOnFail: 10
            });
            logger.info('Loan penalties & reminder cron started');
            process.on('SIGTERM', () => __awaiter(this, void 0, void 0, function* () {
                yield worker.close();
                yield queue_1.QueueService.closeAll();
            }));
        });
    }
    static processLoans() {
        return __awaiter(this, void 0, void 0, function* () {
            const penaltyRate = parseFloat(process.env.LOAN_PENALTY_PCT_PER_DAY || '1') / 100;
            const today = new Date();
            const todayISO = today.toISOString().split('T')[0];
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const tomorrowISO = tomorrow.toISOString().split('T')[0];
            try {
                // Pull all active loans with outstanding balances
                const loans = yield loan_model_1.default.find({
                    status: 'accepted',
                    outstanding: { $gt: 0 }
                });
                logger.info(`Processing ${loans.length} loans for penalties & reminders`);
                for (const loan of loans) {
                    try {
                        const repaymentDateISO = new Date(loan.repayment_date).toISOString().split('T')[0];
                        const user = yield user_service_1.UserService.getUser(loan.userId);
                        if (!user || Array.isArray(user))
                            continue;
                        if (repaymentDateISO < todayISO) {
                            // OVERDUE
                            yield this.applyPenaltyToLoan(loan, penaltyRate);
                            yield notification_service_1.NotificationService.sendLoanOverdue(user, loan);
                        }
                        else if (repaymentDateISO === todayISO) {
                            // DUE TODAY
                            yield notification_service_1.NotificationService.sendLoanDueToday(user, loan);
                        }
                        else if (repaymentDateISO === tomorrowISO) {
                            // DUE TOMORROW
                            yield notification_service_1.NotificationService.sendLoanDueTomorrow(user, loan);
                        }
                    }
                    catch (err) {
                        logger.error({ loanId: loan._id, error: err.message }, 'Error processing loan');
                    }
                }
            }
            catch (err) {
                logger.error({ error: err.message }, 'Error in loan penalties cron');
            }
        });
    }
    static applyPenaltyToLoan(loan, penaltyRate) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield db_1.DatabaseService.startSession();
            try {
                yield db_1.DatabaseService.withTransaction(session, () => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    const today = new Date().toISOString().split('T')[0];
                    const lastPenaltyDate = (_a = loan.lastInterestAdded) === null || _a === void 0 ? void 0 : _a.split('T')[0];
                    // Avoid duplicate penalty within the same day
                    if (lastPenaltyDate === today)
                        return;
                    const penaltyAmount = Math.floor(loan.amount * penaltyRate * 100); // in kobo
                    const traceId = uuid_1.UuidService.generateTraceId();
                    // Ledger entry for penalty
                    yield LedgerService_1.LedgerService.createDoubleEntry(traceId, `user_wallet:${loan.userId}`, 'platform_revenue', penaltyAmount, 'loan', {
                        userId: loan.userId,
                        subtype: 'penalty',
                        session,
                        meta: {
                            loanId: loan._id,
                            penaltyRate,
                            originalAmount: loan.amount
                        }
                    });
                    // Update loan
                    loan.outstanding = Number(loan.outstanding) + penaltyAmount;
                    loan.lastInterestAdded = new Date().toISOString();
                    loan.repayment_history = [
                        ...(loan.repayment_history || []),
                        {
                            amount: penaltyAmount,
                            outstanding: loan.outstanding,
                            action: 'penalty',
                            date: new Date().toISOString()
                        }
                    ];
                    yield loan.save({ session });
                    logger.info({
                        loanId: loan._id,
                        userId: loan.userId,
                        penaltyAmount,
                        newOutstanding: loan.outstanding
                    }, 'Penalty applied to overdue loan');
                }));
            }
            finally {
                yield session.endSession();
            }
        });
    }
}
exports.LoanPenaltiesCron = LoanPenaltiesCron;
// Run if executed directly
if (require.main === module) {
    LoanPenaltiesCron.start().catch(console.error);
}
