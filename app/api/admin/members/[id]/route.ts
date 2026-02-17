export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Update a member's profile (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { displayName, avatarUrl } = await request.json();

    // Verify member belongs to same group
    const member = await prisma.groupMember.findFirst({
      where: { id, groupId: user.groupId }
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Validate displayName
    if (displayName !== undefined && (!displayName || displayName.trim().length === 0)) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }

    if (displayName && displayName.length > 50) {
      return NextResponse.json({ error: 'Name too long (max 50 characters)' }, { status: 400 });
    }

    // Update member
    const updatedMember = await prisma.groupMember.update({
      where: { id },
      data: {
        ...(displayName !== undefined && { displayName: displayName.trim() }),
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null })
      },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        isAdmin: true,
        joinedAt: true
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        groupId: user.groupId,
        type: 'member_updated',
        metadata: {
          memberId: id,
          updatedBy: user.displayName,
          changes: {
            ...(displayName !== undefined && { displayName }),
            ...(avatarUrl !== undefined && { avatarUrl: avatarUrl ? 'updated' : 'removed' })
          }
        }
      }
    });

    return NextResponse.json({ member: updatedMember });
  } catch (error) {
    console.error('Update member error:', error);
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
  }
}

// Remove a member (admin only, cannot remove self or other admins)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify member belongs to same group
    const member = await prisma.groupMember.findFirst({
      where: { id, groupId: user.groupId }
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Cannot remove yourself
    if (member.id === user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }

    // Cannot remove other admins
    if (member.isAdmin) {
      return NextResponse.json({ error: 'Cannot remove other admins' }, { status: 400 });
    }

    // Check if member has any expenses or settlements
    const hasExpenses = await prisma.expense.count({
      where: { paidById: id }
    });
    const hasSettlements = await prisma.settlement.count({
      where: { OR: [{ fromMemberId: id }, { toMemberId: id }] }
    });

    if (hasExpenses > 0 || hasSettlements > 0) {
      return NextResponse.json({ 
        error: 'Cannot remove member with expenses or settlements. Delete their transactions first.' 
      }, { status: 400 });
    }

    // Delete member
    await prisma.groupMember.delete({ where: { id } });

    // Log activity
    await prisma.activityLog.create({
      data: {
        groupId: user.groupId,
        type: 'member_removed',
        metadata: {
          memberName: member.displayName,
          removedBy: user.displayName
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete member error:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
