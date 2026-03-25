import { createAccount, adjustBalance } from './account.model';
import { createAccountRepository } from './account.repository';
import type { Account, AccountType, CreateAccountInput, UpdateAccountInput } from './account.types';

export function createAccountService() {
  const repository = createAccountRepository();

  return {
    async add(input: CreateAccountInput): Promise<Account> {
      const account = createAccount(input);
      await repository.insert(account);
      return account;
    },

    async edit(id: string, input: UpdateAccountInput): Promise<Account | null> {
      const existing = await repository.findById(id);
      if (!existing) return null;

      const hasCreditMode = input.creditMode !== undefined
        ? input.creditMode
        : (existing.creditMode ?? (existing.type === 'credit_card'));

      const updated: Account = {
        ...existing,
        name: input.name ?? existing.name,
        type: input.type ?? existing.type,
        icon: input.icon ?? existing.icon,
        color: input.color ?? existing.color,
        currency: input.currency ?? existing.currency,
        creditMode: hasCreditMode || undefined,
        billingDate: input.billingDate !== undefined ? input.billingDate : existing.billingDate,
        deadlineDate: input.deadlineDate !== undefined ? input.deadlineDate : existing.deadlineDate,
        updatedAt: new Date().toISOString(),
      };

      await repository.update(updated);
      return updated;
    },

    async remove(id: string): Promise<boolean> {
      const existing = await repository.findById(id);
      if (!existing) return false;

      await repository.delete(id);
      return true;
    },

    async getById(id: string): Promise<Account | null> {
      return repository.findById(id);
    },

    async getAll(): Promise<Account[]> {
      return repository.findAll();
    },

    async getByType(type: AccountType): Promise<Account[]> {
      return repository.findByType(type);
    },

    async getDefault(): Promise<Account | null> {
      return repository.findDefault();
    },

    async credit(id: string, amount: number): Promise<Account | null> {
      const existing = await repository.findById(id);
      if (!existing) return null;

      const updated = adjustBalance(existing, amount);
      await repository.update(updated);
      return updated;
    },

    async debit(id: string, amount: number): Promise<Account | null> {
      const existing = await repository.findById(id);
      if (!existing) return null;

      const updated = adjustBalance(existing, -amount);
      await repository.update(updated);
      return updated;
    },

    async setBalance(id: string, balance: number): Promise<void> {
      await repository.updateBalance(id, balance);
    },

    async getTotalBalance(): Promise<number> {
      const accounts = await repository.findAll();
      return accounts.reduce((sum, acc) => sum + acc.balance, 0);
    },
  };
}

export type AccountService = ReturnType<typeof createAccountService>;

