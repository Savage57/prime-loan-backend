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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const passwordUtils_1 = require("../../shared/utils/passwordUtils");
const vfd_provider_1 = require("../../shared/providers/vfd.provider");
const notification_service_1 = require("../notifications/notification.service");
const exceptions_1 = require("../../exceptions");
const user_model_1 = __importDefault(require("./user.model"));
const transfer_service_1 = require("../transfers/transfer.service");
const convertDate_1 = require("../../shared/utils/convertDate");
const config_1 = require("../../config");
const constants_1 = require("../../constants");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const LedgerService_1 = require("../ledger/LedgerService");
const savings_plan_model_1 = require("../savings/savings.plan.model");
const loan_model_1 = __importDefault(require("../loans/loan.model"));
class UserService {
    /**
     * Create client account with enhanced validation and wallet setup
     */
    static createClientAccount(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const { email, name, surname, phone, bvn, nin, password, dob, pin } = data;
            // Enhanced validation
            if (!email || !name || !surname || !phone || !bvn || !password || !nin || !dob || !pin) {
                throw new exceptions_1.BadRequestError("All required fields must be provided");
            }
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new exceptions_1.BadRequestError("Invalid email format");
            }
            // Validate phone format (Nigerian numbers)
            const phoneRegex = /^(\+234|234|0)[789][01]\d{8}$/;
            if (!phoneRegex.test(phone)) {
                throw new exceptions_1.BadRequestError("Invalid Nigerian phone number format");
            }
            // Validate BVN and NIN length
            if (bvn.length !== 11 || nin.length !== 11) {
                throw new exceptions_1.BadRequestError("BVN and NIN must be exactly 11 digits");
            }
            // Check for existing users
            const duplicateEmail = yield user_model_1.default.findOne({ email });
            const duplicateNumber = yield user_model_1.default.findOne({ "user_metadata.phone": phone });
            const duplicateNIN = yield user_model_1.default.findOne({ "user_metadata.nin": nin });
            const duplicateBVN = yield user_model_1.default.findOne({ "user_metadata.bvn": bvn });
            if (duplicateEmail)
                throw new exceptions_1.ConflictError(`A user already exists with the email: ${email}`);
            if (duplicateNumber)
                throw new exceptions_1.ConflictError(`A user already exists with the phone number: ${phone}`);
            if (duplicateNIN)
                throw new exceptions_1.ConflictError(`A user already exists with the NIN: ${nin}`);
            if (duplicateBVN)
                throw new exceptions_1.ConflictError(`A user already exists with the BVN: ${bvn}`);
            data.password = (0, passwordUtils_1.encryptPassword)(data.password);
            // Create VFD account
            const response = yield UserService.vfdProvider.createClient({ bvn: data.bvn, dob: data.dob });
            if (!((_a = response.data) === null || _a === void 0 ? void 0 : _a.accountNo)) {
                throw new exceptions_1.BadRequestError("Failed to create bank account. Please verify your BVN and date of birth.");
            }
            const user = yield user_model_1.default.create({
                password: data.password,
                refresh_tokens: [],
                user_metadata: {
                    email,
                    first_name: name,
                    surname,
                    phone,
                    bvn,
                    nin,
                    dateOfBirth: dob,
                    accountNo: (_b = response.data) === null || _b === void 0 ? void 0 : _b.accountNo,
                    pin,
                    wallet: "0",
                    creditScore: 1.0,
                    ladderIndex: 0,
                    signupBonusReceived: false
                },
                role: "user",
                confirmation_sent_at: (0, convertDate_1.getCurrentTimestamp)(),
                confirmed_at: "",
                email,
                email_confirmed_at: "",
                is_anonymous: false,
                phone,
                is_super_admin: false,
                status: "active"
            });
            // Initialize user wallet in ledger
            yield LedgerService_1.LedgerService.createEntry({
                traceId: `user_init_${user._id}`,
                userId: user._id,
                account: `user_wallet:${user._id}`,
                entryType: 'CREDIT',
                category: 'transfer',
                subtype: 'wallet_initialization',
                amount: 0,
                status: 'COMPLETED',
                meta: {
                    reason: 'Initial wallet setup'
                }
            });
            // Credit signup bonus (async)
            transfer_service_1.TransferService.createUserBonus(user._id, 5000).catch(console.error); // ₦50 bonus
            // Send welcome email (async)
            yield notification_service_1.NotificationService.sendWelcomeEmail(user.email, user.user_metadata.first_name || "");
            return user;
        });
    }
    /**
     * Get user with enhanced data
     */
    static getUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield user_model_1.default.findById(userId);
            if (!user)
                throw new exceptions_1.NotFoundError(`No user found`);
            if (user.status !== "active")
                throw new exceptions_1.UnauthorizedError(`Account has been suspended! Contact admin for revert action.`);
            // Get real-time wallet balance from ledger
            const walletBalance = yield LedgerService_1.LedgerService.getUserWalletBalance(userId);
            // Update user wallet if different
            if (parseInt(user.user_metadata.wallet || "0") !== walletBalance) {
                user.user_metadata.wallet = String(walletBalance);
                yield user.save();
            }
            return user;
        });
    }
    /**
     * Enhanced login with security features
     */
    static login(email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!email || !password) {
                throw new exceptions_1.BadRequestError("Email and password are required");
            }
            const user = yield user_model_1.default.findOne({ email });
            if (!user)
                throw new exceptions_1.UnauthorizedError("Invalid Email");
            if ((user === null || user === void 0 ? void 0 : user.status) && user.status !== "active")
                throw new exceptions_1.UnauthorizedError(`Account has been suspended! Contact admin for revert action.`);
            const { password: encrypted } = user;
            // decrypt found user password
            const decrypted = (0, passwordUtils_1.decodePassword)(encrypted);
            // compare decrypted password with sent password
            if (password !== decrypted)
                throw new exceptions_1.UnauthorizedError(`Incorrect Password!`);
            const { password: dbPassword } = user, // strip out password so would'nt send back to client
            _user = __rest(user, ["password"]);
            const userToSign = {
                accountType: user.role,
                id: _user._id
            };
            // create JWTs
            const accessToken = jsonwebtoken_1.default.sign(userToSign, String(config_1.ACCESS_TOKEN_SECRET), {
                expiresIn: constants_1.ACCESS_TOKEN_EXPIRES_IN,
            });
            const refreshToken = jsonwebtoken_1.default.sign(userToSign, String(config_1.REFRESH_TOKEN_SECRET), {
                expiresIn: constants_1.REFRESH_TOKEN_EXPIRES,
            });
            // update current user refresh token
            const refreshTokens = user.refresh_tokens;
            refreshTokens.push(refreshToken);
            user.refresh_tokens = refreshTokens;
            // Limit refresh tokens to prevent memory bloat
            if (refreshTokens.length > 5) {
                refreshTokens.splice(0, refreshTokens.length - 5);
            }
            user.last_sign_in_at = (0, convertDate_1.getCurrentTimestamp)();
            yield user.save();
            // Send login alert (async)
            yield notification_service_1.NotificationService.sendLoginAlert(user.email, user.user_metadata.first_name || "");
            return Object.assign(Object.assign({}, _user), { refreshToken, accessToken });
        });
    }
    /**
     * Enhanced update with validation
     */
    static update(userId, field, value) {
        return __awaiter(this, void 0, void 0, function* () {
            // Validate field path to prevent unauthorized updates
            const allowedFields = [
                'user_metadata.phone',
                'user_metadata.address',
                'user_metadata.profile_photo',
                'user_metadata.first_name',
                'user_metadata.surname'
            ];
            if (!allowedFields.includes(field)) {
                throw new exceptions_1.BadRequestError(`Field '${field}' is not allowed to be updated`);
            }
            return user_model_1.default.findByIdAndUpdate(userId, { [field]: value }, { new: true });
        });
    }
    /**
     * Enhanced password reset with rate limiting
     */
    initiateReset(email, type) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!email)
                throw new exceptions_1.BadRequestError("Provide a valid email");
            if (!type)
                throw new exceptions_1.BadRequestError("Provide a valid type");
            if (!['password', 'pin'].includes(type)) {
                throw new exceptions_1.BadRequestError("Type must be either 'password' or 'pin'");
            }
            const foundUser = yield user_model_1.default.findOne({ email });
            if (!foundUser)
                throw new exceptions_1.NotFoundError("No user found");
            // Rate limiting: Check if user has requested reset in last 5 minutes
            const recentUpdates = ((_a = foundUser.updates) === null || _a === void 0 ? void 0 : _a.filter((update) => {
                const updateTime = new Date(update.created_at);
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                return updateTime > fiveMinutesAgo;
            })) || [];
            if (recentUpdates.length >= 3) {
                throw new exceptions_1.BadRequestError("Too many reset requests. Please wait 5 minutes before trying again.");
            }
            const pin = Math.floor(100000 + Math.random() * 900000);
            // Initialize updates array if it doesn't exist
            const updates = [
                ...(foundUser.updates || []), // Handle undefined updates array
                {
                    pin,
                    type,
                    status: "awaiting_validation",
                    created_at: new Date().toISOString() // Include full timestamp
                }
            ];
            yield notification_service_1.NotificationService.sendOtpEmail(email, foundUser.user_metadata.first_name, pin);
            const res = yield user_model_1.default.findByIdAndUpdate(foundUser._id, { updates });
            return res;
        });
    }
    ;
    /**
     * Enhanced OTP validation
     */
    validateReset(email, pin) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!email)
                throw new exceptions_1.BadRequestError('Email is required');
            if (!pin)
                throw new exceptions_1.BadRequestError('PIN is required');
            const foundUser = yield user_model_1.default.findOne({ email });
            if (!foundUser)
                throw new exceptions_1.NotFoundError('User not found with provided email');
            const updates = foundUser.updates;
            if (!updates || updates.length === 0) {
                throw new exceptions_1.BadRequestError('No reset request found');
            }
            const lastUpdate = updates[updates.length - 1];
            const currentTime = new Date();
            const createdAt = new Date(lastUpdate.created_at);
            // Calculate time difference in milliseconds
            const timeDiff = currentTime.getTime() - createdAt.getTime();
            // Check if PIN is correct and within 10-minute window
            if (String(lastUpdate.pin) !== pin || timeDiff > 10 * 60 * 1000) { // 10 minutes in milliseconds
                lastUpdate.status = "invalid";
                yield user_model_1.default.findByIdAndUpdate(foundUser._id, { updates });
                throw new exceptions_1.BadRequestError('Invalid or expired OTP');
            }
            lastUpdate.status = "validated";
            yield user_model_1.default.findByIdAndUpdate(foundUser._id, { updates });
            return foundUser;
        });
    }
    ;
    /**
     * Enhanced password/pin update
     */
    updatePasswordOrPin(email, newPassword, newPin) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!email)
                throw new exceptions_1.BadRequestError(`Provide a valid email`);
            const foundUser = yield user_model_1.default.findOne({ email });
            if (!foundUser)
                throw new exceptions_1.NotFoundError(`No user found`);
            // Get the last update from the updates array
            const lastUpdate = foundUser.updates[foundUser.updates.length - 1];
            // Check if last update exists and is validated
            if (!lastUpdate || lastUpdate.status !== "validated") {
                throw new exceptions_1.BadRequestError(`Password or PIN update is not validated`);
            }
            // Hash the new password if provided
            if (newPassword) {
                if (newPassword.length < 8) {
                    throw new exceptions_1.BadRequestError("Password must be at least 8 characters long");
                }
                const hashedPassword = (0, passwordUtils_1.encryptPassword)(newPassword);
                yield user_model_1.default.findByIdAndUpdate(foundUser._id, { password: hashedPassword }); // Save password
                return true;
            }
            // Update the new PIN if provided
            if (newPin) {
                if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
                    throw new exceptions_1.BadRequestError("PIN must be exactly 4 digits");
                }
                yield user_model_1.default.findByIdAndUpdate(foundUser._id, { "user_metadata.pin": newPin }); // Save PIN (if you have a separate update mechanism)
                return true;
            }
            return false;
        });
    }
    ;
    /**
     * Enhanced password change with validation
     */
    changePassword(userId, oldPassword, newPassword) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield user_model_1.default.findById(userId);
            if (!user)
                throw new exceptions_1.NotFoundError(`No user found`);
            // Validate new password
            if (newPassword.length < 8) {
                throw new exceptions_1.BadRequestError("New password must be at least 8 characters long");
            }
            // Verify old password
            const decrypted = (0, passwordUtils_1.decodePassword)(user.password);
            if (oldPassword !== decrypted) {
                throw new exceptions_1.UnauthorizedError(`Current password is incorrect`);
            }
            const encrypted = (0, passwordUtils_1.encryptPassword)(newPassword);
            user.password = encrypted;
            // Clear all refresh tokens to force re-login
            user.refresh_tokens = [];
            yield user.save();
            return user;
        });
    }
    /**
     * Find user by account number
     */
    static findByAccountNo(accountNo) {
        return __awaiter(this, void 0, void 0, function* () {
            return user_model_1.default.findOne({ "user_metadata.accountNo": accountNo });
        });
    }
    /**
     * Find user by email
     */
    static findByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            return user_model_1.default.findOne({ email });
        });
    }
    /**
     * Get user transaction history with pagination
     */
    static getUserTransactionHistory(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, page = 1, limit = 20) {
            return yield transfer_service_1.TransferService.transfers(userId, page, limit);
        });
    }
    /**
     * Get user financial summary
     */
    static getUserFinancialSummary(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const [walletBalance, activeLoans, savingsPlans] = yield Promise.all([
                LedgerService_1.LedgerService.getUserWalletBalance(userId),
                loan_model_1.default.find({
                    userId,
                    loan_payment_status: { $in: ['in-progress', 'not-started'] }
                }),
                savings_plan_model_1.SavingsPlan.find({ userId, status: 'ACTIVE' })
            ]);
            const totalLoanOutstanding = activeLoans.reduce((sum, loan) => sum + (loan.outstanding || 0), 0);
            const totalSavings = savingsPlans.reduce((sum, plan) => sum + plan.principal, 0);
            return {
                walletBalance,
                totalLoanOutstanding,
                totalSavings,
                activeLoansCount: activeLoans.length,
                activeSavingsCount: savingsPlans.length,
                creditScore: yield this.getUserCreditScore(userId)
            };
        });
    }
    /**
     * Get user credit score
     */
    static getUserCreditScore(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield user_model_1.default.findById(userId);
            return (user === null || user === void 0 ? void 0 : user.user_metadata.creditScore) || 0;
        });
    }
}
exports.UserService = UserService;
UserService.vfdProvider = new vfd_provider_1.VfdProvider();
