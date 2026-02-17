export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { computeGroupBalances, computeSmartSettle } from '@/lib/balance';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [balanceResult, group] = await Promise.all([
      computeGroupBalances(user.groupId),
      prisma.group.findUnique({
        where: { id: user.groupId },
        select: { simplifyDebts: true }
      })
    ]);

    const { balances, invariantValid, sumOfBalances } = balanceResult;
    const simplifyDebts = group?.simplifyDebts ?? false;
    
    // When simplifyDebts is enabled, also return the simplified settlement suggestions
    const simplifiedDebts = simplifyDebts ? computeSmartSettle(balances) : [];

    // Include invariant status for debugging (only visible in response, not displayed to users)
    return NextResponse.json({ 
      balances, 
      simplifyDebts, 
      simplifiedDebts,
      _debug: {
        invariantValid,
        sumOfBalances
      }
    });
  } catch (error) {
    console.error('Get balances error:', error);
    return NextResponse.json({ error: 'Failed to get balances' }, { status: 500 });
  }
}