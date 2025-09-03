/**
 * Enhanced Transfer Controller - Unified V1/V2 transfer operations
 * Integrates ledger tracking with existing transfer functionality
 */
import { Request, Response, NextFunction } from "express";
import { ProtectedRequest } from "../interfaces";
import { UserService, TransactionService, IdempotencyService } from "../services";
import { LedgerService } from "../services/ledger.service";
import { UuidService } from "../utils/uuid";
import { Money } from "../utils/money";
import { FEATURE_LEDGER } from "../config";
import { httpClient } from "../utils/httpClient";
import { sha512 } from "js-sha512";
import { sendEmail } from "../jobs/loanReminder";
import mongoose from "mongoose";

const { find, update, getWalletBalance, updateWalletBalance } = new UserService();
const { createWithTrace } = new TransactionService();

export const enhancedTransfer = async (req: ProtectedRequest, res: Response, next: NextFunction) => {
  try {
    const { 
      fromAccount, toAccount, amount, remark, reference, 
      toBank, bank, toClient, ...transferData 
    } = req.body;
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
    if (userBalance < Number(amount)) {
      return res.status(409).json({
        status: "Insufficient Funds.",
        data: null
      });
    }

    const traceId = UuidService.generateTraceId();
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const transferAmount = Number(amount);
        const amountKobo = Money.toKobo(transferAmount);

        // Create pending ledger entry if feature enabled
        if (FEATURE_LEDGER) {
          await LedgerService.createEntry({
            traceId,
            userId: user._id,
            account: `user_wallet:${user._id}`,
            entryType: 'DEBIT',
            category: 'transfer',
            amount: amountKobo,
            status: 'PENDING',
            idempotencyKey,
            meta: {
              toAccount,
              transferType: toBank === '999999' ? 'intra' : 'inter',
              reference
            }
          }, session);
        }

        // Call provider API
        const apiResponse = await httpClient("/wallet2/transfer", "POST", {
          ...transferData,
          fromAccount,
          toAccount,
          toBank,
          amount,
          remark,
          signature: sha512.hex(`${fromAccount}${toAccount}`),
          transferType: toBank === '999999' ? "intra" : "inter",
          reference
        });

        if (apiResponse.data && apiResponse.data.status === "00") {
          // Update user wallet
          await updateWalletBalance(user._id, userBalance - transferAmount);

          // Handle intra-bank transfers (credit beneficiary)
          if (toBank === '999999') {
            const beneficiary = await find({ "user_metadata.accountNo": toAccount }, "one");
            
            if (beneficiary && !Array.isArray(beneficiary) && beneficiary._id) {
              const beneficiaryBalance = await getWalletBalance(beneficiary._id);
              await updateWalletBalance(beneficiary._id, beneficiaryBalance + transferAmount);

              // Create beneficiary transaction
              await createWithTrace({
                name: "Deposit-" + reference,
                category: "credit",
                type: "transfer",
                user: beneficiary._id,
                details: remark || "Transfer received",
                transaction_number: `${apiResponse.data.data.txnId}-received` || "no-txnId",
                amount: transferAmount,
                bank: bank || "Prime Finance",
                receiver: toClient || "Beneficiary",
                account_number: toAccount,
                outstanding: 0,
                session_id: `${apiResponse.data.data.sessionId}-received` || "no-sessionId",
                status: "success",
                traceId
              });

              // Create credit ledger entry for beneficiary
              if (FEATURE_LEDGER) {
                await LedgerService.createEntry({
                  traceId,
                  userId: beneficiary._id,
                  account: `user_wallet:${beneficiary._id}`,
                  entryType: 'CREDIT',
                  category: 'transfer',
                  amount: amountKobo,
                  status: 'COMPLETED'
                }, session);
              }

              // Send notification to beneficiary
              await sendEmail(
                beneficiary.email,
                'Wallet Alert – Funds Credited',
                `Dear ${beneficiary.user_metadata.first_name},\n\nYour wallet has been credited with ₦${transferAmount} from ${user.user_metadata.first_name}.\n\nTransaction Details:\n- Amount: ₦${transferAmount}\n- Reference: ${reference}\n\nThank you for using Prime Finance!`
              );
            }
          }

          // Complete the debit ledger entry
          if (FEATURE_LEDGER) {
            await LedgerService.updateStatus(traceId, 'COMPLETED', session);
          }

          // Create sender transaction
          await createWithTrace({
            name: "Withdrawal-" + reference,
            category: "debit",
            type: "transfer",
            user: user._id,
            details: remark || "Transfer sent",
            transaction_number: apiResponse.data.data.txnId || "no-txnId",
            amount: transferAmount,
            bank: bank || "External Bank",
            receiver: toClient || "Beneficiary",
            account_number: toAccount,
            outstanding: 0,
            session_id: apiResponse.data.data.sessionId || "no-sessionId",
            status: "success",
            traceId
          });

          // Send confirmation to sender
          await sendEmail(
            user.email,
            'Transfer Successful',
            `Dear ${user.user_metadata.first_name},\n\nYour transfer of ₦${transferAmount} has been successfully processed.\n\nTransaction Details:\n- Amount: ₦${transferAmount}\n- Reference: ${reference}\n- To Account: ${toAccount}\n\nThank you for using Prime Finance!`
          );
        }
      });

      const response = {
        status: "success",
        data: {
          ...apiResponse.data.data,
          traceId,
          ledgerEnabled: FEATURE_LEDGER
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
    console.log("Error in enhanced transfer:", error);
    next(error);
  }
};