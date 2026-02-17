export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    if (!month) {
      return NextResponse.json({ error: 'Month required' }, { status: 400 });
    }

    const expenses = await prisma.expense.findMany({
      where: {
        groupId: user.groupId,
        month
      },
      include: {
        paidBy: true,
        splits: { include: { member: true } }
      }
    });

    const members = await prisma.groupMember.findMany({
      where: { groupId: user.groupId }
    });

    // Calculate insights
    const totalExpense = expenses.reduce((sum, e) => sum + (e?.amountCents ?? 0), 0);
    const averagePerPerson = members.length > 0 ? Math.round(totalExpense / members.length) : 0;

    // Per-member stats
    const memberStats = members.map(member => {
      const paid = expenses
        .filter(e => e?.paidById === member.id)
        .reduce((sum, e) => sum + (e?.amountCents ?? 0), 0);

      const share = expenses
        .flatMap(e => e?.splits ?? [])
        .filter(s => s?.memberId === member.id)
        .reduce((sum, s) => sum + (s?.shareCents ?? 0), 0);

      return {
        memberId: member.id,
        displayName: member.displayName,
        paid,
        share
      };
    });

    // Top spender
    const topSpender = [...memberStats].sort((a, b) => b.paid - a.paid)[0];

    return NextResponse.json({
      month,
      totalExpense,
      averagePerPerson,
      memberStats,
      topSpender,
      expenseCount: expenses.length
    });
  } catch (error) {
    console.error('Get insights error:', error);
    return NextResponse.json({ error: 'Failed to get insights' }, { status: 500 });
  }
}