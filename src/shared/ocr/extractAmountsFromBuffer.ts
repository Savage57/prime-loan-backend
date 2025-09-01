/**
 * OCR Service - Extract amounts from calculator images
 * Uses Tesseract.js to extract numeric ladder from uploaded images
 */
import sharp from 'sharp';
import Tesseract from 'tesseract.js';

export interface OcrResult {
  amounts: number[]; // in kobo
  confidence: number;
  extractedText: string;
  imageQuality: 'good' | 'fair' | 'poor';
}

export class OcrService {
  /**
   * Extract amounts from image buffer
   */
  static async extractAmountsFromBuffer(imageBuffer: Buffer): Promise<OcrResult> {
    try {
      // Preprocess image with sharp
      const processedBuffer = await sharp(imageBuffer)
        .resize(1600, null, { withoutEnlargement: true })
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toBuffer();

      // OCR with Tesseract
      const { data } = await Tesseract.recognize(processedBuffer, 'eng', {
        logger: () => {} // Suppress logs
      });

      const extractedText = data.text;
      const confidence = data.confidence;

      // Extract numbers using regex
      const numberMatches = extractedText.match(/(\d{1,3}(?:,\d{3})+|\d+)/g) || [];
      
      // Process and filter amounts
      const amounts = numberMatches
        .map(match => {
          // Remove commas and convert to number
          const num = parseInt(match.replace(/,/g, ''), 10);
          return num * 100; // Convert to kobo
        })
        .filter(amount => {
          // Filter valid range: ₦1,000 to ₦5,000,000 (in kobo)
          return amount >= 100000 && amount <= 500000000;
        })
        .filter((amount, index, arr) => arr.indexOf(amount) === index) // Remove duplicates
        .sort((a, b) => a - b); // Sort ascending

      // Determine image quality based on confidence
      let imageQuality: 'good' | 'fair' | 'poor';
      if (confidence >= 80) imageQuality = 'good';
      else if (confidence >= 60) imageQuality = 'fair';
      else imageQuality = 'poor';

      return {
        amounts,
        confidence,
        extractedText,
        imageQuality
      };
    } catch (error) {
      console.error('OCR extraction failed:', error);
      return {
        amounts: [],
        confidence: 0,
        extractedText: '',
        imageQuality: 'poor'
      };
    }
  }

  /**
   * Validate OCR results for suspicious patterns
   */
  static validateOcrResults(result: OcrResult): { valid: boolean; reason?: string } {
    if (result.amounts.length === 0) {
      return { valid: false, reason: 'No valid amounts extracted' };
    }

    if (result.confidence < 50) {
      return { valid: false, reason: 'Low OCR confidence' };
    }

    if (result.imageQuality === 'poor') {
      return { valid: false, reason: 'Poor image quality' };
    }

    // Check for suspicious patterns
    const uniqueAmounts = new Set(result.amounts);
    if (uniqueAmounts.size < result.amounts.length * 0.7) {
      return { valid: false, reason: 'Too many duplicate amounts' };
    }

    return { valid: true };
  }
}