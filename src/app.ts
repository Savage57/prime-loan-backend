import express, { Application, Request, Response } from "express";
import morgan from "morgan";
import helmet from "helmet";
import { specs, swaggerUi, swaggerUiOptions } from "./swagger.config";
import userRoutes from "./routes/userRoutes";
import adminRoutes from "./routes/adminRoutes"; 
import { errHandler } from './exceptions';
import compression from "compression";
import cookieParser from "cookie-parser";
import crossOrigin from "./shared/utils/cross-origin";

export default async (app: Application) => {
    // Log to console using morgan if app is in development
    if (process.env.ENV === "dev") app.use(morgan("dev"));
    
    // CORS
    app.use(crossOrigin());
    app.use(helmet());
    // Request body parser
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    // Cookie parser
    app.use(cookieParser());
    app.use(compression());
  
    // Swagger Documentation
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));
    
    // Health check endpoint
    app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      });
    });
  
    // Routes
    app.use("/api", userRoutes);
    app.use("/backoffice", adminRoutes);
  
    app.use(errHandler);
}
