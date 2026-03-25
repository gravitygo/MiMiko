import * as Crypto from 'expo-crypto';
import type { CreateTransactionInput, Transaction } from './transaction.types';

export function createTransaction(input: CreateTransactionInput): Transaction {
  const now = new Date().toISOString();

  return {
    id: Crypto.randomUUID(),
    type: input.type,
    amount: input.amount,
    description: input.description ?? null,
    categoryId: input.categoryId ?? null,
    accountId: input.accountId,
    toAccountId: input.toAccountId ?? null,
    toAmount: input.toAmount ?? null,
    fee: input.fee ?? null,
    exchangeRate: input.exchangeRate ?? null,
    date: input.date,
    recurringRuleId: input.recurringRuleId ?? null,
    isGhost: input.isGhost ?? false,
    createdAt: now,
    updatedAt: now,
  };
}

export function isExpense(transaction: Transaction): boolean {
  return transaction.type === 'expense';
}

export function isIncome(transaction: Transaction): boolean {
  return transaction.type === 'income';
}

export function isTransfer(transaction: Transaction): boolean {
  return transaction.type === 'transfer';
}

export function duplicateTransaction(transaction: Transaction): Transaction {
  const now = new Date().toISOString();

  return {
    ...transaction,
    id: Crypto.randomUUID(),
    recurringRuleId: null,
    createdAt: now,
    updatedAt: now,
  };
}

