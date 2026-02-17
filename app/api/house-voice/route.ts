export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Signal categories with display info
const SIGNAL_CATEGORIES = {
  cleaning: { label: 'Cleaning', icon: '🧹' },
  noise: { label: 'Noise', icon: '🔊' },
  expenses: { label: 'Expenses', icon: '💰' },
  shared_space: { label: 'Shared Space', icon: '🛋️' },
  fairness: { label: 'Fairness', icon: '⚖️' },
  other: { label: 'Other', icon: '💬' }
};

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Fetch house voice posts (system-generated)
    const posts = await prisma.houseVoicePost.findMany({
      where: { groupId: user.groupId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Fetch active signals (not expired)
    const signals = await prisma.houseSignal.findMany({
      where: {
        groupId: user.groupId,
        expiresAt: { gt: now }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        category: true,
        message: true,
        createdAt: true
        // NOTE: submitterHash is NEVER returned to protect anonymity
      }
    });

    // Format signals with relative time (no exact timestamps)
    const formattedSignals = signals.map(s => ({
      id: s.id,
      category: s.category,
      categoryLabel: SIGNAL_CATEGORIES[s.category as keyof typeof SIGNAL_CATEGORIES]?.label || 'Other',
      categoryIcon: SIGNAL_CATEGORIES[s.category as keyof typeof SIGNAL_CATEGORIES]?.icon || '💬',
      message: s.message,
      timeAgo: getRelativeTime(s.createdAt) // "Submitted recently" style
    }));

    // Format posts
    const formattedPosts = posts.map(p => ({
      id: p.id,
      type: p.type,
      content: p.content,
      createdAt: p.createdAt.toISOString()
    }));

    return NextResponse.json({
      posts: formattedPosts,
      signals: formattedSignals,
      categories: SIGNAL_CATEGORIES
    });
  } catch (error) {
    console.error('House voice fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch house voice data' }, { status: 500 });
  }
}

// Anonymized relative time - never shows exact timestamps
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Submitted today';
  if (diffDays === 1) return 'Submitted yesterday';
  if (diffDays < 7) return 'Submitted this week';
  if (diffDays < 14) return 'Submitted last week';
  return 'Submitted recently';
}
