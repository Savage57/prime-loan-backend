"use strict";
// src/routes/admin.routes.ts
/**
 * Admin Routes - Comprehensive Administrative Endpoints
 *
 * - All AdminController endpoints are wired here
 * - Extensive Swagger (OpenAPI) comments included (components + route docs)
 * - Joi validation applied via validateReqBody / validateReqQuery
 *
 * NOTE: adjust middleware import paths if your project stores them elsewhere.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const admin_controller_1 = require("../modules/admin/admin.controller");
const loan_controller_1 = require("../modules/loans/loan.controller");
const savings_controller_1 = require("../modules/savings/savings.controller");
const middlewares_1 = require("../shared/middlewares");
const validations_1 = require("../validations");
const middleware_1 = require("../shared/idempotency/middleware");
/**
 * Swagger components (schemas) used by routes below.
 *
 * You can copy this block to your central OpenAPI config if you prefer centralization.
 *
 * components:
 *   schemas:
 *     CreateAdminRequest:
 *       type: object
 *       required: [email, name, surname, password, phone]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         name:
 *           type: string
 *         surname:
 *           type: string
 *         password:
 *           type: string
 *           minLength: 6
 *         phone:
 *           type: string
 *         is_super_admin:
 *           type: boolean
 *         permissions:
 *           type: array
 *           items:
 *             type: string
 *
 *     ActivateRequest:
 *       type: object
 *       required: [adminId, status]
 *       properties:
 *         adminId:
 *           type: string
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *
 *     ActivateUserRequest:
 *       type: object
 *       required: [userId, status]
 *       properties:
 *         userId:
 *           type: string
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *
 *     PaginationQuery:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           default: 1
 *         limit:
 *           type: integer
 *           default: 20
 *
 *     BulkLoanActionRequest:
 *       type: object
 *       required: [loanIds, action]
 *       properties:
 *         loanIds:
 *           type: array
 *           items:
 *             type: string
 *         action:
 *           type: string
 *           enum: [approve, reject]
 *         reason:
 *           type: string
 *
 *     DisburseLoanRequest:
 *       type: object
 *       required: [loanId]
 *       properties:
 *         loanId:
 *           type: string
 *         amount:
 *           type: number
 *
 *     RejectLoanRequest:
 *       type: object
 *       required: [reason]
 *       properties:
 *         reason:
 *           type: string
 *
 *     BusinessReportQuery:
 *       type: object
 *       properties:
 *         from:
 *           type: string
 *           format: date-time
 *         to:
 *           type: string
 *           format: date-time
 *
 *     ProfitReportQuery:
 *       type: object
 *       properties:
 *         from:
 *           type: string
 *           format: date-time
 *         to:
 *           type: string
 *           format: date-time
 *         service:
 *           type: string
 *
 *     UpdatePermissionsRequest:
 *       type: object
 *       required: [permissions]
 *       properties:
 *         permissions:
 *           type: array
 *           items:
 *             type: string
 */
const router = express_1.default.Router();
/* =============================
   ADMIN MANAGEMENT
   ============================= */
/**
 * @swagger
 * /backoffice/create:
 *   post:
 *     tags: [Admin]
 *     summary: Create admin account (Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Create a new administration account
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAdminRequest'
 *     responses:
 *       201:
 *         description: Admin created successfully
 */
router.post("/create", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqBody)(validations_1.createAdminAccountSchema), admin_controller_1.AdminController.createAdminAccount);
/**
 * @swagger
 * /backoffice/login:
 *   post:
 *     summary: User login
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful (returns accessToken and refreshToken)
 */
