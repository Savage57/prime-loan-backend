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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const LedgerService_1 = require("../ledger/LedgerService");
const LedgerEntry_model_1 = require("../ledger/LedgerEntry.model");
const admin_service_1 = require("./admin.service"); // adjust path if needed
const savings_service_1 = require("../savings/savings.service"); // adjust path if needed
const checkPermission_1 = require("../../shared/utils/checkPermission");
const transfer_model_1 = require("../transfers/transfer.model");
const bill_payment_model_1 = require("../bill-payments/bill-payment.model");
const transfer_service_1 = require("../transfers/transfer.service");
const user_service_1 = require("../users/user.service");
const exceptions_1 = require("../../exceptions");
const settings_service_1 = require("./settings.service");
const adminService = new admin_service_1.AdminService();
function parsePageLimit(q) {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 20));
    return { page, limit };
}
class AdminController {
    /**
     * Create a new admin account
     */
    static createAdminAccount(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const actingAdmin = req.admin;
                if (!(actingAdmin === null || actingAdmin === void 0 ? void 0 : actingAdmin.is_super_admin)) {
                    throw new exceptions_1.UnauthorizedError('Only super admins can create admin accounts');
                }
                const admin = yield adminService.createAdminAccount(req.body);
                res.status(201).json({
                    status: 'success',
                    data: admin
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Fetch a single admin by ID
     */
    static getAdmin(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const actingAdmin = req.admin;
                (0, checkPermission_1.checkPermission)(actingAdmin, 'view_users');
                const { adminId } = req.params;
                if (!adminId)
                    return res.status(400).json({ status: 'failed', message: 'adminId is required' });
                const admin = yield adminService.getAdmin(adminId);
                res.status(200).json({
                    status: 'success',
                    data: admin
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Activate / Deactivate an admin account
     */
    static activateAndDeactivateAdmin(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const actingAdmin = req.admin;
                if (!(actingAdmin === null || actingAdmin === void 0 ? void 0 : actingAdmin.is_super_admin)) {
                    throw new exceptions_1.UnauthorizedError('Only super admins can activate or deactivate admins');
                }
                const { status, adminId } = req.body;
                if (!adminId || !status) {
                    return res.status(400).json({ status: 'failed', message: 'adminId and status are required' });
                }
                const updated = yield adminService.activateAndDeactivateAdmin({ status, adminId });
                res.status(200).json({
                    status: 'success',
                    data: updated
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Activate / Deactivate a user account
     */
    static activateAndDeactivateUser(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const actingAdmin = req.admin;
                (0, checkPermission_1.checkPermission)(actingAdmin, 'manage_users');
                const { status, userId } = req.body;
                if (!userId || !status) {
                    return res.status(400).json({ status: 'failed', message: 'userId and status are required' });
                }
                const updated = yield adminService.activateAndDeactivateUser({ status, userId });
                res.status(200).json({
                    status: 'success',
                    data: updated
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Get ledger & related entities by traceId (reconciliation helper)
     */
    static getTransactionDetails(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const admin = req.admin;
                (0, checkPermission_1.checkPermission)(admin, "view_transactions");
                const { traceId } = req.params;
                if (!traceId)
                    return res.status(400).json({ status: 'failed', message: 'traceId is required' });
                // Ledger entries for trace
                const ledgerEntries = yield LedgerService_1.LedgerService.getByTraceId(traceId);
                // Try to find related transfers / bill payments by traceId (best-effort)
                const transfers = yield transfer_model_1.Transfer.find({ traceId }).lean();
                const billPayments = yield bill_payment_model_1.BillPayment.find({ traceId }).lean();
                res.status(200).json({
                    status: 'success',
                    data: {
                        traceId,
                        ledgerEntries,
                        transfers,
                        billPayments
                    }
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Re-query a transfer from provider and reconcile (best-effort)
     */
    static requeryTransfer(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const admin = req.admin;
                (0, checkPermission_1.checkPermission)(admin, 'manage_transactions');
                const { id } = req.params;
                if (!id)
                    return res.status(400).json({ status: 'failed', message: 'transfer id is required' });
                const transfer = yield transfer_service_1.TransferService.transfer(id);
                if (!transfer)
                    return res.status(404).json({ status: 'failed', message: 'transfer not found' });
                const user = yield user_service_1.UserService.findByAccountNo(transfer.fromAccount);
                yield transfer_service_1.TransferService.walletAlerts({
                    account_number: transfer.toAccount,
                    amount: transfer.amount,
                    originator_account_name: `${(_a = user === null || user === void 0 ? void 0 : user.user_metadata) === null || _a === void 0 ? void 0 : _a.first_name} ${(_b = user === null || user === void 0 ? void 0 : user.user_metadata) === null || _b === void 0 ? void 0 : _b.surname}`,
                    originator_account_number: transfer.fromAccount,
                    originator_bank: "VFD - Prime Finance",
                    originator_narration: transfer.naration || 'Transfer',
                    reference: transfer.reference,
                    session_id: transfer.traceId
                });
                res.status(200).json({
                    status: 'success',
                    message: 'Transfer requery not implemented on this server. Returning transfer state.',
                    data: transfer
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Admin dashboard: aggregated platform statistics
     */
    static getDashboardStats(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const admin = req.admin;
                (0, checkPermission_1.checkPermission)(admin, 'view_reports');
                const stats = yield adminService.getDashboardStats();
                res.status(200).json({
                    status: 'success',
                    data: stats
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * System health check (DB, providers, workers hints)
     */
    static getSystemHealth(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const admin = req.admin;
                (0, checkPermission_1.checkPermission)(admin, "view_reports");
                const health = yield adminService.getSystemHealth();
                res.status(200).json({
                    status: 'success',
                    data: health
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * List flagged transactions (transfers + loans) requiring manual review
     */
    static getFlaggedTransactions(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const admin = req.admin;
                (0, checkPermission_1.checkPermission)(admin, 'manage_transactions');
                const { page, limit } = parsePageLimit(req.query);
                const result = yield adminService.getFlaggedTransactions(page, limit);
                res.status(200).json({
                    status: 'success',
                    data: result
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Bulk approve/reject loans
     */
    static bulkLoanAction(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const admin = req.admin;
                (0, checkPermission_1.checkPermission)(admin, 'manage_loans');
                const { loanIds, action, reason } = req.body;
                if (!Array.isArray(loanIds) || loanIds.length === 0)
                    return res.status(400).json({ status: 'failed', message: 'loanIds (array) is required' });
                if (!['approve', 'reject'].includes(action))
                    return res.status(400).json({ status: 'failed', message: 'action must be approve or reject' });
                const results = yield adminService.bulkLoanAction(loanIds, action, String(admin._id), reason);
                res.status(200).json({
                    status: 'success',
                    data: results
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Generate business / profit report
     */
    static generateBusinessReport(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const admin = req.admin;
                (0, checkPermission_1.checkPermission)(admin, 'view_reports');
                const { from, to } = req.query;
                const startDate = from ? new Date(String(from)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                const endDate = to ? new Date(String(to)) : new Date();
                const report = yield adminService.generateBusinessReport(startDate, endDate);
                res.status(200).json({
                    status: 'success',
                    data: report
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Profit report (ledger-driven)
     */
    static getProfitReport(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const admin = req.admin;
                (0, checkPermission_1.checkPermission)(admin, 'view_reports');
                const { from, to, service } = req.query;
                const startDate = from ? new Date(String(from)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                const endDate = to ? new Date(String(to)) : new Date();
                const realizedProfits = yield LedgerEntry_model_1.LedgerEntry.aggregate([
                    {
                        $match: Object.assign({ account: 'platform_revenue', entryType: 'CREDIT', status: 'COMPLETED', createdAt: { $gte: startDate, $lte: endDate } }, (service ? { category: service } : {}))
                    },
                    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
                ]);
                const unrealizedProfits = yield LedgerEntry_model_1.LedgerEntry.aggregate([
                    {
                        $match: Object.assign({ account: 'platform_revenue', entryType: 'CREDIT', status: 'PENDING', createdAt: { $gte: startDate, $lte: endDate } }, (service ? { category: service } : {}))
                    },
                    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
                ]);
                res.status(200).json({
                    status: 'success',
                    data: {
                        period: { from: startDate, to: endDate },
                        realized: realizedProfits,
                        unrealized: unrealizedProfits,
                        totalRealized: realizedProfits.reduce((sum, item) => sum + (item.total || 0), 0),
                        totalUnrealized: unrealizedProfits.reduce((sum, item) => sum + (item.total || 0), 0)
                    }
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Reconciliation: unbalanced traceIds
     */
    static getReconciliationInconsistencies(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const admin = req.admin;
                (0, checkPermission_1.checkPermission)(admin, "manage_transactions");
                const inconsistencies = yield LedgerService_1.LedgerService.findInconsistencies();
                res.status(200).json({
                    status: 'success',
                    data: {
                        inconsistencies,
                        count: inconsistencies.length
                    }
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Update admin permissions
     */
    static updateAdminPermissions(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const actingAdmin = req.admin;
                if (!(actingAdmin === null || actingAdmin === void 0 ? void 0 : actingAdmin.is_super_admin)) {
                    throw new exceptions_1.UnauthorizedError('Only super admins can update admin permissions');
                }
                const { adminId } = req.params;
                const { permissions } = req.body;
                if (!adminId)
                    return res.status(400).json({ status: 'failed', message: 'adminId is required' });
                if (!Array.isArray(permissions))
                    return res.status(400).json({ status: 'failed', message: 'permissions must be an array' });
                const updated = yield adminService.updateAdminPermissions(adminId, permissions);
                res.status(200).json({
                    status: 'success',
                    data: updated
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Admin activity logs
     */
    static getAdminActivityLogs(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const admin = req.admin;
                (0, checkPermission_1.checkPermission)(admin, 'view_reports');
                const { page, limit } = parsePageLimit(req.query);
                const adminId = String(req.query.adminId || '');
                const logs = yield adminService.getAdminActivityLogs(adminId || undefined, page, limit);
                res.status(200).json({
                    status: 'success',
                    data: logs
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Admin: savings portfolio statistics
     */
    static getSavingsStats(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const admin = req.admin;
                (0, checkPermission_1.checkPermission)(admin, 'view_savings');
                const stats = yield savings_service_1.SavingsService.getAdminSavingsStats();
                res.status(200).json({
                    status: 'success',
                    data: stats
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Admin: list savings by category
     */
    static getSavingsByCategory(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const admin = req.admin;
                (0, checkPermission_1.checkPermission)(admin, 'view_savings');
                const category = String(req.query.category || 'active');
                const { page, limit } = parsePageLimit(req.query);
                const result = yield savings_service_1.SavingsService.getSavingsByCategory(category, page, limit);
                res.status(200).json({
                    status: 'success',
                    data: result
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    static getUsers(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const admin = req.admin;
            (0, checkPermission_1.checkPermission)(admin, 'view_users');
            const { filter } = req.query;
            const { page, limit } = parsePageLimit(req.query);
            const result = yield adminService.listAllUsers((admin === null || admin === void 0 ? void 0 : admin._id) || "", page, limit, filter);
            res.status(200).json({
                status: 'success',
                data: result
            });
        });
    }
    static getSettings(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const admin = req.admin;
                (0, checkPermission_1.checkPermission)(admin, "manage_settings");
                const settings = yield settings_service_1.SettingsService.getSettings();
                res.status(200).json({
                    status: 'success',
                    data: settings
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    static updateSettings(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const admin = req.admin;
                (0, checkPermission_1.checkPermission)(admin, "manage_settings");
                const settings = yield settings_service_1.SettingsService.updateSettings((admin === null || admin === void 0 ? void 0 : admin._id) || "", req.body);
                res.status(200).json({
                    status: 'success',
                    data: settings
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Login
     */
    static login(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, password } = req.body;
                const admin = yield user_service_1.UserService.findByEmail(email);
                if (!admin || admin.role !== "admin") {
                    throw new exceptions_1.UnauthorizedError("Access denied");
                }
                const result = yield user_service_1.UserService.login(email, password);
                res.status(200).json({
                    status: "success",
                    data: result,
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Get user profile
     */
    static profile(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { admin } = req;
                if (!admin || admin.role !== "admin") {
                    throw new exceptions_1.UnauthorizedError("Access denied");
                }
                const user = yield user_service_1.UserService.getUser(admin._id);
                res.status(200).json({
                    status: "success",
                    data: admin,
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Update user fields
     */
    static update(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { admin } = req;
                const { field, value } = req.body;
                if (!admin || admin.role !== "admin") {
                    throw new exceptions_1.UnauthorizedError("Access denied");
                }
                const updatedUser = yield user_service_1.UserService.update(admin._id, field, value);
                res.status(200).json({
                    status: "success",
                    data: updatedUser,
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Initiate password or pin reset (sends OTP)
     */
    static initiateReset(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, type } = req.body;
                const userService = new user_service_1.UserService();
                const admin = yield user_service_1.UserService.findByEmail(email);
                if (!admin || admin.role !== "admin") {
                    throw new exceptions_1.UnauthorizedError("Access denied");
                }
                const result = yield userService.initiateReset(email, type);
                res.status(200).json({
                    status: "success",
                    data: result,
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
       * Update password or pin after validation
    */
    static updatePasswordOrPin(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, newPassword, newPin } = req.body;
                const admin = yield user_service_1.UserService.findByEmail(email);
                if (!admin || admin.role !== "admin") {
                    throw new exceptions_1.UnauthorizedError("Access denied");
                }
                const userService = new user_service_1.UserService();
                const result = yield userService.updatePasswordOrPin(email, newPassword, newPin);
                res.status(200).json({
                    status: "success",
                    data: result,
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Validate reset OTP
     */
    static validateReset(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, pin } = req.body;
                const userService = new user_service_1.UserService();
                const admin = yield user_service_1.UserService.findByEmail(email);
                if (!admin || admin.role !== "admin") {
                    throw new exceptions_1.UnauthorizedError("Access denied");
                }
                const result = yield userService.validateReset(email, pin);
                res.status(200).json({
                    status: "success",
                    data: result,
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Change password for logged-in user
     */
    static changePassword(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { admin } = req;
                if (!admin) {
                    throw new exceptions_1.UnauthorizedError("Access denied");
                }
                const { oldPassword, newPassword } = req.body;
                const userService = new user_service_1.UserService();
                const result = yield userService.changePassword(req.admin._id, oldPassword, newPassword);
                res.status(200).json({
                    status: "success",
                    data: result,
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.AdminController = AdminController;
