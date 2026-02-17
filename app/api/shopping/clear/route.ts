export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST - Clear all purchased items
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await prisma.shoppingItem.deleteMany({
      where: {
        groupId: user.groupId,
        purchased: true
      }
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error('Clear purchased items error:', error);
    return NextResponse.json({ error: 'Failed to clear items' }, { status: 500 });
  }
}
