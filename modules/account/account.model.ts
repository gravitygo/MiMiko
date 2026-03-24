import * as Crypto from 'expo-crypto';
import type { Account, CreateAccountInput } from './account.types';

const DEFAULT_CURRENCY = 'php';

export function createAccount(input: CreateAccountInput): Account {
  const now = new Date().toISOString();

  return {
    id: Crypto.randomUUID(),
    name: input.name,
    type: input.type,
    balance: input.balance ?? 0,
    currency: input.currency ?? DEFAULT_CURRENCY,
    icon: input.icon,
    color: input.color,
    isDefault: false,
    billingDate: input.type === 'credit_card' ? input.billingDate : undefined,
    deadlineDate: input.type === 'credit_card' ? input.deadlineDate : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export function adjustBalance(account: Account, amount: number): Account {
  return {
    ...account,
    balance: account.balance + amount,
    updatedAt: new Date().toISOString(),
  };
}

