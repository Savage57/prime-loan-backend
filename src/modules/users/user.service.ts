import { encryptPassword, decodePassword } from "../../utils";
import { VfdProvider } from "../../shared/providers/vfd.provider";
import { NotificationService } from "../notifications/notification.service";
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from "../../exceptions";
import User from "./user.model";
import { TransferService } from "../transfers/transfer.service";
import { getCurrentTimestamp } from "../../utils/convertDate";
import { User as IUser } from "./user.interface";
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } from "../../config";
import { ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES } from "../../constants";
import JWT from "jsonwebtoken";

export class UserService {
    private static vfdProvider = new VfdProvider();

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
        const { email, name, surname, phone, bvn, nin, dob, pin } = data;

        const duplicateEmail = await User.findOne({ email });

        const duplicateNumber = await User.findOne({ user_metadata: { phone } });

        const duplicateNIN = await User.findOne({ user_metadata: { nin } });

        if (duplicateEmail)
            throw new ConflictError(`A user already exists with the email: ${email}`)
        if (duplicateNumber)
        throw new ConflictError(`A user already exists with the phone number: ${phone}`)
        if (duplicateNIN)
        throw new ConflictError(`A user already exists with the NIN: ${nin}`)

        data.password = encryptPassword(data.password);

        const response = await UserService.vfdProvider.createClient({ bvn: data.bvn, dob: data.dob });

        const user = await User.create({
            password: data.password,
            user_metadata: { 
                email, 
                first_name: name, 
                surname, 
                phone, 
                bvn, 
                nin, 
                dateOfBirth: dob,
                accountNo: response.data?.accountNo,
                pin 
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

        // Optional: credit signup bonus
        await TransferService.createUserBonus(user._id, 50);

        await NotificationService.sendWelcomeEmail(
            user.email,
            user.user_metadata.first_name || ""
        );

        return user;
    }

    static async getUser(userId: string) {
        const user = await User.findById(userId);

        if (!user) throw new NotFoundError(`No user found`);

        if (user.status !== "active")
            throw new UnauthorizedError(`Account has been suspended! Contact admin for revert action.`);

        return user;
    }

    static async login(email: string, password: string) {
        const user = await User.findOne({ email });
        if (!user) throw new UnauthorizedError("Invalid Email");
        
        if (!user)
            throw new UnauthorizedError(`Invalid Email Address!`);

        if(user?.status && user.status !== "active") 
            throw new UnauthorizedError(`Account has been suspended! Contact admin for revert action.`);

        const { password: encrypted } = user;

        // decrypt found user password
        const decrypted = decodePassword(encrypted);
    
        // compare decrypted password with sent password
        if (password !== decrypted)
            throw new UnauthorizedError(`Incorrect Password!`);
    
        const {
            password: dbPassword, // strip out password so would'nt send back to client
            ..._user
        } = user;

        const userToSign = {
            accountType: user.role,
            id: _user._id
        }
    
        // create JWTs
        const accessToken = JWT.sign(userToSign, String(ACCESS_TOKEN_SECRET), {
            expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        });
    
        const refreshToken = JWT.sign(userToSign, String(REFRESH_TOKEN_SECRET), {
            expiresIn: REFRESH_TOKEN_EXPIRES,
        });
    
        // update current user refresh token
        const refreshTokens = user.refresh_tokens
        refreshTokens.push(refreshToken)
        user.refresh_tokens = refreshTokens;
        await user.save();

        await NotificationService.sendLoginAlert(
            user.email,
            user.user_metadata.first_name || ""
        );

        return { ..._user, refreshToken, accessToken };
    }

    static async update(userId: string, field: string, value: any) {
        return User.findByIdAndUpdate(userId, { [field]: value }, { new: true });
    }

    async initiateReset(email: string, type: string) {
        if (!email) throw new BadRequestError("Provide a valid email");
        if (!type) throw new BadRequestError("Provide a valid type");
    
        const foundUser: any = await User.findOne({ email });
        if (!foundUser) throw new NotFoundError("No user found");
    
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

    async validateReset (email: string, pin: string) {
        if (!email) throw new BadRequestError('Email is required');
        if (!pin) throw new BadRequestError('PIN is required');

        const foundUser = await User.findOne({ email });

        if (!foundUser) throw new NotFoundError('User not found with provided email');
    
        const updates = foundUser.updates;
        const lastUpdate = updates[updates.length - 1];
        
        if (!lastUpdate) throw new BadRequestError('No reset request found');
    
        const currentTime = new Date();
        const createdAt = new Date(lastUpdate.created_at);
        
        // Calculate time difference in milliseconds
        const timeDiff = currentTime.getTime() - createdAt.getTime();
        console.log(`Time difference: timeDiff: ${timeDiff}, 10min: ${10 * 60 * 1000}`);
    
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
          const hashedPassword = await encryptPassword(newPassword); // Hashing the password with salt rounds
          await User.findByIdAndUpdate(foundUser._id, { password: hashedPassword }); // Save password
          return true;
        }
    
        // Update the new PIN if provided
        if (newPin) {
          await User.findByIdAndUpdate(foundUser._id, { "user_metadata.pin": newPin }); // Save PIN (if you have a separate update mechanism)
          return true;
        }

        return false;
    };
    
    async changePassword(userId: string, oldPassword: string, newPassword: string) {
        const user = await User.findById(userId);

        if (!user) throw new NotFoundError(`No user found`);

        // Decoding password
        const decrypted = decodePassword(oldPassword);

        if (oldPassword !== decrypted) throw new UnauthorizedError(`Invalid credentials`)

        const encrypted = encryptPassword(newPassword);

        user.password = encrypted;
        user.save();

        return user;
    }

    static async findByAccountNo(accountNo: string) {
        return User.findOne({ "user_metadata.accountNo": accountNo });
    }
}
