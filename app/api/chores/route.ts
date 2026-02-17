export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentAssignments } from '@/lib/chores';

// GET - Fetch all chores with current assignments
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all chores for the group
    const chores = await prisma.chore.findMany({
      where: { groupId: user.groupId },
      orderBy: [{ active: 'desc' }, { name: 'asc' }]
    });

    // Get current assignments with rotation logic
    const currentAssignments = await getCurrentAssignments(user.groupId);

    return NextResponse.json({ chores, currentAssignments, userId: user.id });
  } catch (error) {
    console.error('Get chores error:', error);
    return NextResponse.json({ error: 'Failed to fetch chores' }, { status: 500 });
  }
}

// POST - Create a new chore (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { name, icon, frequency } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Chore name is required' }, { status: 400 });
    }

    const validFrequencies = ['weekly', 'biweekly'];
    if (frequency && !validFrequencies.includes(frequency)) {
      return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
    }

    const chore = await prisma.chore.create({
      data: {
        groupId: user.groupId,
        name: name.trim(),
        icon: icon || '🧹',
        frequency: frequency || 'weekly'
      }
    });

    // Initialize rotation state
    await prisma.choreRotationState.create({
      data: {
        groupId: user.groupId,
        choreId: chore.id,
        currentIndex: 0
      }
    });

    return NextResponse.json({ chore });
  } catch (error) {
    console.error('Create chore error:', error);
    return NextResponse.json({ error: 'Failed to create chore' }, { status: 500 });
  }
}
