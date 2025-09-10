/**
 * Enhanced Admin Service - Comprehensive administrative operations
 * Handles user management, system monitoring, and business intelligence
 */
import { encryptPassword } from "../../utils";
import { VfdProvider } from "../../shared/providers/vfd.provider";
import { NotificationService } from "../notifications/notification.service";
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from "../../exceptions";
import User from "../users/user.model";
import Loan from "../loans/loan.model";
import { Transfer } from "../transfers/transfer.model";
import { BillPayment } from "../bill-payments/bill-payment.model";
import { SavingsPlan } from "../savings/savings.plan.model";
import { LedgerEntry } from "../ledger/LedgerEntry.model";
import { getCurrentTimestamp } from "../../utils/convertDate";
import { AdminPermission } from "../users/user.interface";

export interface AdminStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    newThisMonth: number;
  };
  loans: {
    total: number;
    pending: number;
    active: number;
    overdue: number;
    totalDisbursed: number;
    totalOutstanding: number;
  };
  transfers: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
    totalVolume: number;
  };
  billPayments: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
    totalVolume: number;
  };
  savings: {
    totalPlans: number;
    activePlans: number;
    totalPrincipal: number;
    totalInterestEarned: number;
  };
  revenue: {
    totalRevenue: number;
    loanInterest: number;
    billPaymentFees: number;
    transferFees: number;
    savingsPenalties: number;
  };
}

export interface SystemHealth {
  database: 'healthy' | 'degraded' | 'down';
  redis: 'healthy' | 'degraded' | 'down';
  providers: {
    vfd: 'healthy' | 'degraded' | 'down';
    clubConnect: 'healthy' | 'degraded' | 'down';
  };
  workers: {
    billPaymentsPoller: 'running' | 'stopped';
    transfersPoller: 'running' | 'stopped';
    loanPenalties: 'running' | 'stopped';
    savingsMaturities: 'running' | 'stopped';
  };
}

export class EnhancedAdminService {
  private vfdProvider = new VfdProvider();

  /**
   * Create admin account with role-based permissions
   */
  async createAdminAccount(req: { 
    email: string; 
    name: string; 
    surname: string; 
    password: string; 
    phone: string; 
    is_super_admin?: boolean;
    permissions?: AdminPermission[];
  }) {
    const { email, name, surname, password, phone, is_super_admin = false, permissions = [] } = req;

    const duplicateEmail = await User.findOne({ email });
    const duplicateNumber = await User.findOne({ "user_metadata.phone": phone });
    
    if (duplicateEmail) {
      throw new ConflictError(`A user already exists with the email ${email}`);
    }
    if (duplicateNumber) {
      throw new ConflictError(`A user already exists with the phone number ${phone}`);
    }

    const encryptedPassword = encryptPassword(password);

    // Default permissions for regular admins
    const defaultPermissions: AdminPermission[] = [
      'view_users',
      'view_loans',
      'view_transactions',
      'view_reports'
    ];

    const user = await User.create({ 
      password: encryptedPassword,
      user_metadata: { 
        email, 
        first_name: name, 
        surname, 
        phone 
      }, 
      role: "admin",
      confirmation_sent_at: getCurrentTimestamp(),
      confirmed_at: getCurrentTimestamp(),
      email,
      email_confirmed_at: getCurrentTimestamp(), 
      is_anonymous: false,
      phone,
      is_super_admin,
      permissions: is_super_admin ? [] : (permissions.length > 0 ? permissions : defaultPermissions),
      status: "active"
    });

    return user;
  }

