/**
 * GROCERY USAGE HISTORY API
 * =========================
 * GET - Fetch usage history for items
 */

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
    const itemName = searchParams.get('itemName');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const where: Record<string, unknown> = { groupId: user.groupId };
    
    if (itemName) {
      where.itemName = itemName.toLowerCase().trim();
    }

    const history = await prisma.groceryUsageHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50) // Cap at 50
    });

    // Get unique item names for filter dropdown
    const uniqueItems = await prisma.groceryUsageHistory.groupBy({
      by: ['itemName'],
      where: { groupId: user.groupId }
    });

    return NextResponse.json({
      history,
      itemNames: uniqueItems.map(i => i.itemName)
    });
  } catch (error) {
    console.error('Get usage history error:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
