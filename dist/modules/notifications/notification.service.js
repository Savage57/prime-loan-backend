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
exports.NotificationService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    service: "gmail",
    auth: {
        user: process.env.SMTP_USER || "primefinancials68@gmail.com",
        pass: process.env.SMTP_PASS || "your_app_password",
    },
});
class NotificationService {
    static sendEmail(to, subject, html) {
        return __awaiter(this, void 0, void 0, function* () {
            yield transporter.sendMail({
                from: `"Prime Finance" <${process.env.SMTP_USER}>`,
                to,
                subject,
                html,
            });
        });
    }
    /* ----------- Shared Template Wrapper ----------- */
    static template(title, body) {
        return `
    <div style="font-family: Arial, sans-serif; background:#f4f4f4; padding:20px;">
      <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:8px; padding:20px; border:1px solid #ddd;">
        <h1 style="color:#0d6efd; font-size:22px; text-align:center; margin-bottom:20px;">${title}</h1>
        <div style="font-size:15px; line-height:1.6; color:#333;">
          ${body}
        </div>
        <hr style="margin:20px 0; border:none; border-top:1px solid #eee;" />
        <p style="font-size:12px; text-align:center; color:#777;">
          © ${new Date().getFullYear()} Prime Finance. All rights reserved.
        </p>
      </div>
    </div>
    `;
    }
    /* ----------- Loan Reminder Helper ----------- */
    static sendLoanReminder(user, loan, subject, message) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = `
      <p>Dear <strong>${user.user_metadata.first_name}</strong>,</p>
      <p>${message}</p>
      <p><strong>Outstanding:</strong> ₦${loan.outstanding}</p>
      <p><strong>Repayment Date:</strong> ${loan.repayment_date}</p>
      <p style="color:#d97706; font-weight:bold;">
        Please make the payment immediately to avoid further late fees and penalties.
      </p>
    `;
            return this.sendEmail(user.email, subject, this.template("Loan Reminder", body));
        });
    }
    static sendLoanOverdue(user, loan) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.sendLoanReminder(user, loan, "Your Loan is Overdue", `Your loan payment of ₦${loan.outstanding} was due on ${loan.repayment_date}.`);
        });
    }
    static sendLoanDueToday(user, loan) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.sendLoanReminder(user, loan, "Your Loan is Due Today", `Your loan payment of ₦${loan.outstanding} is due <strong>today</strong>.`);
        });
    }
    static sendLoanDueTomorrow(user, loan) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.sendLoanReminder(user, loan, "Your Loan Will Be Due Tomorrow", `Your loan payment of ₦${loan.outstanding} will be due <strong>tomorrow</strong>.`);
        });
    }
    /* ----------- Loan Emails ----------- */
    static sendLoanApplicationUser(user, loan) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = `
      <p>Hi <strong>${user.user_metadata.first_name}</strong>,</p>
      <p>Your loan application for <strong>₦${loan.amount}</strong> has been received.</p>
      <p>We will review it and notify you shortly.</p>
      <p style="color:#0d6efd; font-weight:bold;">Thank you for choosing Prime Finance.</p>
    `;
            return this.sendEmail(user.email, "Loan Application Received", this.template("Loan Application", body));
        });
    }
    static sendWelcomeEmail(to, firstName) {
        return __awaiter(this, void 0, void 0, function* () {
            const html = `
      <div style="font-family: Arial, sans-serif; padding:20px;">
        <h2 style="color:#2563eb;">Welcome to Prime Finance 🎉</h2>
        <p>Hi <b>${firstName}</b>,</p>
        <p>We’re excited to have you on board. Your financial journey starts here.</p>
        <p style="margin-top:20px;">Best regards,<br/>Prime Finance Team</p>
      </div>
    `;
            return this.sendEmail(to, "Welcome to Prime Finance", html);
        });
    }
    static sendLoginAlert(to, firstName) {
        return __awaiter(this, void 0, void 0, function* () {
            const html = `
      <div style="font-family: Arial, sans-serif; padding:20px;">
        <h2 style="color:#16a34a;">Login Alert ✅</h2>
        <p>Hi <b>${firstName}</b>,</p>
        <p>Your account was just accessed. If this wasn’t you, please reset your password immediately.</p>
        <p style="margin-top:20px;">Stay safe,<br/>Prime Finance Security Team</p>
      </div>
    `;
            return this.sendEmail(to, "Login Alert – Prime Finance", html);
        });
    }
    static sendOtpEmail(to, firstName, pin) {
        return __awaiter(this, void 0, void 0, function* () {
            const html = `
      <div style="font-family: Arial, sans-serif; padding:20px;">
        <h2 style="color:#2563eb;">Password Reset Request 🔐</h2>
        <p>Dear <b>${firstName}</b>,</p>
        <p>We received a request to reset your password. Use the One-Time Password (OTP) below to proceed</p>
        <p>🔐 Your One-Time Password (OTP) is:</p>
        <h3 style="background:#f3f4f6; padding:10px; text-align:center; letter-spacing:3px;">${pin}</h3>
        <p>This code is valid for the next 10 minutes. If you did not request a password reset, please ignore this email or contact our support team immediately.</p>
        <br /><br />
        <p>Stay secure,</p>
        <p>Prime Finance Support Team</p>
        <p>support@primefinance.live | primefinance.live</p>
      </div>
    `;
            return this.sendEmail(to, "Reset Your Password – OTP Code", html);
        });
    }
    static sendLoanApplicationAdmin(user, title, content, admins, loan) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = `
      <p>${content}</p>
      <p><strong>User:</strong> ${user.user_metadata.first_name} ${user.user_metadata.surname}</p>
      <p><strong>Amount:</strong> ₦${loan.amount}</p>
      <p><strong>Category:</strong> ${loan.category || "N/A"}</p>
      <p><strong>Duration:</strong> ${loan.duration || "N/A"} days</p>
      <p><strong>Loan ID:</strong> ${loan._id}</p>
    `;
            return this.sendEmail(admins, title, this.template("Admin Notification", body));
        });
    }
    static sendLoanApproval(user, loan) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = `
      <p>Congratulations <strong>${user.user_metadata.first_name}</strong>!</p>
      <p>Your loan of <strong>₦${loan.amount}</strong> has been disbursed successfully.</p>
      <p>Repayment is due on <strong>${loan.repayment_date}</strong>.</p>
      <p style="color:green; font-weight:bold;">Use your funds wisely and repay on time to grow your loan limit, and get funded higher loan amounts.</p>
    `;
            return this.sendEmail(user.email, "Loan Approved & Disbursed", this.template("Loan Approved", body));
        });
    }
    static sendLoanRepayment(user, repayAmount, message) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = `
      <p>Hi <strong>${user.user_metadata.first_name}</strong>,</p>
      <p>Your repayment of <strong>₦${repayAmount}</strong> has been received successfully.</p>
      <p>${message}</p>
      <p>Thank you for your commitment!</p>
    `;
            return this.sendEmail(user.email, "Loan Repayment Successful", this.template("Repayment Confirmation", body));
        });
    }
    static sendLoanRejection(user, amount, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = `
      <p>Dear <strong>${user.user_metadata.first_name}</strong>,</p>
      <p>Unfortunately, your loan request for <strong>₦${amount}</strong> has been rejected.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p style="color:red; font-weight:bold;">Please work on improving your eligibility for future requests.</p>
    `;
            return this.sendEmail(user.email, "Loan Request Rejected", this.template("Loan Rejected", body));
        });
    }
    static sendDebitAlert(user, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = `
      <p>Hi <strong>${user.user_metadata.first_name}</strong>,</p>
      <p>Your transfer of <strong>₦${amount}</strong> has been complete.</p>
      <p>Kindly visit your dashboard to view transaction details.</p>
      <p style="color:#0d6efd; font-weight:bold;">Thank you for choosing Prime Finance.</p>
    `;
            return this.sendEmail(user.email, "Your Transfer Has Been Completed", this.template("Transfer Completed", body));
        });
    }
    static sendCreditAlert(user, amount, originator_account_name, reference) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = `
      <p>Hi <strong>${user.user_metadata.first_name}</strong>,</p>
      <p>Your wallet has been credited with ₦${amount} from ${originator_account_name}.</p>
      <p style="color:gray; font-weight:bold;">Reference: ${reference}</p>
      <p>Kindly visit your dashboard to view transaction details.</p>
      <p style="color:#0d6efd; font-weight:bold;">Thank you for choosing Prime Finance.</p>
    `;
            return this.sendEmail(user.email, "Wallet Alert – Funds Credited", this.template("Wallet Credited", body));
        });
    }
}
exports.NotificationService = NotificationService;
