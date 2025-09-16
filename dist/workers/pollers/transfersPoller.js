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
exports.TransfersPoller = void 0;
/**
 * Transfers Poller Worker
 * Polls pending transfers and handles reconciliation
 */
const queue_1 = require("../../shared/queue");
const transfer_model_1 = require("../../modules/transfers/transfer.model");
const LedgerService_1 = require("../../modules/ledger/LedgerService");
const db_1 = require("../../shared/db");
const vfd_provider_1 = require("../../shared/providers/vfd.provider");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'transfers-poller' });
class TransfersPoller {
    static start() {
        return __awaiter(this, void 0, void 0, function* () {
            yield db_1.DatabaseService.connect();
            const worker = queue_1.QueueService.createWorker('transfers-poller', (job) => __awaiter(this, void 0, void 0, function* () {
                yield this.pollPendingTransfers();
            }), {
                repeat: { every: 30000 }, // 30 seconds
                removeOnComplete: 10,
                removeOnFail: 50
            });
            logger.info('Transfers poller started');
            process.on('SIGTERM', () => __awaiter(this, void 0, void 0, function* () {
                yield worker.close();
                yield queue_1.QueueService.closeAll();
            }));
        });
    }
    static pollPendingTransfers() {
        return __awaiter(this, void 0, void 0, function* () {
            const batchSize = parseInt(process.env.POLL_BATCH_SIZE || '100');
            const refundTimeoutMs = parseInt(process.env.REFUND_TIMEOUT_MS || '86400000');
            try {
                const pendingTransfers = yield transfer_model_1.Transfer.find({
                    status: 'PENDING'
                })
                    .sort({ createdAt: 1 })
                    .limit(batchSize);
                logger.info(`Polling ${pendingTransfers.length} pending transfers`);
                for (const transfer of pendingTransfers) {
                    try {
                        const ageMs = Date.now() - transfer.createdAt.getTime();
                        if (ageMs > refundTimeoutMs) {
                            yield this.refundTransfer(transfer);
                            continue;
                        }
                        // Query provider status
                        if (transfer.reference) {
                            const providerStatus = yield this.vfdProvider.queryTransaction(transfer.reference);
                            yield this.updateTransferStatus(transfer, providerStatus);
                        }
                    }
                    catch (error) {
                        logger.error({
                            transferId: transfer._id,
                            error: error.message
                        }, 'Error polling transfer');
                    }
                }
            }
            catch (error) {
                logger.error({ error: error.message }, 'Error in transfers poller');
            }
        });
    }
    static updateTransferStatus(transfer, providerStatus) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield db_1.DatabaseService.startSession();
            try {
                yield db_1.DatabaseService.withTransaction(session, () => __awaiter(this, void 0, void 0, function* () {
                    if (providerStatus.status === '00') {
                        // Transfer successful
                        transfer.status = 'COMPLETED';
                        transfer.processedAt = new Date();
                        yield transfer.save({ session });
                        // Complete ledger entries
                        yield LedgerService_1.LedgerService.updateStatus(transfer._id, 'COMPLETED', session);
                        // Create credit entry for beneficiary if intra-bank
                        if (transfer.transferType === 'intra') {
                            yield LedgerService_1.LedgerService.createEntry({
                                traceId: transfer.traceId,
                                account: `user_wallet:${transfer.toAccount}`,
                                entryType: 'CREDIT',
                                category: 'transfer',
                                amount: transfer.amount,
                                status: 'COMPLETED'
                            }, session);
                        }
                    }
                    else if (providerStatus.status === 'FAILED') {
                        // Transfer failed - refund user
                        yield this.refundTransfer(transfer, session);
                    }
                    // If still pending, continue polling
                }));
            }
            finally {
                yield session.endSession();
            }
        });
    }
    static refundTransfer(transfer, session) {
        return __awaiter(this, void 0, void 0, function* () {
            const sessionToUse = session || (yield db_1.DatabaseService.startSession());
            const shouldEndSession = !session;
            try {
                yield db_1.DatabaseService.withTransaction(sessionToUse, () => __awaiter(this, void 0, void 0, function* () {
                    // Create refund ledger entry
                    yield LedgerService_1.LedgerService.createEntry({
                        traceId: transfer.traceId,
                        userId: transfer.userId,
                        account: `user_wallet:${transfer.userId}`,
                        entryType: 'CREDIT',
                        category: 'refund',
                        subtype: 'transfer-timeout',
                        amount: transfer.amount,
                        status: 'COMPLETED',
                        meta: {
                            originalTransferId: transfer._id,
                            reason: 'Transfer timeout - auto refund'
                        }
                    }, sessionToUse);
                    // Update transfer status
                    transfer.status = 'FAILED';
                    transfer.processedAt = new Date();
                    transfer.meta = Object.assign(Object.assign({}, transfer.meta), { refundReason: 'Transfer timeout', autoRefunded: true });
                    yield transfer.save({ session: sessionToUse });
                    logger.info({
                        transferId: transfer._id,
                        userId: transfer.userId,
                        amount: transfer.amount
                    }, 'Transfer auto-refunded due to timeout');
                }));
            }
            finally {
                if (shouldEndSession) {
                    yield sessionToUse.endSession();
                }
            }
        });
    }
}
exports.TransfersPoller = TransfersPoller;
TransfersPoller.vfdProvider = new vfd_provider_1.VfdProvider();
// Start the poller if this file is run directly
if (require.main === module) {
    TransfersPoller.start().catch(console.error);
}
