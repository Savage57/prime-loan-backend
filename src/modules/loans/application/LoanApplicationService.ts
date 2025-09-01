/**
 * Loan Application Service
 * Orchestrates loan requests with OCR, eligibility, and auto-approval
 */
import { LoanEligibilityService } from '../domain/LoanEligibility';
import { OcrService } from '../../../shared/ocr/extractAmountsFromBuffer';
import { LoanLadder } from '../infrastructure/models/LoanLadder.model';
import { ManualReview } from '../infrastructure/models/ManualReview.model';
import { LedgerService } from '../../ledger/service';
import { DatabaseService } from '../../../shared/db';
import { UuidService } from '../../../shared/utils/uuid';
import { Money } from '../../../shared/utils/money';
import { saveIdempotentResponse } from '../../../shared/idempotency/middleware';

export interface LoanRequestParams {
  userId: string;
  amount: number; // in naira
  duration: number; // in days
  loanType: string;
  reason: string;
  calculatorImage?: Buffer;
  idempotencyKey: string;
}

export interface LoanRepaymentParams {
  loanId: string;
  userId: string;
  amount: number; // in naira
  idempotencyKey: string;
}

export class LoanApplicationService {
  static async requestLoan(params: LoanRequestParams) {
    const traceId = UuidService.generateTraceId();
    const amountKobo = Money.toKobo(params.amount);
    
    const session = await DatabaseService.startSession();

    try {
      return await DatabaseService.withTransaction(session, async () => {
        let ladder: any = null;
        let requiresManualReview = false;
        let reviewReason = '';

        // Process calculator image if provided
        if (params.calculatorImage) {
          const ocrResult = await OcrService.extractAmountsFromBuffer(params.calculatorImage);
          const validation = OcrService.validateOcrResults(ocrResult);

          if (!validation.valid) {
            requiresManualReview = true;
            reviewReason = `OCR validation failed: ${validation.reason}`;
          } else {
            // Create loan ladder
            const [loanLadder] = await LoanLadder.create([{
              userId: params.userId,
              steps: ocrResult.amounts,
              source: 'image',
              trusted: false,
              meta: {
                ocrConfidence: ocrResult.confidence,
                imageQuality: ocrResult.imageQuality,
                extractedText: ocrResult.extractedText
              }
            }], { session });

            ladder = loanLadder;
          }
        }

        // Check eligibility (placeholder user object)
        const user = { 
          _id: params.userId, 
          user_metadata: { ladderIndex: 0, creditScore: 500 } 
        } as any;
        
        const eligibility = LoanEligibilityService.calculateEligibility(
          user,
          amountKobo,
          ladder
        );

        if (!eligibility.eligible) {
          requiresManualReview = true;
          reviewReason = eligibility.reason || 'Not eligible';
        }

        // Check auto-approval limits
        const canAutoApprove = LoanEligibilityService.canAutoApprove(
          amountKobo,
          eligibility,
          true // ID verified placeholder
        );

        if (amountKobo > 5000000) { // > ₦50,000
          requiresManualReview = true;
          reviewReason = 'Amount exceeds auto-approval limit';
        }

        if (requiresManualReview) {
          // Create manual review
          await ManualReview.create([{
            type: 'loan',
            userId: params.userId,
            reason: reviewReason,
            status: 'open',
            payload: {
              traceId,
              requestedAmount: amountKobo,
              eligibility,
              ladder: ladder?._id
            }
          }], { session });
        }

        const result = {
          traceId,
          status: requiresManualReview ? 'MANUAL_REVIEW' : 'AUTO_APPROVED',
          eligibleAmount: eligibility.maxAmount,
          requiresManualReview,
          reviewReason
        };

        await saveIdempotentResponse(
          params.idempotencyKey,
          params.userId,
          result
        );

        return result;
      });
    } finally {
      await session.endSession();
    }
  }

  static async repayLoan(params: LoanRepaymentParams) {
    const traceId = UuidService.generateTraceId();
    const amountKobo = Money.toKobo(params.amount);

    const session = await DatabaseService.startSession();

    try {
      return await DatabaseService.withTransaction(session, async () => {
        // Create repayment ledger entries
        await LedgerService.createDoubleEntry(
          traceId,
          `user_wallet:${params.userId}`,
          'platform_revenue',
          amountKobo,
          'loan',
          {
            userId: params.userId,
            subtype: 'repayment',
            idempotencyKey: params.idempotencyKey,
            session,
            meta: {
              loanId: params.loanId
            }
          }
        );

        const result = {
          traceId,
          status: 'COMPLETED',
          amountPaid: amountKobo
        };

        await saveIdempotentResponse(
          params.idempotencyKey,
          params.userId,
          result
        );

        return result;
      });
    } finally {
      await session.endSession();
    }
  }
}