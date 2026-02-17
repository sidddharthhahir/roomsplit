import { prisma } from './db';

// ============================================
// LEDGER-FIRST ARCHITECTURE (NON-NEGOTIABLE)
// ============================================
// Only these tables affect money: expenses, expense_splits, settlements
// Balances are NEVER stored, cached, or mutated - ALWAYS derived
// All calculations use INTEGER CENTS - no floating point math

export interface MemberBalance {
  memberId: string;
  displayName: string;
  avatarUrl?: string | null;
  totalPaid: number; // cents
  totalShare: number; // cents
  totalSettledOut: number; // cents - settlements paid
  totalSettledIn: number; // cents - settlements received
  netBalance: number; // positive = owed money, negative = owes money
}

export interface BalanceResult {
  balances: MemberBalance[];
  invariantValid: boolean; // Sum of all balances should equal 0
  sumOfBalances: number; // For debugging - should be 0
}

export interface DebtExplanation {
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  netAmountCents: number; // positive = fromMember owes toMember
  expensesWhereToPaid: {
    id: string;
    description: string;
    amountCents: number;
    fromShareCents: number;
    date: Date;
  }[];
  expensesWhereFromPaid: {
    id: string;
    description: string;
    amountCents: number;
    toShareCents: number;
    date: Date;
  }[];
  settlementsBetween: {
    id: string;
    amountCents: number;
    direction: 'from_to' | 'to_from'; // from_to = fromMember paid toMember
    date: Date;
  }[];
}

/**
 * BALANCE CALCULATION - THE GOLDEN RULE (MANDATORY SINGLE SOURCE)
 * ================================================================
 * 
 * FORMULA (deterministic, integer-only):
 *   balance(U) = (totalPaid + totalSettledOut) - (totalShare + totalSettledIn)
 * 
 * SEMANTICS:
 *   - Positive balance → others owe you money (you should RECEIVE)
 *   - Negative balance → you owe others money (you should PAY)
 * 
 * FINANCIAL INVARIANTS (ALWAYS TRUE):
 *   - Sum of all balances in a group = 0
 *   - A user cannot be both net debtor and creditor
 *   - Settlements never change total group spending
 *   - Recurring templates never affect balances directly
 */
export async function calculateBalances(groupId: string): Promise<MemberBalance[]> {
  const result = await computeGroupBalances(groupId);
  return result.balances;
}

/**
 * PRIMARY BALANCE ENGINE - Single source of truth
 * Called by ALL components that need balance data
 */
export async function computeGroupBalances(groupId: string): Promise<BalanceResult> {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: {
      expensesPaid: true,
      expenseSplits: true,
      settlementsFrom: true,
      settlementsTo: true
    },
    orderBy: { joinedAt: 'asc' } // Deterministic ordering
  });

  const balances: MemberBalance[] = members.map(member => {
    // Integer-only arithmetic - no floating point
    const totalPaid = (member.expensesPaid ?? []).reduce(
      (sum, exp) => sum + Math.round(exp?.amountCents ?? 0), 0
    );
    
    const totalShare = (member.expenseSplits ?? []).reduce(
      (sum, split) => sum + Math.round(split?.shareCents ?? 0), 0
    );
    
    const totalSettledOut = (member.settlementsFrom ?? []).reduce(
      (sum, s) => sum + Math.round(s?.amountCents ?? 0), 0
    );
    
    const totalSettledIn = (member.settlementsTo ?? []).reduce(
      (sum, s) => sum + Math.round(s?.amountCents ?? 0), 0
    );
    
    // FORMULA: balance = (paid + settled_out) - (share + settled_in)
    const netBalance = (totalPaid + totalSettledOut) - (totalShare + totalSettledIn);
    
    return {
      memberId: member.id,
      displayName: member.displayName,
      avatarUrl: member.avatarUrl,
      totalPaid,
      totalShare,
      totalSettledOut,
      totalSettledIn,
      netBalance
    };
  });

  // INVARIANT CHECK: Sum of all balances must equal 0
  const sumOfBalances = balances.reduce((sum, b) => sum + b.netBalance, 0);
  const invariantValid = Math.abs(sumOfBalances) < 2; // Allow 1 cent rounding tolerance

  if (!invariantValid) {
    console.error(`[LEDGER INVARIANT VIOLATION] Group ${groupId}: Sum of balances = ${sumOfBalances} cents (expected 0)`);
  }

  return { balances, invariantValid, sumOfBalances };
}

