/**
 * MONTH SOFT-LOCK API
 * ===================
 * Allows admins to close/reopen months for financial period control.
 * Closed months prevent modifications to expenses and settlements.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - List all closed months
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const closedMonths = await prisma.closedMonth.findMany({
      where: { groupId: user.groupId },
      orderBy: { month: 'desc' }
    }).catch(() => []);

    return NextResponse.json({ closedMonths });
  } catch (error) {
    console.error('Get closed months error:', error);
    return NextResponse.json({ error: 'Failed to fetch closed months' }, { status: 500 });
  }
}

// POST - Close a month
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { month, notes } = await request.json();

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM' }, { status: 400 });
    }

    // Check if already closed
    const existing = await prisma.closedMonth.findUnique({
      where: {
        groupId_month: {
          groupId: user.groupId,
          month
        }
      }
    }).catch(() => null);

    if (existing) {
      return NextResponse.json({ error: 'Month is already closed' }, { status: 400 });
    }

    const closedMonth = await prisma.closedMonth.create({
      data: {
        groupId: user.groupId,
        month,
        closedBy: user.id,
        notes
      }
    });

    // Log the action
    await prisma.activityLog.create({
      data: {
        groupId: user.groupId,
        type: 'month_closed',
        metadata: {
          month,
          closedBy: user.displayName,
          notes
        }
      }
    });

    return NextResponse.json({ closedMonth });
  } catch (error) {
    console.error('Close month error:', error);
    return NextResponse.json({ error: 'Failed to close month' }, { status: 500 });
  }
}

// DELETE - Reopen a month
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM' }, { status: 400 });
    }

    await prisma.closedMonth.delete({
      where: {
        groupId_month: {
          groupId: user.groupId,
          month
        }
      }
    }).catch(() => null);

    // Log the action
    await prisma.activityLog.create({
      data: {
        groupId: user.groupId,
        type: 'month_reopened',
        metadata: {
          month,
          reopenedBy: user.displayName
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reopen month error:', error);
    return NextResponse.json({ error: 'Failed to reopen month' }, { status: 500 });
  }
}
