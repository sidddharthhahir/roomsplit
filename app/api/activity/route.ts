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
    const limit = parseInt(searchParams.get('limit') || '50');

    const logs = await prisma.activityLog.findMany({
      where: { groupId: user.groupId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return NextResponse.json({ activities: logs });
  } catch (error) {
    console.error('Get activity error:', error);
    return NextResponse.json({ error: 'Failed to get activity' }, { status: 500 });
  }
}