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
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    const [expenses, settlements] = await Promise.all([
      prisma.expense.findMany({
        where: { groupId: user.groupId, month },
        include: {
          paidBy: true,
          splits: { include: { member: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.settlement.findMany({
        where: { groupId: user.groupId, month },
        include: { fromMember: true, toMember: true },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Build CSV content
    let csv = 'Type,Date,Description,Category,Amount (EUR),Paid By,Split Details,Notes,Payment Method\n';

    for (const expense of expenses) {
      const date = new Date(expense.createdAt).toLocaleDateString();
      const amount = (expense.amountCents / 100).toFixed(2);
      const splits = expense.splits.map(s => `${s.member.displayName}: €${(s.shareCents / 100).toFixed(2)}`).join('; ');
      const description = expense.description.replace(/,/g, ' ');
      const notes = (expense.notes || '').replace(/,/g, ' ');
      const category = expense.category || 'other';
      
      csv += `Expense,${date},"${description}",${category},${amount},${expense.paidBy.displayName},"${splits}","${notes}",\n`;
    }

    for (const settlement of settlements) {
      const date = new Date(settlement.createdAt).toLocaleDateString();
      const amount = (settlement.amountCents / 100).toFixed(2);
      const description = `${settlement.fromMember.displayName} paid ${settlement.toMember.displayName}`;
      const paymentMethod = settlement.paymentMethod || 'cash';
      
      csv += `Settlement,${date},"${description}",,${amount},${settlement.fromMember.displayName},,, ${paymentMethod}\n`;
    }

    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', `attachment; filename="expenses-${month}.csv"`);

    return new NextResponse(csv, { headers });
  } catch (error) {
    console.error('Export CSV error:', error);
    return NextResponse.json({ error: 'Failed to export CSV' }, { status: 500 });
  }
}
