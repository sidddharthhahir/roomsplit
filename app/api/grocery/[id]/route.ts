/**
 * GROCERY ITEM API (by ID)
 * ========================
 * GET - Get single item with prediction
 * PATCH - Mark item as finished
 * DELETE - Delete item
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import {
  computeRemainingQuantity,
  calculatePrediction,
  getUrgencyLevel,
  getUsageHistory,
  calculateWeightedAverage,
  markItemFinished
} from '@/lib/grocery-prediction';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const item = await prisma.groceryItem.findFirst({
      where: {
        id: params.id,
        groupId: user.groupId
      }
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Compute predictions
    const history = await getUsageHistory(user.groupId, item.name);
    const avgDailyUsage = history.length > 0
      ? calculateWeightedAverage(history)
      : item.avgDailyUsage;

    const remainingQuantity = computeRemainingQuantity(
      item.quantity,
      item.purchaseDate,
      avgDailyUsage
    );

    const { daysLeft, predictedFinishDate } = calculatePrediction(
      remainingQuantity,
      avgDailyUsage
    );

    return NextResponse.json({
      item: {
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        purchaseDate: item.purchaseDate,
        status: item.status,
        avgDailyUsage,
        remainingQuantity,
        daysLeft,
        predictedFinishDate,
        urgencyLevel: getUrgencyLevel(daysLeft),
        isFinishingSoon: daysLeft !== null && daysLeft <= 2
      },
      history
    });
  } catch (error) {
    console.error('Get grocery item error:', error);
    return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();

    if (action === 'finish') {
      // Mark item as finished and record usage
      const result = await markItemFinished(user.groupId, params.id);
      
      return NextResponse.json({
        item: result.item,
        usageRecord: result.usageRecord,
        message: 'Item marked as finished and usage recorded'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Update grocery item error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify item belongs to group
    const item = await prisma.groceryItem.findFirst({
      where: {
        id: params.id,
        groupId: user.groupId
      }
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    await prisma.groceryItem.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete grocery item error:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
