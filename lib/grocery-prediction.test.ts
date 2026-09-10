import { describe, it, expect } from 'vitest';
import {
  calculateWeightedAverage,
  computeRemainingQuantity,
  calculatePrediction,
  getUrgencyLevel,
} from './grocery-prediction';

describe('calculateWeightedAverage', () => {
  it('returns null with no history', () => {
    expect(calculateWeightedAverage([])).toBeNull();
  });

  it('averages simple mean for fewer than 3 records', () => {
    expect(calculateWeightedAverage([{ avgDailyUsage: 2 }, { avgDailyUsage: 4 }])).toBe(3);
  });

  it('applies 0.5/0.3/0.2 weighting to the 3 most recent records', () => {
    const result = calculateWeightedAverage([
      { avgDailyUsage: 10 },
      { avgDailyUsage: 20 },
      { avgDailyUsage: 30 },
    ]);
    // 10*0.5 + 20*0.3 + 30*0.2 = 5 + 6 + 6 = 17
    expect(result).toBe(17);
  });
});

describe('computeRemainingQuantity', () => {
  it('assumes full quantity when there is no usage data', () => {
    expect(computeRemainingQuantity(10, new Date(), null)).toBe(10);
    expect(computeRemainingQuantity(10, new Date(), 0)).toBe(10);
  });

  it('subtracts consumption since the purchase date', () => {
    const purchasedSixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    expect(computeRemainingQuantity(12, purchasedSixDaysAgo, 1)).toBe(6);
  });

  it('clamps to zero instead of going negative', () => {
    const purchasedTwentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    expect(computeRemainingQuantity(5, purchasedTwentyDaysAgo, 1)).toBe(0);
  });
});

describe('calculatePrediction', () => {
  it('returns null prediction when usage is unknown or item is gone', () => {
    expect(calculatePrediction(5, null)).toEqual({ daysLeft: null, predictedFinishDate: null });
    expect(calculatePrediction(0, 2)).toEqual({ daysLeft: null, predictedFinishDate: null });
  });

  it('divides remaining quantity by daily usage to get days left', () => {
    const { daysLeft } = calculatePrediction(10, 2);
    expect(daysLeft).toBe(5);
  });
});

describe('getUrgencyLevel', () => {
  it('classifies thresholds as documented (<=2 red, <=4 yellow, else green)', () => {
    expect(getUrgencyLevel(null)).toBe('unknown');
    expect(getUrgencyLevel(2)).toBe('red');
    expect(getUrgencyLevel(4)).toBe('yellow');
    expect(getUrgencyLevel(5)).toBe('green');
  });
});
