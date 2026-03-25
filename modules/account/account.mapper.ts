import type { Account, AccountRow, AccountType } from './account.types';

export function mapRowToAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type as AccountType,
    balance: row.balance,
    currency: row.currency,
    icon: row.icon,
    color: row.color,
    isDefault: row.is_default === 1,
    creditMode: row.credit_mode === 1 ? true : undefined,
    billingDate: row.billing_date ?? undefined,
    deadlineDate: row.deadline_date ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAccountToRow(account: Account): AccountRow {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    balance: account.balance,
    currency: account.currency,
    icon: account.icon,
    color: account.color,
    is_default: account.isDefault ? 1 : 0,
    credit_mode: account.creditMode ? 1 : 0,
    billing_date: account.billingDate ?? null,
    deadline_date: account.deadlineDate ?? null,
    created_at: account.createdAt,
    updated_at: account.updatedAt,
  };
}

