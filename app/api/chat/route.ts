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
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before'); // cursor for pagination

    const where: any = { groupId: user.groupId };
    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      include: {
        member: {
          select: { id: true, displayName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // Reverse to show oldest first
    return NextResponse.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Get chat messages error:', error);
    return NextResponse.json({ error: 'Failed to get messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, mentions } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: 'Message too long (max 1000 chars)' }, { status: 400 });
    }

    const message = await prisma.chatMessage.create({
      data: {
        groupId: user.groupId,
        memberId: user.id,
        content: content.trim(),
        mentions: mentions || []
      },
      include: {
        member: {
          select: { id: true, displayName: true }
        }
      }
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Create chat message error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
