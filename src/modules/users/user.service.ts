import { encryptPassword, decodePassword } from "../../shared/utils/passwordUtils";
import { VfdProvider } from "../../shared/providers/vfd.provider";
import { NotificationService } from "../notifications/notification.service";
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from "../../exceptions";
import User from "./user.model";
import { TransferService } from "../transfers/transfer.service";
import { getCurrentTimestamp } from "../../shared/utils/convertDate";
import { User as IUser } from "./user.interface";
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } from "../../config";
import { ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES } from "../../constants";
import JWT from "jsonwebtoken";
import { LedgerService } from "../ledger/LedgerService";
import { SavingsPlan } from "../savings/savings.plan.model";
import Loan from "../loans/loan.model";

export class UserService {
    private static vfdProvider = new VfdProvider();

    /**
     * Create client account with enhanced validation and wallet setup
     */
    static async createClientAccount(data: { 
        email: string, 
        name: string, 
        surname: string, 
        phone: string, 
        bvn: string,
        password: string,
        nin: string, 
        dob: string, 
        pin: string 
    }) {
        const { email, name, surname, phone, bvn, nin, password, dob, pin } = data;

        // Enhanced validation
        if (!email || !name || !surname || !phone || !bvn || !password || !nin || !dob || !pin) {
            throw new BadRequestError("All required fields must be provided");
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new BadRequestError("Invalid email format");
        }

        // Validate phone format (Nigerian numbers)
        const phoneRegex = /^(\+234|234|0)[789][01]\d{8}$/;
        if (!phoneRegex.test(phone)) {
            throw new BadRequestError("Invalid Nigerian phone number format");
        }

        // Validate BVN and NIN length
        if (bvn.length !== 11 || nin.length !== 11) {
            throw new BadRequestError("BVN and NIN must be exactly 11 digits");
        }

        // Check for existing users
        const duplicateEmail = await User.findOne({ email });
        const duplicateNumber = await User.findOne({ "user_metadata.phone": phone });
        const duplicateNIN = await User.findOne({ "user_metadata.nin": nin });
        const duplicateBVN = await User.findOne({ "user_metadata.bvn": bvn });

        if (duplicateEmail)
            throw new ConflictError(`A user already exists with the email: ${email}`)
        if (duplicateNumber)
            throw new ConflictError(`A user already exists with the phone number: ${phone}`)
        if (duplicateNIN)
            throw new ConflictError(`A user already exists with the NIN: ${nin}`)
        if (duplicateBVN)
            throw new ConflictError(`A user already exists with the BVN: ${bvn}`)

        data.password = encryptPassword(data.password);

        // Create VFD account
        const response = await UserService.vfdProvider.createClient({ bvn: data.bvn, dob: data.dob });

        if (!response.data?.accountNo) {
            throw new BadRequestError("Failed to create bank account. Please verify your BVN and date of birth.");
        }

        const user = await User.create({
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
                accountNo: response.data?.accountNo,
                pin,
                wallet: "0",
                creditScore: 1.0,
                ladderIndex: 0,
                signupBonusReceived: false
            }, 
            role: "user",
            confirmation_sent_at: getCurrentTimestamp(),
            confirmed_at: "",
            email,
            email_confirmed_at: "", 
            is_anonymous: false,
            phone,
            is_super_admin: false,
            status: "active"
        });

