import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

const ROOMMATE_NAMES = ['Sid', 'Akash', 'Rahul', 'Priya', 'Neha', 'Vikram'];

async function main() {
  console.log('Seeding database...');

  // Check if group already exists
  const existingGroup = await prisma.group.findFirst({
    where: { name: 'Apartment' }
  });

  if (existingGroup) {
    console.log('Group already exists, skipping seed.');
    return;
  }

  // Create the group
  const group = await prisma.group.create({
    data: {
      name: 'Apartment',
      currency: 'EUR'
    }
  });
  console.log('Created group:', group.name);

  // Create admin member (first roommate is admin)
  const admin = await prisma.groupMember.create({
    data: {
      groupId: group.id,
      displayName: ROOMMATE_NAMES[0],
      isAdmin: true
    }
  });
  console.log('Created admin member:', admin.displayName);

  // Create invite codes for remaining members
  for (let i = 1; i < ROOMMATE_NAMES.length; i++) {
    const code = await prisma.inviteCode.create({
      data: {
        code: generateInviteCode(),
        groupId: group.id,
        slotName: ROOMMATE_NAMES[i]
      }
    });
    console.log(`Created invite code for ${ROOMMATE_NAMES[i]}: ${code.code}`);
  }

  // Mark admin's slot as used (admin is pre-joined)
  // Actually, admin doesn't need an invite code since they're the first member
  // Let's create a session token for admin so they can log in
  const adminToken = crypto.randomBytes(32).toString('hex');
  await prisma.groupMember.update({
    where: { id: admin.id },
    data: { sessionToken: adminToken }
  });
  console.log('\n=== ADMIN LOGIN INFO ===');
  console.log('Admin Name:', admin.displayName);
  console.log('Admin Session Token:', adminToken);
  console.log('\nTo log in as admin, set this cookie:');
  console.log(`session_token=${adminToken}`);
  console.log('========================\n');

  // Log activity
  await prisma.activityLog.create({
    data: {
      groupId: group.id,
      type: 'member_joined',
      metadata: {
        memberId: admin.id,
        displayName: admin.displayName,
        slotName: ROOMMATE_NAMES[0]
      }
    }
  });

  console.log('\nSeeding complete!');
  console.log('\nInvite codes for roommates:');
  const codes = await prisma.inviteCode.findMany({
    where: { groupId: group.id }
  });
  for (const code of codes) {
    console.log(`  ${code.slotName}: ${code.code}`);
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });