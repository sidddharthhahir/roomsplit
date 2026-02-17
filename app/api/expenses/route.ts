export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sendPushToGroup, formatNotificationAmount } from '@/lib/push-notifications';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    const where: any = { groupId: user.groupId };
    if (month) {
      where.month = month;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        paidBy: true,
        splits: { include: { member: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ expenses });
  } catch (error) {
    console.error('Get expenses error:', error);
    return NextResponse.json({ error: 'Failed to get expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { description, amountCents, paidById, month, splits, billPhotoUrl, billPhotoPath, category, notes, receiptOcrText } = body;

    if (!description || !amountCents || !paidById || !month || !splits || splits.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate splits sum to total
    const splitsTotal = splits.reduce((sum: number, s: any) => sum + (s?.shareCents ?? 0), 0);
    if (splitsTotal !== amountCents) {
      return NextResponse.json({ 
        error: `Split total (€${(splitsTotal/100).toFixed(2)}) must equal expense total (€${(amountCents/100).toFixed(2)})` 
      }, { status: 400 });
    }

    const expense = await prisma.$transaction(async (tx) => {
      const newExpense = await tx.expense.create({
        data: {
          groupId: user.groupId,
          description,
          amountCents,
          paidById,
          month,
          category: category || 'other',
          notes: notes || null,
          billPhotoUrl,
          billPhotoPath,
          receiptOcrText: receiptOcrText || null,
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
          type: 'expense_added',
          metadata: {
            expenseId: newExpense.id,
            description,
            amountCents,
            paidBy: newExpense.paidBy?.displayName,
            addedBy: user.displayName
          }
        }
      });

      // Create undo history entry (valid for 5 minutes)
      await tx.undoHistory.create({
        data: {
          groupId: user.groupId,
          memberId: user.id,
          actionType: 'expense_added',
          entityType: 'expense',
          entityId: newExpense.id,
          entityData: {
            description,
            amountCents,
            paidById,
            month,
            category: category || 'other',
            notes: notes || null,
            billPhotoUrl,
            billPhotoPath,
            splits: splits.map((s: any) => ({
              memberId: s.memberId,
              shareCents: s.shareCents
            }))
          },
          expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
        }
      });

      return newExpense;
    });

    // Send push notification to group members (don't await, fire and forget)
    sendPushToGroup(user.groupId, user.id, {
      title: '💸 New Expense Added',
      body: `${expense.paidBy?.displayName} paid ${formatNotificationAmount(amountCents)} for "${description}"`,
      icon: '/favicon.svg',
      tag: `expense-${expense.id}`,
      data: { url: '/', tab: 'expenses' }
    }).catch(err => console.error('Push notification error:', err));

    return NextResponse.json({ expense });
  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}