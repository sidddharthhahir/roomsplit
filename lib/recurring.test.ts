import { describe, it, expect } from 'vitest';
import { getNextMonth } from './recurring';

describe('getNextMonth', () => {
  it('increments the month within a year', () => {
    expect(getNextMonth('2026-03')).toBe('2026-04');
  });

  it('rolls over into the next year after December', () => {
    expect(getNextMonth('2026-12')).toBe('2027-01');
  });

  it('pads single-digit months', () => {
    expect(getNextMonth('2026-01')).toBe('2026-02');
  });
});
