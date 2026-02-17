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

    // Get the most recent undoable action for this user (not expired)
    const ownUndoAction = await prisma.undoHistory.findFirst({
      where: {
        groupId: user.groupId,
        memberId: user.id,
        canUndo: true,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (ownUndoAction) {
      return NextResponse.json({ 
        undoAction: { ...ownUndoAction, isOwn: true } 
      });
    }

    // If no own undo action, check for recent group-wide action (to show "Added by X · Locked")
    const groupUndoAction = await prisma.undoHistory.findFirst({
      where: {
        groupId: user.groupId,
        canUndo: true,
        expiresAt: { gt: new Date() }
      },
      include: {
        member: { select: { displayName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (groupUndoAction) {
      return NextResponse.json({ 
        undoAction: {
          ...groupUndoAction,
          isOwn: false,
          creatorName: groupUndoAction.member?.displayName || 'Someone'
        }
      });
    }

    return NextResponse.json({ undoAction: null });
  } catch (error) {
    console.error('Get undo action error:', error);
    return NextResponse.json({ error: 'Failed to get undo action' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { undoId } = await request.json();

    if (!undoId) {
      return NextResponse.json({ error: 'Missing undo ID' }, { status: 400 });
    }

    const undoAction = await prisma.undoHistory.findFirst({
      where: {
        id: undoId,
        groupId: user.groupId,
        memberId: user.id,
        canUndo: true,
        expiresAt: { gt: new Date() }
      }
    });

    if (!undoAction) {
      return NextResponse.json({ error: 'Undo action not found or expired' }, { status: 404 });
    }

    const entityData = undoAction.entityData as any;

    await prisma.$transaction(async (tx) => {
      // Handle different action types
      if (undoAction.actionType === 'expense_added' && undoAction.entityId) {
        // Undo expense creation - delete it
        await tx.expense.delete({ where: { id: undoAction.entityId } });
        
        await tx.activityLog.create({
          data: {
            groupId: user.groupId,
            type: 'expense_undone',
            metadata: {
              description: entityData.description,
              amountCents: entityData.amountCents,
              undoneBy: user.displayName
            }
          }
        });
      } else if (undoAction.actionType === 'expense_deleted') {
        // Undo expense deletion - recreate it
        const newExpense = await tx.expense.create({
          data: {
            groupId: user.groupId,
            description: entityData.description,
            amountCents: entityData.amountCents,
            paidById: entityData.paidById,
            month: entityData.month,
            category: entityData.category || 'other',
            notes: entityData.notes,
            billPhotoUrl: entityData.billPhotoUrl,
            billPhotoPath: entityData.billPhotoPath,
            isRecurring: entityData.isRecurring || false,
            recurringId: entityData.recurringId
          }
        });

        // Recreate splits
        if (entityData.splits && entityData.splits.length > 0) {
          await tx.expenseSplit.createMany({
            data: entityData.splits.map((s: any) => ({
              expenseId: newExpense.id,
              memberId: s.memberId,
              shareCents: s.shareCents
            }))
          });
        }

        await tx.activityLog.create({
          data: {
            groupId: user.groupId,
            type: 'expense_restored',
            metadata: {
              description: entityData.description,
              amountCents: entityData.amountCents,
              restoredBy: user.displayName
            }
          }
        });
      } else if (undoAction.actionType === 'settlement_added' && undoAction.entityId) {
        // Undo settlement creation - delete it
        await tx.settlement.delete({ where: { id: undoAction.entityId } });
        
        await tx.activityLog.create({
          data: {
            groupId: user.groupId,
            type: 'settlement_undone',
            metadata: {
              amountCents: entityData.amountCents,
              from: entityData.fromMemberName,
              to: entityData.toMemberName,
              undoneBy: user.displayName
            }
          }
        });
      } else if (undoAction.actionType === 'settlement_deleted') {
        // Undo settlement deletion - recreate it
        await tx.settlement.create({
          data: {
            groupId: user.groupId,
            fromMemberId: entityData.fromMemberId,
            toMemberId: entityData.toMemberId,
            amountCents: entityData.amountCents,
            month: entityData.month,
            paymentMethod: entityData.paymentMethod || 'cash'
          }
        });

        await tx.activityLog.create({
          data: {
            groupId: user.groupId,
            type: 'settlement_restored',
            metadata: {
              amountCents: entityData.amountCents,
              from: entityData.fromMemberName,
              to: entityData.toMemberName,
              restoredBy: user.displayName
            }
          }
        });
      }

      // Mark as undone
      await tx.undoHistory.update({
        where: { id: undoId },
        data: { canUndo: false }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Undo action error:', error);
    return NextResponse.json({ error: 'Failed to undo action' }, { status: 500 });
  }
}
