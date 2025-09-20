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
exports.LoanController = void 0;
const loan_service_1 = require("./loan.service");
const loan_eligibility_1 = require("./loan-eligibility");
const loan_ladder_model_1 = require("./loan-ladder.model");
const settings_service_1 = require("../admin/settings.service");
const checkPermission_1 = require("../../shared/utils/checkPermission");
const checkPermission_2 = require("../../shared/utils/checkPermission");
const notification_service_1 = require("../notifications/notification.service");
class LoanController {
    /**
     * Request a new loan
     */
    static requestLoan(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
            try {
                const userId = req.user._id;
                const idempotencyKey = req.idempotencyKey;
                const { first_name, last_name, dob, nin, email, bvn, phone, address, company, company_address, annual_income, guarantor_1_name, guarantor_1_phone, guarantor_2_name, guarantor_2_phone, amount, reason, documentType, documentBase64, faceVideoBase64, category, type, duration, percentage, } = req.body;
                const loan = yield loan_service_1.LoanService.createLoan({
                    userId,
                    first_name,
                    last_name,
                    dob,
                    nin,
                    email,
                    bvn,
                    phone,
                    address,
                    company,
                    company_address,
                    annual_income,
                    guarantor_1_name,
                    guarantor_1_phone,
                    guarantor_2_name,
                    guarantor_2_phone,
                    amount,
                    reason,
                    documentType,
                    documentBase64,
                    faceVideoBase64,
                    category,
                    type,
                    duration,
                    percentage,
                    acknowledgment: true,
                    idempotencyKey,
                });
                const settings = yield settings_service_1.SettingsService.getSettings();
                if (!settings.autoLoanApproval) {
                    res.status(201).json({
                        status: "success",
                        data: loan,
                    });
                }
                // Eligibility check
                const eligibility = yield loan_eligibility_1.LoanEligibilityService.calculateEligibility(req.user, amount);
                const admins = yield (0, checkPermission_2.getMailsByPermission)("manage_loans");
                if (eligibility.eligible) {
                    if (eligibility.notifyAdmin) {
                        yield notification_service_1.NotificationService.sendLoanApplicationAdmin(req.user, `New Urgent Loan Application Notification from ${(_a = req.user) === null || _a === void 0 ? void 0 : _a.user_metadata.first_name} ${(_b = req.user) === null || _b === void 0 ? void 0 : _b.user_metadata.surname}`, `User ${(_c = req.user) === null || _c === void 0 ? void 0 : _c.user_metadata.first_name} ${(_d = req.user) === null || _d === void 0 ? void 0 : _d.user_metadata.surname} has applied for a loan of ${amount} although eligible, system require admin intervention because: ${eligibility.reason}.`, admins, loan);
                    }
                    else {
                        const amount = yield loan_ladder_model_1.LoanLadder.findOne({ step: ((_e = req.user) === null || _e === void 0 ? void 0 : _e.user_metadata.ladderIndex) || 0 });
                        if (amount) {
                            const disburseLoan = yield loan_service_1.LoanService.disburseLoan({
                                loanId: loan._id,
                                adminId: "system",
                                amount: amount.amount,
                            });
                            return res.status(201).json({
                                status: "success",
                                data: disburseLoan,
                            });
                        }
                        yield notification_service_1.NotificationService.sendLoanApplicationAdmin(req.user, `New Urgent Loan Application Notification from ${(_f = req.user) === null || _f === void 0 ? void 0 : _f.user_metadata.first_name} ${(_g = req.user) === null || _g === void 0 ? void 0 : _g.user_metadata.surname}`, `User ${(_h = req.user) === null || _h === void 0 ? void 0 : _h.user_metadata.first_name} ${(_j = req.user) === null || _j === void 0 ? void 0 : _j.user_metadata.surname} has applied for a loan of ${amount} although eligible, system could not determine amount to disburse due to invalid ladder score: ${(_k = req.user) === null || _k === void 0 ? void 0 : _k.user_metadata.ladderIndex}.`, admins, loan);
                    }
                }
                if (!eligibility.eligible) {
                    if (eligibility.notifyAdmin) {
                        yield notification_service_1.NotificationService.sendLoanApplicationAdmin(req.user, `New Urgent Loan Application Notification from ${(_l = req.user) === null || _l === void 0 ? void 0 : _l.user_metadata.first_name} ${(_m = req.user) === null || _m === void 0 ? void 0 : _m.user_metadata.surname}`, `User ${(_o = req.user) === null || _o === void 0 ? void 0 : _o.user_metadata.first_name} ${(_p = req.user) === null || _p === void 0 ? void 0 : _p.user_metadata.surname} has applied for a loan of ${amount} and is not eligible, but system require admin intervention because: ${eligibility.reason}.`, admins, loan);
                    }
                    else {
                        yield loan_service_1.LoanService.rejectLoan("system", loan._id, (eligibility === null || eligibility === void 0 ? void 0 : eligibility.reason) || "");
                        return res.status(400).json({
                            status: "failed",
                            message: eligibility.reason,
                        });
                    }
                }
                res.status(201).json({
                    status: "success",
                    data: loan,
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Repay an existing loan
     */
    static repayLoan(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { amount, mandatory } = req.body;
                const userId = req.user._id;
                const idempotencyKey = req.idempotencyKey;
                const result = yield loan_service_1.LoanService.repayLoan({
                    loanId: id,
                    userId,
                    amount,
                    mandatory,
                    idempotencyKey,
                });
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
     * Admin: Disburse a loan
     */
    static disburseLoan(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { loanId, amount } = req.body;
                const admin = req.admin;
                const idempotencyKey = req.idempotencyKey;
                (0, checkPermission_1.checkPermission)(admin, "manage_loans");
                const result = yield loan_service_1.LoanService.disburseLoan({
                    adminId: (admin === null || admin === void 0 ? void 0 : admin._id) || "",
                    loanId,
                    amount,
                    idempotencyKey,
                });
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
     * Admin: Reject a loan
     */
    static rejectLoan(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { reason } = req.body;
                const admin = req.admin;
                (0, checkPermission_1.checkPermission)(admin, "manage_loans");
                const loan = yield loan_service_1.LoanService.rejectLoan((admin === null || admin === void 0 ? void 0 : admin._id) || "", id, reason);
                res.status(200).json({
                    status: "success",
                    data: loan,
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Get single loan status
     */
    static getLoanStatus(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const loan = yield loan_service_1.LoanService.getLoanById(id);
                if (!loan) {
                    return res.status(404).json({ status: "failed", message: "Loan not found" });
                }
                res.status(200).json({
                    status: "success",
                    data: {
                        id: loan._id,
                        status: loan.status,
                        loan_payment_status: loan.loan_payment_status,
                        outstanding: loan.outstanding,
                        repayment_date: loan.repayment_date,
                    },
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * List loans for a user (paginated)
     */
    static listUserLoans(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user._id;
                const page = Number(req.query.page) || 1;
                const limit = Number(req.query.limit) || 10;
                const result = yield loan_service_1.LoanService.listLoansForUser(userId, page, limit);
                res.status(200).json(Object.assign({ status: "success" }, result));
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Admin: List all loans (paginated, with filter)
     */
    static listAllLoans(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const admin = req.admin;
                const page = Number(req.query.page) || 1;
                const limit = Number(req.query.limit) || 20;
                const filter = req.query || {};
                (0, checkPermission_1.checkPermission)(admin, "view_loans");
                const result = yield loan_service_1.LoanService.listAllLoans(page, limit, filter);
                res.status(200).json(Object.assign({ status: "success" }, result));
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Admin: single loan history (paginated)
     */
    static singleLoanHistory(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const admin = req.admin;
                (0, checkPermission_1.checkPermission)(admin, "view_loans");
                const loan = yield loan_service_1.LoanService.getLoanById(id);
                const page = Number(req.query.page) || 1;
                const limit = Number(req.query.limit) || 20;
                let history = yield loan_service_1.LoanService.listLoansForUser((loan === null || loan === void 0 ? void 0 : loan.userId) || "trx-id", page, limit);
                if (history.data.length > 0) {
                    history.data = history.data.filter((item) => item._id !== id);
                }
                res.status(200).json({
                    status: "success",
                    data: {
                        loan,
                        history,
                    },
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Admin: Get Loan Statistics
     */
    static getAdminLoanStats(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const admin = req.admin;
                (0, checkPermission_1.checkPermission)(admin, "view_loans");
                const loan = yield loan_service_1.LoanService.getAdminLoanStats();
                if (!loan) {
                    return res.status(404).json({ status: "failed", message: "Loan not found" });
                }
                res.status(200).json({
                    status: "success",
                    data: loan,
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Admin: Get Loans By Category
     */
    static getLoansByCategory(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const admin = req.admin;
                const page = Number(req.query.page) || 1;
                const limit = Number(req.query.limit) || 20;
                const category = req.query.category;
                const search = req.query.search;
                (0, checkPermission_1.checkPermission)(admin, "view_loans");
                const data = yield loan_service_1.LoanService.getLoansByCategory(category, page, limit, search);
                res.status(200).json({
                    status: "success",
                    data
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.LoanController = LoanController;
