import { getDatabase } from '@/database';
import { mapRowToRecurringRule } from './recurring.mapper';
import type { RecurringRule, RecurringRuleRow } from './recurring.types';

export function createRecurringRepository() {
  return {
    async insert(rule: RecurringRule): Promise<void> {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO recurring_rules (id, name, type, amount, description, category_id, account_id, frequency, next_date, end_date, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rule.id,
          rule.name,
          rule.type,
          rule.amount,
          rule.description,
          rule.categoryId,
          rule.accountId,
          rule.frequency,
          rule.nextDate,
          rule.endDate,
          rule.isActive ? 1 : 0,
          rule.createdAt,
          rule.updatedAt,
        ]
      );
    },

    async update(rule: RecurringRule): Promise<void> {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE recurring_rules SET name = ?, amount = ?, description = ?, category_id = ?, account_id = ?, frequency = ?, next_date = ?, end_date = ?, is_active = ?, updated_at = ? WHERE id = ?`,
        [
          rule.name,
          rule.amount,
          rule.description,
          rule.categoryId,
          rule.accountId,
          rule.frequency,
          rule.nextDate,
          rule.endDate,
          rule.isActive ? 1 : 0,
          rule.updatedAt,
          rule.id,
        ]
      );
    },

    async delete(id: string): Promise<void> {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM recurring_rules WHERE id = ?', [id]);
    },

    async findById(id: string): Promise<RecurringRule | null> {
      const db = await getDatabase();
      const row = await db.getFirstAsync<RecurringRuleRow>(
        'SELECT * FROM recurring_rules WHERE id = ?',
        [id]
      );
      if (!row) return null;
      return mapRowToRecurringRule(row);
    },

    async findAll(): Promise<RecurringRule[]> {
      const db = await getDatabase();
      const rows = await db.getAllAsync<RecurringRuleRow>(
        'SELECT * FROM recurring_rules ORDER BY next_date ASC'
      );
      return rows.map(mapRowToRecurringRule);
    },

    async findActive(): Promise<RecurringRule[]> {
      const db = await getDatabase();
      const rows = await db.getAllAsync<RecurringRuleRow>(
        'SELECT * FROM recurring_rules WHERE is_active = 1 ORDER BY next_date ASC'
      );
      return rows.map(mapRowToRecurringRule);
    },

    async findDue(date: string): Promise<RecurringRule[]> {
      const db = await getDatabase();
      const rows = await db.getAllAsync<RecurringRuleRow>(
        'SELECT * FROM recurring_rules WHERE is_active = 1 AND next_date <= ? ORDER BY next_date ASC',
        [date]
      );
      return rows.map(mapRowToRecurringRule);
    },

    async updateNextDate(id: string, nextDate: string): Promise<void> {
      const db = await getDatabase();
      await db.runAsync(
        'UPDATE recurring_rules SET next_date = ?, updated_at = ? WHERE id = ?',
        [nextDate, new Date().toISOString(), id]
      );
    },

    async setActive(id: string, isActive: boolean): Promise<void> {
      const db = await getDatabase();
      await db.runAsync(
        'UPDATE recurring_rules SET is_active = ?, updated_at = ? WHERE id = ?',
        [isActive ? 1 : 0, new Date().toISOString(), id]
      );
    },
  };
}

export type RecurringRepository = ReturnType<typeof createRecurringRepository>;

