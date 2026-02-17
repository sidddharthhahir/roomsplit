import { prisma } from './db';

/**
 * Get the current period boundaries based on frequency
 * Weekly: Monday 00:00 to Sunday 23:59
 * Biweekly: Every other Monday
 */
export function getCurrentPeriod(frequency: string): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const periodStart = new Date(now);
  periodStart.setDate(now.getDate() + mondayOffset);
  periodStart.setHours(0, 0, 0, 0);
  
  const periodDays = frequency === 'biweekly' ? 14 : 7;
  
  // For biweekly, calculate which week we're in based on epoch
  if (frequency === 'biweekly') {
    const epoch = new Date('2024-01-01'); // Reference Monday
    const weeksSinceEpoch = Math.floor((periodStart.getTime() - epoch.getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (weeksSinceEpoch % 2 !== 0) {
      periodStart.setDate(periodStart.getDate() - 7);
    }
  }
  
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodStart.getDate() + periodDays - 1);
  periodEnd.setHours(23, 59, 59, 999);
  
  return { start: periodStart, end: periodEnd };
}

/**
 * Get deterministic rotation order of members (sorted by join date, then ID)
 */
export async function getMemberRotationOrder(groupId: string): Promise<{ id: string; displayName: string }[]> {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { id: true, displayName: true, joinedAt: true },
    orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }]
  });
  return members;
}

/**
 * Ensure assignment exists for current period, creating one if needed
 * This is the core rotation logic
 */
export async function ensureCurrentAssignment(choreId: string, groupId: string): Promise<{
  id: string;
  assignedTo: { id: string; displayName: string; avatarUrl: string | null };
  periodStart: Date;
  periodEnd: Date;
  completedAt: Date | null;
} | null> {
  const chore = await prisma.chore.findUnique({
    where: { id: choreId },
    include: { rotationState: true }
  });
  
  if (!chore || !chore.active) return null;
  
  const { start, end } = getCurrentPeriod(chore.frequency);
  
  // Check if assignment already exists for this period
  const existingAssignment = await prisma.choreAssignment.findFirst({
    where: {
      choreId,
      periodStart: start,
      periodEnd: end
    },
    include: {
      assignedTo: { select: { id: true, displayName: true, avatarUrl: true } }
    }
  });
  
  if (existingAssignment) {
    return existingAssignment;
  }
  
  // Need to create new assignment - get members and rotation state
  const members = await getMemberRotationOrder(groupId);
  if (members.length === 0) return null;
  
  let currentIndex = chore.rotationState?.currentIndex ?? 0;
  
  // Ensure index is within bounds
  currentIndex = currentIndex % members.length;
  
  const assignedMember = members[currentIndex];
  
  // Create the assignment
  const assignment = await prisma.choreAssignment.create({
    data: {
      choreId,
      assignedToId: assignedMember.id,
      periodStart: start,
      periodEnd: end
    },
    include: {
      assignedTo: { select: { id: true, displayName: true, avatarUrl: true } }
    }
  });
  
  // Update rotation state for next period
  const nextIndex = (currentIndex + 1) % members.length;
  
  await prisma.choreRotationState.upsert({
    where: { choreId },
    create: {
      groupId,
      choreId,
      currentIndex: nextIndex
    },
    update: {
      currentIndex: nextIndex
    }
  });
  
  return assignment;
}

/**
 * Get all current assignments for a group with rotation ensured
 */
export async function getCurrentAssignments(groupId: string): Promise<Array<{
  chore: { id: string; name: string; icon: string; frequency: string };
  assignment: {
    id: string;
    assignedTo: { id: string; displayName: string; avatarUrl: string | null };
    periodStart: Date;
    periodEnd: Date;
    completedAt: Date | null;
  } | null;
}>> {
  const chores = await prisma.chore.findMany({
    where: { groupId, active: true },
    orderBy: { name: 'asc' }
  });
  
  const results = [];
  
  for (const chore of chores) {
    const assignment = await ensureCurrentAssignment(chore.id, groupId);
    results.push({
      chore: {
        id: chore.id,
        name: chore.name,
        icon: chore.icon,
        frequency: chore.frequency
      },
      assignment
    });
  }
  
  return results;
}

/**
 * Format period as readable string
 */
export function formatPeriod(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', options);
  const endStr = end.toLocaleDateString('en-US', options);
  return `${startStr} - ${endStr}`;
}
