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
exports.SavingsController = void 0;
const savings_service_1 = require("./savings.service");
const settings_service_1 = require("../admin/settings.service");
const checkPermission_1 = require("../../shared/utils/checkPermission");
class SavingsController {
    /**
     * Create a savings plan
     */
    static createPlan(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { planType, planName, targetAmount, durationDays, amount, interestRate, renew } = req.body;
                const userId = req.user._id;
                const idempotencyKey = req.idempotencyKey;
                const setting = yield settings_service_1.SettingsService.getSettings();
                if (!setting.savingsEnabled) {
                    return res.status(400).json({
                        status: 'failed',
                        message: "Savings is currently in-active, try again later."
                    });
                }
                const result = yield savings_service_1.SavingsService.createPlan({
                    userId,
                    planType,
                    planName,
                    targetAmount,
                    durationDays,
                    amount,
                    interestRate,
                    renew,
                    idempotencyKey
                });
                res.status(201).json({
                    status: 'success',
                    data: result
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Withdraw from a savings plan
     */
    static withdraw(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { amount } = req.body;
                const userId = req.user._id;
                const idempotencyKey = req.idempotencyKey;
                const setting = yield settings_service_1.SettingsService.getSettings();
                if (!setting.savingsEnabled) {
                    return res.status(400).json({
                        status: 'failed',
                        message: "Savings is currently in-active, try again later."
                    });
                }
                const result = yield savings_service_1.SavingsService.completePlan({
                    planId: id,
                    userId,
                    amount,
                    idempotencyKey
                });
                res.status(200).json({
                    status: 'success',
                    data: result
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Get all savings plans for the logged-in user
     */
    static getUserPlans(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user._id;
                const page = Number(req.query.page) || 1;
                const limit = Number(req.query.limit) || 20;
                const plans = yield savings_service_1.SavingsService.getUserPlans(userId, page, limit);
                res.status(200).json({
                    status: 'success',
                    data: plans
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Get all users savings plans for the logged-in admin
     */
    static getPlans(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const admin = req.admin;
                (0, checkPermission_1.checkPermission)(admin, 'view_savings');
                const page = Number(req.query.page) || 1;
                const limit = Number(req.query.limit) || 20;
                const plans = yield savings_service_1.SavingsService.getAllPlans(page, limit);
                res.status(200).json({
                    status: 'success',
                    data: plans
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Admin: Get portfolio savings statistics
     */
    static getAdminStats(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const admin = req.admin;
                (0, checkPermission_1.checkPermission)(admin, 'view_savings');
                const stats = yield savings_service_1.SavingsService.getAdminSavingsStats();
                res.status(200).json({
                    status: 'success',
                    data: stats
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Admin: Get savings plans by category (active, matured, withdrawn)
     */
    static getSavingsByCategory(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const admin = req.admin;
                (0, checkPermission_1.checkPermission)(admin, 'view_savings');
                const category = String(req.query.category || 'active');
                const page = Number(req.query.page) || 1;
                const limit = Number(req.query.limit) || 20;
                const result = yield savings_service_1.SavingsService.getSavingsByCategory(category, page, limit);
                res.status(200).json({
                    status: 'success',
                    data: result
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.SavingsController = SavingsController;
