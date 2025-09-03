"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Enhanced Routes - Unified V1/V2 endpoints with ledger integration
 * Combines existing functionality with new ledger-first features
 */
const express_1 = __importDefault(require("express"));
const middlewares_1 = require("../middlewares");
const enhancedLoanController_1 = require("../controllers/enhancedLoanController");
const enhancedTransferController_1 = require("../controllers/enhancedTransferController");
const adminController_1 = require("../controllers/adminController");
const router = express_1.default.Router();
// Apply common middleware
router.use(middlewares_1.requestIdMiddleware);
// Enhanced Loan Operations
router.post('/loans/repay', (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.idempotencyMiddleware)(), enhancedLoanController_1.enhancedRepayLoan);
router.post('/loans/create-enhanced', (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.idempotencyMiddleware)(), enhancedLoanController_1.enhancedCreateLoan);
// Enhanced Transfer Operations
router.post('/transfers/enhanced', (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.idempotencyMiddleware)(), enhancedTransferController_1.enhancedTransfer);
// Admin Operations
router.get('/admin/transactions/:traceId', (0, middlewares_1.verifyJwtRest)(), adminController_1.AdminController.getTransactionDetails);
router.get('/admin/profits', (0, middlewares_1.verifyJwtRest)(), adminController_1.AdminController.getProfitReport);
router.get('/admin/reconciliation/inconsistencies', (0, middlewares_1.verifyJwtRest)(), adminController_1.AdminController.getReconciliationInconsistencies);
router.post('/admin/loans/:loanId/approve', (0, middlewares_1.verifyJwtRest)(), adminController_1.AdminController.manualApproveLoan);
exports.default = router;
