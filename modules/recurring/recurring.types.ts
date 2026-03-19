export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type RecurringType = 'expense' | 'income';

export interface RecurringRule {
  id: string;
  name: string;
  type: RecurringType;
  amount: number;
  description: string | null;
  categoryId: string;
  accountId: string;
  frequency: RecurringFrequency;
  nextDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringRuleRow {
  id: string;
  name: string;
  type: string;
  amount: number;
  description: string | null;
  category_id: string;
  account_id: string;
  frequency: string;
  next_date: string;
  end_date: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CreateRecurringRuleInput {
  name: string;
  type: RecurringType;
  amount: number;
  description?: string;
  categoryId: string;
  accountId: string;
  frequency: RecurringFrequency;
  nextDate: string;
  endDate?: string;
}

export interface UpdateRecurringRuleInput {
  name?: string;
  amount?: number;
  description?: string;
  categoryId?: string;
  accountId?: string;
  frequency?: RecurringFrequency;
  nextDate?: string;
  endDate?: string;
}

