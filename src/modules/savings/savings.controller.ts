/**
 * Savings Controller - V2 savings endpoints
 * Handles savings plan creation, withdrawals, and admin analytics
 */
import { Response, NextFunction } from 'express';
import { ProtectedRequest } from '../../interfaces';
import { SavingsService } from './savings.service';
import { SettingsService } from '../admin/settings.service';
import { checkPermission } from '../../shared/utils/checkPermission';

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

      if (!setting.savingsEnabled) {
        return res.status(400).json({
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

      if (!setting.savingsEnabled) {
        return res.status(400).json({
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
      checkPermission(admin!, 'view_savings');

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

  /**
   * Admin: Get portfolio savings statistics
   */
  static async getAdminStats(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const admin = req.admin;
      checkPermission(admin!, 'view_savings');

      const stats = await SavingsService.getAdminSavingsStats();

      res.status(200).json({
        status: 'success',
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Get savings plans by category (active, matured, withdrawn)
   */
  static async getSavingsByCategory(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const admin = req.admin;
      checkPermission(admin!, 'view_savings');

      const category = String(req.query.category || 'active') as 'active' | 'matured' | 'withdrawn';
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const result = await SavingsService.getSavingsByCategory(category, page, limit);

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
