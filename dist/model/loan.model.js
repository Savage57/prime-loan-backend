"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// Subscriber Schema
const SubscriberSchema = new mongoose_1.Schema({
    Subscriber_ID: { type: String, required: false },
    Name: { type: String, required: false },
    Phone: { type: String, required: false },
    Address: { type: String, required: false },
});
// Loan Details Schema
const LoanDetailsSchema = new mongoose_1.Schema({
    loanProvider: { type: String, required: false },
    accountNumber: { type: String, required: false },
    loanAmount: { type: Number, required: false },
    outstandingBalance: { type: Number, required: false },
    status: { type: String, required: false },
    performanceStatus: { type: String, required: false },
    overdueAmount: { type: Number, required: false },
    type: { type: String, required: false },
    loanDuration: { type: String, required: false },
    repaymentFrequency: { type: String, required: false },
    repaymentBehavior: { type: String, required: false },
    paymentProfile: { type: String, required: false },
    dateAccountOpened: { type: String, required: false },
    lastUpdatedAt: { type: String, required: false },
    loanCount: { type: Number, required: false },
    monthlyInstallmentAmt: { type: Number, required: false },
});
// Credit Score Schema
const CreditScoreSchema = new mongoose_1.Schema({
    loanId: { type: String, required: false },
    lastReported: { type: String, required: false },
    creditorName: { type: String, required: false },
    totalDebt: { type: String, required: false },
    accountype: { type: String, required: false },
    outstandingBalance: { type: Number, required: false },
    activeLoan: { type: Number, required: false },
    loansTaken: { type: Number, required: false },
    income: { type: Number, required: false },
    repaymentHistory: { type: String, required: false },
    openedDate: { type: String, required: false },
    lengthOfCreditHistory: { type: String, required: false },
    remarks: { type: String, required: false },
    creditors: [SubscriberSchema],
    loan_details: [LoanDetailsSchema],
});
// Repayment History Schema
const RepaymentHistorySchema = new mongoose_1.Schema({
    amount: { type: Number, required: false },
    outstanding: { type: Number, required: false },
    date: { type: String, required: false },
    action: { type: String, required: false },
});
// Define the LoanApplication Schema
const LoanApplicationSchema = new mongoose_1.Schema({
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    dob: { type: String, required: true },
    bvn: { type: String, required: true },
    nin: { type: String, required: true },
    address: { type: String, required: true },
    company: { type: String, default: null },
    company_address: { type: String, default: null },
    annual_income: { type: String, default: null },
    guarantor_1_name: { type: String, default: null },
    guarantor_1_phone: { type: String, default: null },
    guarantor_2_name: { type: String, default: null },
    guarantor_2_phone: { type: String, default: null },
    doi: { type: String, default: null },
    tin: { type: String, default: null },
    userId: { type: String, required: true },
    base64Image: { type: String, required: true },
    acknowledgment: { type: Boolean, required: true },
    category: { type: String, required: true },
    type: { type: String, required: true },
    status: { type: String, required: true },
    amount: { type: String, required: true },
    requested_amount: { type: String, required: true },
    outstanding: { type: String, required: true },
    reason: { type: String, required: true },
    duration: { type: String, required: true },
    repayment_amount: { type: String, required: true },
    percentage: { type: String, required: true },
    repayment_date: { type: String, required: true },
    loan_date: { type: String, required: true },
    loan_payment_status: { type: String, required: true },
    credit_message: { type: String, required: true },
    credit_score: CreditScoreSchema,
    repayment_history: [RepaymentHistorySchema],
    lastInterestAdded: { type: String, required: false },
    rejectionReason: { type: String, required: false },
    debit_account: { type: String, required: true },
    traceId: { type: String, required: false }, // V2 addition for ledger correlation
}, { timestamps: true });
// Create the LoanApplication model
const LoanApplicationModel = (0, mongoose_1.model)('loans', LoanApplicationSchema);
exports.default = LoanApplicationModel;
