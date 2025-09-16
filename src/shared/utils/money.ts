/**
 * Money utilities for handling currency in minor units (kobo)
 * All monetary values are stored as integers in kobo (1 naira = 100 kobo)
 */

export class Money {
  /**
   * Format kobo as currency string
   */
  static format(amount: number): string {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Validate amount is positive
   */
  static isValidAmount(amount: number): boolean {
    return Number.isInteger(amount) && amount > 0;
  }
}