export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { calculateBalances } from '@/lib/balance';

// Generate weekly or monthly house summary
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can manually trigger summaries
    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { type } = await request.json();

    if (!['weekly_summary', 'monthly_summary'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const now = new Date();
    let periodStart: Date;
    let periodEnd = now;

    if (type === 'weekly_summary') {
      periodStart = new Date(now);
      periodStart.setDate(periodStart.getDate() - 7);
    } else {
      periodStart = new Date(now);
      periodStart.setMonth(periodStart.getMonth() - 1);
    }

    // Gather data for the summary
    const [expenses, settlements, members, chores, balances] = await Promise.all([
      prisma.expense.findMany({
        where: {
          groupId: user.groupId,
          createdAt: { gte: periodStart, lte: periodEnd }
        }
      }),
      prisma.settlement.findMany({
        where: {
          groupId: user.groupId,
          createdAt: { gte: periodStart, lte: periodEnd }
        }
      }),
      prisma.groupMember.count({ where: { groupId: user.groupId } }),
      prisma.choreAssignment.findMany({
        where: {
          chore: { groupId: user.groupId },
          periodStart: { gte: periodStart }
        },
        include: { chore: true }
      }),
      calculateBalances(user.groupId)
    ]);

    // Calculate stats (all neutral, no names)
    const totalSpending = expenses.reduce((sum, e) => sum + e.amountCents, 0);
    const avgPerPerson = members > 0 ? totalSpending / members : 0;
    const settlementCount = settlements.length;
    const completedChores = chores.filter(c => c.completedAt).length;
    const missedChores = chores.filter(c => !c.completedAt && new Date(c.periodEnd) < now).length;
    
    // Check if anyone has significant balance
    const maxOwed = Math.max(...balances.map(b => Math.abs(b.netBalance)));
    const hasOutstandingDebts = maxOwed > 500; // More than €5

    // Generate neutral, calm content
    const content = generateSummaryContent({
      type,
      totalSpending,
      avgPerPerson,
      expenseCount: expenses.length,
      settlementCount,
      completedChores,
      missedChores,
      hasOutstandingDebts,
      memberCount: members
    });

    // Create the post
    const post = await prisma.houseVoicePost.create({
      data: {
        groupId: user.groupId,
        type,
        content,
        periodStart,
        periodEnd
      }
    });

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error('Generate summary error:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}

interface SummaryData {
  type: string;
  totalSpending: number;
  avgPerPerson: number;
  expenseCount: number;
  settlementCount: number;
  completedChores: number;
  missedChores: number;
  hasOutstandingDebts: boolean;
  memberCount: number;
}

function generateSummaryContent(data: SummaryData): string {
  const periodLabel = data.type === 'weekly_summary' ? 'This Week' : 'This Month';
  const lines: string[] = [];

  lines.push(`🎙️ House Update — ${periodLabel}\n`);

  // Spending insight (neutral)
  if (data.expenseCount > 0) {
    const formatted = (data.totalSpending / 100).toFixed(0);
    lines.push(`• Shared spending: €${formatted} across ${data.expenseCount} expense${data.expenseCount !== 1 ? 's' : ''}`);
  } else {
    lines.push(`• No shared expenses recorded`);
  }

  // Settlements (neutral)
  if (data.settlementCount > 0) {
    lines.push(`• ${data.settlementCount} settlement${data.settlementCount !== 1 ? 's' : ''} recorded`);
  }

  // Balance status (very neutral, no blame)
  if (data.hasOutstandingDebts) {
    lines.push(`• Some balances remain outstanding`);
  } else {
    lines.push(`• Balances are looking good`);
  }

  // Chores (neutral)
  if (data.completedChores + data.missedChores > 0) {
    if (data.missedChores > 0) {
      lines.push(`• Some chores were missed this period`);
    } else if (data.completedChores > 0) {
      lines.push(`• All assigned chores were completed`);
    }
  }

  // Closing note
  lines.push(`\nKeep up the good teamwork! 🏠`);

  return lines.join('\n');
}
