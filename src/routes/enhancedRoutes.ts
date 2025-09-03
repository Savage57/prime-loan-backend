/**
 * Enhanced Routes - Unified V1/V2 endpoints with ledger integration
 * Combines existing functionality with new ledger-first features
 */
import express from 'express';
import { requestIdMiddleware, idempotencyMiddleware, verifyJwtRest } from '../middlewares';
import { enhancedRepayLoan, enhancedCreateLoan } from '../controllers/enhancedLoanController';
import { enhancedTransfer } from '../controllers/enhancedTransferController';
import { AdminController } from '../controllers/adminController';

const router = express.Router();

// Apply common middleware
router.use(requestIdMiddleware);

// Enhanced Loan Operations
router.post('/loans/repay', 
  verifyJwtRest(), 
  idempotencyMiddleware(),
  enhancedRepayLoan
);

router.post('/loans/create-enhanced', 
  verifyJwtRest(), 
  idempotencyMiddleware(),
  enhancedCreateLoan
);

// Enhanced Transfer Operations
router.post('/transfers/enhanced', 
  verifyJwtRest(), 
  idempotencyMiddleware(),
  enhancedTransfer
);

// Admin Operations
router.get('/admin/transactions/:traceId', 
  verifyJwtRest(),
  AdminController.getTransactionDetails
);

router.get('/admin/profits', 
  verifyJwtRest(),
  AdminController.getProfitReport
);

router.get('/admin/reconciliation/inconsistencies', 
  verifyJwtRest(),
  AdminController.getReconciliationInconsistencies
);

router.post('/admin/loans/:loanId/approve', 
  verifyJwtRest(),
  AdminController.manualApproveLoan
);

export default router;