router.post("/login", (0, middlewares_1.validateReqBody)(validations_1.loginSchema), admin_controller_1.AdminController.login);
/**
 * @swagger
 * /backoffice/profile:
 *   get:
 *     summary: Get logged-in user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
router.get("/profile", (0, middlewares_1.verifyJwtRest)(), admin_controller_1.AdminController.profile);
/**
 * @swagger
 * /backoffice/update:
 *   put:
 *     summary: Update user fields (phone, address, first_name, surname, profile_photo)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [field, value]
 *             properties:
 *               field:
 *                 type: string
 *                 example: user_metadata.phone
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.put("/update", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqBody)(validations_1.updateUserSchema), admin_controller_1.AdminController.update);
/**
 * @swagger
 * /backoffice/change-password:
 *   post:
 *     summary: Change password for logged-in user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, newPassword]
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.post("/change-password", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqBody)(validations_1.changePasswordSchema), admin_controller_1.AdminController.changePassword);
/**
 * @swagger
 * /backoffice/reset/initiate:
 *   post:
 *     summary: Initiate password or pin reset (sends OTP)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, type]
 *             properties:
 *               email:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [password, pin]
 *     responses:
 *       200:
 *         description: Reset OTP sent
 */
router.post("/reset/initiate", (0, middlewares_1.validateReqBody)(validations_1.initiateResetSchema), admin_controller_1.AdminController.initiateReset);
/**
 * @swagger
 * /backoffice/reset/validate:
 *   post:
 *     summary: Validate reset OTP
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, pin]
 *             properties:
 *               email:
 *                 type: string
 *               pin:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP validated successfully
 */
router.post("/reset/validate", (0, middlewares_1.validateReqBody)(validations_1.validateResetSchema), admin_controller_1.AdminController.validateReset);
/**
 * @swagger
 * /backoffice/update-password-pin:
 *   post:
 *     summary: Update password or pin after OTP validation
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               newPin:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password/PIN updated successfully
 */
router.post("/update-password-pin", (0, middlewares_1.validateReqBody)(validations_1.updatePasswordOrPinSchema), admin_controller_1.AdminController.updatePasswordOrPin);
/**
 * @swagger
 * /backoffice/{adminId}:
 *   get:
 *     tags: [Admin]
 *     summary: Get admin by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Admin returned
 */
router.get("/:adminId([0-9a-fA-F]{24})", (0, middlewares_1.verifyJwtRest)(), admin_controller_1.AdminController.getAdmin);
/**
 * @swagger
 * /backoffice/activate:
 *   post:
 *     tags: [Admin]
 *     summary: Activate/Deactivate admin account (Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActivateRequest'
 *     responses:
 *       200:
 *         description: Admin status updated
 */
router.post("/activate", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqBody)(validations_1.activateAdminReqBodySchema), admin_controller_1.AdminController.activateAndDeactivateAdmin);
/**
 * @swagger
 * /backoffice/{adminId}/permissions:
 *   put:
 *     tags: [Admin]
 *     summary: Update admin permissions (Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePermissionsRequest'
 *     responses:
 *       200:
 *         description: Permissions updated
 */
router.put("/:adminId([0-9a-fA-F]{24})/permissions", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqBody)(validations_1.updateAdminPermissionsSchema), admin_controller_1.AdminController.updateAdminPermissions);
/* =============================
   USER MANAGEMENT
   ============================= */
/**
 * @swagger
 * /backoffice/users:
 *   get:
 *     tags: [Admin - Users]
 *     summary: Get all users (paginated, optional filter)
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           description: simple text filter (email / name)
 *     responses:
 *       200:
 *         description: Users list
 */
router.get("/users", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqQuery)(validations_1.getUsersQuerySchema), admin_controller_1.AdminController.getUsers);
/**
 * @swagger
 * /backoffice/users/activate:
 *   post:
 *     tags: [Admin - Users]
 *     summary: Activate/Deactivate user account
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActivateUserRequest'
 *     responses:
 *       200:
 *         description: User status updated
 */
router.post("/users/activate", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqBody)(validations_1.activateUserReqBodySchema), admin_controller_1.AdminController.activateAndDeactivateUser);
/* =============================
   LOAN MANAGEMENT
   ============================= */
/**
 * @swagger
 * /backoffice/loans:
 *   get:
 *     tags: [Admin - Loans]
 *     summary: Get all loans with optional filters
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, rejected]
 *     responses:
 *       200:
 *         description: Loans returned
 */
