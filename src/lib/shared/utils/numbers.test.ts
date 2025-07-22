import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatCompact,
  formatExact,
  SafeBigInt,
  parseFormattedNumber,
  getPercentage,
  formatPercentage,
  calculateRate,
  formatRate
} from './numbers.js';

describe('Number Formatting', () => {
  describe('formatNumber', () => {
    it('should format small numbers correctly', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(1)).toBe('1');
      expect(formatNumber(42)).toBe('42');
      expect(formatNumber(999)).toBe('999');
    });

    it('should format numbers with K suffix', () => {
      expect(formatNumber(1000)).toBe('1K');
      expect(formatNumber(1500)).toBe('1.5K');
      expect(formatNumber(999999)).toBe('1000K');
    });

    it('should format numbers with M suffix', () => {
      expect(formatNumber(1000000)).toBe('1M');
      expect(formatNumber(2500000)).toBe('2.5M');
      expect(formatNumber(999999999)).toBe('1000M');
    });

    it('should format numbers with B suffix', () => {
      expect(formatNumber(1000000000)).toBe('1B');
      expect(formatNumber(3750000000)).toBe('3.75B');
    });

    it('should handle BigInt values', () => {
      expect(formatNumber(1000n)).toBe('1K');
      expect(formatNumber(1000000n)).toBe('1M');
      expect(formatNumber(BigInt('123456789000'))).toBe('123.46B');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-1000)).toBe('-1K');
      expect(formatNumber(-2500000)).toBe('-2.5M');
    });

    it('should use scientific notation for extremely large numbers', () => {
      const largeNumber = 1e101;
      const result = formatNumber(largeNumber);
      expect(result).toMatch(/^1\.00e\+101$/);
    });

    it('should respect precision parameter', () => {
      expect(formatNumber(1234, 0)).toBe('1K');
      expect(formatNumber(1234, 1)).toBe('1.2K');
      expect(formatNumber(1234, 3)).toBe('1.234K');
    });
  });

  describe('formatCompact', () => {
    it('should format numbers with 1 decimal place', () => {
      expect(formatCompact(1234)).toBe('1.2K');
      expect(formatCompact(5678000)).toBe('5.7M');
    });
  });

  describe('formatExact', () => {
    it('should format numbers with commas', () => {
      expect(formatExact(1234)).toBe('1,234');
      expect(formatExact(1234567)).toBe('1,234,567');
      expect(formatExact(BigInt('123456789012345'))).toBe('123,456,789,012,345');
    });

    it('should handle small numbers without commas', () => {
      expect(formatExact(123)).toBe('123');
      expect(formatExact(0)).toBe('0');
    });
  });

  describe('parseFormattedNumber', () => {
    it('should parse basic numbers', () => {
      expect(parseFormattedNumber('0')).toBe(0);
      expect(parseFormattedNumber('42')).toBe(42);
      expect(parseFormattedNumber('1234')).toBe(1234);
    });

    it('should parse suffixed numbers', () => {
      expect(parseFormattedNumber('1K')).toBe(1000);
      expect(parseFormattedNumber('1.5K')).toBe(1500);
      expect(parseFormattedNumber('2M')).toBe(2000000);
      expect(parseFormattedNumber('3.25B')).toBe(3250000000);
    });

    it('should parse scientific notation', () => {
      expect(parseFormattedNumber('1e3')).toBe(1000);
      expect(parseFormattedNumber('2.5E6')).toBe(2500000);
    });

    it('should handle invalid inputs', () => {
      expect(parseFormattedNumber('')).toBe(null);
      expect(parseFormattedNumber('invalid')).toBe(null);
      expect(parseFormattedNumber('1X')).toBe(null);
    });
  });
});

