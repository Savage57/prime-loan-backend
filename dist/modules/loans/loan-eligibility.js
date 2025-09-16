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
exports.LoanEligibilityService = void 0;
/**
 * Loan Eligibility Domain Service
 * Determines loan eligibility based on ladder, credit score, and business rules
 */
const loan_ladder_model_1 = require("./loan-ladder.model");
const loan_model_1 = __importDefault(require("./loan.model"));
const settings_service_1 = require("../admin/settings.service");
class LoanEligibilityService {
    /**
     * Calculate loan eligibility for a user
     */
    static calculateEligibility(user, requestedAmount) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Check for active loans
            // Note: This would need to query the loan service in real implementation
            const hasActiveLoan = yield loan_model_1.default.findOne({
                userId: user._id,
                loan_payment_status: { $in: ["in-progress", "not-started"] }
            });
            if (hasActiveLoan) {
                return {
                    eligible: false,
                    maxAmount: 0,
                    notifyAdmin: false,
                    reason: 'User has active loan'
                };
            }
            const settings = yield settings_service_1.SettingsService.getSettings();
            if (requestedAmount > settings.maxLoanAmount) {
                return {
                    eligible: false,
                    reason: "Requested amount exceeds maximum limit set by admin",
                    notifyAdmin: true,
                    maxAmount: settings.maxLoanAmount,
                };
            }
            // Get user's ladder index (default to 0 for new users)
            const ladderIndex = user.user_metadata.ladderIndex || 0;
            // Use custom ladder or default system ladder
            let ladderSteps = yield loan_ladder_model_1.LoanLadder.find();
            if (ladderIndex >= ladderSteps.length) {
                return {
                    eligible: true,
                    maxAmount: 0,
                    notifyAdmin: true,
                    reason: 'Loan Need to be approved manually'
                };
            }
            let maxAmount = ((_a = ladderSteps.find(ls => ls.step == ladderIndex)) === null || _a === void 0 ? void 0 : _a.amount) || 0;
            // Apply credit score adjustments (placeholder logic)
            const creditScore = user.user_metadata.creditScore || 1;
            if (creditScore < 0.4) {
                return {
                    eligible: false,
                    maxAmount: 0,
                    notifyAdmin: false,
                    reason: 'Your credit score is too low, you defaulted for too long. Try again after 5 days'
                };
            }
            return {
                eligible: true,
                maxAmount,
                notifyAdmin: false,
                creditScore,
                ladderIndex
            };
        });
    }
}
exports.LoanEligibilityService = LoanEligibilityService;
