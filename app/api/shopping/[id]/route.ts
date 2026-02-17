export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// PATCH - Mark item as purchased/unpurchased
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { purchased } = await request.json();

    // Verify item belongs to user's group
    const existingItem = await prisma.shoppingItem.findFirst({
      where: { id, groupId: user.groupId }
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const item = await prisma.shoppingItem.update({
      where: { id },
      data: {
        purchased: purchased,
        purchasedById: purchased ? user.id : null,
        purchasedAt: purchased ? new Date() : null
      },
      include: {
        addedBy: { select: { id: true, displayName: true, avatarUrl: true } },
        purchasedBy: { select: { id: true, displayName: true, avatarUrl: true } }
      }
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Update shopping item error:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

// DELETE - Remove a shopping item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Verify item belongs to user's group
    const existingItem = await prisma.shoppingItem.findFirst({
      where: { id, groupId: user.groupId }
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    await prisma.shoppingItem.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete shopping item error:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
