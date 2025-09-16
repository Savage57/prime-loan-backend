/**
 * @swagger
 * components:
 *   schemas:
 *     CreateClientAccount:
 *       type: object
 *       required:
 *         - email
 *         - name
 *         - surname
 *         - password
 *         - phone
 *         - bvn
 *         - pin
 *         - nin
 *         - dob
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "johndoe@gmail.com"
 *         name:
 *           type: string
 *           example: "John"
 *         surname:
 *           type: string
 *           example: "Doe"
 *         password:
 *           type: string
 *           format: password
 *           example: "StrongP@ss123"
 *         phone:
 *           type: string
 *           description: Must be a valid Nigerian number
 *           example: "08012345678"
 *         bvn:
 *           type: string
 *           example: "12345678901"
 *         pin:
 *           type: string
 *           description: 4-digit numeric PIN
 *           example: "1234"
 *         nin:
 *           type: string
 *           description: 11-digit NIN
 *           example: "12345678901"
 *         dob:
 *           type: string
 *           description: Format dd/mm/yyyy
 *           example: "25/12/1995"
 *
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "johndoe@gmail.com"
 *         password:
 *           type: string
 *           format: password
 *           example: "StrongP@ss123"
 *
 *     UpdateUserRequest:
 *       type: object
 *       required:
 *         - field
 *         - value
 *       properties:
 *         field:
 *           type: string
 *           enum:
 *             - user_metadata.phone
 *             - user_metadata.address
 *             - user_metadata.profile_photo
 *             - user_metadata.first_name
 *             - user_metadata.surname
 *           example: "user_metadata.phone"
 *         value:
 *           type: string
 *           example: "08123456789"
 *
 *     InitiateResetRequest:
 *       type: object
 *       required:
 *         - email
 *         - type
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "johndoe@gmail.com"
 *         type:
 *           type: string
 *           enum: [password, pin]
 *           example: "password"
 *
 *     ValidateResetRequest:
 *       type: object
 *       required:
 *         - email
 *         - pin
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "johndoe@gmail.com"
 *         pin:
 *           type: string
 *           description: 6-digit OTP
 *           example: "123456"
 *
 *     UpdatePasswordOrPinRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "johndoe@gmail.com"
 *         newPassword:
 *           type: string
 *           format: password
 *           example: "NewStrongP@ss123"
 *         newPin:
 *           type: string
 *           example: "5678"
 *       description: Either `newPassword` or `newPin` must be provided
 *
 *     ChangePasswordRequest:
 *       type: object
 *       required:
 *         - oldPassword
 *         - newPassword
 *       properties:
 *         oldPassword:
 *           type: string
 *           format: password
 *           example: "OldPass123"
 *         newPassword:
 *           type: string
 *           format: password
 *           example: "NewStrongP@ss123"
 */


