/**
 * Transfer Application Service
 * Orchestrates transfer operations with ledger integration
 */
import { LedgerService } from '../../ledger/service';
import { DatabaseService } from '../../../shared/db';
import { UuidService } from '../../../shared/utils/uuid';
import { Money } from '../../../shared/utils/money';
import { Transfer } from '../infrastructure/models/Transfer.model';
import { saveIdempotentResponse } from '../../../shared/idempotency/middleware';

export interface InitiateTransferRequest {
  userId: string;
  toAccount: string;
  amount: number; // in naira
  transferType: 'intra' | 'inter';
  bankCode?: string;
  remark?: string;
  idempotencyKey: string;
}

export interface TransferResult {
  traceId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  transferId: string;
  reference: string;
}

export class TransferService {
  static async initiateTransfer(
    request: InitiateTransferRequest
  ): Promise<TransferResult> {
    const traceId = UuidService.generateTraceId();
    const amountKobo = Money.toKobo(request.amount);
    const reference = `TXN_${UuidService.generate().substring(0, 8).toUpperCase()}`;

    const session = await DatabaseService.startSession();

    try {
      return await DatabaseService.withTransaction(session, async () => {
        // Create transfer record
        const [transfer] = await Transfer.create([{
          userId: request.userId,
          traceId,
          fromAccount: `user_wallet:${request.userId}`, // Simplified for now
          toAccount: request.toAccount,
          amount: amountKobo,
          transferType: request.transferType,
          status: 'PENDING',
          reference,
          remark: request.remark,
          bankCode: request.bankCode
        }], { session });

        // Create pending debit ledger entry
        await LedgerService.createEntry({
          traceId,
          userId: request.userId,
          account: `user_wallet:${request.userId}`,
          entryType: 'DEBIT',
          category: 'transfer',
          amount: amountKobo,
          status: 'PENDING',
          idempotencyKey: request.idempotencyKey,
          meta: {
            transferId: transfer._id,
            toAccount: request.toAccount,
            transferType: request.transferType
          }
        }, session);

        const result: TransferResult = {
          traceId,
          status: 'PENDING',
          transferId: transfer._id,
          reference
        };

        // Save idempotent response
        await saveIdempotentResponse(
          request.idempotencyKey,
          request.userId,
          result
        );

        return result;
      });
    } finally {
      await session.endSession();
    }
  }
}