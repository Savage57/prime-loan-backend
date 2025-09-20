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
exports.BillPaymentService = void 0;
/**
 * Bill Payment Orchestrator with Club Konnect Integration
 */
const clubConnect_provider_1 = require("../../shared/providers/clubConnect.provider");
const BillPaymentTransactionProcessor_1 = require("../../shared/transactions/BillPaymentTransactionProcessor");
const transfer_service_1 = require("../transfers/transfer.service");
const vfd_provider_1 = require("../../shared/providers/vfd.provider");
const user_model_1 = __importDefault(require("../users/user.model"));
const js_sha512_1 = require("js-sha512");
const bill_payment_model_1 = require("./bill-payment.model");
function requireExtra(value, name, service) {
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        throw new Error(`Missing required '${name}' for serviceType='${service}'`);
    }
    return value;
}
class BillPaymentService {
    static initiateBillPayment(req) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const provider = new clubConnect_provider_1.ClubConnectsService();
            const vfdProvider = new vfd_provider_1.VfdProvider();
            const userId = req.userId;
            const user = yield user_model_1.default.findById(userId);
            const from = (yield vfdProvider.getAccountInfo(user ? user.user_metadata.accountNo : "trx-user")).data;
            const to = (yield vfdProvider.getPrimeAccountInfo()).data;
            const prd = ((_a = req.extras) === null || _a === void 0 ? void 0 : _a.internetNetwork) ?
                req.extras.internetNetwork
                : ((_b = req.extras) === null || _b === void 0 ? void 0 : _b.mobileNetwork) ?
                    req.extras.mobileNetwork == "01" ?
                        "MTN"
                        : req.extras.mobileNetwork == "02" ?
                            "Glo"
                            : req.extras.mobileNetwork == "03" ?
                                "9Mobile"
                                : "Airtel"
                    : ((_c = req.extras) === null || _c === void 0 ? void 0 : _c.meterType) ?
                        req.extras.meterType == "01" ?
                            "Prepaid"
                            : "Postpaid"
                        : '';
            const idempotencyKey = req.idempotencyKey;
            return yield (0, BillPaymentTransactionProcessor_1.processTransaction)({
                userId: req.userId,
                amount: req.amount,
                serviceType: req.serviceType,
                serviceId: req.serviceId,
                customerReference: req.customerReference,
                idempotencyKey: req.idempotencyKey,
                providerFn: () => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b, _c, _d, _e, _f;
                    switch (req.serviceType) {
                        /**
                         * AIRTIME
                         * ClubConnectsService.BuyAirtime(amount, mobileNumber, mobileNetwork, bonusType?)
                         * - amount: req.amount
                         * - mobileNumber: Number(req.customerReference)
                         * - mobileNetwork: extras.mobileNetwork (REQUIRED)
                         * - bonusType: extras.bonusType (OPTIONAL)
                         */
                        case 'airtime': {
                            const mobileNetwork = requireExtra((_a = req.extras) === null || _a === void 0 ? void 0 : _a.mobileNetwork, 'extras.mobileNetwork', 'airtime');
                            const mobileNumber = Number(req.customerReference);
                            return provider.BuyAirtime(req.amount, mobileNumber, mobileNetwork, (_b = req.extras) === null || _b === void 0 ? void 0 : _b.bonusType);
                        }
                        /**
                         * DATA
                         * ClubConnectsService.BuyData(dataPlan, mobileNumber, mobileNetwork)
                         * - dataPlan: Number(req.serviceId) (REQUIRED)
                         * - mobileNumber: Number(req.customerReference)
                         * - mobileNetwork: extras.mobileNetwork (REQUIRED)
                         */
                        case 'data': {
                            const dataPlan = Number(req.serviceId);
                            if (Number.isNaN(dataPlan)) {
                                throw new Error(`Invalid 'serviceId' for data: expected numeric dataPlan, got '${req.serviceId}'`);
                            }
                            const mobileNetwork = requireExtra((_c = req.extras) === null || _c === void 0 ? void 0 : _c.mobileNetwork, 'extras.mobileNetwork', 'data');
                            const mobileNumber = Number(req.customerReference);
                            return provider.BuyData(dataPlan, mobileNumber, mobileNetwork);
                        }
                        /**
                         * TV
                         * ClubConnectsService.BuyTv(cableTV, pkg, smartCardNo, phoneNo)
                         * - cableTV: req.serviceId (REQUIRED)
                         * - pkg: extras.pkg (REQUIRED)
                         * - smartCardNo: Number(req.customerReference) (REQUIRED)
                         * - phoneNo: You may choose to pass a contact phone; reusing customerReference is common.
                         */
                        case 'tv': {
                            const cableTV = req.serviceId;
                            const pkg = requireExtra((_d = req.extras) === null || _d === void 0 ? void 0 : _d.pkg, 'extras.pkg', 'tv');
                            const smartCardNo = Number(req.customerReference);
                            const phoneNo = smartCardNo; // or pass a separate contact number if you store it elsewhere
                            return provider.BuyTv(cableTV, pkg, smartCardNo, phoneNo);
                        }
                        /**
                         * POWER
                         * ClubConnectsService.BuyPower(electricCompany, meterType, meterNo, amount, phoneNo)
                         * - electricCompany: req.serviceId (REQUIRED)
                         * - meterType: extras.meterType (REQUIRED)
                         * - meterNo: Number(req.customerReference) (REQUIRED)
                         * - amount: req.amount
                         * - phoneNo: a phone to receive token/SMS; reusing meterNo or separate phone is common
                         */
                        case 'power': {
                            const electricCompany = req.serviceId;
                            const meterType = requireExtra((_e = req.extras) === null || _e === void 0 ? void 0 : _e.meterType, 'extras.meterType', 'power');
                            const meterNo = Number(req.customerReference);
                            const phoneNo = meterNo; // or supply a distinct phone number if available
                            return provider.BuyPower(electricCompany, meterType, meterNo, req.amount, phoneNo);
                        }
                        /**
                         * BETTING
                         * ClubConnectsService.BuyBetting(bettingCompany, customerId, amount)
                         * - bettingCompany: req.serviceId
                         * - customerId: Number(req.customerReference)
                         * - amount: req.amount
                         */
                        case 'betting': {
                            const bettingCompany = req.serviceId;
                            const customerId = Number(req.customerReference);
                            return provider.BuyBetting(bettingCompany, customerId, req.amount);
                        }
                        /**
                         * INTERNET
                         * ClubConnectsService.BuyInternet(mobileNetwork, dataPlan, mobileNumber)
                         * - mobileNetwork: extras.internetNetwork ('smile-direct' | 'spectranet') (REQUIRED)
                         * - dataPlan: req.serviceId (string)
                         * - mobileNumber: Number(req.customerReference)
                         */
                        case 'internet': {
                            const internetNetwork = requireExtra((_f = req.extras) === null || _f === void 0 ? void 0 : _f.internetNetwork, 'extras.internetNetwork', 'internet');
                            const dataPlan = req.serviceId; // e.g., Smile/Spectranet plan code
                            const mobileNumber = Number(req.customerReference);
                            return provider.BuyInternet(internetNetwork, dataPlan, mobileNumber);
                        }
                        /**
                         * WAEC
                         * ClubConnectsService.BuyWaec(examType, phoneNo)
                         * - examType: req.serviceId
                         * - phoneNo: Number(req.customerReference)
                         */
                        case 'waec': {
                            const examType = req.serviceId;
                            const phoneNo = Number(req.customerReference);
                            return provider.BuyWaec(examType, phoneNo);
                        }
                        /**
                         * JAMB
                         * ClubConnectsService.BuyJamb(examType, phoneNo)
                         * - examType: req.serviceId
                         * - phoneNo: Number(req.customerReference)
                         */
                        case 'jamb': {
                            const examType = req.serviceId;
                            const phoneNo = Number(req.customerReference);
                            return provider.BuyJamb(examType, phoneNo);
                        }
                        default:
                            throw new Error(`Unsupported serviceType: ${req.serviceType}`);
                    }
                }),
                txnProvider: () => __awaiter(this, void 0, void 0, function* () {
                    // 1. Create transfer record + ledger entry (PENDING)
                    const result = yield transfer_service_1.TransferService.initiateTransfer({
                        fromAccount: from.accountNo,
                        userId,
                        toAccount: to.accountNo,
                        amount: req.amount,
                        transferType: "intra",
                        bankCode: "999999",
                        remark: `${prd} ${req.serviceType[0].toLocaleUpperCase()}${req.serviceType.slice(1)} Purchase`,
                        idempotencyKey,
                    });
                    // 2. Send transfer to VFD
                    const transferReq = {
                        uniqueSenderAccountId: from.accountId,
                        fromAccount: from.accountNo,
                        fromClientId: from.clientId,
                        fromClient: from.client,
                        fromSavingsId: from.accountId,
                        toAccount: to.accountNo,
                        toClient: to.client,
                        toSession: to.accountId,
                        toClientId: to.clientId,
                        toSavingsId: to.accountId,
                        toBank: "999999",
                        signature: js_sha512_1.sha512.hex(`${from.accountNo}${to.accountNo}`),
                        amount: req.amount,
                        remark: `${prd} ${req.serviceType[0].toLocaleUpperCase()}${req.serviceType.slice(1)} Purchase`,
                        transferType: "intra",
                        reference: result.reference,
                    };
                    return Object.assign(Object.assign({}, (yield vfdProvider.transfer(transferReq))), { reference: result.reference });
                })
            });
        });
    }
    static getUserBillPayments(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, page = 1, limit = 20, status, type, search) {
            const skip = (page - 1) * limit;
            const query = { userId };
            if (status)
                query.status = status;
            if (status)
                query.serviceType = type;
            if (search) {
                const regex = new RegExp(search, "i"); // case-insensitive search
                query.$or = [
                    { "traceId": regex },
                    { "providerRef": regex },
                    { "customerReference": regex },
                ];
            }
            const billPayments = yield bill_payment_model_1.BillPayment.find(query)
                .populate('userId', 'email user_metadata.first_name user_metadata.surname')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .lean();
            const total = yield bill_payment_model_1.BillPayment.countDocuments(query);
            return {
                billPayments,
                page,
                pages: Math.ceil(total / limit),
                total
            };
        });
    }
    static getBillPayments() {
        return __awaiter(this, arguments, void 0, function* (page = 1, limit = 20, status, type, search) {
            const skip = (page - 1) * limit;
            const query = {};
            if (status)
                query.status = status;
            if (status)
                query.serviceType = type;
            if (search) {
                const regex = new RegExp(search, "i"); // case-insensitive search
                query.$or = [
                    { "traceId": regex },
                    { "providerRef": regex },
                    { "customerReference": regex },
                ];
            }
            const billPayments = yield bill_payment_model_1.BillPayment.find(query)
                .populate('userId', 'email user_metadata.first_name user_metadata.surname')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .lean();
            const total = yield bill_payment_model_1.BillPayment.countDocuments(query);
            return {
                billPayments,
                page,
                pages: Math.ceil(total / limit),
                total
            };
        });
    }
}
exports.BillPaymentService = BillPaymentService;
