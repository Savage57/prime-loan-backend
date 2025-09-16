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
exports.checkPermission = checkPermission;
exports.getMailsByPermission = getMailsByPermission;
const exceptions_1 = require("../../exceptions");
const user_model_1 = __importDefault(require("../../modules/users/user.model"));
// Permission checker
function checkPermission(admin, permission) {
    if (!admin)
        throw new exceptions_1.UnauthorizedError("Unauthorized: No admin context");
    if (admin.is_super_admin)
        return true;
    if (!admin.permissions || !admin.permissions.includes(permission)) {
        throw new exceptions_1.UnauthorizedError(`Forbidden: Missing required permission '${permission}'`);
    }
    return true;
}
// Admin mails by permission
function getMailsByPermission(permission) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = "primefinancials68@gmail.com";
        const admins = yield user_model_1.default.find({ role: "admin" });
        const selectedAdmins = admins.filter(admin => admin.is_super_admin || (admin.permissions.includes(permission)));
        for (const admin of selectedAdmins) {
            if (result)
                result = result + ", " + admin.email;
            else
                result = result + admin.email;
        }
        return result;
    });
}
