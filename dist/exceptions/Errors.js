"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnauthorizedError = exports.BadRequestError = exports.ForbiddenError = exports.ConflictError = exports.NotFoundError = exports.STATUS_CODES = exports.APIError = exports.AppError = void 0;
const statusCodes_1 = __importDefault(require("./statusCodes"));
exports.STATUS_CODES = statusCodes_1.default;
class AppError extends Error {
    constructor(statusCode, message, isOperational) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this);
    }
}
exports.AppError = AppError;
//api Specific Errors
class APIError extends AppError {
    constructor(statusCode = statusCodes_1.default.INTERNAL_ERROR, message = 'Internal Server Error', isOperational = true) {
        super(statusCode, message, isOperational);
    }
}
exports.APIError = APIError;
//400
class BadRequestError extends AppError {
    constructor(message = 'Bad request') {
        super(statusCodes_1.default.BAD_REQUEST, message, true);
    }
}
exports.BadRequestError = BadRequestError;
//404
class NotFoundError extends AppError {
    constructor(message = 'Not Found') {
        super(statusCodes_1.default.NOT_FOUND, message, true);
    }
}
exports.NotFoundError = NotFoundError;
//401
class UnauthorizedError extends AppError {
    constructor(message = 'Not authorized') {
        super(statusCodes_1.default.UNAUTHORIZED, message, true);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ConflictError extends AppError {
    constructor(message = 'Conflict') {
        super(statusCodes_1.default.CONFLICT, message, true);
    }
}
exports.ConflictError = ConflictError;
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(statusCodes_1.default.FORBIDDEN, message, true);
    }
}
exports.ForbiddenError = ForbiddenError;
