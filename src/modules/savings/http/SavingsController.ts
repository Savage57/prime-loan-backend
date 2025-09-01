/**
 * Savings Controller - V2 savings endpoints
 * Handles savings plan creation, deposits, and withdrawals
 */
import { Request, Response, NextFunction } from 'express';
import { ProtectedRequest } from '../../../interfaces';
import { SavingsService } from '../application/SavingsService';

export class SavingsController {
  static async createPlan(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { 
        planType, 
        targetAmount, 
        durationDays, 
        interestRate 
      } = req.body;
      
      const userId = req.user!._id;
      const idempotencyKey = req.idempotencyKey!;

      const result = await SavingsService.createPlan({
        userId,
        planType,
        targetAmount,
        durationDays,
        interestRate,
        idempotencyKey
      });

      res.status(201).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async deposit(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      const userId = req.user!._id;
      const idempotencyKey = req.idempotencyKey!;

      const result = await SavingsService.deposit({
        planId: id,
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

  static async withdraw(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      const userId = req.user!._id;
      const idempotencyKey = req.idempotencyKey!;

      const result = await SavingsService.withdraw({
        planId: id,
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

  static async getPlans(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!._id;
      const plans = await SavingsService.getUserPlans(userId);

      res.status(200).json({
        status: 'success',
        data: plans
      });
    } catch (error) {
      next(error);
    }
  }
}