/**
 * DEBT EXPLANATION ENGINE
 * Explains WHY two members have a debt relationship
 * Used for "Why do I owe?" feature and QA checks
 */
export async function explainBalance(
  groupId: string,
  memberAId: string,
  memberBId: string
): Promise<DebtExplanation> {
  // Get member names
  const [memberA, memberB] = await Promise.all([
    prisma.groupMember.findUnique({ where: { id: memberAId }, select: { displayName: true } }),
    prisma.groupMember.findUnique({ where: { id: memberBId }, select: { displayName: true } })
  ]);

  if (!memberA || !memberB) {
    throw new Error('Invalid member IDs');
  }

  // Get all expenses where B paid and A has a share (A owes B)
  const expensesWhereBPaid = await prisma.expense.findMany({
    where: {
      groupId,
      paidById: memberBId,
      splits: { some: { memberId: memberAId } }
    },
    include: {
      splits: { where: { memberId: memberAId } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get all expenses where A paid and B has a share (B owes A)
  const expensesWhereAPaid = await prisma.expense.findMany({
    where: {
      groupId,
      paidById: memberAId,
      splits: { some: { memberId: memberBId } }
    },
    include: {
      splits: { where: { memberId: memberBId } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Get all settlements between A and B
  const settlements = await prisma.settlement.findMany({
    where: {
      groupId,
      OR: [
        { fromMemberId: memberAId, toMemberId: memberBId },
        { fromMemberId: memberBId, toMemberId: memberAId }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });

  // Calculate amounts
  // A owes B for expenses where B paid
  const aOwesB = expensesWhereBPaid.reduce(
    (sum, exp) => sum + (exp.splits[0]?.shareCents ?? 0), 0
  );
  
  // B owes A for expenses where A paid
  const bOwesA = expensesWhereAPaid.reduce(
    (sum, exp) => sum + (exp.splits[0]?.shareCents ?? 0), 0
  );
  
  // Settlements from A to B reduce A's debt
  const aSettledToB = settlements
    .filter(s => s.fromMemberId === memberAId && s.toMemberId === memberBId)
    .reduce((sum, s) => sum + s.amountCents, 0);
  
  // Settlements from B to A reduce B's debt
  const bSettledToA = settlements
    .filter(s => s.fromMemberId === memberBId && s.toMemberId === memberAId)
    .reduce((sum, s) => sum + s.amountCents, 0);

  // Net: positive means A owes B
  const netAmountCents = (aOwesB - aSettledToB) - (bOwesA - bSettledToA);

  return {
    fromMemberId: memberAId,
    fromMemberName: memberA.displayName,
    toMemberId: memberBId,
    toMemberName: memberB.displayName,
    netAmountCents,
    expensesWhereToPaid: expensesWhereBPaid.map(exp => ({
      id: exp.id,
      description: exp.description,
      amountCents: exp.amountCents,
      fromShareCents: exp.splits[0]?.shareCents ?? 0,
      date: exp.createdAt
    })),
    expensesWhereFromPaid: expensesWhereAPaid.map(exp => ({
      id: exp.id,
      description: exp.description,
      amountCents: exp.amountCents,
      toShareCents: exp.splits[0]?.shareCents ?? 0,
      date: exp.createdAt
    })),
    settlementsBetween: settlements.map(s => ({
      id: s.id,
      amountCents: s.amountCents,
      direction: s.fromMemberId === memberAId ? 'from_to' : 'to_from' as const,
      date: s.createdAt
    }))
  };
}

/**
 * SETTLEMENT VALIDATION
 * Ensures settlement doesn't violate financial invariants
 */
export interface SettlementValidation {
  valid: boolean;
  error?: string;
  balanceBeforeFrom: number;
  balanceAfterFrom: number;
  balanceBeforeTo: number;
  balanceAfterTo: number;
}

export async function validateSettlement(
  groupId: string,
  fromMemberId: string,
  toMemberId: string,
  amountCents: number
): Promise<SettlementValidation> {
  // Get current balances
  const { balances } = await computeGroupBalances(groupId);
  
  const fromBalance = balances.find(b => b.memberId === fromMemberId);
  const toBalance = balances.find(b => b.memberId === toMemberId);
  
  if (!fromBalance || !toBalance) {
    return {
      valid: false,
      error: 'Invalid member IDs',
      balanceBeforeFrom: 0,
      balanceAfterFrom: 0,
      balanceBeforeTo: 0,
      balanceAfterTo: 0
    };
  }

  // Calculate what balances would be after settlement
  // When A pays B: A's balance INCREASES, B's balance DECREASES
  const balanceAfterFrom = fromBalance.netBalance + amountCents;
  const balanceAfterTo = toBalance.netBalance - amountCents;

  // VALIDATION RULES:
  // 1. Amount must be positive
  if (amountCents <= 0) {
    return {
      valid: false,
      error: 'Settlement amount must be positive',
      balanceBeforeFrom: fromBalance.netBalance,
      balanceAfterFrom,
      balanceBeforeTo: toBalance.netBalance,
      balanceAfterTo
    };
  }

  // 2. Settlement should generally reduce absolute balances (with some tolerance)
  // But we allow flexible settlements for manual corrections
  // Only block if it would create a massive sign flip (>10% of amount)
  const fromSignBefore = Math.sign(fromBalance.netBalance);
  const fromSignAfter = Math.sign(balanceAfterFrom);
  const toSignBefore = Math.sign(toBalance.netBalance);
  const toSignAfter = Math.sign(balanceAfterTo);

  // Block if settlement creates unreasonable sign flip
  // (e.g., turning someone from owing €0 to being owed €100 without justification)
  if (fromSignBefore !== 0 && fromSignAfter !== 0 && fromSignBefore !== fromSignAfter) {
    // Sign flip for payer - check if it's extreme
    if (Math.abs(balanceAfterFrom) > amountCents * 0.1) {
      return {
        valid: false,
        error: 'This settlement would create an unreasonable credit for the payer',
        balanceBeforeFrom: fromBalance.netBalance,
        balanceAfterFrom,
        balanceBeforeTo: toBalance.netBalance,
        balanceAfterTo
      };
    }
  }

  return {
    valid: true,
    balanceBeforeFrom: fromBalance.netBalance,
    balanceAfterFrom,
    balanceBeforeTo: toBalance.netBalance,
    balanceAfterTo
  };
}

export interface SettlementSuggestion {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amountCents: number;
}

export function computeSmartSettle(balances: MemberBalance[]): SettlementSuggestion[] {
  // Separate into debtors (owe money, negative balance) and creditors (owed money, positive balance)
  const debtors: { id: string; name: string; amount: number }[] = [];
  const creditors: { id: string; name: string; amount: number }[] = [];
  
  for (const b of balances) {
    if (b.netBalance < 0) {
      debtors.push({ id: b.memberId, name: b.displayName, amount: Math.abs(b.netBalance) });
    } else if (b.netBalance > 0) {
      creditors.push({ id: b.memberId, name: b.displayName, amount: b.netBalance });
    }
  }
  
  // Sort descending by amount for greedy matching
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  
  const suggestions: SettlementSuggestion[] = [];
  
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    
    if (!debtor || !creditor) break;
    
    const amount = Math.min(debtor.amount, creditor.amount);
    
    if (amount > 0) {
      suggestions.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amountCents: amount
      });
    }
    
    debtor.amount -= amount;
    creditor.amount -= amount;
    
    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }
  
  return suggestions;
}