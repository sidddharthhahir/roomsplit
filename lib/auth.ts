import { cookies } from 'next/headers';
import { prisma } from './db';
import crypto from 'crypto';

export async function generateSessionToken(): Promise<string> {
  return crypto.randomBytes(32).toString('hex');
}

export async function getCurrentUser() {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    
    if (!sessionToken) return null;
    
    const member = await prisma.groupMember.findUnique({
      where: { sessionToken },
      include: { group: true }
    });
    
    return member;
  } catch {
    return null;
  }
}

export async function createSession(memberId: string): Promise<string> {
  const token = await generateSessionToken();
  
  await prisma.groupMember.update({
    where: { id: memberId },
    data: { sessionToken: token }
  });
  
  return token;
}

export async function destroySession(memberId: string): Promise<void> {
  await prisma.groupMember.update({
    where: { id: memberId },
    data: { sessionToken: null }
  });
}

export function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}