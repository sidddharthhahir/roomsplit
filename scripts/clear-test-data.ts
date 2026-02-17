import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearTestData() {
  console.log('🧹 Clearing all test data (keeping users)...\n');

  try {
    // Delete in order of dependencies (child tables first)
    
    // 1. Undo History
    const undoCount = await prisma.undoHistory.deleteMany({});
    console.log(`  ✓ Deleted ${undoCount.count} undo history entries`);

    // 2. Activity Logs
    const activityCount = await prisma.activityLog.deleteMany({});
    console.log(`  ✓ Deleted ${activityCount.count} activity logs`);

    // 3. Chat Messages
    const chatCount = await prisma.chatMessage.deleteMany({});
    console.log(`  ✓ Deleted ${chatCount.count} chat messages`);

    // 4. Shopping Items
    const shoppingCount = await prisma.shoppingItem.deleteMany({});
    console.log(`  ✓ Deleted ${shoppingCount.count} shopping items`);

    // 5. Chore Assignments
    const choreAssignCount = await prisma.choreAssignment.deleteMany({});
    console.log(`  ✓ Deleted ${choreAssignCount.count} chore assignments`);

    // 6. Chore Rotation States
    const choreRotationCount = await prisma.choreRotationState.deleteMany({});
    console.log(`  ✓ Deleted ${choreRotationCount.count} chore rotation states`);

    // 7. Chores
    const choreCount = await prisma.chore.deleteMany({});
    console.log(`  ✓ Deleted ${choreCount.count} chores`);

    // 8. Expense Splits (must delete before expenses)
    const splitCount = await prisma.expenseSplit.deleteMany({});
    console.log(`  ✓ Deleted ${splitCount.count} expense splits`);

    // 9. Expenses
    const expenseCount = await prisma.expense.deleteMany({});
    console.log(`  ✓ Deleted ${expenseCount.count} expenses`);

    // 10. Settlements
    const settlementCount = await prisma.settlement.deleteMany({});
    console.log(`  ✓ Deleted ${settlementCount.count} settlements`);

    // 11. Recurring Expenses
    const recurringCount = await prisma.recurringExpense.deleteMany({});
    console.log(`  ✓ Deleted ${recurringCount.count} recurring expenses`);

    // 12. Push Subscriptions
    const pushCount = await prisma.pushSubscription.deleteMany({});
    console.log(`  ✓ Deleted ${pushCount.count} push subscriptions`);

    // 13. Budget (optional - keep if you want)
    const budgetCount = await prisma.budget.deleteMany({});
    console.log(`  ✓ Deleted ${budgetCount.count} budgets`);

    console.log('\n✅ All test data cleared successfully!');
    console.log('   Users and invite codes preserved.\n');

    // Show remaining users
    const members = await prisma.groupMember.findMany({
      select: { displayName: true, isAdmin: true }
    });
    console.log('📋 Remaining Users:');
    members.forEach(m => {
      console.log(`   - ${m.displayName}${m.isAdmin ? ' (Admin)' : ''}`);
    });

  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearTestData();
