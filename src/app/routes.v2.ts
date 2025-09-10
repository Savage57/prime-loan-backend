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
import { BillPaymentController } from '../modules/bill-payments/bill-payment.controller';
import { TransferController } from '../modules/transfers/transfer.controller';
import { LoanController } from '../modules/loans/loan.controller';
import { SavingsController } from '../modules/savings/savings.controller';
import { AdminController } from '../modules/admin/AdminController';

const router = express.Router();

// Apply common middleware
router.use(requestIdMiddleware);

// Bill Payments V2
router.post('/bill-payments/initiate', 
  verifyJwtRest(), 
  idempotencyMiddleware,
  BillPaymentController.initiate as any
);

router.get('/bill-payments/:id/status', 
  verifyJwtRest(),
  BillPaymentController.getStatus as any
);

// Transfers V2
router.post('/transfers', 
  verifyJwtRest(), 
  idempotencyMiddleware,
  TransferController.initiate as any
);

router.get('/transfers/:id/status', 
  verifyJwtRest(),
  TransferController.getStatus as any
);

// Loans V2
router.post('/loans/request', 
  verifyJwtRest(), 
  idempotencyMiddleware,
  LoanController.requestLoan as any
);

router.post('/loans/:id/repay', 
  verifyJwtRest(), 
  idempotencyMiddleware,
  LoanController.repayLoan as any
);

router.get('/loans/:id/status', 
  verifyJwtRest(),
  LoanController.getLoanStatus as any
);

// Savings V2
router.post('/savings/plans', 
  verifyJwtRest(), 
  idempotencyMiddleware,
  SavingsController.createPlan as any
);

router.post('/savings/plans/:id/deposit', 
  verifyJwtRest(), 
  idempotencyMiddleware,
  SavingsController.createPlan as any
);

router.post('/savings/plans/:id/withdraw', 
  verifyJwtRest(), 
  idempotencyMiddleware,
  SavingsController.withdraw as any
);

router.get('/savings/plans', 
  verifyJwtRest(),
  SavingsController.getPlans as any
);

// Admin Routes
router.get('/admin/transactions/:traceId', 
  verifyJwtRest(),
  AdminController.getTransactionDetails as any
);

router.post('/admin/transfers/:id/requery', 
  verifyJwtRest(),
  AdminController.requeryTransfer as any
);

router.get('/admin/profits', 
  verifyJwtRest(),
  AdminController.getProfitReport as any
);

router.get('/admin/reconciliation/inconsistencies', 
  verifyJwtRest(),
  AdminController.getReconciliationInconsistencies as any
);

// Error handling
router.use(errorHandler);

export default router;