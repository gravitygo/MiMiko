import { getDatabase } from '@/database';
import { toDebt } from './debt.mapper';
import type { Debt, DebtRow } from './debt.types';

export function createDebtRepository() {
  return {
    async insert(debt: Debt): Promise<void> {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO debts (id, person_name, direction, amount, description, due_date, is_settled, category_id, account_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          debt.id,
          debt.personName,
          debt.direction,
          debt.amount,
          debt.description,
          debt.dueDate,
          debt.isSettled ? 1 : 0,
          debt.categoryId,
          debt.accountId,
          debt.createdAt,
          debt.updatedAt,
        ]
      );
    },

    async update(debt: Debt): Promise<void> {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE debts SET person_name = ?, amount = ?, description = ?, due_date = ?, is_settled = ?, updated_at = ? WHERE id = ?`,
        [debt.personName, debt.amount, debt.description, debt.dueDate, debt.isSettled ? 1 : 0, debt.updatedAt, debt.id]
      );
    },

    async delete(id: string): Promise<void> {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM debts WHERE id = ?', [id]);
    },

    async findById(id: string): Promise<Debt | null> {
      const db = await getDatabase();
      const row = await db.getFirstAsync<DebtRow>('SELECT * FROM debts WHERE id = ?', [id]);
      return row ? toDebt(row) : null;
    },

    async findAll(): Promise<Debt[]> {
      const db = await getDatabase();
      const rows = await db.getAllAsync<DebtRow>('SELECT * FROM debts ORDER BY created_at DESC');
      return rows.map(toDebt);
    },

    async findUnsettled(): Promise<Debt[]> {
      const db = await getDatabase();
      const rows = await db.getAllAsync<DebtRow>(
        'SELECT * FROM debts WHERE is_settled = 0 ORDER BY due_date ASC, created_at DESC'
      );
      return rows.map(toDebt);
    },

    async findByDirection(direction: string): Promise<Debt[]> {
      const db = await getDatabase();
      const rows = await db.getAllAsync<DebtRow>(
        'SELECT * FROM debts WHERE direction = ? ORDER BY created_at DESC',
        [direction]
      );
      return rows.map(toDebt);
    },

    async settle(id: string): Promise<void> {
      const db = await getDatabase();
      await db.runAsync(
        'UPDATE debts SET is_settled = 1, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), id]
      );
    },

    async unsettle(id: string): Promise<void> {
      const db = await getDatabase();
      await db.runAsync(
        'UPDATE debts SET is_settled = 0, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), id]
      );
    },

    async sumUnsettledPayables(): Promise<number> {
      const db = await getDatabase();
      const result = await db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(amount), 0) as total FROM debts WHERE direction = 'payable' AND is_settled = 0"
      );
      return result?.total ?? 0;
    },
  };
}

export type DebtRepository = ReturnType<typeof createDebtRepository>;
