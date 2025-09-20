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
exports.LoanService = void 0;
/**
 * loan.service.ts
 * Centralized Loan business logic (moved out of controller)
 * - Mongoose + transaction aware
 * - Ledger-first orchestration (create DB + ledger + transfer record, then call provider)
 * - Pagination for list endpoints
 */
const axios_1 = __importDefault(require("axios"));
const db_1 = require("../../shared/db");
const uuid_1 = require("../../shared/utils/uuid");
const middleware_1 = require("../../shared/idempotency/middleware");
const LedgerService_1 = require("../ledger/LedgerService");
const vfd_provider_1 = require("../../shared/providers/vfd.provider");
const loan_model_1 = __importDefault(require("./loan.model"));
const user_service_1 = require("../users/user.service");
const transfer_service_1 = require("../transfers/transfer.service");
const notification_service_1 = require("../notifications/notification.service");
const exceptions_1 = require("../../exceptions");
const user_model_1 = __importDefault(require("../users/user.model"));
const checkPermission_1 = require("../../shared/utils/checkPermission");
/* ---------- Constants / Helpers ---------- */
const ALLOWED_ID_DOCS = new Set([
    "NIN",
    "NIN_SLIP",
    "NATIONAL_ID",
    "DRIVERS_LICENSE",
    "PASSPORT",
    "NIN Slip",
    "NIN_SLIP"
]);
function requiredParam(name, v) {
    if (v === undefined || v === null || (typeof v === "string" && v.trim() === "")) {
        throw new exceptions_1.BadRequestError(`${name} is required`);
    }
}
/**
 * daysBetween(now, dueDate)
 * positive -> now is after dueDate (i.e. late)
 */
