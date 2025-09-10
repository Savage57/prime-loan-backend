/**
 * User Routes - V1 and V2 User Management
 * Consolidated user endpoints with proper validation and documentation
 */
import express from 'express';
import { UserController } from '../modules/users/user.controller';
import { validateReqBody, verifyJwtRest } from '../middlewares';
import { 
  createClientAccountSchema, 
  loginReqBodySchema, 
  updateUserSchema,
  changePasswordSchema,
  walletAlertsSchema,
  transferSchema
} from '../validations';
import { TransferService } from '../modules/transfers/transfer.service';
import { idempotencyMiddleware } from '../shared/idempotency/middleware';

const router = express.Router();

/**
 * @swagger
 * /api/users/create-client:
 *   post:
 *     tags: [Users]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, name, surname, password, phone, bvn, pin, nin, dob]
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
 *               bvn:
 *                 type: string
 *                 minLength: 11
 *                 maxLength: 11
 *               pin:
 *                 type: string
 *                 minLength: 4
 *                 maxLength: 4
 *               nin:
 *                 type: string
 *                 minLength: 11
 *                 maxLength: 11
 *               dob:
 *                 type: string
 *                 pattern: '^([0-2][0-9]|3[0-1])/(0[1-9]|1[0-2])/\d{4}$'
 *                 example: "01/01/1990"
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
 */
router.post('/create-client', 
  validateReqBody(createClientAccountSchema), 
  UserController.register
);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     tags: [Users]
 *     summary: User login
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
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           $ref: '#/components/schemas/User'
 *                         accessToken:
 *                           type: string
 *                         refreshToken:
 *                           type: string
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', 
  validateReqBody(loginReqBodySchema), 
  UserController.login
);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 */
router.get('/profile', 
  verifyJwtRest(), 
  UserController.profile
);

/**
 * @swagger
 * /api/users/update:
 *   put:
 *     tags: [Users]
 *     summary: Update user field
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
 *                 example: "user_metadata.phone"
 *               value:
 *                 type: string
 *                 example: "08012345678"
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.put('/update', 
  verifyJwtRest(), 
  validateReqBody(updateUserSchema), 
  UserController.update
);

/**
 * @swagger
 * /api/users/change-password:
 *   post:
 *     tags: [Users]
 *     summary: Change user password
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
router.post('/change-password', 
  verifyJwtRest(), 
  validateReqBody(changePasswordSchema), 
  UserController.changePassword
);

/**
 * @swagger
 * /api/users/initiate-reset:
 *   post:
 *     tags: [Users]
 *     summary: Initiate password/pin reset
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
 *                 format: email
 *               type:
 *                 type: string
 *                 enum: [password, pin]
 *     responses:
 *       200:
 *         description: Reset OTP sent
 */
router.post('/initiate-reset', UserController.initiateReset);

/**
 * @swagger
 * /api/users/validate-reset:
 *   post:
 *     tags: [Users]
 *     summary: Validate reset OTP
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
 *                 format: email
 *               pin:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP validated successfully
 */
router.post('/validate-reset', UserController.validateReset);

/**
 * @swagger
 * /api/users/update-password-pin:
 *   post:
 *     tags: [Users]
 *     summary: Update password or pin after validation
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
 *                 format: email
 *               newPassword:
 *                 type: string
 *               newPin:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password/PIN updated successfully
 */
router.post('/update-password-pin', UserController.updatePasswordOrPin);

/**
 * @swagger
 * /api/users/transfer:
 *   post:
 *     tags: [Users]
 *     summary: Initiate money transfer (Legacy V1)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Transfer'
 *     responses:
 *       200:
 *         description: Transfer initiated successfully
 */
router.post('/transfer', 
  verifyJwtRest(), 
  validateReqBody(transferSchema),
  idempotencyMiddleware(),
  async (req: any, res, next) => {
    try {
      // Legacy transfer endpoint - redirect to V2
      const result = await TransferService.initiateTransfer({
        fromAccount: req.body.fromAccount,
        userId: req.user._id,
        toAccount: req.body.toAccount,
        amount: parseFloat(req.body.amount),
        transferType: req.body.transferType || 'inter',
        bankCode: req.body.toBank,
        remark: req.body.remark,
        idempotencyKey: req.idempotencyKey
      });

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/users/wallet-alerts:
 *   post:
 *     tags: [Users]
 *     summary: Handle wallet credit alerts (Webhook)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [account_number, amount, reference, session_id]
 *             properties:
 *               account_number:
 *                 type: string
 *               amount:
 *                 type: number
 *               originator_account_name:
 *                 type: string
 *               originator_account_number:
 *                 type: string
 *               originator_bank:
 *                 type: string
 *               originator_narration:
 *                 type: string
 *               reference:
 *                 type: string
 *               session_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Wallet alert processed
 */
router.post('/wallet-alerts', 
  validateReqBody(walletAlertsSchema),
  async (req, res, next) => {
    try {
      const transferService = new TransferService();
      const result = await transferService.walletAlerts(req.body);
      
      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;