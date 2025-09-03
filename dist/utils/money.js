"use strict";
/**
 * Money utilities for handling currency in minor units (kobo)
 * All monetary values are stored as integers in kobo (1 naira = 100 kobo)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Money = void 0;
class Money {
    /**
     * Convert naira to kobo (minor units)
     */
    static toKobo(naira) {
        return Math.round(naira * 100);
    }
    /**
     * Convert kobo to naira
     */
    static toNaira(kobo) {
        return kobo / 100;
    }
    /**
     * Format kobo as currency string
     */
    static format(kobo) {
        const naira = Money.toNaira(kobo);
        return `₦${naira.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    /**
     * Validate amount is positive
     */
    static isValidAmount(kobo) {
        return Number.isInteger(kobo) && kobo > 0;
    }
}
exports.Money = Money;
