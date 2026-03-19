import { createTransactionService } from '@/modules/transaction/transaction.service';
import { createDebt } from './debt.model';
import { createDebtRepository } from './debt.repository';
import type { CreateDebtInput, Debt, UpdateDebtInput } from './debt.types';

export function createDebtService() {
  const repository = createDebtRepository();

  return {
    async add(input: CreateDebtInput): Promise<Debt> {
      const debt = createDebt(input);
      await repository.insert(debt);
      return debt;
    },

    async edit(id: string, input: UpdateDebtInput): Promise<Debt | null> {
      const existing = await repository.findById(id);
      if (!existing) return null;

      const updated: Debt = {
        ...existing,
        personName: input.personName ?? existing.personName,
        amount: input.amount ?? existing.amount,
        description: input.description ?? existing.description,
        dueDate: input.dueDate !== undefined ? input.dueDate : existing.dueDate,
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

    async settle(id: string): Promise<Debt | null> {
      const existing = await repository.findById(id);
      if (!existing || existing.isSettled) return null;

      const transactionService = createTransactionService();

      // payable → I pay them → expense; receivable → they pay me → income
      const type = existing.direction === 'payable' ? 'expense' : 'income';

      await transactionService.add({
        type,
        amount: existing.amount,
        description: `${existing.direction === 'payable' ? 'Paid' : 'Received from'} ${existing.personName}${existing.description ? ': ' + existing.description : ''}`,
        categoryId: existing.categoryId ?? 'cat_transfers',
        accountId: existing.accountId ?? 'acc_cash',
        date: new Date().toISOString(),
      });

      await repository.settle(id);

      return {
        ...existing,
        isSettled: true,
        updatedAt: new Date().toISOString(),
      };
    },

    async getAll(): Promise<Debt[]> {
      return repository.findAll();
    },

    async getUnsettled(): Promise<Debt[]> {
      return repository.findUnsettled();
    },

    async getById(id: string): Promise<Debt | null> {
      return repository.findById(id);
    },

    async getCommittedPayables(): Promise<number> {
      return repository.sumUnsettledPayables();
    },
  };
}

export type DebtService = ReturnType<typeof createDebtService>;
