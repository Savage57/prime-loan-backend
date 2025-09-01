/**
 * Loan Controller - V2 loan endpoints
 * Handles loan requests with OCR ladder and auto-approval
 */
import { Request, Response, NextFunction } from 'express';
import { ProtectedRequest } from '../../../interfaces';
import { LoanApplicationService } from '../application/LoanApplicationService';

export class LoanController {
  static async requestLoan(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { 
        amount, 
        duration, 
        loanType, 
        reason,
        calculatorImage 
      } = req.body;
      
      const userId = req.user!._id;
      const idempotencyKey = req.idempotencyKey!;

      const result = await LoanApplicationService.requestLoan({
        userId,
        amount,
        duration,
        loanType,
        reason,
        calculatorImage,
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

  static async repayLoan(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      const userId = req.user!._id;
      const idempotencyKey = req.idempotencyKey!;

      const result = await LoanApplicationService.repayLoan({
        loanId: id,
        userId,
        amount,
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
      
      // Implementation would fetch loan status
      res.status(200).json({
        status: 'success',
        data: { id, status: 'PENDING' } // Placeholder
      });
    } catch (error) {
      next(error);
    }
  }
}