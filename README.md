@@ .. @@
+# Prime Finance Backend V2
# Prime Finance Backend V2
+
+A comprehensive financial services backend with clean architecture, ledger-first design, and robust reconciliation capabilities.

## Features

### V2 Architecture (New)
- **Ledger-First Design**: Every financial operation creates corresponding ledger entries
- **OCR Loan Ladder**: Extract income steps from calculator images for loan eligibility
- **Auto-Approval**: Loans up to ₦50,000 can be auto-approved based on eligibility
- **Polling & Reconciliation**: Automatic status checking and reconciliation for pending transactions
- **Savings Plans**: Locked and flexible savings with interest calculations and penalties
- **Admin Dashboard**: Comprehensive tools for manual reviews, profit reporting, and reconciliation
- **Idempotency**: Prevents duplicate operations with idempotency key enforcement
- **Circuit Breakers**: Prevents cascading failures with provider APIs
- **Rate Limiting**: Protects against abuse with configurable rate limits
- **Comprehensive Monitoring**: Prometheus metrics and health checks
- **API Documentation**: Complete Swagger/OpenAPI documentation

### V1 Features (Preserved)
- User registration and authentication
- Loan applications and management
- Bill payments and transfers
- Transaction history and notifications
- Admin user management

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Build and start**
   ```bash
   npm run build
   npm start
   ```

4. **Start workers** (in separate terminals)
   ```bash
   npm run start:workers
   # Or individually:
   # npm run workers:bill-payments
   # npm run workers:transfers
   # npm run workers:penalties
   # npm run workers:savings
   ```

5. **View API Documentation**
   ```
   http://localhost:3000/api-docs
   ```

## API Documentation

### V1 Endpoints (Existing)
- `POST /api/users/create-client` - User registration
- `POST /api/users/login` - Authentication
- `POST /api/loans/create-loan` - Loan application
- `POST /api/paybills/*` - Bill payment services
- `POST /api/users/transfer` - Money transfers

### V2 Endpoints (New)
- `POST /v2/bill-payments/initiate` - Initiate bill payment with ledger tracking
- `POST /v2/transfers` - Enhanced transfers with reconciliation
- `POST /v2/loans/request` - Loan request with OCR ladder extraction
- `POST /v2/savings/plans` - Create savings plans
- `GET /v2/admin/profits` - Profit reporting dashboard

### Admin Endpoints
- `GET /api/admin/users` - User management
- `GET /api/admin/loans` - Loan management
- `GET /api/admin/loans/stats` - Loan portfolio statistics
- `POST /api/admin/loans/disburse` - Disburse loans
- `GET /v2/admin/reconciliation/inconsistencies` - Ledger reconciliation

## Architecture

### Clean Architecture Layers
```
/src
  /app                 # Application layer (routes, middleware)
  /modules            # Business modules (loans, transfers, etc.)
    /{module}
      /domain         # Business logic
      /application    # Use cases
      /infrastructure # Data access
      /http          # Controllers
  /shared            # Shared utilities and services
  /workers           # Background job processors
  /tests             # Test suites
```

### Key Principles
- **Ledger-First**: All money movements create ledger entries
- **Idempotency**: Duplicate operations return cached responses
- **Polling**: Pending transactions are automatically reconciled
- **Circuit Breakers**: Provider failures are handled gracefully
- **Audit Trail**: Complete transaction history for compliance
- **Rate Limiting**: API protection against abuse
- **Comprehensive Testing**: Unit and integration tests

## Development

### Running in Development
```bash
npm run dev
```

### Building for Production
```bash
npm run build
```

### Running Tests
```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report
```

### Code Quality
```bash
npm run lint           # Check code style
npm run lint:fix       # Fix auto-fixable issues
```

### Database Migrations
New collections are created automatically. Existing data is preserved.

## Monitoring & Observability

### Health Checks
- Application: `GET /health`
- Ledger: `GET /v2/admin/reconciliation/inconsistencies`

### Metrics
Prometheus metrics available at `/metrics`:
- HTTP request metrics
- Business metrics (loans, transfers, etc.)
- System health metrics
- Custom application metrics

### Logging
Structured JSON logs with request correlation and PII redaction

## Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Admin permission system
- Rate limiting on sensitive endpoints

### Data Protection
- Password encryption
- PII redaction in logs
- Secure API key management
- Input validation and sanitization

### Financial Security
- Idempotency key enforcement
- Double-entry bookkeeping
- Transaction reconciliation
- Audit trails

## API Rate Limits

- **Authentication**: 5 attempts per 15 minutes
- **General API**: 100 requests per 15 minutes
- **Financial Operations**: 10 requests per minute

## Environment Variables

Key environment variables (see `.env.example` for complete list):

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/prime-finance
REDIS_URL=redis://localhost:6379

# Server
PORT=3000
NODE_ENV=development

# Features
FEATURE_LEDGER=true
FEATURE_AUTO_APPROVAL=true
FEATURE_OCR=true

