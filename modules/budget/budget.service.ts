import { createTransactionRepository } from '@/modules/transaction/transaction.repository';
import { createBudget, createBudgetStatus, getMonthDateRange } from './budget.model';
import { createBudgetRepository } from './budget.repository';
import type {
    Budget,
    BudgetStatus,
    BudgetType,
    CreateBudgetInput,
    UpdateBudgetInput,
} from './budget.types';

export function createBudgetService() {
  const repository = createBudgetRepository();
  const transactionRepository = createTransactionRepository();

  return {
    async add(input: CreateBudgetInput): Promise<Budget> {
      if (input.type === 'monthly') {
        const existing = await repository.findMonthlyBudget(input.startDate, input.endDate);
        if (existing) {
          const updated = await this.edit(existing.id, { amount: input.amount, name: input.name });
          return updated!;
        }
      }
      const budget = createBudget(input);
      await repository.insert(budget);
      return budget;
    },

    async edit(id: string, input: UpdateBudgetInput): Promise<Budget | null> {
      const existing = await repository.findById(id);
      if (!existing) return null;

      const updated: Budget = {
        ...existing,
        name: input.name ?? existing.name,
        amount: input.amount ?? existing.amount,
        alertThreshold: input.alertThreshold ?? existing.alertThreshold,
        startDate: input.startDate ?? existing.startDate,
        endDate: input.endDate ?? existing.endDate,
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

    async getById(id: string): Promise<Budget | null> {
      return repository.findById(id);
    },

    async getAll(): Promise<Budget[]> {
      return repository.findAll();
    },

    async getByType(type: BudgetType): Promise<Budget[]> {
      return repository.findByType(type);
    },

    async getActive(date: string = new Date().toISOString().split('T')[0]): Promise<Budget[]> {
      return repository.findActive(date);
    },

    async getStatus(id: string): Promise<BudgetStatus | null> {
      const budget = await repository.findById(id);
      if (!budget) return null;

      const spent = await transactionRepository.sumByType('expense', budget.startDate, budget.endDate);
      return createBudgetStatus(budget, spent);
    },

    async getCategoryBudgetStatus(categoryId: string): Promise<BudgetStatus | null> {
      const budget = await repository.findByCategory(categoryId);
      if (!budget) return null;

      const spent = await transactionRepository.sumByCategory(categoryId, budget.startDate, budget.endDate);
      return createBudgetStatus(budget, spent);
    },

    async getAllStatuses(): Promise<BudgetStatus[]> {
      const budgets = await repository.findAll();
      const statuses: BudgetStatus[] = [];

      for (const budget of budgets) {
        let spent: number;

        if (budget.type === 'category' && budget.categoryId) {
          spent = await transactionRepository.sumByCategory(budget.categoryId, budget.startDate, budget.endDate);
        } else {
          spent = await transactionRepository.sumByType('expense', budget.startDate, budget.endDate);
        }

        statuses.push(createBudgetStatus(budget, spent));
      }

      return statuses;
    },

    async getActiveAlerts(): Promise<BudgetStatus[]> {
      const statuses = await this.getAllStatuses();
      return statuses.filter((s) => s.alertLevel === 'warning' || s.alertLevel === 'exceeded');
    },

    async createMonthlyBudget(amount: number, name = 'Monthly Budget'): Promise<Budget> {
      const { startDate, endDate } = getMonthDateRange();

      const existing = await repository.findMonthlyBudget(startDate, endDate);
      if (existing) {
        const updated = await this.edit(existing.id, { amount });
        return updated!;
      }

      return this.add({
        name,
        type: 'monthly',
        amount,
        startDate,
        endDate,
      });
    },

    async createCategoryBudget(
      categoryId: string,
      amount: number,
      name: string
    ): Promise<Budget> {
      const { startDate, endDate } = getMonthDateRange();

      return this.add({
        name,
        type: 'category',
        amount,
        categoryId,
        startDate,
        endDate,
      });
    },
  };
}

export type BudgetService = ReturnType<typeof createBudgetService>;

