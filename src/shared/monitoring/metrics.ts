/**
 * Application Metrics Collection
 * Prometheus-compatible metrics for monitoring
 */
import { register, Counter, Histogram, Gauge } from 'prom-client';

// HTTP Request metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

// Business metrics
export const ledgerEntriesTotal = new Counter({
  name: 'ledger_entries_created_total',
  help: 'Total number of ledger entries created',
  labelNames: ['category', 'entry_type', 'status']
});

export const pendingTransactionsGauge = new Gauge({
  name: 'pending_transactions_total',
  help: 'Number of pending transactions',
  labelNames: ['service']
});

export const pollerRunsTotal = new Counter({
  name: 'poller_runs_total',
  help: 'Total number of poller runs',
  labelNames: ['poller_name', 'status']
});

export const providerErrorsTotal = new Counter({
  name: 'provider_errors_total',
  help: 'Total number of provider errors',
  labelNames: ['provider', 'error_type']
});

export const manualReviewsGauge = new Gauge({
  name: 'manual_reviews_open_total',
  help: 'Number of open manual reviews'
});

export const userRegistrationsTotal = new Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations'
});

export const loanApplicationsTotal = new Counter({
  name: 'loan_applications_total',
  help: 'Total number of loan applications',
  labelNames: ['status']
});

export const transferVolumeTotal = new Counter({
  name: 'transfer_volume_total',
  help: 'Total transfer volume in kobo',
  labelNames: ['transfer_type', 'status']
});

// System metrics
export const databaseConnectionsGauge = new Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections'
});

export const redisConnectionsGauge = new Gauge({
  name: 'redis_connections_active',
  help: 'Number of active Redis connections'
});

// Export the register for /metrics endpoint
export { register };

/**
 * Middleware to collect HTTP metrics
 */
export const metricsMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
    
    httpRequestDuration
      .labels(req.method, route)
      .observe(duration);
  });
  
  next();
};