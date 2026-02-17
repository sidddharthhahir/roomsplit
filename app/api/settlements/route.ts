export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { validateSettlement, computeGroupBalances } from '@/lib/balance';
import { sendPushToMember, formatNotificationAmount } from '@/lib/push-notifications';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    const where: Record<string, unknown> = { groupId: user.groupId };
    if (month) {
      where.month = month;
    }

    const settlements = await prisma.settlement.findMany({
      where,
      include: {
        fromMember: true,
        toMember: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ settlements });
  } catch (error) {
    console.error('Get settlements error:', error);
    return NextResponse.json({ error: 'Failed to get settlements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fromMemberId, toMemberId, amountCents, month, paymentMethod } = await request.json();

    if (!fromMemberId || !toMemberId || !amountCents || !month) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (amountCents <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
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

    // Prevent same person settlement
    if (fromMemberId === toMemberId) {
      return NextResponse.json({ error: 'Cannot settle with yourself' }, { status: 400 });
    }

    // SETTLEMENT VALIDATION - Ensure financial invariants are maintained
    const validation = await validateSettlement(user.groupId, fromMemberId, toMemberId, amountCents);
    if (!validation.valid) {
      console.warn(`[SETTLEMENT BLOCKED] ${validation.error}`, {
        groupId: user.groupId,
        fromMemberId,
        toMemberId,
        amountCents,
        ...validation
      });
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const fromMember = members.find(m => m.id === fromMemberId);
    const toMember = members.find(m => m.id === toMemberId);

    // Settlement validated - proceed with creation
    const settlement = await prisma.$transaction(async (tx) => {
      const newSettlement = await tx.settlement.create({
        data: {
          groupId: user.groupId,
          fromMemberId,
          toMemberId,
          amountCents,
          month,
          paymentMethod: paymentMethod || 'cash'
        },
        include: {
          fromMember: true,
          toMember: true
        }
      });

      await tx.activityLog.create({
        data: {
          groupId: user.groupId,
          type: 'settlement_recorded',
          metadata: {
            settlementId: newSettlement.id,
            from: fromMember?.displayName,
            to: toMember?.displayName,
            amountCents,
            recordedBy: user.displayName
          }
        }
      });

      // Create undo history entry (valid for 5 minutes)
      await tx.undoHistory.create({
        data: {
          groupId: user.groupId,
          memberId: user.id,
          actionType: 'settlement_added',
          entityType: 'settlement',
          entityId: newSettlement.id,
          entityData: {
            fromMemberId,
            toMemberId,
            amountCents,
            month,
            paymentMethod: paymentMethod || 'cash',
            fromMemberName: fromMember?.displayName,
            toMemberName: toMember?.displayName
          },
          expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
        }
      });

      return newSettlement;
    });

    // Send push notification to the person who received the payment
    if (toMemberId !== user.id) {
      sendPushToMember(toMemberId, {
        title: '💰 Payment Received!',
        body: `${settlement.fromMember?.displayName} paid you ${formatNotificationAmount(amountCents)}`,
        icon: '/favicon.svg',
        tag: `settlement-${settlement.id}`,
        data: { url: '/', tab: 'balances' }
      }).catch(err => console.error('Push notification error:', err));
    }

    return NextResponse.json({ settlement });
  } catch (error) {
    console.error('Create settlement error:', error);
    return NextResponse.json({ error: 'Failed to create settlement' }, { status: 500 });
  }
}