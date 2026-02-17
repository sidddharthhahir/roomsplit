export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const budget = await prisma.budget.findUnique({
      where: { groupId: user.groupId }
    });

    // Get current month's total expenses
    const currentMonth = new Date().toISOString().slice(0, 7);
    const expenses = await prisma.expense.aggregate({
      where: {
        groupId: user.groupId,
        month: currentMonth
      },
      _sum: { amountCents: true }
    });

    const currentSpent = expenses._sum.amountCents || 0;
    const percentUsed = budget ? Math.round((currentSpent / budget.monthlyLimit) * 100) : 0;
    const isOverBudget = budget ? currentSpent > budget.monthlyLimit : false;
    const isNearLimit = budget ? percentUsed >= budget.alertAt : false;

    return NextResponse.json({
      budget,
      currentSpent,
      percentUsed,
      isOverBudget,
      isNearLimit
    });
  } catch (error) {
    console.error('Get budget error:', error);
    return NextResponse.json({ error: 'Failed to get budget' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { monthlyLimit, alertAt } = await request.json();

    if (!monthlyLimit || monthlyLimit <= 0) {
      return NextResponse.json({ error: 'Invalid monthly limit' }, { status: 400 });
    }

    const budget = await prisma.budget.upsert({
      where: { groupId: user.groupId },
      update: {
        monthlyLimit,
        alertAt: alertAt || 80
      },
      create: {
        groupId: user.groupId,
        monthlyLimit,
        alertAt: alertAt || 80
      }
    });

    return NextResponse.json({ budget });
  } catch (error) {
    console.error('Update budget error:', error);
    return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    await prisma.budget.deleteMany({
      where: { groupId: user.groupId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete budget error:', error);
    return NextResponse.json({ error: 'Failed to delete budget' }, { status: 500 });
  }
}
