export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// PUT - Update chore (admin only)
export async function PUT(
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
    const { name, icon, frequency } = await request.json();

    // Verify chore belongs to user's group
    const existingChore = await prisma.chore.findFirst({
      where: { id, groupId: user.groupId }
    });

    if (!existingChore) {
      return NextResponse.json({ error: 'Chore not found' }, { status: 404 });
    }

    const validFrequencies = ['weekly', 'biweekly'];
    if (frequency && !validFrequencies.includes(frequency)) {
      return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
    }

    const chore = await prisma.chore.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(icon && { icon }),
        ...(frequency && { frequency })
      }
    });

    return NextResponse.json({ chore });
  } catch (error) {
    console.error('Update chore error:', error);
    return NextResponse.json({ error: 'Failed to update chore' }, { status: 500 });
  }
}

// DELETE - Delete chore (admin only)
export async function DELETE(
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

    await prisma.chore.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete chore error:', error);
    return NextResponse.json({ error: 'Failed to delete chore' }, { status: 500 });
  }
}
