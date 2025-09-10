import { UnauthorizedError } from "../../exceptions";
import { User as IUser, AdminPermission } from "../../modules/users/user.interface";
import User from "../../modules/users/user.model";

// Permission checker
export function checkPermission(admin: IUser | null, permission: AdminPermission) {
  if (!admin) throw new UnauthorizedError("Unauthorized: No admin context");

  if (admin.is_super_admin) return true;

  if (!admin.permissions || !admin.permissions.includes(permission)) {
    throw new UnauthorizedError(`Forbidden: Missing required permission '${permission}'`);
  }

  return true;
}

// Admin mails by permission
export async function getMailsByPermission(permission: AdminPermission) {
  let result = "primefinancials68@gmail.com";
  const admins = await User.find({ role: "admin" });

  const selectedAdmins = admins.filter(admin => admin.is_super_admin || (admin.permissions.includes(permission)))

  for(const admin of selectedAdmins){
    if(result)
      result = result+ ", " + admin.email;
    else
      result = result  + admin.email;
  }

  return result;
}