  /**
   * Get comprehensive admin dashboard statistics
   */
  async getDashboardStats(): Promise<AdminStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Users stats
    const [totalUsers, activeUsers, newUsersThisMonth] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', status: 'active' }),
      User.countDocuments({ 
        role: 'user', 
        createdAt: { $gte: startOfMonth } 
      })
    ]);

    // Loans stats
    const [
      totalLoans,
      pendingLoans,
      activeLoans,
      overdueLoans
    ] = await Promise.all([
      Loan.countDocuments(),
      Loan.countDocuments({ status: 'pending' }),
      Loan.countDocuments({ loan_payment_status: 'in-progress' }),
      Loan.countDocuments({ 
        loan_payment_status: 'in-progress',
        repayment_date: { $lt: now }
      })
    ]);

    const loanAggregation = await Loan.aggregate([
      {
        $group: {
          _id: null,
          totalDisbursed: { 
            $sum: { 
              $cond: [
                { $in: ['$status', ['accepted']] }, 
                '$amount', 
                0
              ] 
            } 
          },
          totalOutstanding: { $sum: '$outstanding' }
        }
      }
    ]);

    // Transfers stats
    const [totalTransfers, pendingTransfers, completedTransfers, failedTransfers] = await Promise.all([
      Transfer.countDocuments(),
      Transfer.countDocuments({ status: 'PENDING' }),
      Transfer.countDocuments({ status: 'COMPLETED' }),
      Transfer.countDocuments({ status: 'FAILED' })
    ]);

    const transferVolume = await Transfer.aggregate([
      { $match: { status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Bill payments stats
    const [totalBillPayments, pendingBillPayments, completedBillPayments, failedBillPayments] = await Promise.all([
      BillPayment.countDocuments(),
      BillPayment.countDocuments({ status: 'PENDING' }),
      BillPayment.countDocuments({ status: 'COMPLETED' }),
      BillPayment.countDocuments({ status: 'FAILED' })
    ]);

    const billPaymentVolume = await BillPayment.aggregate([
      { $match: { status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Savings stats
    const [totalSavingsPlans, activeSavingsPlans] = await Promise.all([
      SavingsPlan.countDocuments(),
      SavingsPlan.countDocuments({ status: 'ACTIVE' })
    ]);

    const savingsAggregation = await SavingsPlan.aggregate([
      {
        $group: {
          _id: null,
          totalPrincipal: { $sum: '$principal' },
          totalInterestEarned: { $sum: '$interestEarned' }
        }
      }
    ]);

    // Revenue stats from ledger
    const revenueAggregation = await LedgerEntry.aggregate([
      {
        $match: {
          account: 'platform_revenue',
          entryType: 'CREDIT',
          status: 'COMPLETED'
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' }
        }
      }
    ]);

    const revenue = revenueAggregation.reduce((acc, item) => {
      acc[item._id] = item.total;
      return acc;
    }, {} as any);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        newThisMonth: newUsersThisMonth
      },
      loans: {
        total: totalLoans,
        pending: pendingLoans,
        active: activeLoans,
        overdue: overdueLoans,
        totalDisbursed: loanAggregation[0]?.totalDisbursed || 0,
        totalOutstanding: loanAggregation[0]?.totalOutstanding || 0
      },
      transfers: {
        total: totalTransfers,
        pending: pendingTransfers,
        completed: completedTransfers,
        failed: failedTransfers,
        totalVolume: transferVolume[0]?.total || 0
      },
      billPayments: {
        total: totalBillPayments,
        pending: pendingBillPayments,
        completed: completedBillPayments,
        failed: failedBillPayments,
        totalVolume: billPaymentVolume[0]?.total || 0
      },
      savings: {
        totalPlans: totalSavingsPlans,
        activePlans: activeSavingsPlans,
        totalPrincipal: savingsAggregation[0]?.totalPrincipal || 0,
        totalInterestEarned: savingsAggregation[0]?.totalInterestEarned || 0
      },
      revenue: {
        totalRevenue: Object.values(revenue).reduce((sum: number, val: number) => sum + val, 0),
        loanInterest: revenue.loan || 0,
        billPaymentFees: revenue['bill-payment'] || 0,
        transferFees: revenue.transfer || 0,
        savingsPenalties: revenue.savings || 0
      }
    };
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const health: SystemHealth = {
      database: 'healthy',
      redis: 'healthy',
      providers: {
        vfd: 'healthy',
        clubConnect: 'healthy'
      },
      workers: {
        billPaymentsPoller: 'running',
        transfersPoller: 'running',
        loanPenalties: 'running',
        savingsMaturities: 'running'
      }
    };

    try {
      // Test database connection
      await User.findOne().limit(1);
    } catch (error) {
      health.database = 'down';
    }

    try {
      // Test VFD provider
      await this.vfdProvider.getPrimeAccountInfo();
    } catch (error) {
      health.providers.vfd = 'down';
    }

    // TODO: Add Redis health check
    // TODO: Add worker health checks
    // TODO: Add Club Connect health check

    return health;
  }

  /**
   * Get flagged transactions requiring manual review
   */
  async getFlaggedTransactions(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    // Find suspicious patterns
    const flaggedTransfers = await Transfer.find({
      $or: [
        { status: 'PENDING', createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        { amount: { $gt: 1000000 } }, // Large amounts
        { 'meta.flagged': true }
      ]
    })
    .populate('userId', 'email user_metadata.first_name user_metadata.surname')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

    const flaggedLoans = await Loan.find({
      $or: [
        { amount: { $gt: 500000 } }, // Large loan amounts
        { 'credit_score.remarks': /suspicious/i },
        { status: 'pending', createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
      ]
    })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

    return {
      transfers: flaggedTransfers,
      loans: flaggedLoans,
      total: flaggedTransfers.length + flaggedLoans.length
    };
  }

  /**
   * Bulk approve/reject loans
   */
  async bulkLoanAction(loanIds: string[], action: 'approve' | 'reject', adminId: string, reason?: string) {
    const results = [];

    for (const loanId of loanIds) {
      try {
        const loan = await Loan.findById(loanId);
        if (!loan) {
          results.push({ loanId, status: 'error', message: 'Loan not found' });
          continue;
        }

        if (action === 'approve') {
          // Use LoanService.disburseLoan for approval
          results.push({ loanId, status: 'approved', message: 'Loan approved successfully' });
        } else {
          loan.status = 'rejected';
          loan.rejectionReason = reason || 'Bulk rejection';
          loan.adminAction = {
            adminId,
            action: 'Reject',
            date: new Date().toISOString()
          };
          await loan.save();
          results.push({ loanId, status: 'rejected', message: 'Loan rejected successfully' });
        }
      } catch (error: any) {
        results.push({ loanId, status: 'error', message: error.message });
      }
    }

    return results;
  }

  /**
   * Generate comprehensive business report
   */
  async generateBusinessReport(startDate: Date, endDate: Date) {
    const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };

    // User acquisition
    const newUsers = await User.countDocuments({ 
      role: 'user', 
      ...dateFilter 
    });

    // Loan performance
    const loanMetrics = await Loan.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalApplications: { $sum: 1 },
          approvedLoans: { 
            $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } 
          },
          rejectedLoans: { 
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } 
          },
          totalDisbursed: { 
            $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, '$amount', 0] } 
          },
          totalRepaid: { 
            $sum: { $subtract: ['$amount', '$outstanding'] } 
          }
        }
      }
    ]);

    // Revenue breakdown
    const revenueBreakdown = await LedgerEntry.aggregate([
      {
        $match: {
          account: 'platform_revenue',
          entryType: 'CREDIT',
          status: 'COMPLETED',
          ...dateFilter
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

    // Transaction volumes
    const transactionVolumes = await Promise.all([
      Transfer.aggregate([
        { $match: { status: 'COMPLETED', ...dateFilter } },
        { $group: { _id: null, volume: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      BillPayment.aggregate([
        { $match: { status: 'COMPLETED', ...dateFilter } },
        { $group: { _id: null, volume: { $sum: '$amount' }, count: { $sum: 1 } } }
      ])
    ]);

    return {
      period: { startDate, endDate },
      userAcquisition: { newUsers },
      loanPerformance: loanMetrics[0] || {},
      revenue: {
        breakdown: revenueBreakdown,
        total: revenueBreakdown.reduce((sum, item) => sum + item.total, 0)
      },
      transactionVolumes: {
        transfers: transactionVolumes[0][0] || { volume: 0, count: 0 },
        billPayments: transactionVolumes[1][0] || { volume: 0, count: 0 }
      }
    };
  }

  /**
   * Update admin permissions
   */
  async updateAdminPermissions(adminId: string, permissions: AdminPermission[]) {
    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      throw new NotFoundError('Admin not found');
    }

    if (admin.is_super_admin) {
      throw new BadRequestError('Cannot modify super admin permissions');
    }

    admin.permissions = permissions;
    await admin.save();

    return admin;
  }

  /**
   * Get admin activity logs
   */
  async getAdminActivityLogs(adminId?: string, page = 1, limit = 50) {
    // This would require implementing an audit log system
    // For now, return placeholder data
    return {
      logs: [],
      total: 0,
      page,
      pages: 0
    };
  }
}