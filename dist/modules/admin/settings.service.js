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
exports.SettingsService = void 0;
const settings_model_1 = require("./settings.model");
class SettingsService {
    /**
     * Get current system settings
     */
    static getSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            let settings = yield settings_model_1.Settings.findOne();
            if (!settings) {
                // initialize defaults if none exist
                settings = yield settings_model_1.Settings.create({
                    autoLoanApproval: true,
                    maxLoanAmount: 5000000,
                    minCreditScore: 0.4,
                    transferEnabled: true,
                    transferDailyLimit: 100000000,
                    savingsEnabled: true,
                    billPaymentEnabled: true,
                    updatedBy: "system"
                });
            }
            return settings;
        });
    }
    /**
     * Update system settings
     */
    static updateSettings(adminId, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            const settings = yield settings_model_1.Settings.findOneAndUpdate({}, Object.assign(Object.assign({}, updates), { updatedBy: adminId, updatedAt: new Date() }), { new: true, upsert: true });
            return settings;
        });
    }
}
exports.SettingsService = SettingsService;
