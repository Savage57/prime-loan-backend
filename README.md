@@ .. @@
+# Prime Finance Backend V2
+
+A comprehensive financial services backend with clean architecture, ledger-first design, and robust reconciliation capabilities.
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