import type { RecurringFrequency, RecurringRule, RecurringRuleRow, RecurringType } from './recurring.types';

export function mapRowToRecurringRule(row: RecurringRuleRow): RecurringRule {
  return {
    id: row.id,
    name: row.name,
    type: row.type as RecurringType,
    amount: row.amount,
    description: row.description,
    categoryId: row.category_id,
    accountId: row.account_id,
    frequency: row.frequency as RecurringFrequency,
    nextDate: row.next_date,
    endDate: row.end_date ?? null,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRecurringRuleToRow(rule: RecurringRule): RecurringRuleRow {
  return {
    id: rule.id,
    name: rule.name,
    type: rule.type,
    amount: rule.amount,
    description: rule.description,
    category_id: rule.categoryId,
    account_id: rule.accountId,
    frequency: rule.frequency,
    next_date: rule.nextDate,
    end_date: rule.endDate,
    is_active: rule.isActive ? 1 : 0,
    created_at: rule.createdAt,
    updated_at: rule.updatedAt,
  };
}

