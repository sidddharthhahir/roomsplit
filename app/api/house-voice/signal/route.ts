export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import crypto from 'crypto';

const VALID_CATEGORIES = ['cleaning', 'noise', 'expenses', 'shared_space', 'fairness', 'other'];
const MAX_MESSAGE_LENGTH = 200;
const MAX_SIGNALS_PER_USER_PER_WEEK = 2;
const MAX_SIGNALS_PER_HOUSE_PER_WEEK = 4;
const SIGNAL_EXPIRY_DAYS = 30;

// Words that indicate targeting (not allowed for anonymity)
const TARGETING_WORDS = ['you', 'he', 'she', 'they', 'him', 'her', 'them', 'your', 'his', 'hers', 'their'];

// Words that indicate accusatory or sarcastic tone (blocked for emotional safety)
const BLOCKED_PHRASES = [
  'always', 'never', 'obviously', 'clearly', 'of course',
  'as usual', 'once again', 'as expected', 'surprise surprise',
  'some people', 'certain people', 'someone here'
];

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { category, message } = await request.json();

    // Validate category
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Validate message if provided
    if (message) {
      if (message.length > MAX_MESSAGE_LENGTH) {
        return NextResponse.json({ 
          error: `Message must be ${MAX_MESSAGE_LENGTH} characters or less` 
        }, { status: 400 });
      }

      // Check for targeting language
      const lowerMessage = message.toLowerCase();
      const hasTargeting = TARGETING_WORDS.some(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(lowerMessage);
      });

      if (hasTargeting) {
        return NextResponse.json({ 
          error: 'Please use neutral language without targeting specific people (avoid "you", "he", "she", etc.)' 
        }, { status: 400 });
      }

      // Check for names (fetch group members)
      const members = await prisma.groupMember.findMany({
        where: { groupId: user.groupId },
        select: { displayName: true }
      });

      const hasName = members.some(m => 
        lowerMessage.includes(m.displayName.toLowerCase())
      );

      if (hasName) {
        return NextResponse.json({ 
          error: 'Please do not mention specific names to maintain anonymity' 
        }, { status: 400 });
      }

      // Check for accusatory or sarcastic tone
      const hasBlockedPhrase = BLOCKED_PHRASES.some(phrase => 
        lowerMessage.includes(phrase.toLowerCase())
      );

      if (hasBlockedPhrase) {
        return NextResponse.json({ 
          error: 'Please use neutral, non-accusatory language. Avoid words like "always", "never", "obviously", etc.' 
        }, { status: 400 });
      }
    }

    // Generate anonymous hash from user ID + secret salt
    const salt = process.env.SIGNAL_HASH_SALT || 'roomsplit-anonymous-2024';
    const submitterHash = crypto
      .createHash('sha256')
      .update(`${user.id}:${salt}`)
      .digest('hex');

    // Check rate limits
    const weekStart = getWeekStart(new Date());
    
    // 1. User-level rate limit (max 2 signals per user per week)
    const userRateLimit = await prisma.signalRateLimit.findUnique({
      where: {
        groupId_submitterHash_weekStart: {
          groupId: user.groupId,
          submitterHash,
          weekStart
        }
      }
    });

    if (userRateLimit && userRateLimit.count >= MAX_SIGNALS_PER_USER_PER_WEEK) {
      return NextResponse.json({ 
        error: 'You can submit another house signal next week.' 
      }, { status: 429 });
    }

    // 2. House-level rate limit (max 4 signals per house per week)
    const houseSignalsThisWeek = await prisma.houseSignal.count({
      where: {
        groupId: user.groupId,
        createdAt: { gte: weekStart }
      }
    });

    if (houseSignalsThisWeek >= MAX_SIGNALS_PER_HOUSE_PER_WEEK) {
      return NextResponse.json({ 
        error: 'The house has reached its weekly signal limit. Try again next week.' 
      }, { status: 429 });
    }

    // Create signal and update rate limit in transaction
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SIGNAL_EXPIRY_DAYS);

    await prisma.$transaction(async (tx) => {
      // Create the signal
      await tx.houseSignal.create({
        data: {
          groupId: user.groupId,
          category,
          message: message?.trim() || null,
          submitterHash,
          expiresAt
        }
      });

      // Update rate limit
      await tx.signalRateLimit.upsert({
        where: {
          groupId_submitterHash_weekStart: {
            groupId: user.groupId,
            submitterHash,
            weekStart
          }
        },
        update: {
          count: { increment: 1 }
        },
        create: {
          groupId: user.groupId,
          submitterHash,
          weekStart,
          count: 1
        }
      });

      // Check for consensus (multiple signals in same category recently)
      await checkAndCreateConsensusNotice(tx, user.groupId, category);
    });

    return NextResponse.json({ 
      success: true,
      message: 'Signal submitted anonymously'
    });
  } catch (error) {
    console.error('Signal submission error:', error);
    return NextResponse.json({ error: 'Failed to submit signal' }, { status: 500 });
  }
}

// Get the start of the current week (Monday)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Check if multiple signals in same category warrant a consensus notice
async function checkAndCreateConsensusNotice(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  groupId: string,
  category: string
) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Count unique submitters for this category in the past week
  const recentSignals = await tx.houseSignal.findMany({
    where: {
      groupId,
      category,
      createdAt: { gte: oneWeekAgo }
    },
    select: { submitterHash: true }
  });

  // Get unique submitters
  const uniqueSubmitters = new Set(recentSignals.map(s => s.submitterHash));

  // If 2+ different people flagged the same category, create consensus notice
  if (uniqueSubmitters.size >= 2) {
    // Check if we already created a consensus notice for this category recently
    const existingNotice = await tx.houseVoicePost.findFirst({
      where: {
        groupId,
        type: 'consensus_notice',
        content: { contains: category },
        createdAt: { gte: oneWeekAgo }
      }
    });

    if (!existingNotice) {
      const categoryLabels: Record<string, string> = {
        cleaning: 'cleaning',
        noise: 'noise levels',
        expenses: 'expense management',
        shared_space: 'shared spaces',
        fairness: 'fairness',
        other: 'a house matter'
      };

      await tx.houseVoicePost.create({
        data: {
          groupId,
          type: 'consensus_notice',
          content: `🎙️ House Notice\n\nMultiple residents have flagged a concern about ${categoryLabels[category] || 'a house matter'}.\n\nThis is a gentle reminder to be mindful of shared living.`
        }
      });
    }
  }
}
