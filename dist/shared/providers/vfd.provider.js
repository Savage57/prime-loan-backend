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
exports.VfdProvider = void 0;
/**
 * VFD Provider - Banking operations adapter
 * Wraps VFD API calls with retry logic and circuit breaker
 */
const axios_1 = __importDefault(require("axios"));
const circuit_1 = require("../utils/circuit");
const generateBearerToken_1 = require("../utils/generateBearerToken");
const config_1 = require("../../config");
/* ---------- PROVIDER CLASS ---------- */
class VfdProvider {
    constructor() {
        this.circuitBreaker = new circuit_1.CircuitBreaker({
            failureThreshold: 5,
            resetTimeout: 60000,
            monitoringPeriod: 300000,
        });
    }
    request(config) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.circuitBreaker.execute(() => __awaiter(this, void 0, void 0, function* () {
                const accessToken = yield (0, generateBearerToken_1.generateBearerToken)(config_1.customerKey, config_1.customerSecret);
                config.headers = Object.assign(Object.assign({}, (config.headers || {})), { AccessToken: accessToken, "Content-Type": "application/json" });
                config.timeout = config.timeout || 20000;
                config.url = `${config_1.baseUrl}${config.url}`;
                const response = yield (0, axios_1.default)(config);
                return response.data;
            }));
        });
    }
    /* ---------- CLIENT ---------- */
    createClient(req) {
        return __awaiter(this, void 0, void 0, function* () {
            let url = "/client/create";
            if (req.previousAccountNo) {
                url += `?previousAccountNo=${req.previousAccountNo}`;
            }
            else {
                url += `?bvn=${req.bvn}&dateOfBirth=${req.dob}`;
            }
            return this.request({ method: "POST", url, data: {} });
        });
    }
    /* ---------- ACCOUNT ---------- */
    getAccountInfo(accountNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = accountNumber
                ? `/account/enquiry?accountNumber=${accountNumber}`
                : "/account/enquiry";
            return this.request({ method: "GET", url });
        });
    }
    getPrimeAccountInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.getAccountInfo();
        });
    }
    /* ---------- BENEFICIARY ---------- */
    getBeneficiary(accountNo, bank, transferType) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = `/transfer/recipient?accountNo=${accountNo}&bank=${bank}&transfer_type=${transferType}`;
            return this.request({ method: "GET", url });
        });
    }
    /* ---------- BANK ---------- */
    getBanks() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request({ method: "GET", url: "/bank" });
        });
    }
    /* ---------- TRANSFER ---------- */
    transfer(request) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request({
                method: "POST",
                url: "/transfer",
                data: Object.assign(Object.assign({}, request), { amount: String(request.amount / 100) }),
            });
        });
    }
    /* ---------- TRANSACTIONS ---------- */
    queryTransaction(ref, sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            let url = "/transactions?";
            if (ref)
                url += `reference=${ref}`;
            else if (sessionId)
                url += `sessionId=${sessionId}`;
            else
                throw new Error("reference or sessionId required");
            return this.request({ method: "GET", url });
        });
    }
    queryReversal(reference) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request({
                method: "GET",
                url: `/transactions/reversal?reference=${reference}`,
            });
        });
    }
    retriggerWebhook(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request({
                method: "POST",
                url: "/transactions/repush",
                data: payload,
            });
        });
    }
    /* ---------- CREDIT (TEST) ---------- */
    simulateCredit(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.request({
                method: "POST",
                url: "/credit",
                data: payload,
            });
        });
    }
}
exports.VfdProvider = VfdProvider;
