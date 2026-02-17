export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// PATCH - Mark assignment as complete (own assignment only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Find the assignment and verify ownership
    const assignment = await prisma.choreAssignment.findFirst({
      where: { id },
      include: { chore: true }
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Verify the assignment belongs to the user's group
    if (assignment.chore.groupId !== user.groupId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Only the assigned member can mark as complete
    if (assignment.assignedToId !== user.id) {
      return NextResponse.json({ error: 'Only the assigned member can mark as complete' }, { status: 403 });
    }

    // Toggle completion status
    const updatedAssignment = await prisma.choreAssignment.update({
      where: { id },
      data: {
        completedAt: assignment.completedAt ? null : new Date()
      },
      include: {
        assignedTo: { select: { id: true, displayName: true, avatarUrl: true } }
      }
    });

    return NextResponse.json({ assignment: updatedAssignment });
  } catch (error) {
    console.error('Complete assignment error:', error);
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
  }
}
