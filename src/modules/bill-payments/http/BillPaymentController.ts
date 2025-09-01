/**
 * Bill Payment Controller - V2 bill payment endpoints
 * Handles bill payment initiation and status checking
 */
import { Request, Response, NextFunction } from 'express';
import { BillPaymentService } from '../application/BillPaymentService';
import { ProtectedRequest } from '../../../interfaces';

export class BillPaymentController {
  static async initiate(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { amount, serviceType, serviceId, customerReference } = req.body;
      const userId = req.user!._id;
      const idempotencyKey = req.idempotencyKey!;

      const result = await BillPaymentService.initiateBillPayment({
        userId,
        amount,
        serviceType,
        serviceId,
        customerReference,
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
      
      // Implementation would fetch bill payment status
      res.status(200).json({
        status: 'success',
        data: { id, status: 'PENDING' } // Placeholder
      });
    } catch (error) {
      next(error);
    }
  }
}