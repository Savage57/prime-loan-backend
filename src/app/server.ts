/**
 * Main Application Server
 * Combines v1 and v2 routes with proper middleware setup
 */
import express from 'express';
import { DatabaseService } from '../shared/db';
import { PORT } from '../config';
import createV1App from '../app';
import v2Routes from './routes.v2';
import { requestIdMiddleware } from './middlewares/requestId';
import { errorHandler } from './middlewares/errorHandler';
import pino from 'pino';

const logger = pino({ name: 'prime-finance-server' });

export async function createServer() {
  const app = express();

  // Connect to database
  await DatabaseService.connect();

  // Add request ID middleware globally
  app.use(requestIdMiddleware);

  // Mount v1 routes (existing functionality)
  await createV1App(app);

  // Mount v2 routes (new clean architecture)
  app.use('/v2', v2Routes);

  // Global error handler
  app.use(errorHandler);

  return app;
}

export async function startServer() {
  try {
    const app = await createServer();
    
    const server = app.listen(PORT, () => {
      logger.info(`Prime Finance server listening on port ${PORT}`);
      logger.info('V1 routes: /api/*');
      logger.info('V2 routes: /v2/*');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    return server;
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to start server');
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer().catch(console.error);
}