import { getDatabase } from '@/database';
import { mapRowToPayable } from './payable.mapper';
import type { Payable, PayableRow } from './payable.types';

export function createPayableRepository() {
  return {
    async insert(payable: Payable): Promise<void> {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO payables (id, name, total_amount, remaining_amount, due_date, description, is_paid, category_id, account_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payable.id,
          payable.name,
          payable.totalAmount,
          payable.remainingAmount,
          payable.dueDate,
          payable.description,
          payable.isPaid ? 1 : 0,
          payable.categoryId,
          payable.accountId,
          payable.createdAt,
          payable.updatedAt,
        ]
      );
    },

    async update(payable: Payable): Promise<void> {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE payables SET name = ?, total_amount = ?, remaining_amount = ?, due_date = ?, description = ?, is_paid = ?, category_id = ?, account_id = ?, updated_at = ? WHERE id = ?`,
        [
          payable.name,
          payable.totalAmount,
          payable.remainingAmount,
          payable.dueDate,
          payable.description,
          payable.isPaid ? 1 : 0,
          payable.categoryId,
          payable.accountId,
          payable.updatedAt,
          payable.id,
        ]
      );
    },

    async delete(id: string): Promise<void> {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM payables WHERE id = ?', [id]);
    },

    async findById(id: string): Promise<Payable | null> {
      const db = await getDatabase();
      const row = await db.getFirstAsync<PayableRow>(
        'SELECT * FROM payables WHERE id = ?',
        [id]
      );
      return row ? mapRowToPayable(row) : null;
    },

    async findAll(): Promise<Payable[]> {
      const db = await getDatabase();
      const rows = await db.getAllAsync<PayableRow>(
        'SELECT * FROM payables ORDER BY due_date ASC'
      );
      return rows.map(mapRowToPayable);
    },

    async findUnpaid(): Promise<Payable[]> {
      const db = await getDatabase();
      const rows = await db.getAllAsync<PayableRow>(
        'SELECT * FROM payables WHERE is_paid = 0 ORDER BY due_date ASC'
      );
      return rows.map(mapRowToPayable);
    },

    async markPaid(id: string): Promise<void> {
      const db = await getDatabase();
      await db.runAsync(
        'UPDATE payables SET is_paid = 1, remaining_amount = 0, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), id]
      );
    },

    async makePayment(id: string, amount: number): Promise<void> {
      const db = await getDatabase();
      const now = new Date().toISOString();
      await db.runAsync(
        `UPDATE payables SET remaining_amount = MAX(remaining_amount - ?, 0), is_paid = CASE WHEN remaining_amount - ? <= 0 THEN 1 ELSE 0 END, updated_at = ? WHERE id = ?`,
        [amount, amount, now, id]
      );
    },
  };
}

export type PayableRepository = ReturnType<typeof createPayableRepository>;
