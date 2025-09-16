/**
 * Main Application Server
 * - Combines middleware, DB connection, and route setup
 * - Uses HTTP server wrapper for flexibility (WebSockets, etc.)
 * - Graceful shutdown and centralized logging
 */
import express from "express";
import http from "http";
import pino from "pino";
import { DatabaseService } from "./shared/db";
import { PORT } from "./config";
import createApp from "./app";

const logger = pino({ name: "prime-finance-server" });

export async function startApp() {
  try {
    const app = express();

    // Connect to database
    await DatabaseService.connect();

    // Mount all middlewares & routes
    await createApp(app);

    const server = http.createServer(app);

    server
      .listen(PORT, (): void => {
        logger.info("Prime Finance server initiated");
      })
      .on("listening", () => {
        logger.info(`Prime Finance server listening on port ${PORT}`);
        logger.info("Routes mounted under /api/*");
      })
      .on("error", (err: any) => {
        logger.error({ err }, "Server failed to start");
        process.exit(1);
      })
      .on("close", () => {
        logger.info("Server closed");
      });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      logger.info("SIGTERM received, shutting down gracefully");
      server.close(() => {
        logger.info("Server closed");
        process.exit(0);
      });
    });

    return server;
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to start app");
    process.exit(1);
  }
}

// Start server if run directly
if (require.main === module) {
  startApp().catch((err) => {
    logger.error({ err }, "Unhandled error while starting app");
    process.exit(1);
  });
}
