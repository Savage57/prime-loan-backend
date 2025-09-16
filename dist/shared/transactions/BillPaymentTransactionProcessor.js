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
exports.processTransaction = processTransaction;
// shared/transactions/transactionProcessor.ts
const LedgerService_1 = require("../../modules/ledger/LedgerService");
const db_1 = require("../../shared/db");
const uuid_1 = require("../../shared/utils/uuid");
const money_1 = require("../../shared/utils/money");
const bill_payment_model_1 = require("../../modules/bill-payments/bill-payment.model");
const middleware_1 = require("../../shared/idempotency/middleware");
const transfer_service_1 = require("../../modules/transfers/transfer.service");
function processTransaction(_a) {
    return __awaiter(this, arguments, void 0, function* ({ userId, amount, serviceType, serviceId, customerReference, idempotencyKey, providerFn, txnProvider }) {
        const traceId = uuid_1.UuidService.generateTraceId();
        if (!money_1.Money.isValidAmount(amount)) {
            throw new Error("Invalid amount");
        }
        const session = yield db_1.DatabaseService.startSession();
        try {
            return yield db_1.DatabaseService.withTransaction(session, () => __awaiter(this, void 0, void 0, function* () {
                // 1. Create bill payment record
                const [billPayment] = yield bill_payment_model_1.BillPayment.create([{
                        userId,
                        traceId,
                        serviceType,
                        serviceId,
                        customerReference,
                        amount: amount,
                        status: "PENDING",
                        meta: { originalAmount: amount }
                    }], { session });
                // 3. Initiate Transaction
                const providerResp = yield txnProvider();
                if (providerResp.status === "00") {
                    // 4. Complete Transaction (if Success)
                    const initTrxn = yield transfer_service_1.TransferService.completeTransfer(providerResp.reference, "bill-payment");
                    // 5. Call Bill Payment provider
                    let providerResponse;
                    try {
                        providerResponse = yield providerFn();
                    }
                    catch (err) {
                        // 6. Mark Failed (if Error)
                        billPayment.status = "FAILED";
                        yield billPayment.save({ session });
                        return { traceId, status: "FAILED", billPayment, message: err.message };
                    }
                    // 6. Mark COMPLETED (if Success)
                    billPayment.status = "COMPLETED";
                    billPayment.processedAt = new Date();
                    billPayment.meta = Object.assign(Object.assign({}, billPayment.meta), { providerResponse });
                    yield billPayment.save({ session });
                    // 7. Update ledger Debit (COMPLETED)
                    yield LedgerService_1.LedgerService.createDoubleEntry(traceId, `user_wallet:${userId}`, `bill-payment:${serviceType}`, amount, "bill-payment", {
                        userId: userId,
                        subtype: serviceType,
                        idempotencyKey,
                        session,
                        meta: {
                            billPaymentId: billPayment._id,
                            transactionId: (initTrxn === null || initTrxn === void 0 ? void 0 : initTrxn.transferId) || ""
                        }
                    });
                    const result = { traceId, status: "COMPLETED", billPayment, message: "Bill payment completed successfully" };
                    yield (0, middleware_1.saveIdempotentResponse)(idempotencyKey, userId, result);
                    return result;
                }
                // 4. Fail Transaction (if Error)
                yield transfer_service_1.TransferService.failTransfer(providerResp.reference);
                // 5. Fail Bill Payment
                billPayment.status = "FAILED";
                yield billPayment.save({ session });
                return { traceId, status: "FAILED", billPayment, message: providerResp.message };
            }));
        }
        finally {
            yield session.endSession();
        }
    });
}
