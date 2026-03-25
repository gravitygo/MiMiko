import { createTransaction, duplicateTransaction, isTransfer } from './transaction.model';
import { createTransactionRepository } from './transaction.repository';
import { createAccountService } from '@/modules/account';
import type {
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilter,
} from './transaction.types';

export function createTransactionService() {
  const repository = createTransactionRepository();
  const accountService = createAccountService();

  async function adjustAccountBalance(
    accountId: string,
    amount: number,
    type: 'expense' | 'income',
    reverse = false
  ): Promise<void> {
    const account = await accountService.getById(accountId);
    const isCreditMode = account?.creditMode === true || account?.type === 'credit_card';

    // For credit-mode accounts, expenses are tracked via billing cycles only.
    // Ghost transactions (credit card expenses) do not affect the account balance.
    if (isCreditMode && type === 'expense') return;

    // For credit-mode accounts: income decreases the outstanding balance (paying down the balance).
    // For regular accounts: expenses decrease balance, income increases it.
    let adjustment: number;
    if (isCreditMode) {
      adjustment = -amount; // Income reduces the owed balance
    } else {
      adjustment = type === 'expense' ? -amount : amount;
    }
    const finalAdjustment = reverse ? -adjustment : adjustment;

    if (finalAdjustment > 0) {
      await accountService.credit(accountId, Math.abs(finalAdjustment));
    } else {
      await accountService.debit(accountId, Math.abs(finalAdjustment));
    }
  }

  async function adjustTransferBalances(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    toAmount: number | null,
    fee: number,
    reverse = false
  ): Promise<void> {
    const totalDebit = amount + fee;
    // For multi-currency: use toAmount if provided, otherwise use source amount
    const creditAmount = toAmount ?? amount;

    if (reverse) {
      // Reverse: credit back to source, debit from destination
      await accountService.credit(fromAccountId, totalDebit);
      await accountService.debit(toAccountId, creditAmount);
    } else {
      // Forward: debit from source (amount + fee), credit to destination
      await accountService.debit(fromAccountId, totalDebit);
      await accountService.credit(toAccountId, creditAmount);
    }
  }

  return {
    async add(input: CreateTransactionInput): Promise<Transaction> {
      // For credit-mode accounts, expense transactions are tracked via billing cycles
      // and should not directly affect the account balance (ghost transactions).
      // Only auto-set when the caller has not explicitly provided an isGhost value.
      let effectiveInput = input;
      if (input.type === 'expense' && input.isGhost === undefined) {
        const account = await accountService.getById(input.accountId);
        const isCreditMode = account?.creditMode === true || account?.type === 'credit_card';
        if (isCreditMode) {
          effectiveInput = { ...input, isGhost: true };
        }
      }

      const transaction = createTransaction(effectiveInput);
      await repository.insert(transaction);

      if (effectiveInput.type === 'transfer' && effectiveInput.toAccountId) {
        const fee = effectiveInput.fee ?? 0;
        const toAmount = effectiveInput.toAmount ?? null;
        await adjustTransferBalances(effectiveInput.accountId, effectiveInput.toAccountId, effectiveInput.amount, toAmount, fee);
      } else if (effectiveInput.type !== 'transfer') {
        await adjustAccountBalance(effectiveInput.accountId, effectiveInput.amount, effectiveInput.type);
      }

      return transaction;
    },

    async edit(id: string, input: UpdateTransactionInput): Promise<Transaction | null> {
      const existing = await repository.findById(id);
      if (!existing) return null;

      // Reverse existing balance adjustments
      if (isTransfer(existing) && existing.toAccountId) {
        await adjustTransferBalances(
          existing.accountId,
          existing.toAccountId,
          existing.amount,
          existing.toAmount,
          existing.fee ?? 0,
          true
        );
      } else if (!isTransfer(existing)) {
        await adjustAccountBalance(
          existing.accountId,
          existing.amount,
          existing.type as 'expense' | 'income',
          true
        );
      }

      const updated: Transaction = {
        ...existing,
        type: input.type ?? existing.type,
        amount: input.amount ?? existing.amount,
        description: input.description ?? existing.description,
        categoryId: input.categoryId ?? existing.categoryId,
        accountId: input.accountId ?? existing.accountId,
        toAccountId: input.toAccountId ?? existing.toAccountId,
        toAmount: input.toAmount ?? existing.toAmount,
        fee: input.fee ?? existing.fee,
        exchangeRate: input.exchangeRate ?? existing.exchangeRate,
        date: input.date ?? existing.date,
        updatedAt: new Date().toISOString(),
      };

      await repository.update(updated);

      // Apply new balance adjustments
      if (isTransfer(updated) && updated.toAccountId) {
        await adjustTransferBalances(
          updated.accountId,
          updated.toAccountId,
          updated.amount,
          updated.toAmount,
          updated.fee ?? 0
        );
      } else if (!isTransfer(updated)) {
        await adjustAccountBalance(
          updated.accountId,
          updated.amount,
          updated.type as 'expense' | 'income'
        );
      }

      return updated;
    },

    async remove(id: string): Promise<boolean> {
      const existing = await repository.findById(id);
      if (!existing) return false;

      // Reverse balance adjustments
      if (isTransfer(existing) && existing.toAccountId) {
        await adjustTransferBalances(
          existing.accountId,
          existing.toAccountId,
          existing.amount,
          existing.toAmount,
          existing.fee ?? 0,
          true
        );
      } else if (!isTransfer(existing)) {
        await adjustAccountBalance(
          existing.accountId,
          existing.amount,
          existing.type as 'expense' | 'income',
          true
        );
      }

      await repository.delete(id);
      return true;
    },

    async duplicate(id: string): Promise<Transaction | null> {
      const existing = await repository.findById(id);
      if (!existing) return null;

      const duplicated = duplicateTransaction(existing);
      await repository.insert(duplicated);

      if (isTransfer(duplicated) && duplicated.toAccountId) {
        await adjustTransferBalances(
          duplicated.accountId,
          duplicated.toAccountId,
          duplicated.amount,
          duplicated.toAmount,
          duplicated.fee ?? 0
        );
      } else if (!isTransfer(duplicated)) {
        await adjustAccountBalance(
          duplicated.accountId,
          duplicated.amount,
          duplicated.type as 'expense' | 'income'
        );
      }

      return duplicated;
    },

    async getById(id: string): Promise<Transaction | null> {
      return repository.findById(id);
    },

    async getAll(filter: TransactionFilter = {}): Promise<Transaction[]> {
      return repository.findAll(filter);
    },

    async getByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
      return repository.findByDateRange(startDate, endDate);
    },

    async getByCategory(categoryId: string, limit = 50): Promise<Transaction[]> {
      return repository.findByCategory(categoryId, limit);
    },

    async getTotalExpenses(startDate: string, endDate: string): Promise<number> {
      return repository.sumByType('expense', startDate, endDate);
    },

    async getTotalIncome(startDate: string, endDate: string): Promise<number> {
      return repository.sumByType('income', startDate, endDate);
    },

    async getCategoryTotal(categoryId: string, startDate: string, endDate: string): Promise<number> {
      return repository.sumByCategory(categoryId, startDate, endDate);
    },

    async count(filter: TransactionFilter = {}): Promise<number> {
      return repository.count(filter);
    },
  };
}

export type TransactionService = ReturnType<typeof createTransactionService>;

