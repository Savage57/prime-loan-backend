"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Admin Routes - Administrative operations
 * Provides admin-only endpoints for system management
 */
const express_1 = __importDefault(require("express"));
const middlewares_1 = require("../middlewares");
const adminController_1 = require("../controllers/adminController");
const router = express_1.default.Router();
// Transaction Details
router.get('/transactions/:traceId', (0, middlewares_1.verifyJwtRest)(), adminController_1.AdminController.getTransactionDetails);
// Profit Reporting
router.get('/profits', (0, middlewares_1.verifyJwtRest)(), adminController_1.AdminController.getProfitReport);
// Reconciliation
router.get('/reconciliation/inconsistencies', (0, middlewares_1.verifyJwtRest)(), adminController_1.AdminController.getReconciliationInconsistencies);
// Loan Management
router.post('/loans/:loanId/approve', (0, middlewares_1.verifyJwtRest)(), adminController_1.AdminController.manualApproveLoan);
exports.default = router;
