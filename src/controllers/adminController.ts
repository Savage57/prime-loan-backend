/**
 * Admin Controller - Administrative operations and reporting
 * Provides admin tools for reconciliation, manual reviews, and profit reporting
 */
import { Request, Response, NextFunction } from 'express';
import { ProtectedRequest } from '../interfaces';
import { LedgerService } from '../services/ledger.service';
import { LoanService, UserService, TransactionService } from '../services';
import LedgerModel from '../model/ledger.model';

const { find: findLoan, update: updateLoan } = new LoanService();
const { find: findUser } = new UserService();
const { findByTraceId } = new TransactionService();

export class AdminController {
  static async getTransactionDetails(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { traceId } = req.params;
      
      // Get all ledger entries for this trace
      const ledgerEntries = await LedgerService.getByTraceId(traceId);
      
      // Get related transactions
      const transactions = await findByTraceId(traceId);
      
      res.status(200).json({
        status: 'success',
        data: {
          traceId,
          ledgerEntries,
          transactions,
          summary: {
            totalDebits: ledgerEntries
              .filter(e => e.entryType === 'DEBIT')
              .reduce((sum, e) => sum + e.amount, 0),
            totalCredits: ledgerEntries
              .filter(e => e.entryType === 'CREDIT')
              .reduce((sum, e) => sum + e.amount, 0)
          }
        }
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
      const realizedProfits = await LedgerModel.aggregate([
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

      // Unrealized profits - pending entries
      const unrealizedProfits = await LedgerModel.aggregate([
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
          count: inconsistencies.length,
          healthy: inconsistencies.length === 0
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async manualApproveLoan(req: ProtectedRequest, res: Response, next: NextFunction) {
    try {
      const { loanId } = req.params;
      const { amount, duration } = req.body;
      const { admin } = req;

      if (!admin || !admin._id) {
        return res.status(403).json({
          status: "Unauthorized",
          message: "Admin access required"
        });
      }

      const loan = await findLoan({ _id: loanId }, 'one');
      if (!loan || Array.isArray(loan)) {
        return res.status(404).json({
          status: "Loan not found",
          data: null
        });
      }

      const user = await findUser({ _id: loan.userId }, 'one');
      if (!user || Array.isArray(user)) {
        return res.status(404).json({
          status: "User not found",
          data: null
        });
      }

      // Calculate loan terms
      const loanAmount = Number(amount || loan.amount);
      const fee = 500;
      const loanPercentage = loan.category === "working" ? 4 : 10;
      const durationDays = Number(duration || loan.duration);
      
      const percentage = durationDays / 30 >= 1
        ? ((loanAmount * loanPercentage) / 100) * (durationDays / 30)
        : (loanAmount * loanPercentage) / 100;
      
      const totalRepayment = loanAmount + fee + percentage;

      const loanDate = new Date();
      const repaymentDate = new Date(loanDate);
      repaymentDate.setDate(loanDate.getDate() + durationDays);

      await updateLoan(loan._id, {
        amount: loanAmount,
        outstanding: totalRepayment,
        status: "accepted",
        loan_date: loanDate.toISOString(),
        repayment_date: repaymentDate.toISOString(),
        duration: durationDays
      });

      // Send approval email
      await sendEmail(
        user.email,
        "Loan Application Approved",
        `Congratulations! Your loan of ₦${loanAmount} has been approved. Repayment of ₦${totalRepayment} is due on ${repaymentDate.toDateString()}.\n\nPrime Finance`
      );

      res.status(200).json({
        status: "success",
        message: "Loan approved successfully",
        data: {
          loanId: loan._id,
          approvedAmount: loanAmount,
          totalRepayment,
          repaymentDate: repaymentDate.toISOString()
        }
      });
    } catch (error: any) {
      console.log("Error in manual loan approval:", error);
      next(error);
    }
  }
}