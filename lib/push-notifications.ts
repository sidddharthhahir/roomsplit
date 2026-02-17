import webpush from 'web-push';
import { prisma } from './db';

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:roomsplit@example.com',
    vapidPublicKey,
    vapidPrivateKey
  );
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    [key: string]: unknown;
  };
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

// Send push notification to a specific member
export async function sendPushToMember(memberId: string, payload: PushPayload): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { memberId }
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          JSON.stringify(payload)
        );
      } catch (error: unknown) {
        // If subscription is invalid, remove it
        if (error && typeof error === 'object' && 'statusCode' in error) {
          const statusCode = (error as { statusCode: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.delete({
              where: { id: sub.id }
            });
          }
        }
        throw error;
      }
    })
  );

  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    console.error(`Failed to send ${failed.length}/${subscriptions.length} notifications`);
  }
}

// Send push notification to all members in a group except the sender
export async function sendPushToGroup(
  groupId: string, 
  excludeMemberId: string, 
  payload: PushPayload
): Promise<void> {
  const members = await prisma.groupMember.findMany({
    where: { 
      groupId,
      id: { not: excludeMemberId }
    },
    select: { id: true }
  });

  await Promise.allSettled(
    members.map(member => sendPushToMember(member.id, payload))
  );
}

// Format currency for notifications
export function formatNotificationAmount(cents: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(cents / 100);
}
