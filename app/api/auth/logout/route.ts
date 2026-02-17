export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getCurrentUser, destroySession } from '@/lib/auth';

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (user) {
      await destroySession(user.id);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete('session_token');
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ success: true });
  }
}