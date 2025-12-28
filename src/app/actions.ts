'use server';

import { visualizeSpendingHabits } from '@/ai/flows/visualize-spending-habits';
import type { Transaction } from '@/lib/types';

export async function generateInsights(transactions: Transaction[]): Promise<string> {
  const expenseData = transactions.filter(t => t.type === 'expense');

  if (expenseData.length === 0) {
    return 'Not enough expense data to generate insights. Please add some expenses first.';
  }

  try {
    const result = await visualizeSpendingHabits({
      expenseData: JSON.stringify(expenseData),
    });
    return result.visualization;
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return 'An error occurred while analyzing your spending habits. Please try again later.';
  }
}
