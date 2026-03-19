import { createPayable } from './payable.model';
import { createPayableRepository } from './payable.repository';
import type { CreatePayableInput, Payable, UpdatePayableInput } from './payable.types';

export function createPayableService() {
  const repo = createPayableRepository();

  return {
    async add(input: CreatePayableInput): Promise<Payable> {
      const payable = createPayable(input);
      await repo.insert(payable);
      return payable;
    },

    async edit(id: string, input: UpdatePayableInput): Promise<Payable | null> {
      const existing = await repo.findById(id);
      if (!existing) return null;

      const updated: Payable = {
        ...existing,
        ...input,
        categoryId: input.categoryId ?? existing.categoryId,
        accountId: input.accountId ?? existing.accountId,
        updatedAt: new Date().toISOString(),
      };

      await repo.update(updated);
      return updated;
    },

    async remove(id: string): Promise<boolean> {
      const existing = await repo.findById(id);
      if (!existing) return false;
      await repo.delete(id);
      return true;
    },

    async getAll(): Promise<Payable[]> {
      return repo.findAll();
    },

    async getUnpaid(): Promise<Payable[]> {
      return repo.findUnpaid();
    },

    async markPaid(id: string): Promise<void> {
      await repo.markPaid(id);
    },

    async makePayment(id: string, amount: number): Promise<void> {
      await repo.makePayment(id, amount);
    },
  };
}
