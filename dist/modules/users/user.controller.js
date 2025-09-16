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
exports.UserController = void 0;
const user_service_1 = require("./user.service");
class UserController {
    /**
     * Register a new user
     */
    static register(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield user_service_1.UserService.createClientAccount(req.body);
                res.status(201).json({
                    status: "success",
                    data: user,
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Login
     */
    static login(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, password } = req.body;
                const result = yield user_service_1.UserService.login(email, password);
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
     * Get user profile
     */
    static profile(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield user_service_1.UserService.getUser(req.user._id);
                res.status(200).json({
                    status: "success",
                    data: user,
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Update user fields
     */
    static update(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { field, value } = req.body;
                const updatedUser = yield user_service_1.UserService.update(req.user._id, field, value);
                res.status(200).json({
                    status: "success",
                    data: updatedUser,
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Initiate password or pin reset (sends OTP)
     */
    static initiateReset(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, type } = req.body;
                const userService = new user_service_1.UserService();
                const result = yield userService.initiateReset(email, type);
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
     * Validate reset OTP
     */
    static validateReset(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, pin } = req.body;
                const userService = new user_service_1.UserService();
                const result = yield userService.validateReset(email, pin);
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
     * Update password or pin after validation
     */
    static updatePasswordOrPin(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, newPassword, newPin } = req.body;
                const userService = new user_service_1.UserService();
                const result = yield userService.updatePasswordOrPin(email, newPassword, newPin);
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
     * Change password for logged-in user
     */
    static changePassword(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { oldPassword, newPassword } = req.body;
                const userService = new user_service_1.UserService();
                const result = yield userService.changePassword(req.user._id, oldPassword, newPassword);
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
}
exports.UserController = UserController;
