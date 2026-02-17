import { prisma } from './db';

export async function generateRecurringExpenseForMonth(
  recurringId: string,
  month: string,
  paidById: string
): Promise<void> {
  const recurring = await prisma.recurringExpense.findUnique({
    where: { id: recurringId },
    include: { group: { include: { members: true } } }
  });
  
  if (!recurring || !recurring.active) return;
  
  // Check if already generated for this month
  const existing = await prisma.expense.findFirst({
    where: {
      recurringId,
      month
    }
  });
  
  if (existing) return; // Already generated
  
  const splitConfig = recurring.splitConfig as { type: string; shares?: Record<string, number> };
  const members = recurring.group?.members ?? [];
  
  // Calculate splits
  let splits: { memberId: string; shareCents: number }[] = [];
  
  if (splitConfig?.type === 'equal') {
    const sharePerMember = Math.floor(recurring.amountCents / members.length);
    const remainder = recurring.amountCents - (sharePerMember * members.length);
    
    splits = members.map((m, idx) => ({
      memberId: m.id,
      shareCents: sharePerMember + (idx === 0 ? remainder : 0)
    }));
  } else if (splitConfig?.type === 'custom' && splitConfig.shares) {
    splits = Object.entries(splitConfig.shares).map(([memberId, cents]) => ({
      memberId,
      shareCents: cents as number
    }));
  }
  
  // Create expense with splits
  await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        groupId: recurring.groupId,
        description: `${recurring.name} - ${month}`,
        amountCents: recurring.amountCents,
        paidById,
        month,
        isRecurring: true,
        recurringId: recurring.id,
        splits: {
          create: splits
        }
      }
    });
    
    // Update last generated month
    await tx.recurringExpense.update({
      where: { id: recurringId },
      data: { lastGeneratedMonth: month }
    });
    
    // Log activity
    await tx.activityLog.create({
      data: {
        groupId: recurring.groupId,
        type: 'recurring_generated',
        metadata: {
          expenseId: expense.id,
          name: recurring.name,
          month,
          amountCents: recurring.amountCents
        }
      }
    });
  });
}

export function getNextMonth(currentMonth: string): string {
  const [year, month] = currentMonth.split('-').map(Number);
  if (month === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}