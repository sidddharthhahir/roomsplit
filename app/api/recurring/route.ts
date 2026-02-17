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

    const recurring = await prisma.recurringExpense.findMany({
      where: { groupId: user.groupId },
      include: {
        expenses: {
          orderBy: { month: 'desc' },
          take: 3
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ recurring });
  } catch (error) {
    console.error('Get recurring error:', error);
    return NextResponse.json({ error: 'Failed to get recurring expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, amountCents, splitConfig } = await request.json();

    if (!name || !amountCents || !splitConfig) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const recurring = await prisma.recurringExpense.create({
      data: {
        groupId: user.groupId,
        name,
        amountCents,
        splitConfig
      }
    });

    return NextResponse.json({ recurring });
  } catch (error) {
    console.error('Create recurring error:', error);
    return NextResponse.json({ error: 'Failed to create recurring expense' }, { status: 500 });
  }
}