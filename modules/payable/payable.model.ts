import * as Crypto from 'expo-crypto';
import type { CreatePayableInput, Payable } from './payable.types';

export function createPayable(input: CreatePayableInput): Payable {
  const now = new Date().toISOString();
  return {
    id: Crypto.randomUUID(),
    name: input.name,
    totalAmount: input.totalAmount,
    remainingAmount: input.totalAmount,
    dueDate: input.dueDate,
    description: input.description ?? null,
    isPaid: false,
    categoryId: input.categoryId ?? null,
    accountId: input.accountId ?? null,
    createdAt: now,
    updatedAt: now,
  };
}
