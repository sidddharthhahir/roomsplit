export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Secure admin login endpoint requiring password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // Find the admin member with group
    const admin = await prisma.groupMember.findFirst({
      where: { isAdmin: true },
      include: { group: true }
    });

    if (!admin || !admin.group) {
      return NextResponse.json({ error: 'No admin found' }, { status: 404 });
    }

    // Check if admin password is set
    if (!admin.group.adminPassword) {
      return NextResponse.json({ error: 'Admin password not configured' }, { status: 403 });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.group.adminPassword);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Generate a session token if not exists
    let sessionToken = admin.sessionToken;
    if (!sessionToken) {
      const crypto = await import('crypto');
      sessionToken = crypto.randomBytes(32).toString('hex');
      await prisma.groupMember.update({
        where: { id: admin.id },
        data: { sessionToken }
      });
    }

    const response = NextResponse.json({
      success: true,
      member: {
        id: admin.id,
        displayName: admin.displayName,
        isAdmin: admin.isAdmin,
        groupId: admin.groupId
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
    console.error('Admin login error:', error);
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
  }
}