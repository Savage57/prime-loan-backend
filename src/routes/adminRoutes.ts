/**
 * Admin Routes - Administrative operations
 * Provides admin-only endpoints for system management
 */
import express from 'express';
import { verifyJwtRest } from '../middlewares';
import { AdminController } from '../controllers/adminController';

const router = express.Router();

// Transaction Details
router.get('/transactions/:traceId', 
  verifyJwtRest(),
  AdminController.getTransactionDetails
);

// Profit Reporting
router.get('/profits', 
  verifyJwtRest(),
  AdminController.getProfitReport
);

// Reconciliation
router.get('/reconciliation/inconsistencies', 
  verifyJwtRest(),
  AdminController.getReconciliationInconsistencies
);

// Loan Management
router.post('/loans/:loanId/approve', 
  verifyJwtRest(),
  AdminController.manualApproveLoan
);

export default router;