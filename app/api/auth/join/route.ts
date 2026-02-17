export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { code, displayName } = await request.json();

    if (!code || !displayName) {
      return NextResponse.json({ error: 'Code and display name required' }, { status: 400 });
    }

    // Find the invite code
    const inviteCode = await prisma.inviteCode.findUnique({
      where: { code: code.toUpperCase() },
      include: { group: true }
    });

    if (!inviteCode) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    // If code is already used, check if this is the same user trying to re-login
    if (inviteCode.used && inviteCode.usedBy) {
      const existingMember = await prisma.groupMember.findUnique({
        where: { id: inviteCode.usedBy }
      });

      if (existingMember) {
        // Allow re-login: verify the name matches (case-insensitive)
        const nameMatches = existingMember.displayName.toLowerCase().trim() === displayName.toLowerCase().trim();
        
        if (nameMatches) {
          // Re-authenticate the existing user
          const sessionToken = await createSession(existingMember.id);

          const response = NextResponse.json({
            success: true,
            member: {
              id: existingMember.id,
              displayName: existingMember.displayName,
              isAdmin: existingMember.isAdmin,
              groupId: existingMember.groupId
            },
            relogin: true
          });

          response.cookies.set('session_token', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30 // 30 days
          });

          return response;
        } else {
          // Name doesn't match - this code belongs to someone else
          return NextResponse.json({ 
            error: 'This code belongs to another member. Please use your own invite code.' 
          }, { status: 400 });
        }
      }
    }

    if (inviteCode.used) {
      return NextResponse.json({ error: 'This code has already been used' }, { status: 400 });
    }

    // Create the member and mark code as used
    const member = await prisma.$transaction(async (tx) => {
      const newMember = await tx.groupMember.create({
        data: {
          groupId: inviteCode.groupId,
          displayName: displayName.trim(),
          isAdmin: false
        }
      });

      await tx.inviteCode.update({
        where: { id: inviteCode.id },
        data: { used: true, usedBy: newMember.id }
      });

      await tx.activityLog.create({
        data: {
          groupId: inviteCode.groupId,
          type: 'member_joined',
          metadata: {
            memberId: newMember.id,
            displayName: newMember.displayName,
            slotName: inviteCode.slotName
          }
        }
      });

      return newMember;
    });

    const sessionToken = await createSession(member.id);

    const response = NextResponse.json({
      success: true,
      member: {
        id: member.id,
        displayName: member.displayName,
        isAdmin: member.isAdmin,
        groupId: member.groupId
      }
    });

    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    });

    return response;
  } catch (error) {
    console.error('Join error:', error);
    return NextResponse.json({ error: 'Failed to join group' }, { status: 500 });
  }
}