/**
 * Enhanced Validation Utilities
 * Centralized validation functions for common data types
 */

export class ValidationUtils {
  /**
   * Validate Nigerian phone number
   */
  static isValidNigerianPhone(phone: string): boolean {
    const phoneRegex = /^(\+234|234|0)[789][01]\d{8}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate BVN format
   */
  static isValidBVN(bvn: string): boolean {
    return /^\d{11}$/.test(bvn);
  }

  /**
   * Validate NIN format
   */
  static isValidNIN(nin: string): boolean {
    return /^\d{11}$/.test(nin);
  }

  /**
   * Validate PIN format
   */
  static isValidPIN(pin: string): boolean {
    return /^\d{4}$/.test(pin);
  }

  /**
   * Validate date of birth format (DD/MM/YYYY)
   */
  static isValidDOB(dob: string): boolean {
    const dobRegex = /^([0-2][0-9]|3[0-1])\/(0[1-9]|1[0-2])\/\d{4}$/;
    if (!dobRegex.test(dob)) return false;

    // Additional validation for actual date
    const [day, month, year] = dob.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    
    return date.getDate() === day && 
           date.getMonth() === month - 1 && 
           date.getFullYear() === year &&
           date <= new Date(); // Must be in the past
  }

  /**
   * Validate amount (positive number)
   */
  static isValidAmount(amount: number): boolean {
    return typeof amount === 'number' && amount > 0 && Number.isFinite(amount);
  }

  /**
   * Validate account number format
   */
  static isValidAccountNumber(accountNo: string): boolean {
    return /^\d{10}$/.test(accountNo);
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Validate password strength
   */
  static isStrongPassword(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }

    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }

    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }

    if (!/\d/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }

    return { valid: true };
  }

  /**
   * Validate Nigerian bank code
   */
  static isValidBankCode(code: string): boolean {
    return /^\d{3}$/.test(code);
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}