/**
 * Admin Controller - Administrative operations and reporting
 * Provides admin tools for reconciliation, manual reviews, and profit reporting
 */
import { Request, Response, NextFunction } from 'express';
import { ProtectedRequest } from '../../interfaces';
import { LedgerService } from '../ledger/LedgerService';
import { LedgerEntry } from '../ledger/LedgerEntry.model';

export class AdminController {
  static async getTransactionDetails(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { traceId } = req.params;
      
      // Get all ledger entries for this trace
      const ledgerEntries = await LedgerService.getByTraceId(traceId);
      
      // Get related entities (bill payments, transfers, etc.)
      // This would need to query multiple collections based on the trace ID
      
      res.status(200).json({
        status: 'success',
        data: {
          traceId,
          ledgerEntries,
          // Additional entity data would be included here
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async requeryTransfer(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      // Implementation would re-query provider and apply missing credits
      res.status(200).json({
        status: 'success',
        message: 'Transfer requeried successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProfitReport(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { from, to, service } = req.query;
      
      const startDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = to ? new Date(to as string) : new Date();

      // Realized profits - completed revenue entries
      const realizedProfits = await LedgerEntry.aggregate([
        {
          $match: {
            account: 'platform_revenue',
            entryType: 'CREDIT',
            status: 'COMPLETED',
            createdAt: { $gte: startDate, $lte: endDate },
            ...(service && { category: service })
          }
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      // Unrealized profits - pending or accrued entries
      const unrealizedProfits = await LedgerEntry.aggregate([
        {
          $match: {
            account: 'platform_revenue',
            entryType: 'CREDIT',
            status: 'PENDING',
            createdAt: { $gte: startDate, $lte: endDate },
            ...(service && { category: service })
          }
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]);

      res.status(200).json({
        status: 'success',
        data: {
          period: { from: startDate, to: endDate },
          realized: realizedProfits,
          unrealized: unrealizedProfits,
          totalRealized: realizedProfits.reduce((sum, item) => sum + item.total, 0),
          totalUnrealized: unrealizedProfits.reduce((sum, item) => sum + item.total, 0)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async getReconciliationInconsistencies(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const inconsistencies = await LedgerService.findInconsistencies();

      res.status(200).json({
        status: 'success',
        data: {
          inconsistencies,
          count: inconsistencies.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
}