function daysBetween(d1, d2) {
    const ms = d1.getTime() - d2.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
}
/* ---------- Service ---------- */
class LoanService {
    /* ---------------------
     * Mono credit lookup + mapper
     * --------------------- */
    static formatMonoDate(dateStr) {
        if (!dateStr)
            return new Date().toISOString();
        const parts = dateStr.split("-");
        if (parts.length !== 3)
            return new Date().toISOString();
        const [d, m, y] = parts;
        return new Date(`${y}-${m}-${d}`).toISOString();
    }
    static convertToCreditScore(rawData) {
        var _a, _b, _c, _d;
        if (!rawData || rawData.error)
            return null;
        const creditHistories = rawData.credit_history || [];
        const loan_details = creditHistories.flatMap((ch) => (ch.history || []).map((h) => {
            var _a, _b, _c, _d;
            const repaymentAmount = isNaN(Number(h.repayment_amount)) ? 0 : Number(h.repayment_amount);
            return {
                loanProvider: ch.institution || "Unknown",
                accountNumber: "N/A",
                loanAmount: repaymentAmount,
                outstandingBalance: 0,
                status: h.loan_status || "",
                performanceStatus: h.performance_status || "",
                overdueAmount: 0,
                type: "N/A",
                loanDuration: `${h.tenor || 0} months`,
                repaymentFrequency: h.repayment_frequency || "",
                repaymentBehavior: ((_b = (_a = h.repayment_schedule) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.status) || "",
                paymentProfile: ((_d = (_c = h.repayment_schedule) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.status) || "",
                dateAccountOpened: this.formatMonoDate(h.date_opened),
                lastUpdatedAt: this.formatMonoDate(h.closed_date),
                loanCount: ch.history.length,
                monthlyInstallmentAmt: repaymentAmount
            };
        }));
        const totalDebt = loan_details.reduce((sum, ld) => sum + (ld.loanAmount || 0), 0);
        return {
            lastReported: rawData.timestamp || new Date().toISOString(),
            creditorName: ((_a = creditHistories[0]) === null || _a === void 0 ? void 0 : _a.institution) || "Unknown",
            totalDebt: String(totalDebt),
            outstandingBalance: 0,
            activeLoan: loan_details.filter((l) => l.status === "open").length,
            loansTaken: loan_details.length,
            repaymentHistory: ((_b = loan_details[0]) === null || _b === void 0 ? void 0 : _b.repaymentBehavior) || "",
            openedDate: ((_c = loan_details[0]) === null || _c === void 0 ? void 0 : _c.dateAccountOpened) || "",
            lengthOfCreditHistory: "0 years",
            remarks: ((_d = loan_details[0]) === null || _d === void 0 ? void 0 : _d.performanceStatus) ? `Loan is ${loan_details[0].performanceStatus}` : "",
            creditors: creditHistories.map((ch) => ({
                Subscriber_ID: ch.institution,
                Name: ch.institution,
                Phone: "",
                Address: ""
            })),
            loan_details
        };
    }
    static monoCreditLookup(bvn) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            if (!bvn)
                return { error: "No BVN provided" };
            const url = "https://api.withmono.com/v3/lookup/credit-history/all";
            const headers = {
                accept: "application/json",
                "content-type": "application/json",
                "mono-sec-key": process.env.MONO_SEC_KEY || "live_sk_axio44pdonk6lb6rdhxa"
            };
            const options = {
                url,
                method: "POST",
                headers,
                data: { bvn },
                timeout: 20000
            };
            try {
                const resp = yield (0, axios_1.default)(options);
                if (![200, 202].includes(resp.status)) {
                    return { error: `Mono lookup failed: ${((_a = resp.data) === null || _a === void 0 ? void 0 : _a.message) || resp.statusText}` };
                }
                return resp.data.data;
            }
            catch (err) {
                const message = ((_c = (_b = err === null || err === void 0 ? void 0 : err.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || (err === null || err === void 0 ? void 0 : err.message) || "unknown";
                return { error: message };
            }
        });
    }
    /* ---------------------
     * Create Loan Application
     * - validate input
     * - require ID doc + face video
     * - prevent guarantors with active loans
     * - run credit lookup (best-effort)
     * - save loan (not-started)
     * - notify user & admin (non-fatal)
     * --------------------- */
    static createLoan(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            requiredParam("userId", params.userId);
            requiredParam("first_name", params.first_name);
            requiredParam("last_name", params.last_name);
            requiredParam("dob", params.dob);
            requiredParam("amount", params.amount);
            requiredParam("documentType", params.documentType);
            requiredParam("documentBase64", params.documentBase64);
            requiredParam("faceVideoBase64", params.faceVideoBase64);
            if (!ALLOWED_ID_DOCS.has(params.documentType)) {
                throw new exceptions_1.BadRequestError(`documentType must be one of: ${[...ALLOWED_ID_DOCS].join(", ")}`);
            }
            // ensure user exists
            const user = yield user_model_1.default.findOne({ _id: params.userId });
            if (!user || Array.isArray(user) || !user._id)
                throw new exceptions_1.NotFoundError("User not found");
            // prevent duplicate active loans for requester
            const existingActive = yield loan_model_1.default.find({
                userId: params.userId,
                loan_payment_status: { $in: ["in-progress", "not-started"] },
                status: { $in: ["pending", "accepted", "active"] }
            });
            if (existingActive && existingActive.length > 0) {
                throw new exceptions_1.ConflictError("Duplicate loan attempt. Wait for current loan decision or repay the existing one.");
            }
            // Check guarantors - they cannot have active loans (if provided)
            const guarantorPhones = [params.guarantor_1_phone, params.guarantor_2_phone].filter(Boolean);
            for (const phone of guarantorPhones) {
                const gUser = yield user_model_1.default.findOne({ "user_metadata.phone": phone });
                if (gUser && !Array.isArray(gUser) && gUser._id) {
                    const gActive = yield loan_model_1.default.findOne({
                        userId: gUser._id,
                        loan_payment_status: { $in: ["in-progress", "not-started"] },
                        status: { $in: ["pending", "accepted", "active"] }
                    });
                    if (gActive) {
                        throw new exceptions_1.BadRequestError(`Guarantor (${phone}) has an active loan and cannot be used.`);
                    }
                }
            }
            // perform credit lookup (best-effort)
            const mono = yield this.monoCreditLookup(params.bvn || ((_a = user.user_metadata) === null || _a === void 0 ? void 0 : _a.bvn));
            const creditScoreObj = this.convertToCreditScore(mono);
            // Build and persist loan record
            const loanPayload = Object.assign(Object.assign({}, params), { userId: params.userId, requested_amount: params.amount, amount: params.amount, loan_payment_status: "not-started", outstanding: params.amount, credit_message: (mono === null || mono === void 0 ? void 0 : mono.error) || "available", credit_score: creditScoreObj, status: params.status || "pending", repayment_history: [] });
            const created = yield loan_model_1.default.create(loanPayload);
            // Notify (best-effort)
            try {
                yield notification_service_1.NotificationService.sendLoanApplicationUser(user, created);
                const admins = yield (0, checkPermission_1.getMailsByPermission)("manage_loans");
                yield notification_service_1.NotificationService.sendLoanApplicationAdmin(user, `New Loan Created From User: ${user.user_metadata.first_name}`, `A new loan has been created by ${user.user_metadata.first_name} ${user.user_metadata.surname}.\n\nDetails:\n- Amount: ${params.amount}\n- Category: ${params.category}\n- Duration: ${params.duration}\n\nLoanId: ${created._id}`, admins, created);
            }
            catch (err) {
                /* non-fatal */
                console.warn("Loan notification failed (non-fatal):", err);
            }
            // save idempotent response if key provided
            if (params.idempotencyKey) {
                yield (0, middleware_1.saveIdempotentResponse)(params.idempotencyKey, params.userId, created);
            }
            return created;
        });
    }
    /* ---------------------
     * Disburse loan (admin)
     * - ledger-first: create transfer record via TransferService (PENDING)
     * - call provider
     * - on success: complete transfer, update loan, ledger entries
     * - on failure: mark transfer failed
     * --------------------- */
    static disburseLoan(params) {
        return __awaiter(this, void 0, void 0, function* () {
            requiredParam("adminId", params.adminId);
            requiredParam("loanId", params.loanId);
            const session = yield db_1.DatabaseService.startSession();
            try {
                return yield db_1.DatabaseService.withTransaction(session, () => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b;
                    const loan = yield loan_model_1.default.findById(params.loanId).session(session);
                    if (!loan)
                        throw new exceptions_1.NotFoundError("Loan not found");
                    if (loan.status === "accepted")
                        throw new exceptions_1.BadRequestError("Loan already accepted");
                    const user = yield user_model_1.default.findOne({ _id: loan.userId }, "one");
                    if (!user || Array.isArray(user) || !user._id)
                        throw new exceptions_1.NotFoundError("User not found");
                    // get prime / user account info
                    const primeInfo = (yield this.vfd.getPrimeAccountInfo()).data;
                    const userAccTyped = (yield this.vfd.getAccountInfo(user.user_metadata.accountNo)).data;
                    if (!(primeInfo === null || primeInfo === void 0 ? void 0 : primeInfo.accountNo) || !(userAccTyped === null || userAccTyped === void 0 ? void 0 : userAccTyped.accountNo)) {
                        throw new Error("Unable to get account info for disbursement");
                    }
                    // Determine disbursement amounts
                    const amountNaira = ((_a = params.amount) !== null && _a !== void 0 ? _a : loan.amount); // naira
                    const processing_fee = Number(loan.repayment_amount - loan.amount);
                    // 1) create transfer record (pending) via TransferService (ledger entry created inside TransferService)
                    // generate idempotency if not provided
                    const transferIdempotency = params.idempotencyKey || `disburse-${uuid_1.UuidService.generate()}`;
                    const transferRecord = yield transfer_service_1.TransferService.initiateTransfer({
                        fromAccount: primeInfo.accountNo,
                        userId: String(loan.userId),
                        toAccount: userAccTyped.accountNo,
                        amount: amountNaira,
                        transferType: "intra",
                        bankCode: "999999",
                        remark: "Loan disbursement",
                        idempotencyKey: transferIdempotency
                    }, "loan-disbursement");
                    // build provider transfer payload (provider expects amount in kobo)
                    const transferRequest = {
                        fromAccount: primeInfo.accountNo,
                        uniqueSenderAccountId: "",
                        fromClientId: primeInfo.clientId,
                        fromClient: primeInfo.client,
                        fromSavingsId: primeInfo.accountId,
                        toClientId: userAccTyped.clientId,
                        toClient: userAccTyped.client,
                        toSavingsId: userAccTyped.accountId,
                        toSession: userAccTyped.accountId,
                        toAccount: userAccTyped.accountNo,
                        toBank: "999999",
                        signature: "", // left to provider or controller to fill if required
                        amount: amountNaira, // kobo
                        remark: "Loan Disbursement",
                        transferType: "intra",
                        reference: transferRecord.reference
                    };
                    // 2) call provider
                    let providerResponse;
                    try {
                        providerResponse = yield this.vfd.transfer(transferRequest);
                    }
                    catch (err) {
                        // fail transfer inside system
                        yield transfer_service_1.TransferService.failTransfer(transferRecord.reference);
                        throw new exceptions_1.APIError(409, `Provider disbursement failed: ${String(err)}`);
                    }
                    const ok = providerResponse && (providerResponse.status === "00" || ((_b = providerResponse.data) === null || _b === void 0 ? void 0 : _b.txnId) || providerResponse.txnId);
                    if (!ok) {
                        yield transfer_service_1.TransferService.failTransfer(transferRecord.reference);
                        throw new exceptions_1.APIError(409, `Disbursement failed: ${JSON.stringify(providerResponse)}`);
                    }
                    // 3) complete internal transfer
                    const trxnRes = yield transfer_service_1.TransferService.completeTransfer(transferRecord.reference, "loan-disbursement");
                    // 4) update loan: compute total repayment schedule (fee + interest)
                    const fee = 500;
                    const loan_per = 10;
                    const duration = loan.duration || 30;
                    const percentage = duration / 30 >= 1
                        ? ((loan.amount * loan_per) / 100) * (duration / 30)
                        : (loan.amount * loan_per) / 100;
                    const total = Number(Number(loan.amount) + Number(fee + percentage));
                    const loanDate = new Date();
                    const repaymentDate = new Date(loanDate);
                    repaymentDate.setDate(loanDate.getDate() + Number(loan.duration || duration));
                    loan.outstanding = total;
                    loan.status = "accepted";
                    loan.loan_date = loanDate.toISOString();
                    loan.repayment_date = repaymentDate.toISOString();
                    loan.loan_payment_status = "in-progress";
                    loan.adminAction = {
                        adminId: params.adminId,
                        action: "Approve",
                        date: new Date().toISOString()
                    };
                    yield loan.save({ session });
                    // 5) ledger double entry: platform_cash -> user_wallet
                    yield LedgerService_1.LedgerService.createDoubleEntry(uuid_1.UuidService.generateTraceId(), "loan_disbursement", // platform funding account
                    `user_wallet:${user._id}`, loan.amount, "loan", {
                        userId: user._id,
                        subtype: "disbursement",
                        session
                    });
                    // 6) notify user (best-effort)
                    try {
                        yield notification_service_1.NotificationService.sendLoanApproval(user, loan);
                    }
                    catch (err) {
                        console.warn("notify error:", err);
                    }
                    // idempotent response
                    if (params.idempotencyKey) {
                        yield (0, middleware_1.saveIdempotentResponse)(params.idempotencyKey, String(loan.userId), { loan, providerResponse });
                    }
                    return { loan, providerResponse, trxnRes };
                }));
            }
            finally {
                yield session.endSession();
            }
        });
    }
    /* ---------------------
     * Repay loan
     * - ledger-first: initiate internal transfer record (user -> platform)
     * - call provider
     * - on success: complete transfer, update loan outstanding, ledger entries, tx record, update credit score
     * --------------------- */
    static repayLoan(params) {
        return __awaiter(this, void 0, void 0, function* () {
            requiredParam("userId", params.userId);
            requiredParam("loanId", params.loanId);
            requiredParam("amount", params.amount);
            const session = yield db_1.DatabaseService.startSession();
            try {
                return yield db_1.DatabaseService.withTransaction(session, () => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    const loan = yield loan_model_1.default.findById(params.loanId).session(session);
                    if (!loan)
                        throw new exceptions_1.NotFoundError("Loan not found");
                    const user = yield user_model_1.default.findOne({ _id: params.userId });
                    if (!user || Array.isArray(user) || !user._id)
                        throw new exceptions_1.NotFoundError("User not found");
                    const primeInfo = (yield this.vfd.getPrimeAccountInfo()).data;
                    const userAcc = (yield this.vfd.getAccountInfo(user.user_metadata.accountNo)).data;
                    if (!(primeInfo === null || primeInfo === void 0 ? void 0 : primeInfo.accountNo) || !(userAcc === null || userAcc === void 0 ? void 0 : userAcc.accountNo)) {
                        throw new Error("Could not fetch account info to perform repayment");
                    }
                    // Ensure user has funds (provider source of truth)
                    const userBalance = parseFloat(userAcc.accountBalance || "0");
                    let repayAmount = Number(params.amount);
                    if (userBalance < repayAmount) {
                        if (userBalance <= 0)
                            throw new exceptions_1.BadRequestError("Insufficient funds to repay loan");
                        else
                            repayAmount = userBalance;
                    }
                    // 1) internal transfer record
                    const transferIdempotency = params.idempotencyKey || `repay-${uuid_1.UuidService.generate()}`;
                    const transferRecord = yield transfer_service_1.TransferService.initiateTransfer({
                        fromAccount: userAcc.accountNo,
                        userId: String(user._id),
                        toAccount: primeInfo.accountNo,
                        amount: params.amount,
                        transferType: "intra",
                        bankCode: "999999",
                        remark: "Loan repayment",
                        idempotencyKey: transferIdempotency
                    }, "loan-repayment");
                    // 2) provider transfer (user -> prime)
                    const transferRequest = {
                        fromAccount: userAcc.accountNo,
                        uniqueSenderAccountId: userAcc.accountId,
                        fromClientId: userAcc.clientId,
                        fromClient: userAcc.client,
                        fromSavingsId: userAcc.accountId,
                        toClientId: primeInfo.clientId,
                        toClient: primeInfo.client,
                        toSavingsId: primeInfo.accountId,
                        toSession: primeInfo.accountId,
                        toAccount: primeInfo.accountNo,
                        toBank: "999999",
                        signature: "",
                        amount: repayAmount,
                        remark: `${params.mandatory ? "Mandatory" : "Voluntary"} Loan Repayment`,
                        transferType: "intra",
                        reference: transferRecord.reference
                    };
                    let providerResponse;
                    try {
                        providerResponse = yield this.vfd.transfer(transferRequest);
                    }
                    catch (err) {
                        yield transfer_service_1.TransferService.failTransfer(transferRecord.reference);
                        throw new Error(`Repayment provider transfer failed: ${String(err)}`);
                    }
                    const ok = providerResponse && (providerResponse.status === "00" || ((_a = providerResponse.data) === null || _a === void 0 ? void 0 : _a.txnId) || providerResponse.txnId);
                    if (!ok) {
                        yield transfer_service_1.TransferService.failTransfer(transferRecord.reference);
                        throw new Error(`Repayment failed: ${JSON.stringify(providerResponse)}`);
                    }
                    // 3) complete internal transfer
                    const trxnRes = yield transfer_service_1.TransferService.completeTransfer(transferRecord.reference, "loan-repayment");
                    // 4) update loan outstanding & history
                    let newOutstanding = 0;
                    if (loan.outstanding && loan.outstanding >= params.amount) {
                        newOutstanding = loan.outstanding - params.amount;
                    }
                    const paidInFull = newOutstanding <= 0;
                    const now = new Date();
                    loan.repayment_history = loan.repayment_history || [];
                    loan.repayment_history.push({
                        amount: params.amount,
                        outstanding: newOutstanding,
                        action: "repayment",
                        date: now.toISOString()
                    });
                    loan.outstanding = newOutstanding;
                    loan.loan_payment_status = paidInFull ? "complete" : "in-progress";
                    yield loan.save({ session });
                    // 5) ledger double entry: user_wallet -> platform_cash
                    yield LedgerService_1.LedgerService.createDoubleEntry(uuid_1.UuidService.generateTraceId(), `user_wallet:${user._id}`, "loan_repayment", repayAmount, "loan", {
                        userId: user._id,
                        subtype: "repayment",
                        idempotencyKey: params.idempotencyKey,
                        session
                    });
                    // 8) compute and persist updated credit score based on timeliness
                    try {
                        const dueDateISO = loan.repayment_date;
                        if (dueDateISO) {
                            const dueDate = new Date(dueDateISO);
                            const daysLate = daysBetween(now, dueDate); // positive -> late
                            const [newScore, ladderIndex, category, message] = LoanService.computeCreditScoreFromTimeliness(daysLate, user.user_metadata.ladderIndex || 0);
                            yield user_service_1.UserService.update(user._id, "user_metadata.creditScore", newScore);
                            yield user_service_1.UserService.update(user._id, "user_metadata.ladderIndex", ladderIndex);
                            yield notification_service_1.NotificationService.sendLoanRepayment(user, repayAmount, message);
                        }
                    }
                    catch (err) {
                        console.warn("Failed updating credit score (non-fatal):", err);
                    }
                    // 9) idempotent response
                    if (params.idempotencyKey) {
                        yield (0, middleware_1.saveIdempotentResponse)(params.idempotencyKey, params.userId, { status: "success", loan, providerResponse });
                    }
                    return { loan, providerResponse, trxnRes };
                }));
            }
            finally {
                yield session.endSession();
            }
        });
    }
    /**
     * Compute numeric credit score (0.0 - 1.0) based on `daysLate`.
     * daysLate < 0: before due date -> 1.0
     * daysLate === 0: on due date -> 0.9
     * 1-3 days late -> 0.6
     * 4-5 days late -> 0.5
     * 6-7 days late -> 0.4
     * >7 days late -> 0.3
     */
    static computeCreditScoreFromTimeliness(daysLate, ladderIndex) {
        if (daysLate < 0)
            return [1.0, ladderIndex + 1, "before_due_date", "Continue making payment before due date to keep a perfect credit score and unlock larger loan amounts"];
        if (daysLate === 0)
            return [0.9, ladderIndex + 1, "on_due_date", "Make sure to pay on or before the due date to maintain a good credit score and unlock larger loan amounts"];
        if (daysLate <= 3)
            return [0.6, ladderIndex, "1-3_days_late", "Paying within 1-3 days after the due date may impact your credit score and may result in higher interest rates as well as inability to unlock larger loan amounts"];
        if (daysLate <= 5)
            return [0.5, ladderIndex > 0 ? ladderIndex - 1 : 0, "4-5_days_late", "Paying 4-5 days late will negatively affect your credit score and may result in higher interest rates as well as inability to unlock larger loan amounts"];
        if (daysLate <= 7)
            return [0.4, ladderIndex > 0 ? ladderIndex - 1 : 0, "6-7_days_late", "Paying 6-7 days late will further impact your credit score and may result in higher interest rates as well as inability to unlock larger loan amounts"];
        return [0.3, ladderIndex > 1 ? ladderIndex - 2 : 0, "over_7_days_late", "Paying over 7 days late will significantly harm your credit score and may result in higher interest rates as well as loan denial"];
    }
    /* ---------------------
     * Reject a loan (admin)
     * --------------------- */
    static rejectLoan(adminId, loanId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            requiredParam("adminId", adminId);
            requiredParam("loanId", loanId);
            requiredParam("reason", reason);
            const loan = yield loan_model_1.default.findById(loanId);
            if (!loan)
                throw new exceptions_1.NotFoundError("Loan not found");
            if (loan.status === "accepted")
                throw new exceptions_1.BadRequestError("Cannot reject accepted loan");
            if (loan.status === "rejected")
                throw new exceptions_1.BadRequestError("Loan already rejected");
            loan.outstanding = 0;
            loan.rejectionReason = reason;
            loan.status = "rejected";
            loan.adminAction = {
                adminId,
                action: "Reject",
                date: new Date().toISOString()
            };
            yield loan.save();
            const user = yield user_service_1.UserService.getUser(loan.userId);
            if (user) {
                yield notification_service_1.NotificationService.sendLoanRejection(user, loan.amount, reason);
            }
            return loan;
        });
    }
    /* ---------------------
     * Query helpers (paginated)
     * --------------------- */
    static getLoanById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!id)
                return null;
            return loan_model_1.default.findById(id);
        });
    }
    static listLoansForUser(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, page = 1, limit = 10) {
            if (!userId)
                return { data: [], total: 0, page, pages: 0 };
            const skip = (page - 1) * limit;
            const [data, total] = yield Promise.all([
                loan_model_1.default.find({ userId }).skip(skip).limit(limit).sort({ createdAt: -1 }),
                loan_model_1.default.countDocuments({ userId })
            ]);
            return { data, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
        });
    }
    static listAllLoans() {
        return __awaiter(this, arguments, void 0, function* (page = 1, limit = 20, filter = {}) {
            const skip = (page - 1) * limit;
            const [data, total] = yield Promise.all([
                loan_model_1.default.find({}).skip(skip).limit(limit).sort({ createdAt: -1 }),
                loan_model_1.default.countDocuments(filter)
            ]);
            return { data, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
        });
    }
    /**
     * Admin loan portfolio analytics
    */
    static getAdminLoanStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            // Load only required fields
            const loans = yield loan_model_1.default.find({}, {
                amount: 1,
                repayment_amount: 1,
                outstanding: 1,
                loan_payment_status: 1,
                repayment_date: 1,
                status: 1,
                repayment_history: 1
            });
            let stats = {
                totalApplied: 0,
                appliedUsers: 0,
                totalDisbursed: 0,
                disbursedUsers: 0,
                realizedProfit: 0,
                unrealizedProfit: 0,
                activeLoans: 0,
                activeAmount: 0,
                dueLoans: 0,
                dueAmount: 0,
                pendingLoans: 0,
                pendingAmount: 0,
                overdueLoans: 0,
                overdueAmount: 0,
                repaidLoans: 0,
                repaidAmount: 0,
                repaidingLoans: 0,
                repaidingAmount: 0,
                notStarted: 0,
            };
            for (const loan of loans) {
                const amount = loan.amount || 0;
                const repayment = loan.repayment_amount || 0;
                const outstanding = loan.outstanding || 0;
                const dueDate = loan.repayment_date ? new Date(loan.repayment_date) : null;
                // Applied loans
                stats.totalApplied += amount;
                stats.appliedUsers++;
                // Disbursed loans
                if (loan.status == "accepted") {
                    stats.totalDisbursed += amount;
                    stats.disbursedUsers++;
                    const expectedProfit = (repayment || 0) - (amount || 0);
                    const realized = (repayment || 0) - (outstanding || 0) - (amount || 0);
                    stats.realizedProfit += Math.max(realized, 0);
                    stats.unrealizedProfit += Math.max(expectedProfit - realized, 0);
                }
                // Loan status categorization
                if (loan.status == "accepted" &&
                    (loan.loan_payment_status == "in-progress" ||
                        loan.loan_payment_status == "not-started")) {
                    if (dueDate) {
                        if (dueDate > now) {
                            stats.activeLoans++;
                            stats.activeAmount += outstanding;
                        }
                        else if (dueDate.toDateString() === now.toDateString()) {
                            stats.dueLoans++;
                            stats.dueAmount += outstanding;
                        }
                        else {
                            stats.overdueLoans++;
                            stats.overdueAmount += outstanding;
                        }
                    }
                }
                if (loan.loan_payment_status == "complete") {
                    stats.repaidLoans++;
                    let sum = 0;
                    for (let payment of (loan === null || loan === void 0 ? void 0 : loan.repayment_history) || []) {
                        sum += isNaN(Number(payment.amount)) ? 0 : Number(payment.amount);
                    }
                    stats.repaidAmount += sum;
                }
                if (loan.loan_payment_status == "in-progress") {
                    stats.repaidingLoans++;
                    let sum = 0;
                    for (let payment of (loan === null || loan === void 0 ? void 0 : loan.repayment_history) || []) {
                        sum += isNaN(Number(payment.amount)) ? 0 : Number(payment.amount);
                    }
                    stats.repaidingAmount += sum;
                }
                if (loan.status == "accepted" && loan.loan_payment_status == "not-started") {
                    stats.notStarted++;
                }
                if (loan.status === "pending") {
                    stats.pendingLoans++;
                    stats.pendingAmount += amount;
                }
            }
            return Object.assign({ totalLoans: loans.length }, stats);
        });
    }
    /**
     * Get loans & users by category for admin
     */
    static getLoansByCategory(category_1) {
        return __awaiter(this, arguments, void 0, function* (category, page = 1, limit = 20, search) {
            const now = new Date();
            let filter = {};
            console.log({ category, page, limit, search });
            if (category === "active") {
                filter.loan_payment_status = "in-progress";
            }
            else if (category === "due") {
                filter.loan_payment_status = "in-progress";
                filter.repayment_date = { $lte: now };
            }
            else if (category === "overdue") {
                filter.loan_payment_status = "in-progress";
                filter.repayment_date = { $lt: now };
            }
            else if (category === "completed") {
                filter.loan_payment_status = "complete";
            }
            else if (category === "pending") {
                filter.status = "pending";
            }
            else if (category === "rejected") {
                filter.status = "rejected";
            }
            if (search) {
                const regex = new RegExp(search, "i"); // case-insensitive search
                filter.$or = [
                    { "first_name": regex },
                    { "last_name": regex },
                    { email: regex },
                    {
                        $expr: {
                            $regexMatch: {
                                input: { $concat: ["$first_name", " ", "$last_name"] },
                                regex: search,
                                options: "i",
                            },
                        },
                    },
                ];
            }
            const skip = (page - 1) * limit;
            const [loans, total] = yield Promise.all([
                loan_model_1.default.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
                loan_model_1.default.countDocuments(filter)
            ]);
            // Join with user details (admin wants to see who owes what)
            const userIds = loans.map(l => l.userId);
            const users = yield user_model_1.default.find({ _id: { $in: userIds } }, { email: 1, user_metadata: 1 });
            return {
                loans,
                users,
                total,
                page,
                pages: Math.max(1, Math.ceil(total / limit))
            };
        });
    }
}
exports.LoanService = LoanService;
LoanService.vfd = new vfd_provider_1.VfdProvider();
