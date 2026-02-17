export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, generateInviteCode } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const codes = await prisma.inviteCode.findMany({
      where: { groupId: user.groupId },
      orderBy: { createdAt: 'desc' }
    });

    // Get member names for used codes
    const usedByIds = codes.filter(c => c.usedBy).map(c => c.usedBy as string);
    const members = usedByIds.length > 0 ? await prisma.groupMember.findMany({
      where: { id: { in: usedByIds } },
      select: { id: true, displayName: true }
    }) : [];

    const memberMap = new Map(members.map(m => [m.id, m.displayName]));

    // Return codes with actual member names
    const codesWithNames = codes.map(code => ({
      ...code,
      usedByName: code.usedBy ? memberMap.get(code.usedBy) || null : null
    }));

    return NextResponse.json({ codes: codesWithNames });
  } catch (error) {
    console.error('Get codes error:', error);
    return NextResponse.json({ error: 'Failed to get codes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slotName } = await request.json();
    if (!slotName) {
      return NextResponse.json({ error: 'Slot name required' }, { status: 400 });
    }

    const code = await prisma.inviteCode.create({
      data: {
        code: generateInviteCode(),
        groupId: user.groupId,
        slotName
      }
    });

    return NextResponse.json({ code });
  } catch (error) {
    console.error('Create code error:', error);
    return NextResponse.json({ error: 'Failed to create code' }, { status: 500 });
  }
}