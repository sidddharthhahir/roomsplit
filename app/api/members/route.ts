export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const members = await prisma.groupMember.findMany({
      where: { groupId: user.groupId },
      orderBy: { joinedAt: 'asc' }
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Get members error:', error);
    return NextResponse.json({ error: 'Failed to get members' }, { status: 500 });
  }
}

// PUT - Update current user's profile
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { displayName, avatarUrl } = await request.json();

    // Validate displayName
    if (displayName !== undefined) {
      if (!displayName || displayName.trim().length === 0) {
        return NextResponse.json({ error: 'Display name cannot be empty' }, { status: 400 });
      }
      if (displayName.trim().length > 50) {
        return NextResponse.json({ error: 'Display name is too long' }, { status: 400 });
      }
    }

    // Validate avatarUrl (basic URL validation)
    if (avatarUrl !== undefined && avatarUrl !== null && avatarUrl !== '') {
      try {
        new URL(avatarUrl);
      } catch {
        return NextResponse.json({ error: 'Invalid avatar URL' }, { status: 400 });
      }
    }

    // Update the user's profile
    const updated = await prisma.groupMember.update({
      where: { id: user.id },
      data: {
        ...(displayName !== undefined && { displayName: displayName.trim() }),
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null }),
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        groupId: user.groupId,
        type: 'profile_updated',
        metadata: {
          memberId: user.id,
          displayName: updated.displayName,
          updatedBy: user.displayName,
        },
      },
    });

    return NextResponse.json({ 
      success: true, 
      member: {
        id: updated.id,
        displayName: updated.displayName,
        avatarUrl: updated.avatarUrl,
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}