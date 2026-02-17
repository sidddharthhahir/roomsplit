/**
 * GROCERY ITEMS API
 * =================
 * Manages grocery items with smart usage prediction.
 * GET - Fetch all active grocery items with predictions
 * POST - Add a new grocery item (handles cycle reset)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import {
  getGroceryItemsWithPredictions,
  getSmartSuggestions,
  handleGroceryPurchase
} from '@/lib/grocery-prediction';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active items with computed predictions
    const items = await getGroceryItemsWithPredictions(user.groupId);
    
    // Get smart suggestions for items finishing soon
    const suggestions = await getSmartSuggestions(user.groupId);

    return NextResponse.json({
      items,
      suggestions,
      count: items.length
    });
  } catch (error) {
    console.error('Get grocery items error:', error);
    return NextResponse.json({ error: 'Failed to fetch grocery items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, quantity, unit } = await request.json();

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
    }

    if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json({ error: 'Valid quantity is required' }, { status: 400 });
    }

    if (!unit || typeof unit !== 'string' || unit.trim().length === 0) {
      return NextResponse.json({ error: 'Unit is required' }, { status: 400 });
    }

    // Handle purchase (creates new item, handles cycle reset if existing)
    const result = await handleGroceryPurchase(
      user.groupId,
      name.trim(),
      quantity,
      unit.trim()
    );

    return NextResponse.json({
      item: result.newItem,
      previousCycle: result.previousItem ? {
        closedItem: result.previousItem,
        usageRecord: result.usageRecord
      } : null,
      message: result.previousItem
        ? `Updated ${name} - previous cycle recorded in usage history`
        : `Added ${name} to grocery tracking`
    });
  } catch (error) {
    console.error('Add grocery item error:', error);
    return NextResponse.json({ error: 'Failed to add grocery item' }, { status: 500 });
  }
}
