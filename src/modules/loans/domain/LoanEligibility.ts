/**
 * Loan Eligibility Domain Service
 * Determines loan eligibility based on ladder, credit score, and business rules
 */
import { ILoanLadder } from '../infrastructure/models/LoanLadder.model';
import { User } from '../../../interfaces';

export interface EligibilityResult {
  eligible: boolean;
  maxAmount: number; // in kobo
  reason?: string;
  creditScore?: number;
  ladderIndex?: number;
}

export class LoanEligibilityService {
  private static readonly DEFAULT_LADDER = [
    10000000, // ₦100,000 in kobo
    20000000, // ₦200,000
    35000000, // ₦350,000
    50000000, // ₦500,000
    75000000, // ₦750,000
    100000000 // ₦1,000,000
  ];

  private static readonly AUTO_APPROVAL_MAX = 5000000; // ₦50,000 in kobo

  /**
   * Calculate loan eligibility for a user
   */
  static calculateEligibility(
    user: User,
    requestedAmount: number,
    ladder?: ILoanLadder
  ): EligibilityResult {
    // Check for active loans
    // Note: This would need to query the loan service in real implementation
    const hasActiveLoan = false; // Placeholder

    if (hasActiveLoan) {
      return {
        eligible: false,
        maxAmount: 0,
        reason: 'User has active loan'
      };
    }

    // Get user's ladder index (default to 0 for new users)
    const ladderIndex = user.user_metadata.ladderIndex || 0;
    
    // Use custom ladder or default system ladder
    const ladderSteps = ladder?.steps || this.DEFAULT_LADDER;
    
    if (ladderIndex >= ladderSteps.length) {
      return {
        eligible: false,
        maxAmount: 0,
        reason: 'Ladder index out of bounds'
      };
    }

    const maxAmount = ladderSteps[ladderIndex];
    
    // Apply credit score adjustments (placeholder logic)
    const creditScore = user.user_metadata.creditScore || 500;
    let adjustedMaxAmount = maxAmount;
    
    if (creditScore < 400) {
      adjustedMaxAmount = Math.floor(maxAmount * 0.7);
    } else if (creditScore > 700) {
      adjustedMaxAmount = Math.floor(maxAmount * 1.2);
    }

    const eligible = requestedAmount <= adjustedMaxAmount;
    
    return {
      eligible,
      maxAmount: adjustedMaxAmount,
      creditScore,
      ladderIndex
    };
  }

  /**
   * Check if loan can be auto-approved
   */
  static canAutoApprove(
    requestedAmount: number,
    eligibilityResult: EligibilityResult,
    idVerified: boolean = true
  ): boolean {
    return (
      eligibilityResult.eligible &&
      requestedAmount <= this.AUTO_APPROVAL_MAX &&
      idVerified
    );
  }
}