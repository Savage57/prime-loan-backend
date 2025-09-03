/**
 * Enhanced Loan Controller - Unified V1/V2 loan operations
 * Integrates ledger tracking with existing loan functionality
 */
import { Request, Response, NextFunction } from "express";
import { ProtectedRequest, RepaymentHistoryEntry } from "../interfaces";
import { UserService, LoanService, TransactionService, IdempotencyService } from "../services";
import { LedgerService } from "../services/ledger.service";
import { UuidService } from "../utils/uuid";
import { Money } from "../utils/money";
import { FEATURE_LEDGER, LOAN_AUTO_APPROVAL_MAX_KOBO } from "../config";
import { sendEmail } from "../jobs/loanReminder";
import mongoose from "mongoose";

const { find, update, getWalletBalance, updateWalletBalance } = new UserService();
const { create: createLoan, update: updateLoan, findById: findLoanById, addRepaymentHistory } = new LoanService();
const { createWithTrace } = new TransactionService();

export const enhancedRepayLoan = async (req: ProtectedRequest, res: Response, next: NextFunction) => {
  try {
    const { amount, transactionId, outstanding } = req.body;
    const { user } = req;
    const idempotencyKey = req.headers['idempotency-key'] as string;

    if (!user || !user._id) {
      return res.status(404).json({
        status: "User not found.",
        data: null
      });
    }

    // Check idempotency
    if (idempotencyKey) {
      const existingResponse = await IdempotencyService.checkKey(idempotencyKey, user._id);
      if (existingResponse) {
        return res.status(200).json(existingResponse.response);
      }
    }

    const userBalance = await getWalletBalance(user._id);
    if (userBalance < Number(outstanding)) {
      return res.status(409).json({
        status: "Insufficient Funds.",
        data: null
      });
    }

    const foundLoan = await findLoanById(transactionId);
    if (!foundLoan) {
      return res.status(404).json({
        status: "Loan not found.",
        data: null
      });
    }

    const traceId = UuidService.generateTraceId();
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const repaymentAmount = Number(outstanding);
        const newOutstanding = Math.max(0, Number(foundLoan.outstanding) - repaymentAmount);

        // Create ledger entries if feature enabled
        if (FEATURE_LEDGER) {
          await LedgerService.createDoubleEntry(
            traceId,
            `user_wallet:${user._id}`,
            'platform_revenue',
            Money.toKobo(repaymentAmount),
            'loan',
            {
              userId: user._id,
              subtype: 'repayment',
              idempotencyKey,
              session,
              meta: { loanId: foundLoan._id }
            }
          );
        }

        // Update loan
        const repaymentEntry: RepaymentHistoryEntry = {
          amount: repaymentAmount,
          outstanding: newOutstanding,
          action: "repayment",
          date: new Date().toISOString()
        };

        await updateLoan(foundLoan._id, {
          loan_payment_status: newOutstanding <= 0 ? "complete" : "in-progress",
          outstanding: newOutstanding,
          repayment_history: [...(foundLoan.repayment_history || []), repaymentEntry],
          traceId
        });

        // Update user wallet
        await updateWalletBalance(user._id, userBalance - repaymentAmount);

        // Create transaction record
        await createWithTrace({
          name: "Loan Repayment",
          category: "debit",
          type: "loan",
          user: user._id,
          details: "Loan repayment",
          transaction_number: `REPAY_${UuidService.generate().substring(0, 8)}`,
          amount: repaymentAmount,
          outstanding: newOutstanding,
          bank: "Prime Finance",
          receiver: "Prime Finance",
          account_number: "platform",
          session_id: traceId,
          status: "success",
          traceId
        });

        // Update credit score on successful repayment
        if (newOutstanding <= 0) {
          const currentScore = user.user_metadata?.creditScore || 500;
          await update(user._id, "user_metadata.creditScore", Math.min(850, currentScore + 10));
        }
      });

      const response = {
        status: "success",
        data: {
          traceId,
          amountPaid: repaymentAmount,
          remainingOutstanding: Math.max(0, Number(foundLoan.outstanding) - repaymentAmount)
        }
      };

      // Save idempotent response
      if (idempotencyKey) {
        await IdempotencyService.saveResponse(idempotencyKey, user._id, response);
      }

      res.status(200).json(response);
    } finally {
      await session.endSession();
    }
  } catch (error: any) {
    console.log("Error in enhanced loan repayment:", error);
    next(error);
  }
};

export const enhancedCreateLoan = async (req: ProtectedRequest, res: Response, next: NextFunction) => {
  try {
    const { amount, ...loanData } = req.body;
    const { user } = req;
    const idempotencyKey = req.headers['idempotency-key'] as string;

    if (!user || !user._id) {
      throw new Error("User not found.");
    }

    // Check idempotency
    if (idempotencyKey) {
      const existingResponse = await IdempotencyService.checkKey(idempotencyKey, user._id);
      if (existingResponse) {
        return res.status(200).json(existingResponse.response);
      }
    }

    const traceId = UuidService.generateTraceId();
    const amountKobo = Money.toKobo(Number(amount));

    // Check auto-approval eligibility
    const canAutoApprove = amountKobo <= LOAN_AUTO_APPROVAL_MAX_KOBO;
    const initialStatus = canAutoApprove ? "pending" : "pending"; // Still requires manual review

    const loan = await createLoan({
      ...loanData,
      amount,
      requested_amount: amount,
      userId: user._id,
      status: initialStatus,
      traceId,
      credit_message: "available",
      loan_payment_status: "not-started"
    });

    // Send notifications
    await sendEmail(
      user.email,
      "Loan Application Received",
      `Dear ${user.user_metadata.first_name},\n\nYour loan application has been received. We will review it and get back to you shortly.\n\nThank you,\nPrime Finance`
    );

    const response = {
      status: "success",
      data: {
        ...loan,
        traceId,
        autoApprovalEligible: canAutoApprove
      }
    };

    // Save idempotent response
    if (idempotencyKey) {
      await IdempotencyService.saveResponse(idempotencyKey, user._id, response);
    }

    res.status(200).json(response);
  } catch (error: any) {
    console.log("Error in enhanced loan creation:", error);
    next(error);
  }
};