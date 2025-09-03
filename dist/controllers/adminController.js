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
exports.AdminController = void 0;
const ledger_service_1 = require("../services/ledger.service");
const services_1 = require("../services");
const ledger_model_1 = __importDefault(require("../model/ledger.model"));
const { find: findLoan, update: updateLoan } = new services_1.LoanService();
const { find: findUser } = new services_1.UserService();
const { findByTraceId } = new services_1.TransactionService();
class AdminController {
    static getTransactionDetails(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { traceId } = req.params;
                // Get all ledger entries for this trace
                const ledgerEntries = yield ledger_service_1.LedgerService.getByTraceId(traceId);
                // Get related transactions
                const transactions = yield findByTraceId(traceId);
                res.status(200).json({
                    status: 'success',
                    data: {
                        traceId,
                        ledgerEntries,
                        transactions,
                        summary: {
                            totalDebits: ledgerEntries
                                .filter(e => e.entryType === 'DEBIT')
                                .reduce((sum, e) => sum + e.amount, 0),
                            totalCredits: ledgerEntries
                                .filter(e => e.entryType === 'CREDIT')
                                .reduce((sum, e) => sum + e.amount, 0)
                        }
                    }
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    static getProfitReport(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { from, to, service } = req.query;
                const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                const endDate = to ? new Date(to) : new Date();
                // Realized profits - completed revenue entries
                const realizedProfits = yield ledger_model_1.default.aggregate([
                    {
                        $match: Object.assign({ account: 'platform_revenue', entryType: 'CREDIT', status: 'COMPLETED', createdAt: { $gte: startDate, $lte: endDate } }, (service && { category: service }))
                    },
                    {
                        $group: {
                            _id: '$category',
                            total: { $sum: '$amount' },
                            count: { $sum: 1 }
                        }
                    }
                ]);
                // Unrealized profits - pending entries
                const unrealizedProfits = yield ledger_model_1.default.aggregate([
                    {
                        $match: Object.assign({ account: 'platform_revenue', entryType: 'CREDIT', status: 'PENDING', createdAt: { $gte: startDate, $lte: endDate } }, (service && { category: service }))
                    },
                    {
                        $group: {
                            _id: '$category',
                            total: { $sum: '$amount' },
                            count: { $sum: 1 }
                        }
                    }
                ]);
                res.status(200).json({
                    status: 'success',
                    data: {
                        period: { from: startDate, to: endDate },
                        realized: realizedProfits,
                        unrealized: unrealizedProfits,
                        totalRealized: realizedProfits.reduce((sum, item) => sum + item.total, 0),
                        totalUnrealized: unrealizedProfits.reduce((sum, item) => sum + item.total, 0)
                    }
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    static getReconciliationInconsistencies(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const inconsistencies = yield ledger_service_1.LedgerService.findInconsistencies();
                res.status(200).json({
                    status: 'success',
                    data: {
                        inconsistencies,
                        count: inconsistencies.length,
                        healthy: inconsistencies.length === 0
                    }
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    static manualApproveLoan(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { loanId } = req.params;
                const { amount, duration } = req.body;
                const { admin } = req;
                if (!admin || !admin._id) {
                    return res.status(403).json({
                        status: "Unauthorized",
                        message: "Admin access required"
                    });
                }
                const loan = yield findLoan({ _id: loanId }, 'one');
                if (!loan || Array.isArray(loan)) {
                    return res.status(404).json({
                        status: "Loan not found",
                        data: null
                    });
                }
                const user = yield findUser({ _id: loan.userId }, 'one');
                if (!user || Array.isArray(user)) {
                    return res.status(404).json({
                        status: "User not found",
                        data: null
                    });
                }
                // Calculate loan terms
                const loanAmount = Number(amount || loan.amount);
                const fee = 500;
                const loanPercentage = loan.category === "working" ? 4 : 10;
                const durationDays = Number(duration || loan.duration);
                const percentage = durationDays / 30 >= 1
                    ? ((loanAmount * loanPercentage) / 100) * (durationDays / 30)
                    : (loanAmount * loanPercentage) / 100;
                const totalRepayment = loanAmount + fee + percentage;
                const loanDate = new Date();
                const repaymentDate = new Date(loanDate);
                repaymentDate.setDate(loanDate.getDate() + durationDays);
                yield updateLoan(loan._id, {
                    amount: loanAmount,
                    outstanding: totalRepayment,
                    status: "accepted",
                    loan_date: loanDate.toISOString(),
                    repayment_date: repaymentDate.toISOString(),
                    duration: durationDays
                });
                // Send approval email
                yield sendEmail(user.email, "Loan Application Approved", `Congratulations! Your loan of ₦${loanAmount} has been approved. Repayment of ₦${totalRepayment} is due on ${repaymentDate.toDateString()}.\n\nPrime Finance`);
                res.status(200).json({
                    status: "success",
                    message: "Loan approved successfully",
                    data: {
                        loanId: loan._id,
                        approvedAmount: loanAmount,
                        totalRepayment,
                        repaymentDate: repaymentDate.toISOString()
                    }
                });
            }
            catch (error) {
                console.log("Error in manual loan approval:", error);
                next(error);
            }
        });
    }
}
exports.AdminController = AdminController;
