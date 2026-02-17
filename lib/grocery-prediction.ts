/**
 * SMART GROCERY USAGE PREDICTION ENGINE
 * ======================================
 * Predicts when grocery items will run out based on historical usage patterns.
 * 
 * Key Design Decisions:
 * - remainingQuantity is ALWAYS computed dynamically (never stored)
 * - Uses weighted average of last 3 usage records (0.5, 0.3, 0.2)
 * - All calculations use numeric precision to avoid floating drift
 */

import { prisma } from './db';

// Precision helper - rounds to 4 decimal places to avoid floating point drift
function precise(num: number): number {
  return Math.round(num * 10000) / 10000;
}

export interface GroceryItemWithPrediction {
  id: string;
  name: string;
  quantity: number;           // Initial quantity
  unit: string;
  purchaseDate: Date;
  status: 'active' | 'finished';
  
  // Computed predictions
  avgDailyUsage: number | null;
  remainingQuantity: number;  // Dynamically computed
  daysLeft: number | null;
  predictedFinishDate: Date | null;
  urgencyLevel: 'green' | 'yellow' | 'red' | 'unknown';
  isFinishingSoon: boolean;
}

export interface UsageHistoryRecord {
  id: string;
  itemName: string;
  quantity: number;
  daysUsed: number;
  avgDailyUsage: number;
  createdAt: Date;
}

export interface SmartSuggestion {
  itemName: string;
  daysLeft: number;
  predictedFinishDate: Date;
  message: string;
}

/**
 * Calculate weighted average usage from history records.
 * If 3+ records: weightedAvg = (recent * 0.5) + (previous * 0.3) + (older * 0.2)
 * If fewer records: use simple average
 */
export function calculateWeightedAverage(records: { avgDailyUsage: number }[]): number | null {
  if (records.length === 0) return null;
  
  if (records.length >= 3) {
    // Weighted average: most recent gets highest weight
    const weighted = 
      precise(records[0].avgDailyUsage * 0.5) +
      precise(records[1].avgDailyUsage * 0.3) +
      precise(records[2].avgDailyUsage * 0.2);
    return precise(weighted);
  } else {
    // Simple average for fewer records
    const sum = records.reduce((acc, r) => acc + r.avgDailyUsage, 0);
    return precise(sum / records.length);
  }
}

/**
 * Compute remaining quantity dynamically.
 * Formula: remaining = initialQuantity - (daysPassed × avgDailyUsage)
 * Clamps to 0 if negative.
 */
