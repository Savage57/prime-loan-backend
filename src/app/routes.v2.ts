/**
 * V2 API Routes - New clean architecture endpoints
 * All new functionality goes through these routes with proper middleware
 */
import express from 'express';
import { requestIdMiddleware } from './middlewares/requestId';
import { idempotencyMiddleware } from '../shared/idempotency/middleware';
import { errorHandler } from './middlewares/errorHandler';
import { verifyJwtRest } from '../middlewares';

// Import v2 controllers
import { BillPaymentController } from '../modules/bill-payments/http/BillPaymentController';
import { TransferController } from '../modules/transfers/http/TransferController';
import { LoanController } from '../modules/loans/http/LoanController';
import { SavingsController } from '../modules/savings/http/SavingsController';
import { AdminController } from '../modules/admin/controllers/AdminController';

const router = express.Router();

// Apply common middleware
router.use(requestIdMiddleware);

// Bill Payments V2
router.post('/bill-payments/initiate', 
  verifyJwtRest(), 
  idempotencyMiddleware(),
  BillPaymentController.initiate
);

router.get('/bill-payments/:id/status', 
  verifyJwtRest(),
  BillPaymentController.getStatus
);

// Transfers V2
router.post('/transfers', 
  verifyJwtRest(), 
  idempotencyMiddleware(),
  TransferController.initiate
);

router.get('/transfers/:id/status', 
  verifyJwtRest(),
  TransferController.getStatus
);

// Loans V2
router.post('/loans/request', 
  verifyJwtRest(), 
  idempotencyMiddleware(),
  LoanController.requestLoan
);

router.post('/loans/:id/repay', 
  verifyJwtRest(), 
  idempotencyMiddleware(),
  LoanController.repayLoan
);

router.get('/loans/:id/status', 
  verifyJwtRest(),
  LoanController.getStatus
);

// Savings V2
router.post('/savings/plans', 
  verifyJwtRest(), 
  idempotencyMiddleware(),
  SavingsController.createPlan
);

router.post('/savings/plans/:id/deposit', 
  verifyJwtRest(), 
  idempotencyMiddleware(),
  SavingsController.deposit
);

router.post('/savings/plans/:id/withdraw', 
  verifyJwtRest(), 
  idempotencyMiddleware(),
  SavingsController.withdraw
);

router.get('/savings/plans', 
  verifyJwtRest(),
  SavingsController.getPlans
);

// Admin Routes
router.get('/admin/transactions/:traceId', 
  verifyJwtRest(),
  AdminController.getTransactionDetails
);

router.post('/admin/transfers/:id/requery', 
  verifyJwtRest(),
  AdminController.requeryTransfer
);

router.get('/admin/manual-reviews', 
  verifyJwtRest(),
  AdminController.getManualReviews
);

router.post('/admin/loans/:loanId/manual-approve', 
  verifyJwtRest(),
  AdminController.manualApproveLoan
);

router.post('/admin/loans/:loanId/manual-reject', 
  verifyJwtRest(),
  AdminController.manualRejectLoan
);

router.get('/admin/profits', 
  verifyJwtRest(),
  AdminController.getProfitReport
);

router.get('/admin/reconciliation/inconsistencies', 
  verifyJwtRest(),
  AdminController.getReconciliationInconsistencies
);

// Error handling
router.use(errorHandler);

export default router;