export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  categoryId: string | null;
  accountId: string;
  // Transfer specific fields
  toAccountId: string | null;
  toAmount: number | null; // Amount received in destination currency
  fee: number | null;
  exchangeRate: number | null; // Rate used for currency conversion
  date: string;
  recurringRuleId: string | null;
  /** Ghost transactions are visible in history but do not affect account balances */
  isGhost: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionRow {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  category_id: string | null;
  account_id: string;
  to_account_id: string | null;
  to_amount: number | null;
  fee: number | null;
  exchange_rate: number | null;
  date: string;
  recurring_rule_id: string | null;
  is_ghost: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  description?: string;
  categoryId?: string;
  accountId: string;
  toAccountId?: string;
  toAmount?: number;
  fee?: number;
  exchangeRate?: number;
  date: string;
  recurringRuleId?: string;
  /** When true, transaction is informational only and does not affect account balances */
  isGhost?: boolean;
}

export interface UpdateTransactionInput {
  type?: TransactionType;
  amount?: number;
  description?: string;
  categoryId?: string;
  accountId?: string;
  toAccountId?: string;
  toAmount?: number;
  fee?: number;
  exchangeRate?: number;
  date?: string;
}

export interface TransactionFilter {
  type?: TransactionType;
  categoryId?: string;
  accountId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  /** When true, include only ghost transactions; when false, exclude ghost transactions; when undefined, include all */
  isGhost?: boolean;
}

