export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { generateRecurringExpenseForMonth } from '@/lib/recurring';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { month, paidById } = await request.json();

    if (!month || !paidById) {
      return NextResponse.json({ error: 'Month and payer required' }, { status: 400 });
    }

    const recurring = await prisma.recurringExpense.findUnique({
      where: { id: params.id }
    });

    if (!recurring || recurring.groupId !== user.groupId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await generateRecurringExpenseForMonth(params.id, month, paidById);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Generate recurring error:', error);
    return NextResponse.json({ error: 'Failed to generate expense' }, { status: 500 });
  }
}