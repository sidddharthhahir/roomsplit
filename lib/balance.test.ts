import { describe, it, expect } from 'vitest';
import { computeSmartSettle, type MemberBalance } from './balance';

function balance(memberId: string, netBalance: number): MemberBalance {
  return {
    memberId,
    displayName: memberId,
    totalPaid: 0,
    totalShare: 0,
    totalSettledOut: 0,
    totalSettledIn: 0,
    netBalance,
  };
}

describe('computeSmartSettle', () => {
  it('produces no suggestions when everyone is already settled', () => {
    const balances = [balance('a', 0), balance('b', 0)];
    expect(computeSmartSettle(balances)).toEqual([]);
  });

  it('matches a single debtor to a single creditor for the full amount', () => {
    const balances = [balance('a', -1000), balance('b', 1000)];
    const suggestions = computeSmartSettle(balances);

    expect(suggestions).toEqual([
      { fromId: 'a', fromName: 'a', toId: 'b', toName: 'b', amountCents: 1000 },
    ]);
  });

  it('minimizes transactions when one creditor is owed by multiple debtors', () => {
    // a owes 300, b owes 700, c is owed 1000 total
    const balances = [balance('a', -300), balance('b', -700), balance('c', 1000)];
    const suggestions = computeSmartSettle(balances);

    const total = suggestions.reduce((sum, s) => sum + s.amountCents, 0);
    expect(total).toBe(1000);
    expect(suggestions.every((s) => s.toId === 'c')).toBe(true);
  });

  it('settles balances so every debtor and creditor nets to zero', () => {
    const balances = [
      balance('a', -1200),
      balance('b', 500),
      balance('c', -300),
      balance('d', 1000),
    ];
    const suggestions = computeSmartSettle(balances);

    const net: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
    for (const s of suggestions) {
      net[s.fromId] -= s.amountCents;
      net[s.toId] += s.amountCents;
    }

    expect(net.a).toBe(-1200);
    expect(net.b).toBe(500);
    expect(net.c).toBe(-300);
    expect(net.d).toBe(1000);
  });
});
