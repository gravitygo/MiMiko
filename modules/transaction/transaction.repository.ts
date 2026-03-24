import { getDatabase } from '@/database';
import { mapRowToTransaction } from './transaction.mapper';
import type { Transaction, TransactionFilter, TransactionRow } from './transaction.types';

export function createTransactionRepository() {
  return {
    async insert(transaction: Transaction): Promise<void> {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO transactions (id, type, amount, description, category_id, account_id, to_account_id, to_amount, fee, exchange_rate, date, recurring_rule_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transaction.id,
          transaction.type,
          transaction.amount,
          transaction.description,
          transaction.categoryId,
          transaction.accountId,
          transaction.toAccountId,
          transaction.toAmount,
          transaction.fee,
          transaction.exchangeRate,
          transaction.date,
          transaction.recurringRuleId,
          transaction.createdAt,
          transaction.updatedAt,
        ]
      );
    },

    async update(transaction: Transaction): Promise<void> {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE transactions SET type = ?, amount = ?, description = ?, category_id = ?, account_id = ?, to_account_id = ?, to_amount = ?, fee = ?, exchange_rate = ?, date = ?, updated_at = ? WHERE id = ?`,
        [
          transaction.type,
          transaction.amount,
          transaction.description,
          transaction.categoryId,
          transaction.accountId,
          transaction.toAccountId,
          transaction.toAmount,
          transaction.fee,
          transaction.exchangeRate,
          transaction.date,
          transaction.updatedAt,
          transaction.id,
        ]
      );
    },

    async delete(id: string): Promise<void> {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
    },

    async findById(id: string): Promise<Transaction | null> {
      const db = await getDatabase();
      const row = await db.getFirstAsync<TransactionRow>('SELECT * FROM transactions WHERE id = ?', [id]);
      if (!row) return null;
      return mapRowToTransaction(row);
    },

    async findAll(filter: TransactionFilter = {}): Promise<Transaction[]> {
      const db = await getDatabase();
      const conditions: string[] = [];
      const params: (string | number)[] = [];

      if (filter.type) {
        conditions.push('type = ?');
        params.push(filter.type);
      }
      if (filter.categoryId) {
        conditions.push('category_id = ?');
        params.push(filter.categoryId);
      }
      if (filter.accountId) {
        conditions.push('account_id = ?');
        params.push(filter.accountId);
      }
      if (filter.startDate) {
        conditions.push('date >= ?');
        params.push(filter.startDate);
      }
      if (filter.endDate) {
        conditions.push('date <= ?');
        params.push(filter.endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const limit = filter.limit ?? 50;
      const offset = filter.offset ?? 0;

      const rows = await db.getAllAsync<TransactionRow>(
        `SELECT * FROM transactions ${whereClause} ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return rows.map(mapRowToTransaction);
    },

    async findByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
      const db = await getDatabase();
      const rows = await db.getAllAsync<TransactionRow>(
        'SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date DESC',
        [startDate, endDate]
      );
      return rows.map(mapRowToTransaction);
    },

    async findByCategory(categoryId: string, limit = 50): Promise<Transaction[]> {
      const db = await getDatabase();
      const rows = await db.getAllAsync<TransactionRow>(
        'SELECT * FROM transactions WHERE category_id = ? ORDER BY date DESC LIMIT ?',
        [categoryId, limit]
      );
      return rows.map(mapRowToTransaction);
    },

    async findByRecurringRuleId(recurringRuleId: string): Promise<Transaction[]> {
      const db = await getDatabase();
      const rows = await db.getAllAsync<TransactionRow>(
        'SELECT * FROM transactions WHERE recurring_rule_id = ? ORDER BY date DESC',
        [recurringRuleId]
      );
      return rows.map(mapRowToTransaction);
    },

    async sumByType(type: 'expense' | 'income', startDate: string, endDate: string): Promise<number> {
      const db = await getDatabase();
      const result = await db.getFirstAsync<{ total: number | null }>(
        'SELECT SUM(amount) as total FROM transactions WHERE type = ? AND date >= ? AND date <= ?',
        [type, startDate, endDate]
      );
      return result?.total ?? 0;
    },

    async sumByCategory(categoryId: string, startDate: string, endDate: string): Promise<number> {
      const db = await getDatabase();
      const result = await db.getFirstAsync<{ total: number | null }>(
        'SELECT SUM(amount) as total FROM transactions WHERE category_id = ? AND date >= ? AND date <= ?',
        [categoryId, startDate, endDate]
      );
      return result?.total ?? 0;
    },

    async count(filter: TransactionFilter = {}): Promise<number> {
      const db = await getDatabase();
      const conditions: string[] = [];
      const params: (string | number)[] = [];

      if (filter.type) {
        conditions.push('type = ?');
        params.push(filter.type);
      }
      if (filter.categoryId) {
        conditions.push('category_id = ?');
        params.push(filter.categoryId);
      }
      if (filter.startDate) {
        conditions.push('date >= ?');
        params.push(filter.startDate);
      }
      if (filter.endDate) {
        conditions.push('date <= ?');
        params.push(filter.endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM transactions ${whereClause}`,
        params
      );
      return result?.count ?? 0;
    },
  };
}

export type TransactionRepository = ReturnType<typeof createTransactionRepository>;

