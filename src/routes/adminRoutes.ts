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

import express from "express";
import { AdminController } from "../modules/admin/admin.controller";
import { LoanController } from "../modules/loans/loan.controller";
import { SavingsController } from "../modules/savings/savings.controller";
import { verifyJwtRest, validateReqBody, validateReqQuery } from "../shared/middlewares";
import {
  createAdminAccountSchema,
  activateAdminReqBodySchema,
  activateUserReqBodySchema,
  getUsersQuerySchema,
  bulkLoanActionSchema,
  disburseLoanSchema,
  rejectLoanSchema,
  loanListQuerySchema,
  businessReportQuerySchema,
  profitReportQuerySchema,
  flaggedQuerySchema,
  updateAdminPermissionsSchema,
  activityLogsQuerySchema,
  changePasswordSchema,
  initiateResetSchema,
  updatePasswordOrPinSchema,
  updateUserSchema,
  validateResetSchema,
  loginSchema
} from "../validations";
import { idempotencyMiddleware } from "../shared/idempotency/middleware";
import { checkPermission } from "../shared/utils/checkPermission";

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

const router = express.Router();

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
router.post(
  "/create",
  verifyJwtRest(),
  validateReqBody(createAdminAccountSchema),
  AdminController.createAdminAccount as any
);

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
router.post("/login", validateReqBody(loginSchema), AdminController.login as any);

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
router.get("/profile", verifyJwtRest(), AdminController.profile as any);

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
router.put(
  "/update",
  verifyJwtRest(),
  validateReqBody(updateUserSchema),
  AdminController.update as any
);

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
router.post(
  "/change-password",
  verifyJwtRest(),
  validateReqBody(changePasswordSchema),
  AdminController.changePassword as any
);

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
router.post("/reset/initiate", validateReqBody(initiateResetSchema), AdminController.initiateReset as any);

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
router.post("/reset/validate", validateReqBody(validateResetSchema), AdminController.validateReset as any);

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
router.post("/update-password-pin", validateReqBody(updatePasswordOrPinSchema), AdminController.updatePasswordOrPin as any);

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
router.get("/:adminId", verifyJwtRest(), AdminController.getAdmin as any);

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
router.post(
  "/activate",
  verifyJwtRest(),
  validateReqBody(activateAdminReqBodySchema),
  AdminController.activateAndDeactivateAdmin as any
);

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
router.put(
  "/:adminId/permissions",
  verifyJwtRest(),
  validateReqBody(updateAdminPermissionsSchema),
  AdminController.updateAdminPermissions as any
);

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
router.get(
  "/users",
  verifyJwtRest(),
  validateReqQuery(getUsersQuerySchema),
  AdminController.getUsers as any
);

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
router.post(
  "/users/activate",
  verifyJwtRest(),
  validateReqBody(activateUserReqBodySchema),
  AdminController.activateAndDeactivateUser as any
);

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
router.get("/loans", verifyJwtRest(), validateReqQuery(loanListQuerySchema), LoanController.listAllLoans as any);

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
router.get("/loans/:id", verifyJwtRest(), LoanController.singleLoanHistory as any);

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
router.post("/loans/disburse", verifyJwtRest(), idempotencyMiddleware() as any, validateReqBody(disburseLoanSchema), LoanController.disburseLoan as any);

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
router.post("/loans/:id/reject", verifyJwtRest(), validateReqBody(rejectLoanSchema), LoanController.rejectLoan as any);

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
router.get("/loans/stats", verifyJwtRest(), LoanController.getAdminLoanStats as any);

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
router.get("/loans/category/:category", verifyJwtRest(), LoanController.getLoansByCategory as any);

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
router.post("/loans/bulk-action", verifyJwtRest(), validateReqBody(bulkLoanActionSchema), AdminController.bulkLoanAction as any);

/* =============================
   SAVINGS MANAGEMENT
   ============================= */

router.get("/savings", verifyJwtRest(), SavingsController.getPlans as any);

router.get("/savings/stats", verifyJwtRest(), AdminController.getSavingsStats as any);

router.get("/savings/by-category", verifyJwtRest(), validateReqQuery(flaggedQuerySchema), AdminController.getSavingsByCategory as any);

/* =============================
   DASHBOARD / REPORTS
   ============================= */

/**
 * @swagger
 * /backoffice/dashboard:
 *   get:
 *     tags: [Admin - Reports]
 *     summary: Get admin dashboard stats
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
router.get("/dashboard", verifyJwtRest(), AdminController.getDashboardStats as any);

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
router.get("/system/health", verifyJwtRest(), AdminController.getSystemHealth as any);

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
router.get("/business-report", verifyJwtRest(), validateReqQuery(businessReportQuerySchema), AdminController.generateBusinessReport as any);

router.get("/profits", verifyJwtRest(), validateReqQuery(profitReportQuerySchema), AdminController.getProfitReport as any);

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
router.get("/transactions/:traceId", verifyJwtRest(), AdminController.getTransactionDetails as any);

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
router.post("/transfers/:id/requery", verifyJwtRest(), AdminController.requeryTransfer as any);

router.get("/reconciliation/inconsistencies", verifyJwtRest(), AdminController.getReconciliationInconsistencies as any);

router.get("/transactions/flagged", verifyJwtRest(), validateReqQuery(flaggedQuerySchema), AdminController.getFlaggedTransactions as any);

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
router.get("/activity-logs", verifyJwtRest(), validateReqQuery(activityLogsQuerySchema), AdminController.getAdminActivityLogs as any);

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
router.get(
  "/settings",
  verifyJwtRest(),
  AdminController.getSettings as any
);

/**
 * @swagger
 * /backoffice/settings:
 *   put:
 *     tags: [Admin - Settings]
 *     summary: Update admin settings
 *     security: [ { bearerAuth: [] } ]
 */
router.put(
  "/settings",
  verifyJwtRest(),
  AdminController.updateSettings as any
);

export default router;