router.get("/loans", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqQuery)(validations_1.loanListQuerySchema), loan_controller_1.LoanController.listAllLoans);
/**
 * @swagger
 * /backoffice/loans/{id}:
 *   get:
 *     tags: [Admin - Loans]
 *     summary: Get loan with history
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
 *         description: Loan details
 */
router.get("/loans/:id([0-9a-fA-F]{24})", (0, middlewares_1.verifyJwtRest)(), loan_controller_1.LoanController.singleLoanHistory);
/**
 * @swagger
 * /backoffice/loans/disburse:
 *   post:
 *     tags: [Admin - Loans]
 *     summary: Disburse approved loan
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DisburseLoanRequest'
 *     responses:
 *       200:
 *         description: Loan disbursed
 */
router.post("/loans/disburse", (0, middlewares_1.verifyJwtRest)(), (0, middleware_1.idempotencyMiddleware)(), (0, middlewares_1.validateReqBody)(validations_1.disburseLoanSchema), loan_controller_1.LoanController.disburseLoan);
/**
 * @swagger
 * /backoffice/loans/{id}/reject:
 *   post:
 *     tags: [Admin - Loans]
 *     summary: Reject loan application
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *             $ref: '#/components/schemas/RejectLoanRequest'
 *     responses:
 *       200:
 *         description: Loan rejected
 */
router.post("/loans/:id([0-9a-fA-F]{24})/reject", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqBody)(validations_1.rejectLoanSchema), loan_controller_1.LoanController.rejectLoan);
/**
 * @swagger
 * /backoffice/loans/stats:
 *   get:
 *     tags: [Admin - Loans]
 *     summary: Get loan portfolio statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Loan statistics
 */
router.get("/loans/stats", (0, middlewares_1.verifyJwtRest)(), loan_controller_1.LoanController.getAdminLoanStats);
/**
 * @swagger
 * /backoffice/loans/category/{category}:
 *   get:
 *     tags: [Admin - Loans]
 *     summary: Get loans by category
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [active, due, overdue, repaid]
 *     responses:
 *       200:
 *         description: Loans by category
 */
router.get("/loans/category/:category", (0, middlewares_1.verifyJwtRest)(), loan_controller_1.LoanController.getLoansByCategory);
/**
 * @swagger
 * /backoffice/loans/bulk-action:
 *   post:
 *     tags: [Admin - Loans]
 *     summary: Bulk approve/reject loans
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkLoanActionRequest'
 *     responses:
 *       200:
 *         description: Bulk operation result
 */
router.post("/loans/bulk-action", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqBody)(validations_1.bulkLoanActionSchema), admin_controller_1.AdminController.bulkLoanAction);
/* =============================
   SAVINGS MANAGEMENT
   ============================= */
router.get("/savings", (0, middlewares_1.verifyJwtRest)(), savings_controller_1.SavingsController.getPlans);
router.get("/savings/stats", (0, middlewares_1.verifyJwtRest)(), admin_controller_1.AdminController.getSavingsStats);
router.get("/savings/by-category", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqQuery)(validations_1.flaggedQuerySchema), admin_controller_1.AdminController.getSavingsByCategory);
/* =============================
   DASHBOARD / REPORTS
   ============================= */
/**
 * @swagger
 * components:
 *   schemas:
 *     AdminStats:
 *       type: object
 *       properties:
 *         users:
 *           type: object
 *           properties:
 *             total: { type: integer }
 *             active: { type: integer }
 *             inactive: { type: integer }
 *             newThisMonth: { type: integer }
 *         loans:
 *           type: object
 *           properties:
 *             total: { type: integer }
 *             pending: { type: integer }
 *             active: { type: integer }
 *             overdue: { type: integer }
 *             totalDisbursed: { type: number }
 *             totalOutstanding: { type: number }
 *         transfers:
 *           type: object
 *           properties:
 *             total: { type: integer }
 *             pending: { type: integer }
 *             completed: { type: integer }
 *             failed: { type: integer }
 *             totalVolume: { type: number }
 *         billPayments:
 *           type: object
 *           properties:
 *             total: { type: integer }
 *             pending: { type: integer }
 *             completed: { type: integer }
 *             failed: { type: integer }
 *             totalVolume: { type: number }
 *         savings:
 *           type: object
 *           properties:
 *             totalPlans: { type: integer }
 *             activePlans: { type: integer }
 *             totalPrincipal: { type: number }
 *             totalInterestEarned: { type: number }
 *         revenue:
 *           type: object
 *           properties:
 *             totalRevenue: { type: number }
 *             loanInterest: { type: number }
 *             billPaymentFees: { type: number }
 *             transferFees: { type: number }
 *             savingsPenalties: { type: number }
 */
