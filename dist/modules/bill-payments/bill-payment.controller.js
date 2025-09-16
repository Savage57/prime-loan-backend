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
exports.BillPaymentController = void 0;
const bill_payment_service_1 = require("./bill.payment.service");
const clubConnect_provider_1 = require("../../shared/providers/clubConnect.provider");
class BillPaymentController {
    /**
     * Initiate bill payment transaction
     */
    static initiate(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { amount, serviceType, serviceId, customerReference, extras } = req.body;
                const userId = req.user._id;
                const idempotencyKey = req.idempotencyKey;
                const result = yield bill_payment_service_1.BillPaymentService.initiateBillPayment({
                    userId,
                    amount,
                    serviceType,
                    serviceId,
                    customerReference,
                    extras,
                    idempotencyKey,
                });
                res.status(200).json({ status: "success", data: result });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Fetch status of a transaction
     */
    static getStatus(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const provider = new clubConnect_provider_1.ClubConnectsService();
                const result = yield provider.QueryTransaction(Number(id));
                res.status(200).json({ status: "success", data: result });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Cancel a transaction
     */
    static cancelTransaction(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const provider = new clubConnect_provider_1.ClubConnectsService();
                const result = yield provider.CancelTransaction(Number(id));
                res.status(200).json({ status: "success", data: result });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Wallet balance
     */
    static walletBalance(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const provider = new clubConnect_provider_1.ClubConnectsService();
                const balance = yield provider.CheckWalletBalance();
                res.status(200).json({ status: "success", data: balance });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * List data plans
     */
    static getDataPlans(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const provider = new clubConnect_provider_1.ClubConnectsService();
                const plans = yield provider.GetDataPlans();
                res.status(200).json({ status: "success", data: plans });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * List TV packages
     */
    static getTvPackages(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const provider = new clubConnect_provider_1.ClubConnectsService();
                const tv = yield provider.GetTvPackages();
                res.status(200).json({ status: "success", data: tv });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Verify TV smartcard number
     */
    static verifyTv(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { cableTV, smartCardNo } = req.body;
                const provider = new clubConnect_provider_1.ClubConnectsService();
                const result = yield provider.VerifyTvNumber(cableTV, Number(smartCardNo));
                res.status(200).json({ status: "success", data: result });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Electricity subscriptions
     */
    static getPowerSubscriptions(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const provider = new clubConnect_provider_1.ClubConnectsService();
                const subs = yield provider.GetPowerSubscriptions();
                res.status(200).json({ status: "success", data: subs });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Verify electricity meter number
     */
    static verifyPower(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { electricCompany, meterNo } = req.body;
                const provider = new clubConnect_provider_1.ClubConnectsService();
                const result = yield provider.VerifyPowerNumber(electricCompany, Number(meterNo));
                res.status(200).json({ status: "success", data: result });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Betting platforms
     */
    static getBettingPlatforms(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const provider = new clubConnect_provider_1.ClubConnectsService();
                const platforms = yield provider.GetBettingPlatforms();
                res.status(200).json({ status: "success", data: platforms });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Verify betting customer
     */
    static verifyBetting(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { bettingCompany, customerId } = req.body;
                const provider = new clubConnect_provider_1.ClubConnectsService();
                const result = yield provider.VerifyBettingNumber(bettingCompany, Number(customerId));
                res.status(200).json({ status: "success", data: result });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Internet plans
     */
    static getInternetPlans(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { network } = req.params; // "smile-direct" or "spectranet"
                const provider = new clubConnect_provider_1.ClubConnectsService();
                const result = yield provider.GetInternetPlans(network);
                res.status(200).json({ status: "success", data: result });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Verify Smile number
     */
    static verifySmile(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { mobileNumber } = req.body;
                const provider = new clubConnect_provider_1.ClubConnectsService();
                const result = yield provider.VerifySmileNumber(Number(mobileNumber));
                res.status(200).json({ status: "success", data: result });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * WAEC types
     */
    static getWaecTypes(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const provider = new clubConnect_provider_1.ClubConnectsService();
                const types = yield provider.GetWaecTypes();
                res.status(200).json({ status: "success", data: types });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * JAMB types
     */
    static getJambTypes(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const provider = new clubConnect_provider_1.ClubConnectsService();
                const types = yield provider.GetJambTypes();
                res.status(200).json({ status: "success", data: types });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Verify JAMB profile
     */
    static verifyJamb(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { examType, profileId } = req.body;
                const provider = new clubConnect_provider_1.ClubConnectsService();
                const result = yield provider.VerifyJambNumber(examType, Number(profileId));
                res.status(200).json({ status: "success", data: result });
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.BillPaymentController = BillPaymentController;
