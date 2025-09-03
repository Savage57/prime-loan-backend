# Prime Finance Backend - Unified Architecture

A comprehensive financial services backend with enhanced ledger tracking, robust reconciliation capabilities, and unified V1/V2 architecture.

## Features

### Enhanced Features
- **Ledger-First Design**: Every financial operation creates corresponding ledger entries
- **Auto-Approval**: Loans up to ₦50,000 can be auto-approved based on eligibility
- **Admin Dashboard**: Comprehensive tools for manual reviews, profit reporting, and reconciliation
- **Idempotency**: Prevents duplicate operations with idempotency key enforcement
- **Enhanced Tracking**: All transactions include trace IDs for complete audit trails

### Core Features
- User registration and authentication
- Loan applications and management
- Bill payments and transfers
- Transaction history and notifications
- Admin user management
- Enhanced loan repayments with ledger integration
- Improved transfer handling with reconciliation

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

4. **Start penalty worker** (optional, in separate terminal)
   ```bash
   node dist/workers/loanPenalties.js
   ```

## API Endpoints

### Core Endpoints
- `POST /api/users/create-client` - User registration
- `POST /api/users/login` - User authentication
- `POST /api/loans/create-loan` - Loan application
- `POST /api/paybills/paybill` - Bill payments
- `POST /api/users/transfer` - Money transfers

### Enhanced Endpoints
- `POST /api/loans/create-enhanced` - Enhanced loan creation with ledger
- `POST /api/loans/repay-enhanced` - Enhanced loan repayment with ledger
- `POST /api/users/transfer-enhanced` - Enhanced transfers with ledger
- `POST /api/enhanced/loans/repay` - Idempotent loan repayment
- `POST /api/enhanced/transfers/enhanced` - Idempotent transfers

### Admin Endpoints
- `GET /api/admin/transactions/:traceId` - Transaction details
- `GET /api/admin/profits` - Profit reporting
- `GET /api/admin/reconciliation/inconsistencies` - Find ledger issues
- `POST /api/admin/loans/:loanId/approve` - Manual loan approval

## Database Collections

### Enhanced Collections
- `ledger_entries` - All financial transactions
- `idempotency_keys` - Duplicate operation prevention

### Core Collections (Enhanced)
- `users` - User accounts and authentication
- `loans` - Loan applications and status (enhanced with traceId)
- `transactions` - Transaction history (enhanced with traceId)
- `messages` - User notifications
- `counters` - System counters for signup bonuses

## Monitoring

### Health Checks
- `GET /health` - Application health
- `GET /api/admin/reconciliation/inconsistencies` - Ledger health

### Logging
Structured JSON logs with:
- Request ID correlation
- Trace ID for transaction tracking
- PII redaction for compliance

## Configuration

### Feature Flags
- `FEATURE_LEDGER`: Enable/disable ledger-first operations
- `LOAN_AUTO_APPROVAL_MAX_KOBO`: Maximum amount for auto-approval (default: 5000000 kobo = ₦50,000)
- `LOAN_PENALTY_PCT_PER_DAY`: Daily penalty percentage (default: 1%)

## Architecture

### Enhanced Models
- **Ledger Integration**: All financial operations can optionally create ledger entries
- **Trace ID Correlation**: Every transaction includes a trace ID for complete audit trails
- **Idempotency Support**: Prevents duplicate operations with cached responses
- **Enhanced User Model**: Added credit score and ladder index tracking
- **Improved Loan Model**: Added trace ID and enhanced repayment history

### Services
- **LedgerService**: Manages double-entry bookkeeping and reconciliation
- **IdempotencyService**: Handles duplicate operation prevention
- **Enhanced Controllers**: Unified V1/V2 functionality with optional ledger integration

## Development

The codebase now provides a unified architecture that:
- Preserves all existing V1 functionality
- Adds optional ledger-first operations
- Provides enhanced tracking and reconciliation
- Maintains backward compatibility
- Enables gradual migration to ledger-first operations