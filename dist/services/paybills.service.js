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
exports.PaybillsService = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const exceptions_1 = require("../exceptions");
const interfaces_1 = require("../interfaces");
function addEightPercent(value) {
    return String(value + (value * 0.03));
}
class PaybillsService {
    handleResponse(response) {
        console.log("Response:", response);
        console.log("Response data:", response.data);
        console.log("Response status code:", response.data.statuscode);
        console.log("Response status:", response.data.status);
        if (response.data && response.data.status && response.data.status !== interfaces_1.StatusCode.ORDER_RECEIVED) {
            throw new exceptions_1.APIError(Number(response.data.statuscode), interfaces_1.StatusDescriptions[response.data.status] || "System busy, try again later");
        }
        return Object.assign(Object.assign({}, response.data), { status: response.data.status });
    }
    ;
    CheckWalletBalance() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.check_wallet_balance());
            return response.data;
        });
    }
    ;
    QueryTransaction(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.query_transaction(orderId));
            return this.handleResponse(response);
        });
    }
    ;
    CancelTransaction(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.cancel_transaction(orderId));
            return this.handleResponse(response);
        });
    }
    ;
    BuyAirtime(amount, mobileNumber, mobileNetwork, bonusType) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.buy_airtime(amount, mobileNumber, mobileNetwork, bonusType));
            return this.handleResponse(response);
        });
    }
    ;
    GetDataPlans() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.data_plans());
            return ({
                MOBILE_NETWORK: {
                    Airtel: [{
                            ID: response.data.MOBILE_NETWORK.Airtel[0].ID,
                            PRODUCT: response.data.MOBILE_NETWORK.Airtel[0].PRODUCT.map((atl) => (Object.assign(Object.assign({}, atl), { PRODUCT_AMOUNT: addEightPercent(Number(atl.PRODUCT_AMOUNT)) })))
                        }],
                    Glo: [{
                            ID: response.data.MOBILE_NETWORK.Glo[0].ID,
                            PRODUCT: response.data.MOBILE_NETWORK.Glo[0].PRODUCT.map((atl) => (Object.assign(Object.assign({}, atl), { PRODUCT_AMOUNT: addEightPercent(Number(atl.PRODUCT_AMOUNT)) })))
                        }],
                    m_9mobile: [{
                            ID: response.data.MOBILE_NETWORK.m_9mobile[0].ID,
                            PRODUCT: response.data.MOBILE_NETWORK.m_9mobile[0].PRODUCT.map((atl) => (Object.assign(Object.assign({}, atl), { PRODUCT_AMOUNT: addEightPercent(Number(atl.PRODUCT_AMOUNT)) })))
                        }],
                    MTN: [{
                            ID: response.data.MOBILE_NETWORK.MTN[0].ID,
                            PRODUCT: response.data.MOBILE_NETWORK.MTN[0].PRODUCT.map((atl) => (Object.assign(Object.assign({}, atl), { PRODUCT_AMOUNT: addEightPercent(Number(atl.PRODUCT_AMOUNT)) })))
                        }],
                }
            });
        });
    }
    ;
    BuyData(dataPlan, mobileNumber, mobileNetwork) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.buy_data(dataPlan, mobileNumber, mobileNetwork));
            return this.handleResponse(response);
        });
    }
    ;
    GetTvPackages() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.tv_packages());
            return ({
                TV_ID: {
                    DStv: [{
                            ID: response.data.TV_ID.DStv[0].ID,
                            PRODUCT: response.data.TV_ID.DStv[0].PRODUCT.map((atl) => (Object.assign(Object.assign({}, atl), { PACKAGE_AMOUNT: addEightPercent(Number(atl.PACKAGE_AMOUNT)) })))
                        }],
                    GOtv: [{
                            ID: response.data.TV_ID.GOtv[0].ID,
                            PRODUCT: response.data.TV_ID.GOtv[0].PRODUCT.map((atl) => (Object.assign(Object.assign({}, atl), { PACKAGE_AMOUNT: addEightPercent(Number(atl.PACKAGE_AMOUNT)) })))
                        }],
                    Showmax: [{
                            ID: response.data.TV_ID.Showmax[0].ID,
                            PRODUCT: response.data.TV_ID.Showmax[0].PRODUCT.map((atl) => (Object.assign(Object.assign({}, atl), { PACKAGE_AMOUNT: addEightPercent(Number(atl.PACKAGE_AMOUNT)) })))
                        }],
                    Startimes: [{
                            ID: response.data.TV_ID.Startimes[0].ID,
                            PRODUCT: response.data.TV_ID.Startimes[0].PRODUCT.map((atl) => (Object.assign(Object.assign({}, atl), { PACKAGE_AMOUNT: addEightPercent(Number(atl.PACKAGE_AMOUNT)) })))
                        }],
                }
            });
        });
    }
    ;
    VerifyTvNumber(cableTV, smartCardNo) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.verify_tv_no(cableTV, smartCardNo));
            return response.data;
        });
    }
    ;
    BuyTv(cableTV, pkg, smartCardNo, phoneNo) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.buy_tv(cableTV, pkg, smartCardNo, phoneNo));
            return this.handleResponse(response);
        });
    }
    ;
    GetPowerSubscriptions() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.power_subscriptions());
            return response.data;
        });
    }
    ;
    VerifyPowerNumber(electricCompany, meterNo) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.verify_power_no(electricCompany, meterNo));
            return response.data;
        });
    }
    ;
    BuyPower(electricCompany, meterType, meterNo, amount, phoneNo) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.buy_power(electricCompany, meterType, meterNo, amount, phoneNo));
            return this.handleResponse(response);
        });
    }
    ;
    GetBettingPlatforms() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.betting_platforms());
            return response.data;
        });
    }
    VerifyBettingNumber(bettingCompany, customerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.verify_betting_no(bettingCompany, customerId));
            return response.data;
        });
    }
    BuyBetting(bettingCompany, customerId, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.buy_betting(bettingCompany, customerId, amount));
            return this.handleResponse(response);
        });
    }
    GetInternetPlans(mobileNetwork) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.internet_plans(mobileNetwork));
            return response.data;
        });
    }
    VerifySmileNumber(mobileNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.verify_smile_no("smile-direct", mobileNumber));
            return response.data;
        });
    }
    BuyInternet(mobileNetwork, dataPlan, mobileNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.buy_internet(mobileNetwork, dataPlan, mobileNumber));
            return this.handleResponse(response);
        });
    }
    GetWaecTypes() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.waec_types());
            return response.data;
        });
    }
    BuyWaec(examType, phoneNo) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.buy_waec(examType, phoneNo));
            return this.handleResponse(response);
        });
    }
    GetJambTypes() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.jamb_types());
            return response.data;
        });
    }
    VerifyJambNumber(examType, profileId) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.verify_jamb_no(examType, profileId));
            return response.data;
        });
    }
    BuyJamb(examType, phoneNo) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(config_1.CLUB_KONNECT_API_URLs.buy_jamb(examType, phoneNo));
            return this.handleResponse(response);
        });
    }
}
exports.PaybillsService = PaybillsService;
