/**
 * Currency formatting utilities for Sri Lankan Rupee (LKR)
 */

/**
 * Format a number as Sri Lankan Rupee currency
 * @param value - The numeric value to format
 * @param compact - Whether to use compact notation (e.g., 1.5M)
 * @returns Formatted currency string with Rs prefix
 */
export function formatLKR(value: number | null | undefined, compact: boolean = false): string {
  const safeValue = value ?? 0;
  
  if (compact) {
    if (Math.abs(safeValue) >= 1000000) {
      return `Rs ${(safeValue / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(safeValue) >= 1000) {
      return `Rs ${(safeValue / 1000).toFixed(0)}k`;
    }
  }
  
  return `Rs ${safeValue.toLocaleString()}`;
}

/**
 * Format a number as compact currency (e.g., Rs 1.5k, Rs 2.3M)
 * @param value - The numeric value to format
 * @returns Formatted compact currency string
 */
export function formatLKRCompact(value: number | null | undefined): string {
  return formatLKR(value, true);
}
