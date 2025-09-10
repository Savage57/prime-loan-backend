/**
 * Transfer Controller - V2 transfer endpoints
 * Handles transfer initiation with ledger + VFD integration
 */
import { Response, NextFunction } from "express";
import { ProtectedRequest } from "../../interfaces";
import { TransferService } from "./transfer.service";
import { VfdProvider, TransferRequest } from "../../shared/providers/vfd.provider";
import { sha512 } from "js-sha512";
import { APIError } from "../../exceptions";

export class TransferController {
  private static vfdProvider = new VfdProvider();

  /**
   * Initiate a transfer
   */
  static async initiate(req: ProtectedRequest, res: Response, next: NextFunction) {
    const { 
      fromAccount, 
      fromClientId, 
      fromClient, 
      fromSavingsId,
      fromBvn,
      toClient,
      toClientId,
      toSession,
      toAccount,
      toSavingsId,
      toBvn,
      toBank,
      toKyc,
      amount, 
      transferType,
      remark, 
    } = req.body;
    const userId = req.user!._id;
    const idempotencyKey = req.idempotencyKey!;

    // 1. Create transfer record + ledger entry (PENDING)
    const result = await TransferService.initiateTransfer({
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
      // 2. Send transfer to VFD
      const transferReq: TransferRequest = {
        uniqueSenderAccountId: toBank == '999999'? fromSavingsId : "",
        fromAccount,
        fromClientId,
        fromClient,
        fromSavingsId,
        toAccount,
        toClient,
        toSession,
        ...(toBank == '999999'? { toClientId } : { fromBvn, toBvn, toKyc }),
        toSavingsId,
        toBank,
        signature: sha512.hex(`${fromAccount}${toAccount}`),
        amount: amount,
        remark: remark || "",
        transferType,
        reference: result.reference,
      };

      const providerResp = await TransferController.vfdProvider.transfer(transferReq);

      if(providerResp.status === "00") {
        await TransferService.completeTransfer(result.reference);
        return res.status(200).json({
          status: "success",
          data: {
            ...result,
            provider: providerResp,
          },
        });
      }

      await TransferService.failTransfer(result.reference);
      throw new APIError(409, providerResp.message);
    } catch (error) {
      await TransferService.failTransfer(result.reference);
      next(error);
    }
  }

  /**
   * Get transfer status
   */
  static async getStatus(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { reference, sessionId } = req.query as {
        reference?: string;
        sessionId?: string;
      };

      if (!reference && !sessionId) {
        return res.status(400).json({
          status: "error",
          message: "reference or sessionId is required",
        });
      }

      const statusResp = await TransferController.vfdProvider.queryTransaction(
        reference,
        sessionId
      );

      res.status(200).json({
        status: "success",
        data: statusResp,
      });
    } catch (error) {
      next(error);
    }
  }
}
