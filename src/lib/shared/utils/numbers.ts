// Number formatting utilities for large values in incremental games

// Suffixes for large numbers
const NUMBER_SUFFIXES = [
  '', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc',
  'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg',
  'UVg', 'DVg', 'TVg', 'QaVg', 'QiVg', 'SxVg', 'SpVg', 'OcVg', 'NoVg', 'Tg'
];

// Scientific notation threshold
const SCIENTIFIC_THRESHOLD = 1e100;

/**
 * Format a number with appropriate suffixes (K, M, B, T, etc.)
 * @param value - Number or BigInt to format
 * @param precision - Decimal places to show (default: 2)
 * @param forceScientific - Force scientific notation (default: false)
 * @returns Formatted string
 */
export function formatNumber(
  value: number | bigint,
  precision: number = 2,
  forceScientific: boolean = false
): string {
  // Handle special cases
  if (value === 0 || value === 0n) return '0';
  
  // Convert BigInt to number for processing
  const numValue = typeof value === 'bigint' ? Number(value) : value;
  
  // Handle negative numbers
  const isNegative = numValue < 0;
  const absValue = Math.abs(numValue);
  
  // Use scientific notation for extremely large numbers
  if (forceScientific || absValue >= SCIENTIFIC_THRESHOLD) {
    return (isNegative ? '-' : '') + absValue.toExponential(precision);
  }
  
  // Find appropriate suffix
  let suffixIndex = 0;
  let scaledValue = absValue;
  
  while (scaledValue >= 1000 && suffixIndex < NUMBER_SUFFIXES.length - 1) {
    scaledValue /= 1000;
    suffixIndex++;
  }
  
  // Format the number
  const formatted = scaledValue.toFixed(precision);
  const trimmed = parseFloat(formatted).toString(); // Remove trailing zeros
  const suffix = NUMBER_SUFFIXES[suffixIndex];
  
  return (isNegative ? '-' : '') + trimmed + suffix;
}

/**
 * Format a number for compact display (shorter format)
 * @param value - Number or BigInt to format
 * @returns Compact formatted string
 */
export function formatCompact(value: number | bigint): string {
  return formatNumber(value, 1);
}

/**
 * Format a number with full precision for exact values
 * @param value - Number or BigInt to format
 * @returns Fully formatted string with commas
 */
export function formatExact(value: number | bigint): string {
  const stringValue = value.toString();
  return stringValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Safe BigInt arithmetic operations with overflow protection
 */
export class SafeBigInt {
  // Maximum safe BigInt value (2^1000 - 1)
  private static readonly MAX_SAFE = BigInt('2') ** BigInt('1000') - BigInt('1');
  
  /**
   * Safe addition with overflow protection
   */
  static add(a: bigint, b: bigint): bigint {
    const result = a + b;
    return result > this.MAX_SAFE ? this.MAX_SAFE : result;
  }
  
  /**
   * Safe subtraction with underflow protection
   */
  static subtract(a: bigint, b: bigint): bigint {
    const result = a - b;
    return result < 0n ? 0n : result;
  }
  
  /**
   * Safe multiplication with overflow protection
   */
  static multiply(a: bigint, b: bigint): bigint {
    try {
      const result = a * b;
      return result > this.MAX_SAFE ? this.MAX_SAFE : result;
    } catch {
      return this.MAX_SAFE;
    }
  }
  
  /**
   * Safe division
   */
  static divide(a: bigint, b: bigint): bigint {
    if (b === 0n) return 0n;
    return a / b;
  }
  
  /**
   * Safe power operation with overflow protection
   */
  static power(base: bigint, exponent: bigint): bigint {
    if (exponent === 0n) return 1n;
    if (exponent === 1n) return base;
    if (base === 0n) return 0n;
    if (base === 1n) return 1n;
    
    try {
      let result = base;
      for (let i = 1n; i < exponent; i++) {
        result = this.multiply(result, base);
        if (result >= this.MAX_SAFE) return this.MAX_SAFE;
      }
      return result;
    } catch {
      return this.MAX_SAFE;
    }
  }
  
  /**
   * Compare two BigInt values safely
   */
  static compare(a: bigint, b: bigint): -1 | 0 | 1 {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }
  
  /**
   * Check if a BigInt value is safe to use
   */
  static isSafe(value: bigint): boolean {
    return value <= this.MAX_SAFE && value >= 0n;
  }
}

/**
 * Parse a formatted number string back to a number
 * @param formatted - Formatted string (e.g., "1.5K", "2.3M")
 * @returns Parsed number or null if invalid
 */
export function parseFormattedNumber(formatted: string): number | null {
  if (!formatted || typeof formatted !== 'string') return null;
  
  const trimmed = formatted.trim();
  if (trimmed === '0') return 0;
  
  // Handle scientific notation
  if (trimmed.includes('e') || trimmed.includes('E')) {
    const parsed = parseFloat(trimmed);
    return isNaN(parsed) ? null : parsed;
  }
  
  // Extract number and suffix
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*([A-Za-z]*)$/);
  if (!match) return null;
  
  const [, numberPart, suffix] = match;
  const baseNumber = parseFloat(numberPart);
  
  if (isNaN(baseNumber)) return null;
  
  // Find suffix multiplier
  const suffixIndex = NUMBER_SUFFIXES.indexOf(suffix);
  if (suffixIndex === -1 && suffix !== '') return null;
  
  const multiplier = Math.pow(1000, suffixIndex);
  return baseNumber * multiplier;
}

/**
 * Get the percentage between two values
 * @param current - Current value
 * @param target - Target value
 * @returns Percentage (0-100)
 */
export function getPercentage(current: number | bigint, target: number | bigint): number {
  if (target === 0 || target === 0n) return 0;
  
  const currentNum = typeof current === 'bigint' ? Number(current) : current;
  const targetNum = typeof target === 'bigint' ? Number(target) : target;
  
  return Math.min(100, (currentNum / targetNum) * 100);
}

/**
 * Format a percentage value
 * @param percentage - Percentage value (0-100)
 * @param precision - Decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(percentage: number, precision: number = 1): string {
  return percentage.toFixed(precision) + '%';
}

/**
 * Calculate production rate per second
 * @param amount - Amount produced
 * @param timeMs - Time in milliseconds
 * @returns Rate per second
 */
export function calculateRate(amount: number | bigint, timeMs: number): number {
  if (timeMs <= 0) return 0;
  
  const amountNum = typeof amount === 'bigint' ? Number(amount) : amount;
  return amountNum / (timeMs / 1000);
}

/**
 * Format a rate with appropriate time unit
 * @param rate - Rate per second
 * @returns Formatted rate string
 */
export function formatRate(rate: number): string {
  if (rate === 0) return '0/sec';
  if (rate < 0.01) return formatNumber(rate * 60, 2) + '/min';
  if (rate < 1) return formatNumber(rate, 2) + '/sec';
  return formatNumber(rate, 1) + '/sec';
} 
