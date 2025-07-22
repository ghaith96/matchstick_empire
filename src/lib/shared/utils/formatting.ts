/**
 * Utility functions for formatting numbers, currency, and other display values
 */

/**
 * Format large numbers with appropriate suffixes (K, M, B, T, etc.)
 */
export function formatNumber(value: bigint | number): string {
  let num: number;
  
  if (typeof value === 'bigint') {
    // Handle very large BigInt values
    if (value > Number.MAX_SAFE_INTEGER) {
      return formatBigNumber(value);
    }
    num = Number(value);
  } else {
    num = value;
  }

  if (num === 0) return '0';
  
  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  const tier = Math.floor(Math.log10(Math.abs(num)) / 3);
  
  if (tier === 0) {
    return num.toLocaleString();
  }
  
  if (tier >= suffixes.length) {
    return num.toExponential(2);
  }
  
  const suffix = suffixes[tier];
  const scale = Math.pow(10, tier * 3);
  const scaled = num / scale;
  
  // Show more precision for smaller scaled numbers
  const precision = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
  
  return scaled.toFixed(precision) + suffix;
}

/**
 * Format BigInt numbers that exceed Number.MAX_SAFE_INTEGER
 */
function formatBigNumber(value: bigint): string {
  const str = value.toString();
  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  
  if (str.length <= 3) {
    return str;
  }
  
  const groups = Math.floor((str.length - 1) / 3);
  
  if (groups >= suffixes.length) {
    return `${str.slice(0, 3)}...e${str.length - 1}`;
  }
  
  const significantDigits = str.length - (groups * 3);
  const mainPart = str.slice(0, significantDigits);
  const fractionalPart = str.slice(significantDigits, significantDigits + 2);
  
  let result = mainPart;
  if (fractionalPart && fractionalPart !== '00') {
    result += '.' + fractionalPart.replace(/0+$/, '');
  }
  
  return result + suffixes[groups];
}

/**
 * Format currency values with appropriate precision
 */
export function formatCurrency(value: number, currency: string = '$'): string {
  if (!value || value === 0) return `${currency}0.00`;
  
  if (Math.abs(value) >= 1000) {
    return `${currency}${formatNumber(value)}`;
  }
  
  // For smaller amounts, show cents
  return `${currency}${value.toFixed(2)}`;
}

/**
 * Format percentage values
 */
export function formatPercentage(value: number, precision: number = 1): string {
  return `${(value * 100).toFixed(precision)}%`;
}

/**
 * Format time duration in human-readable format
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  
  return `${seconds}s`;
}

/**
 * Format time ago in relative format
 */
export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) { // Less than 1 minute
    return 'Just now';
  }
  
  if (diff < 3600000) { // Less than 1 hour
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }
  
  if (diff < 86400000) { // Less than 1 day
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }
  
  if (diff < 604800000) { // Less than 1 week
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  }
  
  // For older timestamps, show the actual date
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Format production rate (per second, per minute, etc.)
 */
export function formatRate(value: bigint | number, unit: string = 'sec'): string {
  return `${formatNumber(value)}/${unit}`;
}

/**
 * Format multiplier values
 */
export function formatMultiplier(value: number): string {
  if (value === 1) return '1x';
  return `${value.toFixed(value < 10 ? 2 : 1)}x`;
}

/**
 * Format price with trend indicator
 */
export function formatPriceWithTrend(currentPrice: number, previousPrice: number, currency: string = '$'): string {
  const formattedPrice = formatCurrency(currentPrice, currency);
  
  if (previousPrice === 0 || currentPrice === previousPrice) {
    return formattedPrice;
  }
  
  const change = ((currentPrice - previousPrice) / previousPrice) * 100;
  const trendIcon = change > 0 ? '📈' : '📉';
  const changeStr = change > 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
  
  return `${formattedPrice} ${trendIcon} ${changeStr}`;
}

/**
 * Format efficiency as percentage
 */
export function formatEfficiency(efficiency: number): string {
  return formatPercentage(efficiency, 1);
}

/**
 * Format achievement progress
 */
export function formatProgress(current: number, target: number): string {
  if (target === 0) return '100%';
  const percentage = Math.min((current / target) * 100, 100);
  return `${percentage.toFixed(1)}% (${formatNumber(current)}/${formatNumber(target)})`;
}

/**
 * Compact number formatting for UI elements with limited space
 */
export function formatCompact(value: bigint | number): string {
  let num: number;
  
  if (typeof value === 'bigint') {
    if (value > Number.MAX_SAFE_INTEGER) {
      return formatBigNumber(value);
    }
    num = Number(value);
  } else {
    num = value;
  }

  if (num === 0) return '0';
  if (Math.abs(num) < 1000) return num.toString();
  
  const suffixes = ['', 'K', 'M', 'B', 'T'];
  const tier = Math.floor(Math.log10(Math.abs(num)) / 3);
  
  if (tier >= suffixes.length) {
    return num.toExponential(1);
  }
  
  const suffix = suffixes[tier];
  const scale = Math.pow(10, tier * 3);
  const scaled = num / scale;
  
  return scaled.toFixed(1) + suffix;
}

/**
 * Format file size in bytes
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  return `${size.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
} 
