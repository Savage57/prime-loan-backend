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
exports.TransferController = void 0;
const transfer_service_1 = require("./transfer.service");
const vfd_provider_1 = require("../../shared/providers/vfd.provider");
const js_sha512_1 = require("js-sha512");
const exceptions_1 = require("../../exceptions");
class TransferController {
    /**
     * Initiate a transfer
     */
    static initiate(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const { fromAccount, fromClientId, fromClient, fromSavingsId, fromBvn, toClient, toClientId, toSession, toAccount, toSavingsId, toBvn, toBank, toKyc, amount, transferType, remark, } = req.body;
            const userId = req.user._id;
            const idempotencyKey = req.idempotencyKey;
            const result = yield transfer_service_1.TransferService.initiateTransfer({
                fromAccount,
                userId,
                toAccount,
                amount,
                transferType,
                bankCode: toBank,
                remark,
                idempotencyKey,
            });
            try {
                const transferReq = Object.assign(Object.assign({ uniqueSenderAccountId: toBank == '999999' ? fromSavingsId : "", fromAccount,
                    fromClientId,
                    fromClient,
                    fromSavingsId,
                    toAccount,
                    toClient,
                    toSession }, (toBank == '999999' ? { toClientId } : { fromBvn, toBvn, toKyc })), { toSavingsId,
                    toBank, signature: js_sha512_1.sha512.hex(`${fromAccount}${toAccount}`), amount: amount, remark: remark || "", transferType, reference: result.reference });
                const providerResp = yield TransferController.vfdProvider.transfer(transferReq);
                if (providerResp.status === "00") {
                    yield transfer_service_1.TransferService.completeTransfer(result.reference);
                    return res.status(200).json({
                        status: "success",
                        data: Object.assign(Object.assign({}, result), { provider: providerResp }),
                    });
                }
                yield transfer_service_1.TransferService.failTransfer(result.reference);
                throw new exceptions_1.APIError(409, providerResp.message);
            }
            catch (error) {
                yield transfer_service_1.TransferService.failTransfer(result.reference);
                next(error);
            }
        });
    }
    /**
     * Get transfer status (via provider query)
     */
    static getStatus(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { reference, sessionId } = req.query;
                if (!reference && !sessionId) {
                    return res.status(400).json({
                        status: "error",
                        message: "reference or sessionId is required",
                    });
                }
                const statusResp = yield TransferController.vfdProvider.queryTransaction(reference, sessionId);
                res.status(200).json({ status: "success", data: statusResp });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Get transfer by transactionId
     */
    static getTransfer(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const transfer = yield transfer_service_1.TransferService.transfer(id);
                if (!transfer) {
                    return res.status(404).json({ status: "error", message: "Transfer not found" });
                }
                res.status(200).json({ status: "success", data: transfer });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Get paginated transfers for authenticated user
     */
    static getTransfers(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.user._id;
                const page = Number(req.query.page) || 1;
                const limit = Number(req.query.limit) || 10;
                const result = yield transfer_service_1.TransferService.transfers(userId, page, limit);
                res.status(200).json({ status: "success", data: result });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Handle incoming wallet credit alerts (webhook from VFD)
     */
    static walletAlert(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const txn = yield transfer_service_1.TransferService.walletAlerts(req.body);
                if (!txn) {
                    return res.status(404).json({ status: "error", message: "User account not found" });
                }
                res.status(200).json({ status: "success", data: txn });
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.TransferController = TransferController;
TransferController.vfdProvider = new vfd_provider_1.VfdProvider();
