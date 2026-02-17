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

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category');
    const hasReceipt = searchParams.get('hasReceipt');
    const month = searchParams.get('month');
    const paidById = searchParams.get('paidById');

    // Build where clause
    const where: any = { groupId: user.groupId };

    if (month) {
      where.month = month;
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    if (hasReceipt === 'true') {
      where.billPhotoUrl = { not: null };
    }

    if (paidById) {
      where.paidById = paidById;
    }

    // Search in description, notes, and OCR text
    if (query) {
      where.OR = [
        { description: { contains: query, mode: 'insensitive' } },
        { notes: { contains: query, mode: 'insensitive' } },
        { receiptOcrText: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } }
      ];
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        paidBy: true,
        splits: { include: { member: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Limit results
    });

    // Also search settlements if query provided
    let settlements: any[] = [];
    if (query) {
      const settlementWhere: any = {
        groupId: user.groupId,
        OR: [
          { fromMember: { displayName: { contains: query, mode: 'insensitive' } } },
          { toMember: { displayName: { contains: query, mode: 'insensitive' } } },
          { paymentMethod: { contains: query, mode: 'insensitive' } }
        ]
      };

      if (month) {
        settlementWhere.month = month;
      }

      settlements = await prisma.settlement.findMany({
        where: settlementWhere,
        include: {
          fromMember: true,
          toMember: true
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
    }

    // Get receipts only (for gallery view)
    const receipts = expenses.filter(e => e.billPhotoUrl);

    return NextResponse.json({
      expenses,
      settlements,
      receipts,
      totalExpenses: expenses.length,
      totalSettlements: settlements.length,
      totalReceipts: receipts.length
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
  }
}