export function computeRemainingQuantity(
  initialQuantity: number,
  purchaseDate: Date,
  avgDailyUsage: number | null
): number {
  if (avgDailyUsage === null || avgDailyUsage <= 0) {
    return initialQuantity; // No usage data, assume full
  }
  
  const now = new Date();
  const daysPassed = Math.floor(
    (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const consumed = precise(daysPassed * avgDailyUsage);
  const remaining = precise(initialQuantity - consumed);
  
  return Math.max(0, remaining); // Clamp to 0
}

/**
 * Calculate days left and predicted finish date.
 */
export function calculatePrediction(
  remainingQuantity: number,
  avgDailyUsage: number | null
): { daysLeft: number | null; predictedFinishDate: Date | null } {
  if (avgDailyUsage === null || avgDailyUsage <= 0 || remainingQuantity <= 0) {
    return { daysLeft: null, predictedFinishDate: null };
  }
  
  const daysLeft = precise(remainingQuantity / avgDailyUsage);
  const predictedFinishDate = new Date();
  predictedFinishDate.setDate(predictedFinishDate.getDate() + Math.ceil(daysLeft));
  
  return { daysLeft, predictedFinishDate };
}

/**
 * Determine urgency level based on days left.
 * Green: > 4 days
 * Yellow: 2-4 days
 * Red: <= 2 days
 */
export function getUrgencyLevel(daysLeft: number | null): 'green' | 'yellow' | 'red' | 'unknown' {
  if (daysLeft === null) return 'unknown';
  if (daysLeft <= 2) return 'red';
  if (daysLeft <= 4) return 'yellow';
  return 'green';
}

/**
 * Fetch usage history for an item (last 3 records).
 */
export async function getUsageHistory(
  groupId: string,
  itemName: string,
  limit: number = 3
): Promise<UsageHistoryRecord[]> {
  const normalizedName = itemName.toLowerCase().trim();
  
  const records = await prisma.groceryUsageHistory.findMany({
    where: {
      groupId,
      itemName: normalizedName
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
  
  return records.map(r => ({
    id: r.id,
    itemName: r.itemName,
    quantity: r.quantity,
    daysUsed: r.daysUsed,
    avgDailyUsage: r.avgDailyUsage,
    createdAt: r.createdAt
  }));
}

/**
 * Get all active grocery items with predictions.
 */
export async function getGroceryItemsWithPredictions(
  groupId: string
): Promise<GroceryItemWithPrediction[]> {
  const items = await prisma.groceryItem.findMany({
    where: {
      groupId,
      status: 'active'
    },
    orderBy: { purchaseDate: 'desc' }
  });
  
  const results: GroceryItemWithPrediction[] = [];
  
  for (const item of items) {
    // Get historical usage for this item type
    const history = await getUsageHistory(groupId, item.name);
    const avgDailyUsage = history.length > 0 
      ? calculateWeightedAverage(history)
      : item.avgDailyUsage;
    
    // Compute remaining quantity dynamically
    const remainingQuantity = computeRemainingQuantity(
      item.quantity,
      item.purchaseDate,
      avgDailyUsage
    );
    
    // Calculate predictions
    const { daysLeft, predictedFinishDate } = calculatePrediction(
      remainingQuantity,
      avgDailyUsage
    );
    
    const urgencyLevel = getUrgencyLevel(daysLeft);
    const isFinishingSoon = daysLeft !== null && daysLeft <= 2;
    
    results.push({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      purchaseDate: item.purchaseDate,
      status: item.status as 'active' | 'finished',
      avgDailyUsage,
      remainingQuantity,
      daysLeft,
      predictedFinishDate,
      urgencyLevel,
      isFinishingSoon
    });
  }
  
  return results;
}

/**
 * Get smart suggestions for items finishing soon.
 */
export async function getSmartSuggestions(
  groupId: string
): Promise<SmartSuggestion[]> {
  const items = await getGroceryItemsWithPredictions(groupId);
  const suggestions: SmartSuggestion[] = [];
  
  for (const item of items) {
    if (item.isFinishingSoon && item.daysLeft !== null && item.predictedFinishDate !== null) {
      const daysText = item.daysLeft < 1 
        ? 'less than a day'
        : `about ${item.daysLeft.toFixed(1)} days`;
      
      suggestions.push({
        itemName: item.name,
        daysLeft: item.daysLeft,
        predictedFinishDate: item.predictedFinishDate,
        message: `${item.name} will likely finish in ${daysText}. Consider buying soon.`
      });
    }
  }
  
  // Sort by urgency (least days left first)
  suggestions.sort((a, b) => a.daysLeft - b.daysLeft);
  
  return suggestions;
}

/**
 * Handle buying a grocery item again (cycle reset).
 * If same item exists as active, close it and record usage history.
 */
export async function handleGroceryPurchase(
  groupId: string,
  name: string,
  quantity: number,
  unit: string
): Promise<{ newItem: any; previousItem: any | null; usageRecord: any | null }> {
  const normalizedName = name.toLowerCase().trim();
  
  // Check for existing active item with same name
  const existingItem = await prisma.groceryItem.findFirst({
    where: {
      groupId,
      name: { equals: normalizedName, mode: 'insensitive' },
      status: 'active'
    }
  });
  
  let usageRecord = null;
  let previousItem = null;
  
  if (existingItem) {
    // Calculate usage from the previous cycle
    const now = new Date();
    const daysUsed = Math.max(1, Math.ceil(
      (now.getTime() - existingItem.purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
    ));
    const avgDailyUsage = precise(existingItem.quantity / daysUsed);
    
    // Save usage history record
    usageRecord = await prisma.groceryUsageHistory.create({
      data: {
        groupId,
        itemName: normalizedName,
        quantity: existingItem.quantity,
        daysUsed,
        avgDailyUsage
      }
    });
    
    // Mark old item as finished
    previousItem = await prisma.groceryItem.update({
      where: { id: existingItem.id },
      data: { status: 'finished' }
    });
  }
  
  // Get updated prediction based on history
  const history = await getUsageHistory(groupId, normalizedName);
  const predictedAvgUsage = calculateWeightedAverage(history);
  
  // Calculate predicted finish date for new item
  let predictedFinishDate: Date | null = null;
  if (predictedAvgUsage !== null && predictedAvgUsage > 0) {
    const daysLeft = Math.ceil(quantity / predictedAvgUsage);
    predictedFinishDate = new Date();
    predictedFinishDate.setDate(predictedFinishDate.getDate() + daysLeft);
  }
  
  // Create new active grocery item
  const newItem = await prisma.groceryItem.create({
    data: {
      groupId,
      name: normalizedName,
      quantity,
      unit,
      purchaseDate: new Date(),
      status: 'active',
      avgDailyUsage: predictedAvgUsage,
      predictedFinishDate
    }
  });
  
  return { newItem, previousItem, usageRecord };
}

/**
 * Manually mark an item as finished.
 */
export async function markItemFinished(
  groupId: string,
  itemId: string
): Promise<{ item: any; usageRecord: any }> {
  const item = await prisma.groceryItem.findFirst({
    where: {
      id: itemId,
      groupId,
      status: 'active'
    }
  });
  
  if (!item) {
    throw new Error('Item not found or already finished');
  }
  
  // Calculate actual usage
  const now = new Date();
  const daysUsed = Math.max(1, Math.ceil(
    (now.getTime() - item.purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
  ));
  const avgDailyUsage = precise(item.quantity / daysUsed);
  
  // Save usage history
  const usageRecord = await prisma.groceryUsageHistory.create({
    data: {
      groupId,
      itemName: item.name.toLowerCase().trim(),
      quantity: item.quantity,
      daysUsed,
      avgDailyUsage
    }
  });
  
  // Mark item as finished
  const updatedItem = await prisma.groceryItem.update({
    where: { id: itemId },
    data: { status: 'finished' }
  });
  
  return { item: updatedItem, usageRecord };
}

/**
 * Update predictions for all active items in a group.
 * Called periodically or after usage history changes.
 */
export async function updateAllPredictions(groupId: string): Promise<void> {
  const activeItems = await prisma.groceryItem.findMany({
    where: {
      groupId,
      status: 'active'
    }
  });
  
  for (const item of activeItems) {
    const history = await getUsageHistory(groupId, item.name);
    const avgDailyUsage = calculateWeightedAverage(history);
    
    let predictedFinishDate: Date | null = null;
    if (avgDailyUsage !== null && avgDailyUsage > 0) {
      const remainingQuantity = computeRemainingQuantity(
        item.quantity,
        item.purchaseDate,
        avgDailyUsage
      );
      if (remainingQuantity > 0) {
        const daysLeft = Math.ceil(remainingQuantity / avgDailyUsage);
        predictedFinishDate = new Date();
        predictedFinishDate.setDate(predictedFinishDate.getDate() + daysLeft);
      }
    }
    
    await prisma.groceryItem.update({
      where: { id: item.id },
      data: {
        avgDailyUsage,
        predictedFinishDate
      }
    });
  }
}
