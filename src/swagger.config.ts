/**
 * Swagger Configuration for Prime Finance API
 * Comprehensive API documentation for both user and admin endpoints
 */
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Prime Finance API',
      version: '2.0.0',
      description: 'Comprehensive financial services API with loans, transfers, bill payments, and savings',
      contact: {
        name: 'Prime Finance Support',
        email: 'support@primefinance.live'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.primefinance.live',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['user', 'admin'] },
            status: { type: 'string', enum: ['active', 'inactive'] },
            user_metadata: {
              type: 'object',
              properties: {
                first_name: { type: 'string' },
                surname: { type: 'string' },
                phone: { type: 'string' },
                accountNo: { type: 'string' },
                wallet: { type: 'string' },
                creditScore: { type: 'number' },
                ladderIndex: { type: 'number' }
              }
            }
          }
        },
        Loan: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { type: 'string' },
            amount: { type: 'number' },
            outstanding: { type: 'number' },
            status: { type: 'string', enum: ['pending', 'accepted', 'rejected'] },
            loan_payment_status: { type: 'string', enum: ['not-started', 'in-progress', 'complete'] },
            repayment_date: { type: 'string', format: 'date-time' },
            category: { type: 'string', enum: ['personal', 'working'] }
          }
        },
        Transfer: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { type: 'string' },
            traceId: { type: 'string' },
            fromAccount: { type: 'string' },
            toAccount: { type: 'string' },
            amount: { type: 'number' },
            status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED'] },
            transferType: { type: 'string', enum: ['intra', 'inter'] }
          }
        },
        BillPayment: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { type: 'string' },
            serviceType: { type: 'string' },
            amount: { type: 'number' },
            status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED'] },
            customerReference: { type: 'string' }
          }
        },
        SavingsPlan: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { type: 'string' },
            planName: { type: 'string' },
            planType: { type: 'string', enum: ['LOCKED', 'FLEXIBLE'] },
            principal: { type: 'number' },
            interestRate: { type: 'number' },
            status: { type: 'string', enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'] }
          }
        },
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string' },
            requestId: { type: 'string' },
            traceId: { type: 'string' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: { type: 'object' },
            message: { type: 'string' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/modules/*/routes/*.ts', './src/app/routes.v2.ts']
};

export const specs = swaggerJsdoc(options);
export const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true
  }
};

export { swaggerUi };