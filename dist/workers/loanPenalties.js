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
exports.applyDailyPenalties = applyDailyPenalties;
/**
 * Loan Penalties Worker - Applies daily penalties to overdue loans
 * Runs as a separate process to handle penalty calculations
 */
const services_1 = require("../services");
const ledger_service_1 = require("../services/ledger.service");
const uuid_1 = require("../utils/uuid");
const money_1 = require("../utils/money");
const config_1 = require("../config");
const utils_1 = require("../utils");
const mongoose_1 = __importDefault(require("mongoose"));
const node_cron_1 = __importDefault(require("node-cron"));
const { getOverdueLoans, update: updateLoan, addRepaymentHistory } = new services_1.LoanService();
function applyDailyPenalties() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const overdueLoans = yield getOverdueLoans();
            console.log(`Processing penalties for ${overdueLoans.length} overdue loans`);
            for (const loan of overdueLoans) {
                try {
                    yield applyPenaltyToLoan(loan);
                }
                catch (error) {
                    console.error(`Error applying penalty to loan ${loan._id}:`, error);
                }
            }
        }
        catch (error) {
            console.error('Error in loan penalties worker:', error);
        }
    });
}
function applyPenaltyToLoan(loan) {
    return __awaiter(this, void 0, void 0, function* () {
        const session = yield mongoose_1.default.startSession();
        try {
            yield session.withTransaction(() => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const today = new Date().toISOString().split('T')[0];
                const lastPenaltyDate = (_a = loan.lastInterestAdded) === null || _a === void 0 ? void 0 : _a.split('T')[0];
                // Skip if penalty already applied today
                if (lastPenaltyDate === today) {
                    return;
                }
                const penaltyRate = config_1.LOAN_PENALTY_PCT_PER_DAY / 100;
                const penaltyAmount = Math.floor(loan.amount * penaltyRate);
                const traceId = uuid_1.UuidService.generateTraceId();
                // Create penalty ledger entries if feature enabled
                if (config_1.FEATURE_LEDGER) {
                    yield ledger_service_1.LedgerService.createDoubleEntry(traceId, `user_wallet:${loan.userId}`, 'platform_revenue', money_1.Money.toKobo(penaltyAmount), 'loan', {
                        userId: loan.userId,
                        subtype: 'penalty',
                        session,
                        meta: {
                            loanId: loan._id,
                            penaltyRate,
                            originalAmount: loan.amount
                        }
                    });
                }
                // Update loan with penalty
                const newOutstanding = Number(loan.outstanding) + penaltyAmount;
                const penaltyEntry = {
                    amount: penaltyAmount,
                    outstanding: newOutstanding,
                    action: 'penalty',
                    date: new Date().toISOString()
                };
                yield updateLoan(loan._id, {
                    outstanding: newOutstanding,
                    lastInterestAdded: new Date().toISOString(),
                    traceId
                });
                yield addRepaymentHistory(loan._id, penaltyEntry);
                console.log(`Penalty applied to loan ${loan._id}: ₦${penaltyAmount}`);
            }));
        }
        finally {
            yield session.endSession();
        }
    });
}
// Start the worker if this file is run directly
if (require.main === module) {
    (0, utils_1.connectToDB)();
    // Run daily at midnight
    node_cron_1.default.schedule('0 0 * * *', () => __awaiter(void 0, void 0, void 0, function* () {
        console.log('Running daily loan penalties...');
        yield applyDailyPenalties();
    }));
    console.log('Loan penalties worker started');
}
