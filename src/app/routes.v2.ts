/**
 * V2 API Routes - New clean architecture endpoints
 * All new functionality goes through these routes with proper middleware
 */
import express from 'express';
import { requestIdMiddleware } from './middlewares/requestId';
import { idempotencyMiddleware } from '../shared/idempotency/middleware';
import { errorHandler } from './middlewares/errorHandler';
import { verifyJwtRest } from '../middlewares';
import { validateReqBody } from '../middlewares';

// Import v2 controllers
import { BillPaymentController } from '../modules/bill-payments/bill-payment.controller';
import { TransferController } from '../modules/transfers/transfer.controller';
import { LoanController } from '../modules/loans/loan.controller';
import { SavingsController } from '../modules/savings/savings.controller';
import { AdminController } from '../modules/admin/AdminController';

// Import validation schemas
import { 
  airtimeSchema, 
  dataSchema, 
  tvSchema, 
  powerSchema, 
  bettingSchema, 
  internetSchema, 
  waecSchema, 
  jambSchema 
} from '../validations';

const router = express.Router();

// Apply common middleware
router.use(requestIdMiddleware);

/**
 * @swagger
 * /v2/bill-payments/initiate:
 *   post:
 *     tags: [V2 - Bill Payments]
 *     summary: Initiate bill payment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, serviceType, serviceId, customerReference]
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount in naira
 *               serviceType:
 *                 type: string
 *                 enum: [airtime, data, tv, power, betting, internet, waec, jamb]
 *               serviceId:
 *                 type: string
 *                 description: Provider-specific service ID
 *               customerReference:
 *                 type: string
 *                 description: Customer reference (phone, meter number, etc.)
 *               extras:
 *                 type: object
 *                 description: Service-specific parameters
 *     responses:
 *       200:
 *         description: Bill payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/BillPayment'
 */
router.post('/bill-payments/initiate', 
  verifyJwtRest(), 
  idempotencyMiddleware,
  BillPaymentController.initiate as any
);

/**
 * @swagger
 * /v2/bill-payments/{id}/status:
 *   get:
 *     tags: [V2 - Bill Payments]
 *     summary: Get bill payment status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bill payment status retrieved
 */
router.get('/bill-payments/:id/status', 
  verifyJwtRest(),
  BillPaymentController.getStatus as any
);

/**
 * @swagger
 * /v2/transfers:
 *   post:
 *     tags: [V2 - Transfers]
 *     summary: Initiate money transfer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromAccount, toAccount, amount, transferType, remark]
 *             properties:
 *               fromAccount:
 *                 type: string
 *               toAccount:
 *                 type: string
 *               amount:
 *                 type: number
 *               transferType:
 *                 type: string
 *                 enum: [intra, inter]
 *               remark:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transfer initiated successfully
 */
router.post('/transfers', 
  verifyJwtRest(), 
  idempotencyMiddleware,
  TransferController.initiate as any
);

/**
 * @swagger
 * /v2/transfers/{id}/status:
 *   get:
 *     tags: [V2 - Transfers]
 *     summary: Get transfer status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transfer status retrieved
 */
router.get('/transfers/:id/status', 
  verifyJwtRest(),
  TransferController.getStatus as any
);

/**
 * @swagger
 * /v2/loans/request:
 *   post:
 *     tags: [V2 - Loans]
 *     summary: Request a loan
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [first_name, last_name, amount, reason, acknowledgment]
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               amount:
 *                 type: number
 *               reason:
 *                 type: string
 *               acknowledgment:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Loan request submitted successfully
 */
router.post('/loans/request', 
  verifyJwtRest(), 
  idempotencyMiddleware,
  LoanController.requestLoan as any
);

/**
 * @swagger
 * /v2/loans/{id}/repay:
 *   post:
 *     tags: [V2 - Loans]
 *     summary: Repay loan
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *               mandatory:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Loan repayment processed successfully
 */
router.post('/loans/:id/repay', 
  verifyJwtRest(), 
  idempotencyMiddleware,
  LoanController.repayLoan as any
);

/**
 * @swagger
 * /v2/loans/{id}/status:
 *   get:
 *     tags: [V2 - Loans]
 *     summary: Get loan status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Loan status retrieved
 */
router.get('/loans/:id/status', 
  verifyJwtRest(),
  LoanController.getLoanStatus as any
);

/**
 * @swagger
 * /v2/loans:
 *   get:
 *     tags: [V2 - Loans]
 *     summary: Get user loans
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: User loans retrieved
 */
router.get('/loans', 
  verifyJwtRest(),
  LoanController.listUserLoans as any
);

/**
 * @swagger
 * /v2/savings/plans:
 *   post:
 *     tags: [V2 - Savings]
 *     summary: Create savings plan
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [planType, planName, amount, interestRate]
 *             properties:
 *               planType:
 *                 type: string
 *                 enum: [LOCKED, FLEXIBLE]
 *               planName:
 *                 type: string
 *               amount:
 *                 type: number
 *               interestRate:
 *                 type: number
 *               targetAmount:
 *                 type: number
 *               durationDays:
 *                 type: integer
 *               renew:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Savings plan created successfully
 */
router.post('/savings/plans', 
  verifyJwtRest(), 
  idempotencyMiddleware,
  SavingsController.createPlan as any
);

/**
 * @swagger
 * /v2/savings/plans/{id}/withdraw:
 *   post:
 *     tags: [V2 - Savings]
 *     summary: Withdraw from savings plan
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Withdrawal processed successfully
 */
router.post('/savings/plans/:id/withdraw', 
  verifyJwtRest(), 
  idempotencyMiddleware,
  SavingsController.withdraw as any
);

/**
 * @swagger
 * /v2/savings/plans:
 *   get:
 *     tags: [V2 - Savings]
 *     summary: Get user savings plans
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Savings plans retrieved
 */
router.get('/savings/plans', 
  verifyJwtRest(),
  SavingsController.getUserPlans as any
);

/**
 * @swagger
 * /v2/admin/transactions/{traceId}:
 *   get:
 *     tags: [V2 - Admin]
 *     summary: Get transaction details by trace ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: traceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction details retrieved
 */
router.get('/admin/transactions/:traceId', 
  verifyJwtRest(),
  AdminController.getTransactionDetails as any
);

/**
 * @swagger
 * /v2/admin/transfers/{id}/requery:
 *   post:
 *     tags: [V2 - Admin]
 *     summary: Requery transfer status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transfer requeried successfully
 */
router.post('/admin/transfers/:id/requery', 
  verifyJwtRest(),
  AdminController.requeryTransfer as any
);

/**
 * @swagger
 * /v2/admin/profits:
 *   get:
 *     tags: [V2 - Admin]
 *     summary: Get profit report
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: service
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profit report retrieved
 */
router.get('/admin/profits', 
  verifyJwtRest(),
  AdminController.getProfitReport as any
);

/**
 * @swagger
 * /v2/admin/reconciliation/inconsistencies:
 *   get:
 *     tags: [V2 - Admin]
 *     summary: Get reconciliation inconsistencies
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reconciliation inconsistencies retrieved
 */
router.get('/admin/reconciliation/inconsistencies', 
  verifyJwtRest(),
  AdminController.getReconciliationInconsistencies as any
);

// Error handling
router.use(errorHandler);

export default router;