router.get("/dashboard", (0, middlewares_1.verifyJwtRest)(), admin_controller_1.AdminController.getDashboardStats);
/**
 * @swagger
 * /backoffice/system/health:
 *   get:
 *     tags: [Admin - Reports]
 *     summary: Get system health overview
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health
 */
router.get("/system/health", (0, middlewares_1.verifyJwtRest)(), admin_controller_1.AdminController.getSystemHealth);
/**
 * @swagger
 * /backoffice/business-report:
 *   get:
 *     tags: [Admin - Reports]
 *     summary: Generate business/profit report (from/to query)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Business report
 */
router.get("/business-report", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqQuery)(validations_1.businessReportQuerySchema), admin_controller_1.AdminController.generateBusinessReport);
router.get("/profits", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqQuery)(validations_1.profitReportQuerySchema), admin_controller_1.AdminController.getProfitReport);
/* =============================
   TRANSACTIONS & RECONCILIATION
   ============================= */
/**
 * @swagger
 * /backoffice/transactions/{traceId}:
 *   get:
 *     tags: [Admin - Transactions]
 *     summary: Get ledger entries & related txns by traceId
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
 *         description: Transaction details
 */
router.get("/transactions/:traceId([0-9a-fA-F]{24})", (0, middlewares_1.verifyJwtRest)(), admin_controller_1.AdminController.getTransactionDetails);
/**
 * @swagger
 * /backoffice/transfers/{id}/requery:
 *   post:
 *     tags: [Admin - Transactions]
 *     summary: Re-query a transfer and attempt reconcile (best-effort)
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
 *         description: Requery result
 */
router.post("/transfers/:id([0-9a-fA-F]{24})/requery", (0, middlewares_1.verifyJwtRest)(), admin_controller_1.AdminController.requeryTransfer);
router.get("/reconciliation/inconsistencies", (0, middlewares_1.verifyJwtRest)(), admin_controller_1.AdminController.getReconciliationInconsistencies);
router.get("/transactions/flagged", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqQuery)(validations_1.flaggedQuerySchema), admin_controller_1.AdminController.getFlaggedTransactions);
router.get("/transactions", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqQuery)(validations_1.transactionQuerySchema), admin_controller_1.AdminController.getTransactions);
/* =============================
   ACTIVITY LOGS
   ============================= */
/**
 * @swagger
 * /backoffice/activity-logs:
 *   get:
 *     tags: [Admin - Logs]
 *     summary: Get admin activity logs
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
 *           default: 50
 *       - in: query
 *         name: adminId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Activity logs
 */
router.get("/activity-logs", (0, middlewares_1.verifyJwtRest)(), (0, middlewares_1.validateReqQuery)(validations_1.activityLogsQuerySchema), admin_controller_1.AdminController.getAdminActivityLogs);
/* ================================
   ADMIN SETTINGS
================================ */
/**
 * @swagger
 * /backoffice/settings:
 *   get:
 *     tags: [Admin - Settings]
 *     summary: Get admin settings
 *     security: [ { bearerAuth: [] } ]
 */
router.get("/settings", (0, middlewares_1.verifyJwtRest)(), admin_controller_1.AdminController.getSettings);
/**
 * @swagger
 * /backoffice/settings:
 *   put:
 *     tags: [Admin - Settings]
 *     summary: Update admin settings
 *     security: [ { bearerAuth: [] } ]
 */
router.put("/settings", (0, middlewares_1.verifyJwtRest)(), admin_controller_1.AdminController.updateSettings);
exports.default = router;
