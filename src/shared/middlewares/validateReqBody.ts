import { Request, Response, NextFunction } from "express";
import Joi from "joi";

/**
 * Validate request body with Joi schema
 */
export function validateReqBody(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid request body",
        errors: error.details.map((d) => d.message),
      });
    }

    req.body = value;
    next();
  };
}

/**
 * Validate request query with Joi schema
 */
export function validateReqQuery(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        status: "failed",
        message: "Invalid query parameters",
        errors: error.details.map((d) => d.message),
      });
    }

    req.query = value;
    next();
  };
}