describe('SafeBigInt', () => {
  describe('add', () => {
    it('should add BigInt values correctly', () => {
      expect(SafeBigInt.add(100n, 200n)).toBe(300n);
      expect(SafeBigInt.add(BigInt('999999999999999999'), 1n)).toBe(BigInt('1000000000000000000'));
    });

    it('should prevent overflow', () => {
      const maxSafe = BigInt('2') ** BigInt('1000') - BigInt('1');
      const result = SafeBigInt.add(maxSafe, 1n);
      expect(result).toBe(maxSafe);
    });
  });

  describe('subtract', () => {
    it('should subtract BigInt values correctly', () => {
      expect(SafeBigInt.subtract(300n, 100n)).toBe(200n);
      expect(SafeBigInt.subtract(100n, 50n)).toBe(50n);
    });

    it('should prevent underflow', () => {
      expect(SafeBigInt.subtract(100n, 200n)).toBe(0n);
      expect(SafeBigInt.subtract(0n, 100n)).toBe(0n);
    });
  });

  describe('multiply', () => {
    it('should multiply BigInt values correctly', () => {
      expect(SafeBigInt.multiply(10n, 20n)).toBe(200n);
      expect(SafeBigInt.multiply(123n, 456n)).toBe(56088n);
    });

    it('should handle edge cases', () => {
      expect(SafeBigInt.multiply(0n, 1000n)).toBe(0n);
      expect(SafeBigInt.multiply(1n, 1000n)).toBe(1000n);
    });
  });

  describe('divide', () => {
    it('should divide BigInt values correctly', () => {
      expect(SafeBigInt.divide(100n, 5n)).toBe(20n);
      expect(SafeBigInt.divide(1000n, 3n)).toBe(333n);
    });

    it('should handle division by zero', () => {
      expect(SafeBigInt.divide(100n, 0n)).toBe(0n);
    });
  });

  describe('power', () => {
    it('should calculate power correctly', () => {
      expect(SafeBigInt.power(2n, 3n)).toBe(8n);
      expect(SafeBigInt.power(10n, 2n)).toBe(100n);
      expect(SafeBigInt.power(5n, 0n)).toBe(1n);
    });

    it('should handle edge cases', () => {
      expect(SafeBigInt.power(0n, 5n)).toBe(0n);
      expect(SafeBigInt.power(1n, 1000n)).toBe(1n);
      expect(SafeBigInt.power(7n, 1n)).toBe(7n);
    });
  });

  describe('compare', () => {
    it('should compare BigInt values correctly', () => {
      expect(SafeBigInt.compare(100n, 200n)).toBe(-1);
      expect(SafeBigInt.compare(200n, 100n)).toBe(1);
      expect(SafeBigInt.compare(100n, 100n)).toBe(0);
    });
  });

  describe('isSafe', () => {
    it('should validate safe BigInt values', () => {
      expect(SafeBigInt.isSafe(0n)).toBe(true);
      expect(SafeBigInt.isSafe(1000n)).toBe(true);
      expect(SafeBigInt.isSafe(BigInt('999999999999999999999'))).toBe(true);
      expect(SafeBigInt.isSafe(-1n)).toBe(false);
    });
  });
});

describe('Utility Functions', () => {
  describe('getPercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(getPercentage(50, 100)).toBe(50);
      expect(getPercentage(25, 100)).toBe(25);
      expect(getPercentage(150, 100)).toBe(100); // Capped at 100%
    });

    it('should handle BigInt values', () => {
      expect(getPercentage(500n, 1000n)).toBe(50);
      expect(getPercentage(750n, 1000n)).toBe(75);
    });

    it('should handle zero target', () => {
      expect(getPercentage(50, 0)).toBe(0);
      expect(getPercentage(50n, 0n)).toBe(0);
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with default precision', () => {
      expect(formatPercentage(50.5)).toBe('50.5%');
      expect(formatPercentage(33.333)).toBe('33.3%');
    });

    it('should respect precision parameter', () => {
      expect(formatPercentage(33.333, 0)).toBe('33%');
      expect(formatPercentage(33.333, 2)).toBe('33.33%');
    });
  });

  describe('calculateRate', () => {
    it('should calculate rate per second correctly', () => {
      expect(calculateRate(1000, 1000)).toBe(1000); // 1000 in 1 second = 1000/sec
      expect(calculateRate(5000, 2000)).toBe(2500); // 5000 in 2 seconds = 2500/sec
    });

    it('should handle BigInt amounts', () => {
      expect(calculateRate(2000n, 1000)).toBe(2000);
    });

    it('should handle zero time', () => {
      expect(calculateRate(1000, 0)).toBe(0);
    });
  });

  describe('formatRate', () => {
    it('should format rates appropriately', () => {
      expect(formatRate(0)).toBe('0/sec');
      expect(formatRate(1)).toBe('1/sec');
      expect(formatRate(2.5)).toBe('2.5/sec');
      expect(formatRate(1000)).toBe('1K/sec');
    });

    it('should use minutes for very slow rates', () => {
      expect(formatRate(0.005)).toBe('0.3/min');
      expect(formatRate(0.001)).toBe('0.06/min');
    });

    it('should show seconds for slow rates', () => {
      expect(formatRate(0.1)).toBe('0.1/sec');
      expect(formatRate(0.5)).toBe('0.5/sec');
    });
  });
}); 
