"use strict";
/**
 * Money utilities for handling currency in minor units (kobo)
 * All monetary values are stored as integers in kobo (1 naira = 100 kobo)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Money = void 0;
class Money {
    /**
     * Format kobo as currency string
     */
    static format(amount) {
        return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    /**
     * Validate amount is positive
     */
    static isValidAmount(amount) {
        return Number.isInteger(amount) && amount > 0;
    }
}
exports.Money = Money;
