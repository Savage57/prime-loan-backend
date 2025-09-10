/**
 * Admin Routes - Administrative endpoints
 * Comprehensive admin functionality with proper RBAC
 */
import express from 'express';
import { AdminController } from '../modules/admin/AdminController';
import { AdminService } from '../modules/admin/admin.service';
import { LoanController } from '../modules/loans/loan.controller';
import { SavingsController } from '../modules/savings/savings.controller';
import { UserService } from '../modules/users/user.service';
import { verifyJwtRest, validateReqBody } from '../middlewares';
import { 
  createAdminAccountSchema, 
  activateAdminReqBodySchema, 
  activateUserReqBodySchema 
} from '../validations';
import { idempotencyMiddleware } from '../shared/idempotency/middleware';
import { checkPermission } from '../shared/utils/checkPermission';

const router = express.Router();

// Admin Authentication & Management
/**
 * @swagger
 * /api/admin/create:
 *   post:
 *     tags: [Admin]
 *     summary: Create admin account (Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, name, surname, password, phone]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               name:
 *                 type: string
 *               surname:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *               phone:
 *                 type: string
 *               is_super_admin:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Admin created successfully
 */
router.post('/create', 
  verifyJwtRest(),
  validateReqBody(createAdminAccountSchema),
  async (req: any, res, next) => {
    try {
      if (!req.admin?.is_super_admin) {
        return res.status(403).json({
          status: 'error',
          message: 'Only super admins can create admin accounts'
        });
      }

      const adminService = new AdminService();
      const admin = await adminService.createAdminAccount(req.body);

      res.status(201).json({
        status: 'success',
        data: admin
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/admin/activate:
 *   post:
 *     tags: [Admin]
 *     summary: Activate/Deactivate admin account
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [adminId, status]
 *             properties:
 *               adminId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Admin status updated
 */
router.post('/activate', 
  verifyJwtRest(),
  validateReqBody(activateAdminReqBodySchema),
  async (req: any, res, next) => {
    try {
      if (!req.admin?.is_super_admin) {
        return res.status(403).json({
          status: 'error',
          message: 'Only super admins can manage admin accounts'
        });
      }

      const adminService = new AdminService();
      const admin = await adminService.ActivateAndDeactivateAdmin(req.body);

      res.status(200).json({
        status: 'success',
        data: admin
      });
    } catch (error) {
      next(error);
    }
  }
);

// User Management
/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     tags: [Admin - Users]
 *     summary: Get all users (paginated)
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
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get('/users', 
  verifyJwtRest(),
  async (req: any, res, next) => {
    try {
      checkPermission(req.admin, 'view_users');

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const status = req.query.status;

      const filter: any = {};
      if (status) filter.status = status;

      const skip = (page - 1) * limit;
      const users = await UserService.find(filter, 'many');
      
      res.status(200).json({
        status: 'success',
        data: {
          users: Array.isArray(users) ? users.slice(skip, skip + limit) : [],
          page,
          limit
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/admin/users/{userId}:
 *   get:
 *     tags: [Admin - Users]
 *     summary: Get user details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details retrieved
 */
router.get('/users/:userId', 
  verifyJwtRest(),
  async (req: any, res, next) => {
    try {
      checkPermission(req.admin, 'view_users');

      const user = await UserService.getUser(req.params.userId);
      
      res.status(200).json({
        status: 'success',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/admin/users/activate:
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
 *             type: object
 *             required: [userId, status]
 *             properties:
 *               userId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: User status updated
 */
router.post('/users/activate', 
  verifyJwtRest(),
  validateReqBody(activateUserReqBodySchema),
  async (req: any, res, next) => {
    try {
      checkPermission(req.admin, 'manage_users');

      const adminService = new AdminService();
      const user = await adminService.ActivateAndDeactivateUser(req.body);

      res.status(200).json({
        status: 'success',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }
);

// Loan Management
/**
 * @swagger
 * /api/admin/loans:
 *   get:
 *     tags: [Admin - Loans]
 *     summary: Get all loans with filters
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
 *         description: Loans retrieved successfully
 */
router.get('/loans', verifyJwtRest(), LoanController.listAllLoans);

/**
 * @swagger
 * /api/admin/loans/{id}:
 *   get:
 *     tags: [Admin - Loans]
 *     summary: Get loan details with history
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
 *         description: Loan details retrieved
 */
router.get('/loans/:id', verifyJwtRest(), LoanController.singleLoanHistory);

/**
 * @swagger
 * /api/admin/loans/disburse:
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
 *             type: object
 *             required: [loanId]
 *             properties:
 *               loanId:
 *                 type: string
 *               amount:
 *                 type: number
 *                 description: Override amount (optional)
 *     responses:
 *       200:
 *         description: Loan disbursed successfully
 */
router.post('/loans/disburse', 
  verifyJwtRest(), 
  idempotencyMiddleware(),
  LoanController.disburseLoan
);

/**
 * @swagger
 * /api/admin/loans/{id}/reject:
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
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Loan rejected successfully
 */
router.post('/loans/:id/reject', verifyJwtRest(), LoanController.rejectLoan);

/**
 * @swagger
 * /api/admin/loans/stats:
 *   get:
 *     tags: [Admin - Loans]
 *     summary: Get loan portfolio statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Loan statistics retrieved
 */
router.get('/loans/stats', verifyJwtRest(), LoanController.getAdminLoanStats);

/**
 * @swagger
 * /api/admin/loans/category/{category}:
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
 *         description: Loans by category retrieved
 */
router.get('/loans/category/:category', verifyJwtRest(), LoanController.getLoansByCategory);

// Savings Management
/**
 * @swagger
 * /api/admin/savings:
 *   get:
 *     tags: [Admin - Savings]
 *     summary: Get all savings plans
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
router.get('/savings', verifyJwtRest(), SavingsController.getPlans);

// V2 Admin Endpoints
router.get('/transactions/:traceId', verifyJwtRest(), AdminController.getTransactionDetails);
router.post('/transfers/:id/requery', verifyJwtRest(), AdminController.requeryTransfer);
router.get('/profits', verifyJwtRest(), AdminController.getProfitReport);
router.get('/reconciliation/inconsistencies', verifyJwtRest(), AdminController.getReconciliationInconsistencies);

export default router;