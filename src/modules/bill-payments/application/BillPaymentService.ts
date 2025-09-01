/**
 * Bill Payment Application Service
 * Orchestrates bill payment operations with ledger integration
 */
import { LedgerService } from '../../ledger/service';
import { DatabaseService } from '../../../shared/db';
import { UuidService } from '../../../shared/utils/uuid';
import { OutboxService } from '../../../shared/outbox/service';
import { Money } from '../../../shared/utils/money';
import { BillPayment } from '../infrastructure/models/BillPayment.model';
import { saveIdempotentResponse } from '../../../shared/idempotency/middleware';

export interface InitiateBillPaymentRequest {
  userId: string;
  amount: number; // in naira (will be converted to kobo)
  serviceType: string;
  serviceId: string;
  customerReference: string;
  idempotencyKey: string;
}

export interface BillPaymentResult {
  traceId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  billPaymentId: string;
  message?: string;
}

export class BillPaymentService {
  /**
   * Initiate a bill payment with ledger-first approach
   */
  static async initiateBillPayment(
    request: InitiateBillPaymentRequest
  ): Promise<BillPaymentResult> {
    const traceId = UuidService.generateTraceId();
    const amountKobo = Money.toKobo(request.amount);

    if (!Money.isValidAmount(amountKobo)) {
      throw new Error('Invalid amount');
    }

    const session = await DatabaseService.startSession();

    try {
      return await DatabaseService.withTransaction(session, async () => {
        // Create bill payment record
        const [billPayment] = await BillPayment.create([{
          userId: request.userId,
          traceId,
          serviceType: request.serviceType,
          serviceId: request.serviceId,
          customerReference: request.customerReference,
          amount: amountKobo,
          status: 'PENDING',
          meta: {
            originalAmount: request.amount
          }
        }], { session });

        // Create pending debit ledger entry
        await LedgerService.createEntry({
          traceId,
          userId: request.userId,
          account: `user_wallet:${request.userId}`,
          entryType: 'DEBIT',
          category: 'bill-payment',
          subtype: request.serviceType,
          amount: amountKobo,
          status: 'PENDING',
          idempotencyKey: request.idempotencyKey,
          meta: {
            billPaymentId: billPayment._id,
            serviceType: request.serviceType
          }
        }, session);

        // Create outbox event for provider call
        await OutboxService.createEvent(session, 'bill-payment.initiate', {
          traceId,
          billPaymentId: billPayment._id,
          serviceType: request.serviceType,
          serviceId: request.serviceId,
          customerReference: request.customerReference,
          amount: amountKobo
        });

        const result: BillPaymentResult = {
          traceId,
          status: 'PENDING',
          billPaymentId: billPayment._id,
          message: 'Bill payment initiated successfully'
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

  /**
   * Process bill payment completion
   */
  static async completeBillPayment(
    billPaymentId: string,
    providerResponse: any
  ): Promise<void> {
    const session = await DatabaseService.startSession();

    try {
      await DatabaseService.withTransaction(session, async () => {
        const billPayment = await BillPayment.findById(billPaymentId).session(session);
        if (!billPayment) throw new Error('Bill payment not found');

        // Update bill payment status
        billPayment.status = 'COMPLETED';
        billPayment.processedAt = new Date();
        billPayment.meta = { ...billPayment.meta, providerResponse };
        await billPayment.save({ session });

        // Complete the debit ledger entry
        const debitEntry = await LedgerService.createEntry({
          traceId: billPayment.traceId,
          account: `user_wallet:${billPayment.userId}`,
          entryType: 'DEBIT',
          category: 'bill-payment',
          amount: billPayment.amount,
          status: 'COMPLETED'
        }, session);

        // Create credit to provider
        await LedgerService.createEntry({
          traceId: billPayment.traceId,
          account: `provider:${billPayment.serviceType}`,
          entryType: 'CREDIT',
          category: 'bill-payment',
          amount: billPayment.amount,
          status: 'COMPLETED',
          relatedTo: debitEntry._id
        }, session);
      });
    } finally {
      await session.endSession();
    }
  }
}