export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Get all members (for admin)
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const members = await prisma.groupMember.findMany({
      where: { groupId: user.groupId },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        isAdmin: true,
        joinedAt: true
      },
      orderBy: { joinedAt: 'asc' }
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Get members error:', error);
    return NextResponse.json({ error: 'Failed to get members' }, { status: 500 });
  }
}
