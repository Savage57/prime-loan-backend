/**
 * Savings Controller - V2 savings endpoints
 * Handles savings plan creation and withdrawals
 */
import { Response, NextFunction } from 'express';
import { ProtectedRequest } from '../../interfaces';
import { SavingsService } from './savings.service';
import { SettingsService } from '../admin/settings.service';

export class SavingsController {
  /**
   * Create a savings plan
   */
  static async createPlan(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { 
        planType, 
        planName,
        targetAmount, 
        durationDays, 
        amount,
        interestRate,
        renew
      } = req.body;
      
      const userId = req.user!._id;
      const idempotencyKey = req.idempotencyKey!;

      const setting = await SettingsService.getSettings();

      if(!setting.savingsEnabled) {
        res.status(400).json({
          status: 'failed',
          message: "Savings is currently in-active, try again later."
        });
      }

      const result = await SavingsService.createPlan({
        userId,
        planType,
        planName,
        targetAmount,
        durationDays,
        amount,
        interestRate,
        renew,
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

  /**
   * Withdraw from a savings plan
   */
  static async withdraw(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      const userId = req.user!._id;
      const idempotencyKey = req.idempotencyKey!;

      const setting = await SettingsService.getSettings();

      if(!setting.savingsEnabled) {
        res.status(400).json({
          status: 'failed',
          message: "Savings is currently in-active, try again later."
        });
      }

      const result = await SavingsService.completePlan({
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

  /**
   * Get all savings plans for the logged-in user
   */
  static async getUserPlans(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!._id;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const plans = await SavingsService.getUserPlans(userId, page, limit);

      res.status(200).json({
        status: 'success',
        data: plans
      });
    } catch (error) {
      next(error);
    }
  }

    /**
   * Get all users savings plans for the logged-in admin
   */
  static async getPlans(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const admin = req.admin;

      //TODO: Check if admin is super admin, give access, else check if admin has the permission.

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const plans = await SavingsService.getAllPlans(page, limit);

      res.status(200).json({
        status: 'success',
        data: plans
      });
    } catch (error) {
      next(error);
    }
  }
}
