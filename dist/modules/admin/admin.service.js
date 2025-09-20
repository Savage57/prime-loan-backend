"use strict";
/**
 * admin.service.merged.ts
 * Merged & optimized AdminService (TypeScript)
 * - Consolidates features from the provided AdminService and EnhancedAdminService
 * - Uses defensive checks, lean() where possible, clear errors and small performance improvements
 * - TODOs left intentionally: Redis + worker health checks, transactional guarantees depending on LoanService internals
 */
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
exports.AdminService = void 0;
const passwordUtils_1 = require("../../shared/utils/passwordUtils");
const vfd_provider_1 = require("../../shared/providers/vfd.provider");
const notification_service_1 = require("../notifications/notification.service");
const exceptions_1 = require("../../exceptions");
const user_model_1 = __importDefault(require("../users/user.model"));
const loan_model_1 = __importDefault(require("../loans/loan.model"));
const transfer_model_1 = require("../transfers/transfer.model");
const bill_payment_model_1 = require("../bill-payments/bill-payment.model");
const savings_plan_model_1 = require("../savings/savings.plan.model");
const LedgerEntry_model_1 = require("../ledger/LedgerEntry.model");
const convertDate_1 = require("../../shared/utils/convertDate");
const loan_service_1 = require("../loans/loan.service");
class AdminService {
    constructor(vfdProvider, notificationService) {
        this.vfdProvider = vfdProvider !== null && vfdProvider !== void 0 ? vfdProvider : new vfd_provider_1.VfdProvider();
        this.notificationService = notificationService !== null && notificationService !== void 0 ? notificationService : new notification_service_1.NotificationService();
    }
    /**
     * Create admin account with role-based permissions and defensive duplicate checks
     */
    createAdminAccount(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, name, surname, password, phone, is_super_admin = false, permissions = [] } = req;
            // Defensive duplicate checks using indexed fields where possible
            const [duplicateEmail, duplicatePhone] = yield Promise.all([
                user_model_1.default.findOne({ email }).lean(),
                user_model_1.default.findOne({ 'user_metadata.phone': phone }).lean()
            ]);
            if (duplicateEmail) {
                throw new exceptions_1.ConflictError(`A user already exists with the email ${email}`);
            }
            if (duplicatePhone) {
                throw new exceptions_1.ConflictError(`A user already exists with the phone number ${phone}`);
            }
            const encryptedPassword = (0, passwordUtils_1.encryptPassword)(password);
            const defaultPermissions = [
                'view_users',
                'view_loans',
                'view_transactions',
                'view_reports'
            ];
            const user = yield user_model_1.default.create({
                password: encryptedPassword,
                user_metadata: {
                    email,
                    first_name: name,
                    surname,
                    phone
                },
                role: 'admin',
                confirmation_sent_at: (0, convertDate_1.getCurrentTimestamp)(),
                confirmed_at: (0, convertDate_1.getCurrentTimestamp)(),
                email,
                email_confirmed_at: (0, convertDate_1.getCurrentTimestamp)(),
                is_anonymous: false,
                phone,
                is_super_admin,
                permissions: is_super_admin ? [] : (permissions.length > 0 ? permissions : defaultPermissions),
                status: 'active'
            });
            return user;
        });
    }
    /**
     * Fetch a single admin (with status check)
     */
    getAdmin(adminId) {
        return __awaiter(this, void 0, void 0, function* () {
            const admin = yield user_model_1.default.findById(adminId);
            if (!admin)
                throw new exceptions_1.NotFoundError('No admin found');
            if (admin.status !== 'active')
                throw new exceptions_1.UnauthorizedError('Account has been suspended! Contact super admin for revert action.');
            return admin;
        });
    }
    /**
     * Activate / Deactivate admin account
     */
    activateAndDeactivateAdmin(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const { status, adminId } = req;
            const updated = yield user_model_1.default.findByIdAndUpdate(adminId, { status }, { new: true });
            if (!updated)
                throw new exceptions_1.NotFoundError('Admin not found');
            return updated;
        });
    }
    /**
     * Activate / Deactivate user account
     */
    activateAndDeactivateUser(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const { status, userId } = req;
            const updated = yield user_model_1.default.findByIdAndUpdate(userId, { status }, { new: true });
            if (!updated)
                throw new exceptions_1.NotFoundError('User not found');
            return updated;
        });
    }
    /**
     * Comprehensive admin dashboard statistics
     */
    getDashboardStats() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const [totalUsers, activeUsers, newUsersThisMonth] = yield Promise.all([
                user_model_1.default.countDocuments({ role: 'user' }),
                user_model_1.default.countDocuments({ role: 'user', status: 'active' }),
                user_model_1.default.countDocuments({ role: 'user', createdAt: { $gte: startOfMonth } })
            ]);
            const [totalLoans, pendingLoans, activeLoans, overdueLoans] = yield Promise.all([
                loan_model_1.default.countDocuments(),
                loan_model_1.default.countDocuments({ status: 'pending' }),
                loan_model_1.default.countDocuments({ loan_payment_status: 'in-progress' }),
                loan_model_1.default.countDocuments({ loan_payment_status: 'in-progress', repayment_date: { $lt: now } })
            ]);
            const loanAggregation = yield loan_model_1.default.aggregate([
                {
                    $group: {
                        _id: null,
                        totalDisbursed: {
                            $sum: {
                                $cond: [{ $in: ['$status', ['accepted']] }, '$amount', 0]
                            }
                        },
                        totalOutstanding: { $sum: '$outstanding' }
                    }
                }
            ]);
            const [totalTransfers, pendingTransfers, completedTransfers, failedTransfers] = yield Promise.all([
                transfer_model_1.Transfer.countDocuments(),
                transfer_model_1.Transfer.countDocuments({ status: 'PENDING' }),
                transfer_model_1.Transfer.countDocuments({ status: 'COMPLETED' }),
                transfer_model_1.Transfer.countDocuments({ status: 'FAILED' })
            ]);
            const transferVolumeAgg = yield transfer_model_1.Transfer.aggregate([
                { $match: { status: 'COMPLETED' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const [totalBillPayments, pendingBillPayments, completedBillPayments, failedBillPayments] = yield Promise.all([
                bill_payment_model_1.BillPayment.countDocuments(),
                bill_payment_model_1.BillPayment.countDocuments({ status: 'PENDING' }),
                bill_payment_model_1.BillPayment.countDocuments({ status: 'COMPLETED' }),
                bill_payment_model_1.BillPayment.countDocuments({ status: 'FAILED' })
            ]);
            const billPaymentVolumeAgg = yield bill_payment_model_1.BillPayment.aggregate([
                { $match: { status: 'COMPLETED' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const [totalSavingsPlans, activeSavingsPlans] = yield Promise.all([
                savings_plan_model_1.SavingsPlan.countDocuments(),
                savings_plan_model_1.SavingsPlan.countDocuments({ status: 'ACTIVE' })
            ]);
            const savingsAggregation = yield savings_plan_model_1.SavingsPlan.aggregate([
                {
                    $group: {
                        _id: null,
                        totalPrincipal: { $sum: '$principal' },
                        totalInterestEarned: { $sum: '$interestEarned' }
                    }
                }
            ]);
            const revenueAggregation = yield LedgerEntry_model_1.LedgerEntry.aggregate([
                {
                    $match: {
                        account: 'platform_revenue',
                        entryType: 'CREDIT',
                        status: 'COMPLETED'
                    }
                },
                { $group: { _id: '$category', total: { $sum: '$amount' } } }
            ]);
            const revenueMap = (revenueAggregation || []).reduce((acc, item) => {
                acc[item._id] = item.total;
                return acc;
            }, {});
            const safe = (v) => (typeof v === 'number' ? v : Number(v) || 0);
            return {
                users: {
                    total: totalUsers,
                    active: activeUsers,
                    inactive: totalUsers - activeUsers,
                    newThisMonth: newUsersThisMonth
                },
                loans: {
                    total: totalLoans,
                    pending: pendingLoans,
                    active: activeLoans,
                    overdue: overdueLoans,
                    totalDisbursed: ((_a = loanAggregation[0]) === null || _a === void 0 ? void 0 : _a.totalDisbursed) || 0,
                    totalOutstanding: ((_b = loanAggregation[0]) === null || _b === void 0 ? void 0 : _b.totalOutstanding) || 0
                },
                transfers: {
                    total: totalTransfers,
                    pending: pendingTransfers,
                    completed: completedTransfers,
                    failed: failedTransfers,
                    totalVolume: ((_c = transferVolumeAgg[0]) === null || _c === void 0 ? void 0 : _c.total) || 0
                },
                billPayments: {
                    total: totalBillPayments,
                    pending: pendingBillPayments,
                    completed: completedBillPayments,
                    failed: failedBillPayments,
                    totalVolume: ((_d = billPaymentVolumeAgg[0]) === null || _d === void 0 ? void 0 : _d.total) || 0
                },
                savings: {
                    totalPlans: totalSavingsPlans,
                    activePlans: activeSavingsPlans,
                    totalPrincipal: ((_e = savingsAggregation[0]) === null || _e === void 0 ? void 0 : _e.totalPrincipal) || 0,
                    totalInterestEarned: ((_f = savingsAggregation[0]) === null || _f === void 0 ? void 0 : _f.totalInterestEarned) || 0
                },
                revenue: {
                    totalRevenue: Object.values(revenueMap).reduce((sum, val) => sum + safe(val), 0),
                    loanInterest: revenueMap.loan || 0,
                    billPaymentFees: revenueMap['bill-payment'] || 0,
                    transferFees: revenueMap.transfer || 0,
                    savingsPenalties: revenueMap.savings || 0
                }
            };
        });
    }
    /**
     * Simple system health checks (DB + VFD). Expand Redis/workers/Club Connect as needed.
     */
    getSystemHealth() {
        return __awaiter(this, void 0, void 0, function* () {
            const health = {
                database: 'healthy',
                redis: 'healthy',
                providers: {
                    vfd: 'healthy',
                    clubConnect: 'healthy'
                },
                workers: {
                    billPaymentsPoller: 'running',
                    transfersPoller: 'running',
                    loanPenalties: 'running',
                    savingsMaturities: 'running'
                }
            };
            try {
                yield user_model_1.default.exists({});
            }
            catch (error) {
                health.database = 'down';
            }
            try {
                yield this.vfdProvider.getPrimeAccountInfo();
            }
            catch (error) {
                health.providers.vfd = 'down';
            }
            // TODO: Add Redis health-check (ping) and worker status introspection
            return health;
        });
    }
    getTransactions() {
        return __awaiter(this, arguments, void 0, function* (page = 1, limit = 20, status, type, search) {
            const skip = (page - 1) * limit;
            const query = {};
            if (status)
                query.status = status;
            if (status)
                query.transferType = type;
            if (search) {
                const regex = new RegExp(search, "i"); // case-insensitive search
                query.$or = [
                    { "traceId": regex },
                    { "reference": regex },
                    { "toAccount": regex },
                    { "fromAccount": regex }
                ];
            }
            const transfers = yield transfer_model_1.Transfer.find(query)
                .populate('userId', 'email user_metadata.first_name user_metadata.surname')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .lean();
            const total = yield transfer_model_1.Transfer.countDocuments(query);
            return {
                transfers,
                page,
                pages: Math.ceil(total / limit),
                total
            };
        });
    }
    /**
     * Return flagged transfers and loans for manual review
     */
    getFlaggedTransactions() {
        return __awaiter(this, arguments, void 0, function* (page = 1, limit = 20) {
            const skip = (page - 1) * limit;
            const flaggedTransfers = yield transfer_model_1.Transfer.find({
                $or: [
                    { status: 'PENDING', createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
                    { amount: { $gt: 1000000 } },
                    { 'meta.flagged': true }
                ]
            })
                .populate('userId', 'email user_metadata.first_name user_metadata.surname')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .lean();
            const flaggedBillPayments = yield bill_payment_model_1.BillPayment.find({
                $or: [
                    { status: 'PENDING', createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
                    { amount: { $gt: 50000 } },
                    { 'meta.flagged': true }
                ]
            })
                .populate('userId', 'email user_metadata.first_name user_metadata.surname')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .lean();
            const flaggedLoans = yield loan_model_1.default.find({
                $or: [
                    { amount: { $gt: 200000 } },
                    { 'credit_score.remarks': /suspicious/i },
                    { status: 'pending', createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
                ]
            })
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .lean();
            const total = ((flaggedTransfers === null || flaggedTransfers === void 0 ? void 0 : flaggedTransfers.length) || 0) + ((flaggedLoans === null || flaggedLoans === void 0 ? void 0 : flaggedLoans.length) || 0) + ((flaggedBillPayments === null || flaggedBillPayments === void 0 ? void 0 : flaggedBillPayments.length) || 0);
            return {
                transfers: flaggedTransfers,
                loans: flaggedLoans,
                billPayments: flaggedBillPayments,
                page,
                pages: Math.ceil(total / limit),
                total
            };
        });
    }
    /**
     * Bulk approve or reject loans. Uses LoanService — keeps operations sequential to avoid race conditions with downstream providers.
     */
    bulkLoanAction(loanIds, action, adminId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = [];
            for (const loanId of loanIds) {
                try {
                    const foundLoan = yield loan_model_1.default.findById(loanId).lean();
                    if (!foundLoan) {
                        results.push({ loanId, status: 'error', message: 'Loan not found' });
                        continue;
                    }
                    if (action === 'approve') {
                        // Disburse via LoanService (implementation dependent)
                        const loan = yield loan_service_1.LoanService.disburseLoan({ adminId, loanId });
                        results.push({ loanId, status: 'success', message: 'Loan approved and disbursed', loan });
                    }
                    else {
                        const loan = yield loan_service_1.LoanService.rejectLoan(adminId, loanId, reason || 'Rejected by admin');
                        results.push({ loanId, status: 'success', message: 'Loan rejected', loan });
                    }
                }
                catch (error) {
                    results.push({ loanId, status: 'failed', message: (error === null || error === void 0 ? void 0 : error.message) || String(error) });
                }
            }
            return results;
        });
    }
    /**
     * Generate a business report for a period
     */
    generateBusinessReport(startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };
            const newUsers = yield user_model_1.default.countDocuments(Object.assign({ role: 'user' }, dateFilter));
            const loanMetrics = yield loan_model_1.default.aggregate([
                { $match: dateFilter },
                {
                    $group: {
                        _id: null,
                        totalApplications: { $sum: 1 },
                        approvedLoans: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
                        rejectedLoans: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                        totalDisbursed: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, '$amount', 0] } },
                        totalRepaid: { $sum: { $subtract: ['$amount', '$outstanding'] } }
                    }
                }
            ]);
            const revenueBreakdown = yield LedgerEntry_model_1.LedgerEntry.aggregate([
                {
                    $match: Object.assign({ account: 'platform_revenue', entryType: 'CREDIT', status: 'COMPLETED' }, dateFilter)
                },
                { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]);
            const [transferVolumes, billPaymentVolumes] = yield Promise.all([
                transfer_model_1.Transfer.aggregate([{ $match: Object.assign({ status: 'COMPLETED' }, dateFilter) }, { $group: { _id: null, volume: { $sum: '$amount' }, count: { $sum: 1 } } }]),
                bill_payment_model_1.BillPayment.aggregate([{ $match: Object.assign({ status: 'COMPLETED' }, dateFilter) }, { $group: { _id: null, volume: { $sum: '$amount' }, count: { $sum: 1 } } }])
            ]);
            return {
                period: { startDate, endDate },
                userAcquisition: { newUsers },
                loanPerformance: loanMetrics[0] || {},
                revenue: {
                    breakdown: revenueBreakdown,
                    total: (revenueBreakdown || []).reduce((sum, item) => sum + (item.total || 0), 0)
                },
                transactionVolumes: {
                    transfers: transferVolumes[0] || { volume: 0, count: 0 },
                    billPayments: billPaymentVolumes[0] || { volume: 0, count: 0 }
                }
            };
        });
    }
    /**
     * Update admin permissions (super-admins are protected)
     */
    updateAdminPermissions(adminId, permissions) {
        return __awaiter(this, void 0, void 0, function* () {
            const admin = yield user_model_1.default.findById(adminId);
            if (!admin || admin.role !== 'admin') {
                throw new exceptions_1.NotFoundError('Admin not found');
            }
            if (admin.is_super_admin) {
                throw new exceptions_1.BadRequestError('Cannot modify super admin permissions');
            }
            admin.permissions = permissions;
            yield admin.save();
            return admin;
        });
    }
    /**
     * Placeholder for admin activity logs - implement audit collection elsewhere and query here
     */
    getAdminActivityLogs(adminId_1) {
        return __awaiter(this, arguments, void 0, function* (adminId, page = 1, limit = 50) {
            const admin = yield user_model_1.default.findById(adminId);
            if (!admin || admin.role !== 'admin') {
                throw new exceptions_1.NotFoundError('Admin not found');
            }
            return {
                logs: [],
                total: 0,
                page,
                pages: 0
            };
        });
    }
    listAllUsers(adminId_1) {
        return __awaiter(this, arguments, void 0, function* (adminId, page = 1, limit = 50, status, search) {
            const admin = yield user_model_1.default.findById(adminId);
            if (!admin || admin.role !== "admin") {
                throw new exceptions_1.NotFoundError("Admin not found");
            }
            const query = { role: "user" };
            if (status)
                query.status = status;
            if (search) {
                const regex = new RegExp(search, "i"); // case-insensitive search
                query.$or = [
                    { "user_metadata.first_name": regex },
                    { "user_metadata.surname": regex },
                    { email: regex },
                    {
                        $expr: {
                            $regexMatch: {
                                input: { $concat: ["$user_metadata.first_name", " ", "$user_metadata.surname"] },
                                regex: search,
                                options: "i",
                            },
                        },
                    },
                ];
            }
            const users = yield user_model_1.default.find(query)
                .skip((page - 1) * limit)
                .limit(limit);
            const total = yield user_model_1.default.countDocuments(query);
            return { users, total, page, pages: Math.ceil(total / limit) };
        });
    }
}
exports.AdminService = AdminService;
