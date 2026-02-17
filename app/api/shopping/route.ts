export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Fetch all shopping items for the group
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await prisma.shoppingItem.findMany({
      where: { groupId: user.groupId },
      include: {
        addedBy: { select: { id: true, displayName: true, avatarUrl: true } },
        purchasedBy: { select: { id: true, displayName: true, avatarUrl: true } }
      },
      orderBy: [
        { purchased: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Get shopping items error:', error);
    return NextResponse.json({ error: 'Failed to fetch shopping items' }, { status: 500 });
  }
}

// POST - Add a new shopping item
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, quantity, category } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
    }

    const item = await prisma.shoppingItem.create({
      data: {
        groupId: user.groupId,
        name: name.trim(),
        quantity: quantity?.trim() || null,
        category: category || 'general',
        addedById: user.id
      },
      include: {
        addedBy: { select: { id: true, displayName: true, avatarUrl: true } },
        purchasedBy: { select: { id: true, displayName: true, avatarUrl: true } }
      }
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Add shopping item error:', error);
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
  }
}
