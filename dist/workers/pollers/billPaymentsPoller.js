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
exports.BillPaymentsPoller = void 0;
/**
 * Bill Payments Poller Worker
 * Polls pending bill payments and updates status based on provider responses
 */
const queue_1 = require("../../shared/queue");
const bill_payment_model_1 = require("../../modules/bill-payments/bill-payment.model");
const LedgerService_1 = require("../../modules/ledger/LedgerService");
const db_1 = require("../../shared/db");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'bill-payments-poller' });
class BillPaymentsPoller {
    static start() {
        return __awaiter(this, void 0, void 0, function* () {
            yield db_1.DatabaseService.connect();
            const worker = queue_1.QueueService.createWorker('bill-payments-poller', (job) => __awaiter(this, void 0, void 0, function* () {
                yield this.pollPendingBillPayments();
            }), {
                repeat: { every: 30000 }, // 30 seconds
                removeOnComplete: 10,
                removeOnFail: 50
            });
            logger.info('Bill payments poller started');
            // Graceful shutdown
            process.on('SIGTERM', () => __awaiter(this, void 0, void 0, function* () {
                yield worker.close();
                yield queue_1.QueueService.closeAll();
            }));
        });
    }
    static pollPendingBillPayments() {
        return __awaiter(this, void 0, void 0, function* () {
            const batchSize = parseInt(process.env.POLL_BATCH_SIZE || '100');
            const refundTimeoutMs = parseInt(process.env.REFUND_TIMEOUT_MS || '86400000'); // 24h
            try {
                const pendingPayments = yield bill_payment_model_1.BillPayment.find({
                    status: 'PENDING'
                })
                    .sort({ createdAt: 1 })
                    .limit(batchSize);
                logger.info(`Polling ${pendingPayments.length} pending bill payments`);
                for (const payment of pendingPayments) {
                    try {
                        // Check if payment is too old (24h) - auto-refund
                        const ageMs = Date.now() - payment.createdAt.getTime();
                        if (ageMs > refundTimeoutMs) {
                            yield this.refundBillPayment(payment);
                            continue;
                        }
                        // Query provider status (placeholder)
                        // const providerStatus = await this.queryProviderStatus(payment);
                        // await this.updatePaymentStatus(payment, providerStatus);
                    }
                    catch (error) {
                        logger.error({
                            billPaymentId: payment._id,
                            error: error.message
                        }, 'Error polling bill payment');
                    }
                }
            }
            catch (error) {
                logger.error({ error: error.message }, 'Error in bill payments poller');
            }
        });
    }
    static refundBillPayment(payment) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield db_1.DatabaseService.startSession();
            try {
                yield db_1.DatabaseService.withTransaction(session, () => __awaiter(this, void 0, void 0, function* () {
                    // Create refund ledger entry
                    yield LedgerService_1.LedgerService.createEntry({
                        traceId: payment.traceId,
                        userId: payment.userId,
                        account: `user_wallet:${payment.userId}`,
                        entryType: 'CREDIT',
                        category: 'refund',
                        subtype: 'bill-payment-timeout',
                        amount: payment.amount,
                        status: 'COMPLETED',
                        meta: {
                            originalBillPaymentId: payment._id,
                            reason: 'Provider timeout - auto refund'
                        }
                    }, session);
                    // Update bill payment status
                    payment.status = 'FAILED';
                    payment.processedAt = new Date();
                    payment.meta = Object.assign(Object.assign({}, payment.meta), { refundReason: 'Provider timeout', autoRefunded: true });
                    yield payment.save({ session });
                    logger.info({
                        billPaymentId: payment._id,
                        userId: payment.userId,
                        amount: payment.amount
                    }, 'Bill payment auto-refunded due to timeout');
                }));
            }
            finally {
                yield session.endSession();
            }
        });
    }
}
exports.BillPaymentsPoller = BillPaymentsPoller;
// Start the poller if this file is run directly
if (require.main === module) {
    BillPaymentsPoller.start().catch(console.error);
}
