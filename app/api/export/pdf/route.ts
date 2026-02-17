export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { formatCents, formatMonth } from '@/lib/format';
import { calculateBalances } from '@/lib/balance';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { month } = await request.json();
    if (!month) {
      return NextResponse.json({ error: 'Month required' }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { id: user.groupId }
    });

    const expenses = await prisma.expense.findMany({
      where: {
        groupId: user.groupId,
        month
      },
      include: {
        paidBy: true,
        splits: { include: { member: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    const settlements = await prisma.settlement.findMany({
      where: {
        groupId: user.groupId,
        month
      },
      include: {
        fromMember: true,
        toMember: true
      }
    });

    const balances = await calculateBalances(user.groupId);

    const totalExpense = expenses.reduce((sum, e) => sum + (e?.amountCents ?? 0), 0);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #0d9488; margin-bottom: 5px; }
          h2 { color: #666; font-size: 18px; margin-top: 30px; border-bottom: 2px solid #0d9488; padding-bottom: 5px; }
          .subtitle { color: #666; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
          th { background: #f8f9fa; font-weight: 600; }
          .total { font-weight: bold; background: #f0fdfa; }
          .amount { text-align: right; font-family: monospace; }
          .positive { color: #059669; }
          .negative { color: #dc2626; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>${group?.name ?? 'Group'}</h1>
        <p class="subtitle">Expense Report for ${formatMonth(month)}</p>
        
        <h2>Expenses</h2>
        <table>
          <tr>
            <th>Description</th>
            <th>Paid By</th>
            <th class="amount">Amount</th>
          </tr>
          ${expenses.map(e => `
            <tr>
              <td>${e?.description ?? ''}</td>
              <td>${e?.paidBy?.displayName ?? ''}</td>
              <td class="amount">${formatCents(e?.amountCents ?? 0)}</td>
            </tr>
          `).join('')}
          <tr class="total">
            <td colspan="2">Total</td>
            <td class="amount">${formatCents(totalExpense)}</td>
          </tr>
        </table>

        ${settlements.length > 0 ? `
          <h2>Settlements</h2>
          <table>
            <tr>
              <th>From</th>
              <th>To</th>
              <th class="amount">Amount</th>
            </tr>
            ${settlements.map(s => `
              <tr>
                <td>${s?.fromMember?.displayName ?? ''}</td>
                <td>${s?.toMember?.displayName ?? ''}</td>
                <td class="amount">${formatCents(s?.amountCents ?? 0)}</td>
              </tr>
            `).join('')}
          </table>
        ` : ''}

        <h2>Current Balances</h2>
        <table>
          <tr>
            <th>Member</th>
            <th class="amount">Balance</th>
          </tr>
          ${balances.map(b => `
            <tr>
              <td>${b.displayName}</td>
              <td class="amount ${b.netBalance >= 0 ? 'positive' : 'negative'}">
                ${b.netBalance >= 0 ? '+' : ''}${formatCents(b.netBalance)}
              </td>
            </tr>
          `).join('')}
        </table>

        <div class="footer">
          Generated on ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </body>
      </html>
    `;

    // Generate PDF using HTML2PDF API
    const createResponse = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        html_content: html,
        pdf_options: { format: 'A4', margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } }
      })
    });

    if (!createResponse.ok) {
      return NextResponse.json({ error: 'Failed to create PDF request' }, { status: 500 });
    }

    const { request_id } = await createResponse.json();
    if (!request_id) {
      return NextResponse.json({ error: 'No request ID' }, { status: 500 });
    }

    // Poll for completion
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(r => setTimeout(r, 1000));

      const statusResponse = await fetch('https://apps.abacus.ai/api/getConvertHtmlToPdfStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id, deployment_token: process.env.ABACUSAI_API_KEY })
      });

      const statusResult = await statusResponse.json();
      const status = statusResult?.status ?? 'FAILED';

      if (status === 'SUCCESS' && statusResult?.result?.result) {
        const pdfBuffer = Buffer.from(statusResult.result.result, 'base64');
        return new NextResponse(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${group?.name ?? 'expenses'}-${month}.pdf"`
          }
        });
      } else if (status === 'FAILED') {
        return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
      }

      attempts++;
    }

    return NextResponse.json({ error: 'PDF generation timed out' }, { status: 500 });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json({ error: 'Failed to export PDF' }, { status: 500 });
  }
}