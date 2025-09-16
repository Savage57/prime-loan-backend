"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateReqBody = validateReqBody;
exports.validateReqQuery = validateReqQuery;
/**
 * Validate request body with Joi schema
 */
function validateReqBody(schema) {
    return (req, res, next) => {
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
function validateReqQuery(schema) {
    return (req, res, next) => {
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
