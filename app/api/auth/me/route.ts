export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
        groupId: user.groupId,
        groupName: user.group?.name
      }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}