# Security
ACCESS_TOKEN_SECRET=your_jwt_secret
REFRESH_TOKEN_SECRET=your_refresh_secret
CRYPTOJS_KEY=your_encryption_key
```

## Deployment

### Docker Deployment
```bash
docker build -t prime-finance-backend .
docker run -p 3000:3000 --env-file .env prime-finance-backend
```

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper database URLs
- [ ] Set up Redis cluster
- [ ] Configure monitoring and alerting
- [ ] Set up log aggregation
- [ ] Configure backup strategies
- [ ] Set up SSL/TLS certificates
- [ ] Configure rate limiting
- [ ] Set up health checks

## Support & Contributing

### Getting Help
- Check the API documentation at `/api-docs`
- Review the architecture docs in `docs/`
- Check existing issues and discussions

### Contributing
1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Code Standards
- Follow TypeScript best practices
- Write comprehensive tests
- Use meaningful commit messages
- Document new features
- Follow the existing code style

## License

This project is proprietary software. All rights reserved.

+
+## Features
+
+### V2 Architecture (New)
+- **Ledger-First Design**: Every financial operation creates corresponding ledger entries
+- **OCR Loan Ladder**: Extract income steps from calculator images for loan eligibility
+- **Auto-Approval**: Loans up to ₦50,000 can be auto-approved based on eligibility
+- **Polling & Reconciliation**: Automatic status checking and reconciliation for pending transactions
+- **Savings Plans**: Locked and flexible savings with interest calculations and penalties
+- **Admin Dashboard**: Comprehensive tools for manual reviews, profit reporting, and reconciliation
+- **Idempotency**: Prevents duplicate operations with idempotency key enforcement
+- **Circuit Breakers**: Prevents cascading failures with provider APIs
+
+### V1 Features (Preserved)
+- User registration and authentication
+- Loan applications and management
+- Bill payments and transfers
+- Transaction history and notifications
+- Admin user management
+
+## Quick Start
+
+1. **Install dependencies**
+   ```bash
+   npm install
+   ```
+
+2. **Setup environment**
+   ```bash
+   cp .env.example .env
+   # Edit .env with your configuration
+   ```
+
+3. **Build and start**
+   ```bash
+   npm run build
+   npm start
+   ```
+
+4. **Start workers** (in separate terminals)
+   ```bash
+   node dist/workers/pollers/billPaymentsPoller.js
+   node dist/workers/pollers/transfersPoller.js
+   node dist/workers/loans/penaltiesCron.js
+   node dist/workers/savings/maturitiesWorker.js
+   ```
+
+## API Documentation
+
+### V1 Endpoints (Existing)
+- `POST /api/users/create-client` - User registration
+- `POST /api/users/login` - Authentication
+- `POST /api/loans/create-loan` - Loan application
+- `POST /api/paybills/*` - Bill payment services
+- `POST /api/users/transfer` - Money transfers
+
+### V2 Endpoints (New)
+- `POST /v2/bill-payments/initiate` - Initiate bill payment with ledger tracking
+- `POST /v2/transfers` - Enhanced transfers with reconciliation
+- `POST /v2/loans/request` - Loan request with OCR ladder extraction
+- `POST /v2/savings/plans` - Create savings plans
+- `GET /v2/admin/profits` - Profit reporting dashboard
+
+## Architecture
+
+### Clean Architecture Layers
+```
+/src
+  /app                 # Application layer (routes, middleware)
+  /modules            # Business modules (loans, transfers, etc.)
+    /{module}
+      /domain         # Business logic
+      /application    # Use cases
+      /infrastructure # Data access
+      /http          # Controllers
+  /shared            # Shared utilities and services
+  /workers           # Background job processors
+```
+
+### Key Principles
+- **Ledger-First**: All money movements create ledger entries
+- **Idempotency**: Duplicate operations return cached responses
+- **Polling**: Pending transactions are automatically reconciled
+- **Circuit Breakers**: Provider failures are handled gracefully
+- **Audit Trail**: Complete transaction history for compliance
+
+## Development
+
+### Running in Development
+```bash
+npm run dev
+```
+
+### Building for Production
+```bash
+npm run build
+```
+
+### Database Migrations
+New collections are created automatically. Existing data is preserved.
+
+### Testing
+```bash
+npm test  # When tests are added
+```
+
+## Monitoring
+
+### Health Checks
+- Application: `GET /health`
+- Ledger: `GET /v2/admin/reconciliation/inconsistencies`
+
+### Metrics
+Prometheus metrics available at `/metrics`
+
+### Logging
+Structured JSON logs with request correlation and PII redaction
+
+## Support
+
+For technical support or questions about the V2 architecture, refer to:
+- `docs/REFARCH.md` - Detailed architecture documentation
+- `docs/RUNNING.md` - Operational procedures
+- Admin dashboard at `/v2/admin/*` endpoints
+
 # Prime Finance Backend
 
 A comprehensive financial services backend built with Node.js, TypeScript, Express, and MongoDB.