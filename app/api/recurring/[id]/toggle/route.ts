export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recurring = await prisma.recurringExpense.findUnique({
      where: { id: params.id }
    });

    if (!recurring || recurring.groupId !== user.groupId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await prisma.recurringExpense.update({
      where: { id: params.id },
      data: { active: !recurring.active }
    });

    return NextResponse.json({ recurring: updated });
  } catch (error) {
    console.error('Toggle recurring error:', error);
    return NextResponse.json({ error: 'Failed to toggle' }, { status: 500 });
  }
}