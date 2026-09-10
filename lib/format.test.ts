import { describe, it, expect } from 'vitest';
import { formatCents, parseCentsFromEuros, formatMonth } from './format';

describe('formatCents', () => {
  it('formats whole and fractional euro amounts', () => {
    expect(formatCents(0)).toBe('€0.00');
    expect(formatCents(150)).toBe('€1.50');
    expect(formatCents(100000)).toBe('€1000.00');
  });

  it('formats negative amounts', () => {
    expect(formatCents(-250)).toBe('€-2.50');
  });
});

describe('parseCentsFromEuros', () => {
  it('round-trips through formatCents without drift', () => {
    for (const cents of [0, 1, 99, 150, 1999, 123456]) {
      expect(parseCentsFromEuros((cents / 100).toFixed(2))).toBe(cents);
    }
  });

  it('accepts numeric input as well as strings', () => {
    expect(parseCentsFromEuros(12.5)).toBe(1250);
  });

  it('avoids floating point rounding errors (e.g. 0.1 + 0.2 cases)', () => {
    // 19.99 * 100 alone can drift to 1998.9999999999998 without rounding
    expect(parseCentsFromEuros('19.99')).toBe(1999);
    expect(parseCentsFromEuros('10.10')).toBe(1010);
  });
});

describe('formatMonth', () => {
  it('formats a YYYY-MM string as a readable month/year', () => {
    expect(formatMonth('2026-01')).toBe('January 2026');
    expect(formatMonth('2025-12')).toBe('December 2025');
  });
});
