export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settlement = await prisma.settlement.findUnique({
      where: { id: params.id },
      include: { fromMember: true, toMember: true }
    });

    if (!settlement || settlement.groupId !== user.groupId) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 });
    }

    const body = await request.json();
    const { fromMemberId, toMemberId, amountCents } = body;

    if (!fromMemberId || !toMemberId || !amountCents) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (amountCents <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }

    if (fromMemberId === toMemberId) {
      return NextResponse.json({ error: 'Cannot settle with yourself' }, { status: 400 });
    }

    // Verify members belong to group
    const members = await prisma.groupMember.findMany({
      where: {
        id: { in: [fromMemberId, toMemberId] },
        groupId: user.groupId
      }
    });

    if (members.length !== 2) {
      return NextResponse.json({ error: 'Invalid members' }, { status: 400 });
    }

    const fromMember = members.find(m => m.id === fromMemberId);
    const toMember = members.find(m => m.id === toMemberId);

    const updatedSettlement = await prisma.$transaction(async (tx) => {
      const updated = await tx.settlement.update({
        where: { id: params.id },
        data: {
          fromMemberId,
          toMemberId,
          amountCents
        },
        include: {
          fromMember: true,
          toMember: true
        }
      });

      await tx.activityLog.create({
        data: {
          groupId: user.groupId,
          type: 'settlement_edited',
          metadata: {
            settlementId: updated.id,
            from: fromMember?.displayName,
            to: toMember?.displayName,
            amountCents,
            editedBy: user.displayName
          }
        }
      });

      return updated;
    });

    return NextResponse.json({ settlement: updatedSettlement });
  } catch (error) {
    console.error('Update settlement error:', error);
    return NextResponse.json({ error: 'Failed to update settlement' }, { status: 500 });
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

    const settlement = await prisma.settlement.findUnique({
      where: { id: params.id },
      include: { fromMember: true, toMember: true }
    });

    if (!settlement || settlement.groupId !== user.groupId) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Create undo history entry BEFORE deleting (valid for 5 minutes)
      await tx.undoHistory.create({
        data: {
          groupId: user.groupId,
          memberId: user.id,
          actionType: 'settlement_deleted',
          entityType: 'settlement',
          entityId: null,
          entityData: {
            fromMemberId: settlement.fromMemberId,
            toMemberId: settlement.toMemberId,
            amountCents: settlement.amountCents,
            month: settlement.month,
            paymentMethod: settlement.paymentMethod,
            fromMemberName: settlement.fromMember?.displayName,
            toMemberName: settlement.toMember?.displayName
          },
          expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
        }
      });

      await tx.settlement.delete({
        where: { id: params.id }
      });

      await tx.activityLog.create({
        data: {
          groupId: user.groupId,
          type: 'settlement_deleted',
          metadata: {
            from: settlement.fromMember?.displayName,
            to: settlement.toMember?.displayName,
            amountCents: settlement.amountCents,
            deletedBy: user.displayName
          }
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete settlement error:', error);
    return NextResponse.json({ error: 'Failed to delete settlement' }, { status: 500 });
  }
}
