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
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const helmet_1 = __importDefault(require("helmet"));
const swagger_config_1 = require("./swagger.config");
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const exceptions_1 = require("./exceptions");
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cross_origin_1 = __importDefault(require("./shared/utils/cross-origin"));
exports.default = (app) => __awaiter(void 0, void 0, void 0, function* () {
    // Log to console using morgan if app is in development
    if (process.env.ENV === "dev")
        app.use((0, morgan_1.default)("dev"));
    // CORS
    app.use((0, cross_origin_1.default)());
    app.use((0, helmet_1.default)());
    // Request body parser
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: false }));
    // Cookie parser
    app.use((0, cookie_parser_1.default)());
    app.use((0, compression_1.default)());
    // Swagger Documentation
    app.use('/api-docs', swagger_config_1.swaggerUi.serve, swagger_config_1.swaggerUi.setup(swagger_config_1.specs, swagger_config_1.swaggerUiOptions));
    // Health check endpoint
    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '2.0.0'
        });
    });
    // Routes
    app.use("/api", userRoutes_1.default);
    app.use("/backoffice", adminRoutes_1.default);
    app.use(exceptions_1.errHandler);
});
