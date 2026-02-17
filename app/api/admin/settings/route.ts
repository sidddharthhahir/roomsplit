export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Get group settings
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const group = await prisma.group.findUnique({
      where: { id: user.groupId },
      select: { simplifyDebts: true }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json({ simplifyDebts: group.simplifyDebts });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 });
  }
}

// Update group settings (admin only)
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Only admin can change settings' }, { status: 403 });
    }

    const body = await request.json();
    const { simplifyDebts } = body;

    if (typeof simplifyDebts !== 'boolean') {
      return NextResponse.json({ error: 'Invalid value for simplifyDebts' }, { status: 400 });
    }

    const group = await prisma.group.update({
      where: { id: user.groupId },
      data: { simplifyDebts },
      select: { simplifyDebts: true }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        groupId: user.groupId,
        type: 'settings_changed',
        metadata: {
          setting: 'simplifyDebts',
          value: simplifyDebts,
          changedBy: user.displayName
        }
      }
    });

    return NextResponse.json({ simplifyDebts: group.simplifyDebts });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