        // Initialize user wallet in ledger
        await LedgerService.createEntry({
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
        TransferService.createUserBonus(user._id, 5000).catch(console.error); // ₦50 bonus

        // Send welcome email (async)
        await NotificationService.sendWelcomeEmail(
            user.email,
            user.user_metadata.first_name || ""
        );

        return user;
    }

    /**
     * Get user with enhanced data
     */
    static async getUser(userId: string) {
        const user = await User.findById(userId);

        if (!user) throw new NotFoundError(`No user found`);

        if (user.status !== "active")
            throw new UnauthorizedError(`Account has been suspended! Contact admin for revert action.`);

        // Get real-time wallet balance from ledger
        const walletBalance = await LedgerService.getUserWalletBalance(userId);
        
        // Update user wallet if different
        if (parseInt(user.user_metadata.wallet || "0") !== walletBalance) {
            user.user_metadata.wallet = String(walletBalance);
            await user.save();
        }

        return user;
    }

    /**
     * Enhanced login with security features
     */
    static async login(email: string, password: string) {
        if (!email || !password) {
            throw new BadRequestError("Email and password are required");
        }

        // Find user (as a Mongoose doc so we can save)
        const user = await User.findOne({ email });
        if (!user) throw new UnauthorizedError("Invalid Email");

        if (user?.status && user.status !== "active") {
            throw new UnauthorizedError(`Account has been suspended! Contact admin for revert action.`);
        }

        // Verify password
        const decrypted = decodePassword(user.password);
        if (password !== decrypted) {
            throw new UnauthorizedError(`Incorrect Password!`);
        }

        // JWT payload
        const userToSign = {
            accountType: user.role,
            id: user._id
        };

        // Create JWTs
        const accessToken = JWT.sign(userToSign, String(ACCESS_TOKEN_SECRET), {
            expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        });

        const refreshToken = JWT.sign(userToSign, String(REFRESH_TOKEN_SECRET), {
            expiresIn: REFRESH_TOKEN_EXPIRES,
        });

        // Manage refresh tokens
        user.refresh_tokens.push(refreshToken);
        if (user.refresh_tokens.length > 5) {
            user.refresh_tokens.splice(0, user.refresh_tokens.length - 5);
        }

        // Update last sign in
        user.last_sign_in_at = getCurrentTimestamp();
        await user.save();

        // Send login alert (async, non-blocking)
        NotificationService.sendLoginAlert(
            user.email,
            user.user_metadata?.first_name || ""
        ).catch(() => null);

        // Convert to plain object after saving
        const userObj = user.toObject();

        // Remove sensitive/internal fields
        delete (userObj as any).password;
        delete (userObj as any).__v;
        delete (userObj as any).refresh_tokens;

        return {
            ...userObj,
            refreshToken,
            accessToken,
        };
    }


    /**
     * Enhanced update with validation
     */
    static async update(userId: string, field: string, value: any) {
        // Validate field path to prevent unauthorized updates
        const allowedFields = [
            'user_metadata.phone',
            'user_metadata.address',
            'user_metadata.profile_photo',
            'user_metadata.first_name',
            'user_metadata.surname'
        ];

        if (!allowedFields.includes(field)) {
            throw new BadRequestError(`Field '${field}' is not allowed to be updated`);
        }

        return User.findByIdAndUpdate(userId, { [field]: value }, { new: true });
    }

    /**
     * Enhanced password reset with rate limiting
     */
    async initiateReset(email: string, type: string) {
        if (!email) throw new BadRequestError("Provide a valid email");
        if (!type) throw new BadRequestError("Provide a valid type");
        if (!['password', 'pin'].includes(type)) {
            throw new BadRequestError("Type must be either 'password' or 'pin'");
        }
    
        const foundUser: any = await User.findOne({ email });
        if (!foundUser) throw new NotFoundError("No user found");

        // Rate limiting: Check if user has requested reset in last 5 minutes
        const recentUpdates = foundUser.updates?.filter((update: any) => {
            const updateTime = new Date(update.created_at);
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            return updateTime > fiveMinutesAgo;
        }) || [];

        if (recentUpdates.length >= 3) {
            throw new BadRequestError("Too many reset requests. Please wait 5 minutes before trying again.");
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

        await NotificationService.sendOtpEmail(email, foundUser.user_metadata.first_name, pin);

        const res = await User.findByIdAndUpdate(foundUser._id, { updates });

        return res;
    };

    /**
     * Enhanced OTP validation
     */
    async validateReset (email: string, pin: string) {
        if (!email) throw new BadRequestError('Email is required');
        if (!pin) throw new BadRequestError('PIN is required');

        const foundUser = await User.findOne({ email });

        if (!foundUser) throw new NotFoundError('User not found with provided email');
    
        const updates = foundUser.updates;
        if (!updates || updates.length === 0) {
            throw new BadRequestError('No reset request found');
        }
        
        const lastUpdate = updates[updates.length - 1];
        
        const currentTime = new Date();
        const createdAt = new Date(lastUpdate.created_at);
        
        // Calculate time difference in milliseconds
        const timeDiff = currentTime.getTime() - createdAt.getTime();
    
        // Check if PIN is correct and within 10-minute window
        if (String(lastUpdate.pin) !== pin || timeDiff > 10 * 60 * 1000) { // 10 minutes in milliseconds
          lastUpdate.status = "invalid";
          await User.findByIdAndUpdate(foundUser._id, { updates });
          throw new BadRequestError('Invalid or expired OTP');
        }
    
        lastUpdate.status = "validated";
        await User.findByIdAndUpdate(foundUser._id, { updates });

        return foundUser;
    };

    /**
     * Enhanced password/pin update
     */
    async updatePasswordOrPin (email: string, newPassword: string, newPin: string) {
        if (!email)
          throw new BadRequestError(`Provide a valid email`);

        const foundUser = await User.findOne({ email });

    
        if (!foundUser)
          throw new NotFoundError(`No user found`);
    
        // Get the last update from the updates array
        const lastUpdate = foundUser.updates[foundUser.updates.length - 1];
    
        // Check if last update exists and is validated
        if (!lastUpdate || lastUpdate.status !== "validated") {
          throw new BadRequestError(`Password or PIN update is not validated`);
        }
    
        // Hash the new password if provided
        if (newPassword) {
          if (newPassword.length < 8) {
            throw new BadRequestError("Password must be at least 8 characters long");
          }
          const hashedPassword = encryptPassword(newPassword);
          await User.findByIdAndUpdate(foundUser._id, { password: hashedPassword }); // Save password
          return true;
        }
    
        // Update the new PIN if provided
        if (newPin) {
          if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
            throw new BadRequestError("PIN must be exactly 4 digits");
          }
          await User.findByIdAndUpdate(foundUser._id, { "user_metadata.pin": newPin }); // Save PIN (if you have a separate update mechanism)
          return true;
        }

        return false;
    };
    
    /**
     * Enhanced password change with validation
     */
    async changePassword(userId: string, oldPassword: string, newPassword: string) {
        const user = await User.findById(userId);

        if (!user) throw new NotFoundError(`No user found`);

        // Validate new password
        if (newPassword.length < 8) {
            throw new BadRequestError("New password must be at least 8 characters long");
        }

        // Verify old password
        const decrypted = decodePassword(user.password);
        if (oldPassword !== decrypted) {
            throw new UnauthorizedError(`Current password is incorrect`);
        }

        const encrypted = encryptPassword(newPassword);
        user.password = encrypted;
        
        // Clear all refresh tokens to force re-login
        user.refresh_tokens = [];
        await user.save();

        return user;
    }

    /**
     * Find user by account number
     */
    static async findByAccountNo(accountNo: string) {
        return User.findOne({ "user_metadata.accountNo": accountNo });
    }

    /**
     * Find user by email
     */
    static async findByEmail(email: string) {
        return User.findOne({ email });
    }

    /**
     * Get user transaction history with pagination
     */
    static async getUserTransactionHistory(userId: string, page = 1, limit = 20) {
        return await TransferService.transfers(userId, page, limit);
    }

    /**
     * Get user financial summary
     */
    static async getUserFinancialSummary(userId: string) {
        const [walletBalance, activeLoans, savingsPlans] = await Promise.all([
            LedgerService.getUserWalletBalance(userId),
            Loan.find({ 
                userId, 
                loan_payment_status: { $in: ['in-progress', 'not-started'] } 
            }),
            SavingsPlan.find({ userId, status: 'ACTIVE' })
        ]);

        const totalLoanOutstanding = activeLoans.reduce((sum, loan) => sum + (loan.outstanding || 0), 0);
        const totalSavings = savingsPlans.reduce((sum, plan) => sum + plan.principal, 0);

        return {
            walletBalance,
            totalLoanOutstanding,
            totalSavings,
            activeLoansCount: activeLoans.length,
            activeSavingsCount: savingsPlans.length,
            creditScore: await this.getUserCreditScore(userId)
        };
    }

    /**
     * Get user credit score
     */
    private static async getUserCreditScore(userId: string) {
        const user = await User.findById(userId);
        return user?.user_metadata.creditScore || 0;
    }
}
