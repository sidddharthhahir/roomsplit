/**
 * DEV-ONLY LEDGER DEBUGGING TOOL
 * ================================
 * Hidden route for debugging financial integrity.
 * Shows raw expenses, splits, settlements, and computed balances.
 * 
 * ACCESS: Only admin users can view this.
 * PURPOSE: QA, debugging, invariant verification
 * SAFETY: Read-only, never modifies data
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { computeGroupBalances } from '@/lib/balance';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admin access
    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const groupId = user.groupId;

    // Fetch all raw ledger data
    const [expenses, settlements, members, closedMonths] = await Promise.all([
      prisma.expense.findMany({
        where: { groupId },
        include: {
          paidBy: { select: { displayName: true } },
          splits: {
            include: { member: { select: { displayName: true } } }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100 // Limit for performance
      }),
      prisma.settlement.findMany({
        where: { groupId },
        include: {
          fromMember: { select: { displayName: true } },
          toMember: { select: { displayName: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.groupMember.findMany({
        where: { groupId },
        select: { id: true, displayName: true, isAdmin: true }
      }),
      prisma.closedMonth.findMany({
        where: { groupId },
        orderBy: { month: 'desc' }
      }).catch(() => []) // Might not exist yet
    ]);

    // Compute balances with invariant check
    const balanceResult = await computeGroupBalances(groupId);

    // Validate expense splits sum to expense amount
    const expenseValidation = expenses.map(exp => {
      const splitSum = exp.splits.reduce((sum, s) => sum + s.shareCents, 0);
      const valid = splitSum === exp.amountCents;
      return {
        id: exp.id,
        description: exp.description,
        amountCents: exp.amountCents,
        splitSum,
        valid,
        error: valid ? null : `Split sum (${splitSum}) != expense amount (${exp.amountCents})`
      };
    });

    const invalidExpenses = expenseValidation.filter(e => !e.valid);

    // Check for orphaned splits (splits without parent expense)
    const orphanedSplitsCount = await prisma.expenseSplit.count({
      where: {
        expense: { groupId },
        expenseId: { notIn: expenses.map(e => e.id) }
      }
    });

    // Build response
    return NextResponse.json({
      meta: {
        generatedAt: new Date().toISOString(),
        groupId,
        isReadOnly: true,
        purpose: 'Debug & QA Only'
      },
      invariants: {
        sumOfBalances: balanceResult.sumOfBalances,
        balanceInvariantValid: balanceResult.invariantValid,
        invalidExpenseCount: invalidExpenses.length,
        orphanedSplitsCount
      },
      balances: balanceResult.balances.map(b => ({
        memberId: b.memberId,
        displayName: b.displayName,
        totalPaid: b.totalPaid,
        totalShare: b.totalShare,
        totalSettledOut: b.totalSettledOut,
        totalSettledIn: b.totalSettledIn,
        netBalance: b.netBalance,
        netBalanceFormatted: `€${(b.netBalance / 100).toFixed(2)}`
      })),
      members,
      closedMonths,
      expenseValidation: invalidExpenses.length > 0 ? invalidExpenses : 'All expenses valid',
      recentExpenses: expenses.slice(0, 20).map(e => ({
        id: e.id,
        description: e.description,
        amountCents: e.amountCents,
        paidBy: e.paidBy.displayName,
        month: e.month,
        isRecurring: e.isRecurring,
        createdAt: e.createdAt,
        splits: e.splits.map(s => ({
          member: s.member.displayName,
          shareCents: s.shareCents
        }))
      })),
      recentSettlements: settlements.slice(0, 20).map(s => ({
        id: s.id,
        from: s.fromMember.displayName,
        to: s.toMember.displayName,
        amountCents: s.amountCents,
        month: s.month,
        createdAt: s.createdAt
      }))
    });
  } catch (error) {
    console.error('Ledger debug error:', error);
    return NextResponse.json({ error: 'Failed to generate ledger report' }, { status: 500 });
  }
}
