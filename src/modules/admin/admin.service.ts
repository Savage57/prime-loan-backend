import { encryptPassword, decodePassword } from "../../utils";
import { VfdProvider } from "../../shared/providers/vfd.provider";
import { NotificationService } from "../notifications/notification.service";
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from "../../exceptions";
import User from "../users/user.model";
import { getCurrentTimestamp } from "../../utils/convertDate";

export class AdminService {
     async createAdminAccount(req: { email: string, name: string, surname: string, password: string, phone: string, is_super_admin: boolean }) {
        const { email, name, surname, password, phone, is_super_admin } = req;
    
        const duplicateEmail = await User.findOne({ email });
    
        const duplicateNumber = await User.findOne({ user_metadata: { phone } });
        
        if (duplicateEmail)
          throw new ConflictError(`A user already exists with the email ${email}`)
        if (duplicateNumber)
          throw new ConflictError(`A user already exists with the phone number ${phone}`)
    
        req.password = encryptPassword(password);
    
        const user: any = await User.create({ 
          password: req.password,
          user_metadata: { email, first_name: name, surname, phone }, 
          role: "admin",
          confirmation_sent_at: getCurrentTimestamp(),
          confirmed_at: "",
          email,
          email_confirmed_at: "", 
          is_anonymous: false,
          phone,
          is_super_admin,
          status: "active"
        });
    
        return user;
    }

    async getAdmin(adminId: string)  {
        const foundAdmin: any = await User.find({ _id: adminId});

        if(foundAdmin.status !== "active") 
            throw new UnauthorizedError(`Account has been suspended! Contact super admin for revert action.`);

        if (!foundAdmin)
            throw new NotFoundError(`No admin found`);

        return foundAdmin;
    }

    async ActivateAndDeactivateAdmin(req: { status: string, adminId: string }) {
        const { status, adminId } = req; // Extract update field and data from request body
    
        const updatedAdmin = await User.findByIdAndUpdate(adminId, { status });
    
        return updatedAdmin;
    };

    async ActivateAndDeactivateUser(req: { status: string, userId: string }) {
        const { status, userId } = req; // Extract update field and data from request body

        const updatedUser = await User.findByIdAndUpdate(userId, { status });

        return updatedUser;
    };
}
