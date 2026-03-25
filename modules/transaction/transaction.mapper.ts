import type { Transaction, TransactionRow, TransactionType } from './transaction.types';

export function mapRowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type as TransactionType,
    amount: row.amount,
    description: row.description,
    categoryId: row.category_id,
    accountId: row.account_id,
    toAccountId: row.to_account_id,
    toAmount: row.to_amount,
    fee: row.fee,
    exchangeRate: row.exchange_rate,
    date: row.date,
    recurringRuleId: row.recurring_rule_id,
    isGhost: row.is_ghost === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTransactionToRow(transaction: Transaction): TransactionRow {
  return {
    id: transaction.id,
    type: transaction.type,
    amount: transaction.amount,
    description: transaction.description,
    category_id: transaction.categoryId,
    account_id: transaction.accountId,
    to_account_id: transaction.toAccountId,
    to_amount: transaction.toAmount,
    fee: transaction.fee,
    exchange_rate: transaction.exchangeRate,
    date: transaction.date,
    recurring_rule_id: transaction.recurringRuleId,
    is_ghost: transaction.isGhost ? 1 : 0,
    created_at: transaction.createdAt,
    updated_at: transaction.updatedAt,
  };
}

