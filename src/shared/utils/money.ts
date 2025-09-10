/**
 * Money utilities for handling currency in minor units (kobo)
 * All monetary values are stored as integers in kobo (1 naira = 100 kobo)
 */

export class Money {
  /**
   * Convert naira to kobo (minor units)
   */
  static toKobo(naira: number): number {
    return Math.round(naira * 100);
  }

  /**
   * Convert kobo to naira
   */
  static toNaira(kobo: number): number {
    return kobo / 100;
  }

  /**
   * Format kobo as currency string
   */
  static format(kobo: number): string {
    const naira = Money.toNaira(kobo);
    return `₦${naira.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Validate amount is positive
   */
  static isValidAmount(amount: number): boolean {
    return Number.isInteger(amount) && amount > 0;
  }
}