"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startApp = startApp;
/**
 * Main Application Server
 * - Combines middleware, DB connection, and route setup
 * - Uses HTTP server wrapper for flexibility (WebSockets, etc.)
 * - Graceful shutdown and centralized logging
 */
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const pino_1 = __importDefault(require("pino"));
const db_1 = require("./shared/db");
const config_1 = require("./config");
const app_1 = __importDefault(require("./app"));
const logger = (0, pino_1.default)({ name: "prime-finance-server" });
function startApp() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const app = (0, express_1.default)();
            // Connect to database
            yield db_1.DatabaseService.connect();
            // Mount all middlewares & routes
            yield (0, app_1.default)(app);
            const server = http_1.default.createServer(app);
            server
                .listen(config_1.PORT, () => {
                logger.info("Prime Finance server initiated");
            })
                .on("listening", () => {
                logger.info(`Prime Finance server listening on port ${config_1.PORT}`);
                logger.info("Routes mounted under /api/*");
            })
                .on("error", (err) => {
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
        }
        catch (error) {
            logger.error({ error: error.message }, "Failed to start app");
            process.exit(1);
        }
    });
}
// Start server if run directly
if (require.main === module) {
    startApp().catch((err) => {
        logger.error({ err }, "Unhandled error while starting app");
        process.exit(1);
    });
}
