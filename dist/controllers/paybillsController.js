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
exports.getPowerSubscriptions = exports.getBettingPlatforms = exports.getJambTypes = exports.getWaecTypes = exports.getInternetPlans = exports.getDataPlans = exports.getTvPackages = exports.verifyJambNumber = exports.verifySmileNumber = exports.verifyBettingNumber = exports.verifyPowerNumber = exports.verifyTvNumber = exports.cancelTransaction = exports.queryTransaction = exports.buyJamb = exports.buyInternet = exports.buyBetting = exports.buyPower = exports.buyTv = exports.buyWaec = exports.buyData = exports.buyAirtime = void 0;
const paybills_service_1 = require("../services/paybills.service");
const services_1 = require("../services");
const validateParams_1 = require("../utils/validateParams");
const interfaces_1 = require("../interfaces");
const httpClient_1 = require("../utils/httpClient");
const generateRef_1 = require("../utils/generateRef");
const js_sha512_1 = require("js-sha512");
const paybillsService = new paybills_service_1.PaybillsService();
const { update, find } = new services_1.UserService();
const { create: createTransaction } = new services_1.TransactionService();
const bankTransfer = (_a) => __awaiter(void 0, [_a], void 0, function* ({ userId, amount, }) {
    var _b, _c, _d, _e, _f, _g;
    try {
        // 1. Find user
        const user = yield find({ _id: userId }, "one");
        if (!user || Array.isArray(user))
            throw new Error(`User not found`);
        // 2. Enquire user account
        const userAccountRes = yield (0, httpClient_1.httpClient)(`/wallet2/account/enquiry?accountNumber=${user === null || user === void 0 ? void 0 : user.user_metadata.accountNo}`, "GET");
        if (!userAccountRes.data)
            throw new Error(`User account not found`);
        const userAccountData = userAccountRes.data.data;
        const userBalance = Number(userAccountData.accountBalance);
        // 3. Enquire prime account (admin)
        const adminAccountRes = yield (0, httpClient_1.httpClient)(`/wallet2/account/enquiry?`, "GET");
        if (!adminAccountRes.data)
            throw new Error("Prime account not found");
        const adminAccountData = adminAccountRes.data.data;
        // 4. Construct transfer payload
        const ref = `Prime-Finance-${(0, generateRef_1.generateRandomString)(9)}`;
        const transferBody = {
            fromAccount: userAccountData.accountNo,
            uniqueSenderAccountId: userAccountData.accountId,
            fromClientId: userAccountData.clientId,
            fromClient: userAccountData.client,
            fromSavingsId: userAccountData.accountId,
            toClientId: adminAccountData.clientId,
            toClient: adminAccountData.client,
            toSavingsId: adminAccountData.accountId,
            toSession: adminAccountData.accountId,
            toAccount: adminAccountData.accountNo,
            toBank: "999999",
            signature: js_sha512_1.sha512.hex(`${userAccountData.accountNo}${adminAccountData.accountNo}`),
            amount: amount,
            remark: "Paybills Payment",
            transferType: "intra",
            reference: ref,
        };
        // 5. Attempt transfer
        const transferRes = yield (0, httpClient_1.httpClient)("/wallet2/transfer", "POST", transferBody);
        return {
            status: "success",
            message: "Transfer completed successfully",
            userBalance,
            data: transferRes.data,
        };
    }
    catch (error) {
        // Extract error details
        const message = ((_c = (_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) ||
            ((_e = (_d = error === null || error === void 0 ? void 0 : error.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.error) ||
            (error === null || error === void 0 ? void 0 : error.message) ||
            "An unknown error occurred";
        const statusCode = ((_f = error === null || error === void 0 ? void 0 : error.response) === null || _f === void 0 ? void 0 : _f.status) || 500;
        const errorData = ((_g = error === null || error === void 0 ? void 0 : error.response) === null || _g === void 0 ? void 0 : _g.data) || null;
        // Optional: log for debugging
        console.error("Bank Transfer Error:", {
            message,
            statusCode,
            errorData,
        });
        // Return structured error
        throw {
            status: "error",
            message,
            code: statusCode,
            userBalance: null,
            data: errorData,
        };
    }
});
const checkSufficientBalance = (user, amount) => __awaiter(void 0, void 0, void 0, function* () {
    const userWallet = Number(user.user_metadata.wallet);
    if (userWallet < amount) {
        throw new Error("Insufficient Funds.");
    }
    const walletBalance = yield paybillsService.CheckWalletBalance();
    if (Number(walletBalance.balance) < Number(amount)) {
        throw new Error("System currently busy. Try again later.");
    }
    return walletBalance;
});
const processTransaction = (req, res, next, serviceFn, serviceArgs, transactionDetails) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amount } = req.body;
        const { user } = req;
        if (!user || !user._id)
            throw new Error("Invalid user");
        yield checkSufficientBalance(user, amount);
        const response = yield serviceFn(...serviceArgs);
        const { status, userBalance } = yield bankTransfer({ userId: user._id, amount }); //uncomment later
        // const status = "success"; //comment later
        // const  userBalance = Number(user.user_metadata.wallet); //comment later
        const updatedWallet = userBalance != null ? userBalance - amount : Number(user.user_metadata.wallet) - amount;
        yield update(user._id, "user_metadata.wallet", String(updatedWallet));
        const ref = `Prime-Finance-${(0, generateRef_1.generateRandomString)(9)}`;
        const transaction = yield createTransaction({
            name: transactionDetails.name,
            category: transactionDetails.category,
            type: "paybills",
            user: user._id,
            details: interfaces_1.StatusDescriptions[response.status],
            transaction_number: response.orderid ? String(response.orderid) : ref,
            amount,
            outstanding: 0,
            bank: transactionDetails.bank,
            account_number: transactionDetails.account_number,
            receiver: transactionDetails.receiver,
            status: status || "error",
            session_id: response.orderid ? String(response.orderid) : ref,
        });
        res.status(200).json({ status: "success", data: Object.assign(Object.assign({}, response), { transaction }), message: interfaces_1.StatusDescriptions[response.status] });
    }
    catch (error) {
        console.log({ error });
        next(error);
    }
});
const buyAirtime = (req, res, next) => {
    (0, validateParams_1.validateRequiredParams)(req.body, ["amount", "mobileNumber", "mobileNetwork"]);
    return processTransaction(req, res, next, paybillsService.BuyAirtime.bind(paybillsService), [req.body.amount, req.body.mobileNumber, req.body.mobileNetwork, req.body.bonusType], {
        name: "Airtime Purchase",
        category: "airtime",
        bank: req.body.mobileNetwork,
        account_number: req.body.mobileNumber,
        receiver: req.body.mobileNumber,
    });
};
exports.buyAirtime = buyAirtime;
const buyData = (req, res, next) => {
    (0, validateParams_1.validateRequiredParams)(req.body, ["dataPlan", "mobileNumber", "mobileNetwork", "amount"]);
    return processTransaction(req, res, next, paybillsService.BuyData.bind(paybillsService), [req.body.dataPlan, req.body.mobileNumber, req.body.mobileNetwork], {
        name: "Data Purchase",
        category: "data",
        bank: req.body.mobileNetwork,
        account_number: req.body.mobileNumber,
        receiver: req.body.mobileNumber,
    });
};
exports.buyData = buyData;
const buyWaec = (req, res, next) => {
    (0, validateParams_1.validateRequiredParams)(req.body, ["examType", "phoneNo", "amount"]);
    return processTransaction(req, res, next, paybillsService.BuyWaec.bind(paybillsService), [req.body.examType, req.body.phoneNo], {
        name: "WAEC PIN Purchase",
        category: "waec",
        bank: req.body.examType,
        account_number: req.body.phoneNo,
        receiver: req.body.phoneNo,
    });
};
exports.buyWaec = buyWaec;
const buyTv = (req, res, next) => {
    (0, validateParams_1.validateRequiredParams)(req.body, ["cableTV", "pkg", "smartCardNo", "phoneNo", "amount"]);
    return processTransaction(req, res, next, paybillsService.BuyTv.bind(paybillsService), [req.body.cableTV, req.body.pkg, req.body.smartCardNo, req.body.phoneNo], {
        name: "TV Subscription",
        category: "tv",
        bank: req.body.cableTV,
        account_number: req.body.smartCardNo,
        receiver: req.body.phoneNo,
    });
};
exports.buyTv = buyTv;
const buyPower = (req, res, next) => {
    (0, validateParams_1.validateRequiredParams)(req.body, ["electricCompany", "meterType", "meterNo", "amount", "phoneNo"]);
    return processTransaction(req, res, next, paybillsService.BuyPower.bind(paybillsService), [req.body.electricCompany, req.body.meterType, req.body.meterNo, req.body.amount, req.body.phoneNo], {
        name: "Electricity Purchase",
        category: "power",
        bank: req.body.electricCompany,
        account_number: req.body.meterNo,
        receiver: req.body.phoneNo,
    });
};
exports.buyPower = buyPower;
const buyBetting = (req, res, next) => {
    (0, validateParams_1.validateRequiredParams)(req.body, ["bettingCompany", "customerId", "amount"]);
    return processTransaction(req, res, next, paybillsService.BuyBetting.bind(paybillsService), [req.body.bettingCompany, req.body.customerId, req.body.amount], {
        name: "Betting Wallet Top-up",
        category: "betting",
        bank: req.body.bettingCompany,
        account_number: req.body.customerId,
        receiver: req.body.customerId,
    });
};
exports.buyBetting = buyBetting;
const buyInternet = (req, res, next) => {
    (0, validateParams_1.validateRequiredParams)(req.body, ["mobileNetwork", "dataPlan", "mobileNumber", "amount"]);
    return processTransaction(req, res, next, paybillsService.BuyInternet.bind(paybillsService), [req.body.mobileNetwork, req.body.dataPlan, req.body.mobileNumber], {
        name: "Internet Purchase",
        category: "internet",
        bank: req.body.mobileNetwork,
        account_number: req.body.mobileNumber,
        receiver: req.body.mobileNumber,
    });
};
exports.buyInternet = buyInternet;
const buyJamb = (req, res, next) => {
    (0, validateParams_1.validateRequiredParams)(req.body, ["examType", "phoneNo", "amount"]);
    return processTransaction(req, res, next, paybillsService.BuyJamb.bind(paybillsService), [req.body.examType, req.body.phoneNo], {
        name: "JAMB PIN Purchase",
        category: "jamb",
        bank: req.body.examType,
        account_number: req.body.phoneNo,
        receiver: req.body.phoneNo,
    });
};
exports.buyJamb = buyJamb;
// Query a Transaction by orderId
const queryTransaction = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId } = req.params;
        if (!orderId)
            throw new Error("Missing orderId");
        const response = yield paybillsService.QueryTransaction(Number(orderId));
        res.status(200).json({ status: "success", data: response, message: interfaces_1.StatusDescriptions[response.status] });
    }
    catch (error) {
        next(error);
    }
});
exports.queryTransaction = queryTransaction;
// Cancel a Transaction by orderId
const cancelTransaction = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId } = req.params;
        if (!orderId)
            throw new Error("Missing orderId");
        const response = yield paybillsService.CancelTransaction(Number(orderId));
        res.status(200).json({ status: "success", data: response, message: interfaces_1.StatusDescriptions[response.status] });
    }
    catch (error) {
        next(error);
    }
});
exports.cancelTransaction = cancelTransaction;
// Verify TV Subscription by Smartcard
const verifyTvNumber = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { cableTV, smartCardNo } = req.query;
        if (!cableTV || !smartCardNo)
            throw new Error("Missing cableTV or smartCardNo");
        const response = yield paybillsService.VerifyTvNumber(cableTV, Number(smartCardNo));
        res.status(200).json({ status: "success", data: response });
    }
    catch (error) {
        next(error);
    }
});
exports.verifyTvNumber = verifyTvNumber;
// Verify Power Meter Number
const verifyPowerNumber = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { electricCompany, meterNo } = req.query;
        if (!electricCompany || !meterNo)
            throw new Error("Missing electricCompany or meterNo");
        const response = yield paybillsService.VerifyPowerNumber(electricCompany, Number(meterNo));
        res.status(200).json({ status: "success", data: response });
    }
    catch (error) {
        next(error);
    }
});
exports.verifyPowerNumber = verifyPowerNumber;
// Verify Betting Customer ID
const verifyBettingNumber = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { bettingCompany, customerId } = req.query;
        if (!bettingCompany || !customerId)
            throw new Error("Missing bettingCompany or customerId");
        const response = yield paybillsService.VerifyBettingNumber(bettingCompany, Number(customerId));
        res.status(200).json({ status: "success", data: response });
    }
    catch (error) {
        next(error);
    }
});
exports.verifyBettingNumber = verifyBettingNumber;
// Verify Smile Number
const verifySmileNumber = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { mobileNumber } = req.query;
        if (!mobileNumber)
            throw new Error("Missing mobileNumber");
        const response = yield paybillsService.VerifySmileNumber(Number(mobileNumber));
        res.status(200).json({ status: "success", data: response });
    }
    catch (error) {
        next(error);
    }
});
exports.verifySmileNumber = verifySmileNumber;
// Verify JAMB Profile ID
const verifyJambNumber = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { examType, profileId } = req.query;
        if (!examType || !profileId)
            throw new Error("Missing examType or profileId");
        const response = yield paybillsService.VerifyJambNumber(examType, Number(profileId));
        res.status(200).json({ status: "success", data: response });
    }
    catch (error) {
        next(error);
    }
});
exports.verifyJambNumber = verifyJambNumber;
// Get available TV packages
const getTvPackages = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield paybillsService.GetTvPackages();
        res.status(200).json({ status: "success", data: response });
    }
    catch (error) {
        next(error);
    }
});
exports.getTvPackages = getTvPackages;
// Get available mobile data plans
const getDataPlans = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield paybillsService.GetDataPlans();
        res.status(200).json({ status: "success", data: response });
    }
    catch (error) {
        next(error);
    }
});
exports.getDataPlans = getDataPlans;
// Get internet plan options for Smile/Spectranet
const getInternetPlans = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { mobileNetwork } = req.query;
        // Validate mobileNetwork
        if (typeof mobileNetwork !== "string" || !["smile-direct", "spectranet"].includes(mobileNetwork)) {
            throw new Error("Invalid or missing mobileNetwork. Allowed values: 'smile-direct', 'spectranet'");
        }
        const response = yield paybillsService.GetInternetPlans(mobileNetwork);
        res.status(200).json({ status: "success", data: response });
    }
    catch (error) {
        next(error);
    }
});
exports.getInternetPlans = getInternetPlans;
// Get WAEC PIN types
const getWaecTypes = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield paybillsService.GetWaecTypes();
        res.status(200).json({ status: "success", data: response });
    }
    catch (error) {
        next(error);
    }
});
exports.getWaecTypes = getWaecTypes;
// Get JAMB PIN types
const getJambTypes = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield paybillsService.GetJambTypes();
        res.status(200).json({ status: "success", data: response });
    }
    catch (error) {
        next(error);
    }
});
exports.getJambTypes = getJambTypes;
// Get Betting Platforms
const getBettingPlatforms = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield paybillsService.GetBettingPlatforms();
        res.status(200).json({ status: "success", data: response });
    }
    catch (error) {
        next(error);
    }
});
exports.getBettingPlatforms = getBettingPlatforms;
// Get Power Subscription Companies
const getPowerSubscriptions = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield paybillsService.GetPowerSubscriptions();
        res.status(200).json({ status: "success", data: response });
    }
    catch (error) {
        next(error);
    }
});
exports.getPowerSubscriptions = getPowerSubscriptions;
