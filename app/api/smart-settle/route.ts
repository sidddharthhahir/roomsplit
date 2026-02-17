export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { calculateBalances, computeSmartSettle } from '@/lib/balance';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const balances = await calculateBalances(user.groupId);
    const suggestions = computeSmartSettle(balances);

    return NextResponse.json({ suggestions, balances });
  } catch (error) {
    console.error('Smart settle error:', error);
    return NextResponse.json({ error: 'Failed to compute settlements' }, { status: 500 });
  }
}