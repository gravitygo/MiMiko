import * as Crypto from 'expo-crypto';
import type { CreateRecurringRuleInput, RecurringFrequency, RecurringRule } from './recurring.types';

export function createRecurringRule(input: CreateRecurringRuleInput): RecurringRule {
  const now = new Date().toISOString();

  return {
    id: Crypto.randomUUID(),
    name: input.name,
    type: input.type,
    amount: input.amount,
    description: input.description ?? null,
    categoryId: input.categoryId,
    accountId: input.accountId,
    frequency: input.frequency,
    nextDate: input.nextDate,
    endDate: input.endDate ?? null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function calculateNextDate(currentDate: string, frequency: RecurringFrequency): string {
  const date = new Date(currentDate);

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date.toISOString().split('T')[0];
}

