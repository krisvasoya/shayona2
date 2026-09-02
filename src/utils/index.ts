/**
 * Core Utility Functions
 * Safe monetary formatting, arithmetic, and number-to-words.
 */

export * from './phone';
export * from './numberToWords';

/**
 * Format integer paise into display INR currency string (e.g. 1000000 -> ₹10,000.00)
 */
export function formatCurrency(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Convert rupee input to integer paise safely
 */
export function rupeesToPaise(rupees: number | string): number {
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(num) || num < 0) return 0;
  return Math.round(num * 100);
}

/**
 * Convert integer paise to decimal rupees
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}
