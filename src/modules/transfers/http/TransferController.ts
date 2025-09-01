/**
 * Transfer Controller - V2 transfer endpoints
 * Handles transfer initiation with ledger integration
 */
import { Request, Response, NextFunction } from 'express';
import { ProtectedRequest } from '../../../interfaces';
import { TransferService } from '../application/TransferService';

export class TransferController {
  static async initiate(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { 
        toAccount, 
        amount, 
        transferType, 
        bankCode, 
        remark 
      } = req.body;
      
      const userId = req.user!._id;
      const idempotencyKey = req.idempotencyKey!;

      const result = await TransferService.initiateTransfer({
        userId,
        toAccount,
        amount,
        transferType,
        bankCode,
        remark,
        idempotencyKey
      });

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getStatus(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      // Implementation would fetch transfer status
      res.status(200).json({
        status: 'success',
        data: { id, status: 'PENDING' } // Placeholder
      });
    } catch (error) {
      next(error);
    }
  }
}