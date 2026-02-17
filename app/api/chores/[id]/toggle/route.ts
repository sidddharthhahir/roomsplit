export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// PATCH - Toggle chore active status (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { id } = params;

    // Verify chore belongs to user's group
    const existingChore = await prisma.chore.findFirst({
      where: { id, groupId: user.groupId }
    });

    if (!existingChore) {
      return NextResponse.json({ error: 'Chore not found' }, { status: 404 });
    }

    const chore = await prisma.chore.update({
      where: { id },
      data: { active: !existingChore.active }
    });

    return NextResponse.json({ chore });
  } catch (error) {
    console.error('Toggle chore error:', error);
    return NextResponse.json({ error: 'Failed to toggle chore' }, { status: 500 });
  }
}
