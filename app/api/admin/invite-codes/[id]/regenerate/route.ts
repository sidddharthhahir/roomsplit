export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, generateInviteCode } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingCode = await prisma.inviteCode.findUnique({
      where: { id: params.id }
    });

    if (!existingCode || existingCode.groupId !== user.groupId) {
      return NextResponse.json({ error: 'Code not found' }, { status: 404 });
    }

    if (existingCode.used) {
      return NextResponse.json({ error: 'Cannot regenerate used code' }, { status: 400 });
    }

    const updatedCode = await prisma.inviteCode.update({
      where: { id: params.id },
      data: { code: generateInviteCode() }
    });

    return NextResponse.json({ code: updatedCode });
  } catch (error) {
    console.error('Regenerate code error:', error);
    return NextResponse.json({ error: 'Failed to regenerate code' }, { status: 500 });
  }
}