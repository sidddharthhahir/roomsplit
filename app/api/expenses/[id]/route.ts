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

    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
      include: { splits: true }
    });

    if (!expense || expense.groupId !== user.groupId) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    if (expense.isRecurring) {
      return NextResponse.json({ error: 'Cannot edit recurring expenses' }, { status: 400 });
    }

    const body = await request.json();
    const { description, amountCents, paidById, splits, category, notes } = body;

    if (!description || !amountCents || !paidById || !splits || splits.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate splits sum to total
    const splitsTotal = splits.reduce((sum: number, s: any) => sum + (s?.shareCents ?? 0), 0);
    if (splitsTotal !== amountCents) {
      return NextResponse.json({ 
        error: `Split total must equal expense total` 
      }, { status: 400 });
    }

    const updatedExpense = await prisma.$transaction(async (tx) => {
      // Delete old splits
      await tx.expenseSplit.deleteMany({
        where: { expenseId: params.id }
      });

      // Update expense with new splits
      const updated = await tx.expense.update({
        where: { id: params.id },
        data: {
          description,
          amountCents,
          paidById,
          category: category || 'other',
          notes: notes || null,
          splits: {
            create: splits.map((s: any) => ({
              memberId: s.memberId,
              shareCents: s.shareCents
            }))
          }
        },
        include: {
          paidBy: true,
          splits: { include: { member: true } }
        }
      });

      await tx.activityLog.create({
        data: {
          groupId: user.groupId,
          type: 'expense_edited',
          metadata: {
            expenseId: updated.id,
            description,
            amountCents,
            editedBy: user.displayName
          }
        }
      });

      return updated;
    });

    return NextResponse.json({ expense: updatedExpense });
  } catch (error) {
    console.error('Update expense error:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
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

    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
      include: { splits: true, paidBy: true }
    });

    if (!expense || expense.groupId !== user.groupId) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Create undo history entry BEFORE deleting (valid for 5 minutes)
      await tx.undoHistory.create({
        data: {
          groupId: user.groupId,
          memberId: user.id,
          actionType: 'expense_deleted',
          entityType: 'expense',
          entityId: null,
          entityData: {
            description: expense.description,
            amountCents: expense.amountCents,
            paidById: expense.paidById,
            month: expense.month,
            category: expense.category,
            notes: expense.notes,
            billPhotoUrl: expense.billPhotoUrl,
            billPhotoPath: expense.billPhotoPath,
            isRecurring: expense.isRecurring,
            recurringId: expense.recurringId,
            splits: expense.splits.map(s => ({
              memberId: s.memberId,
              shareCents: s.shareCents
            }))
          },
          expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
        }
      });

      await tx.expense.delete({
        where: { id: params.id }
      });

      await tx.activityLog.create({
        data: {
          groupId: user.groupId,
          type: 'expense_deleted',
          metadata: {
            description: expense.description,
            amountCents: expense.amountCents,
            deletedBy: user.displayName
          }
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete expense error:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}