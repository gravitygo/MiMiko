import { getDatabase } from '@/database';
import { mapRowToAccount } from './account.mapper';
import type { Account, AccountRow, AccountType } from './account.types';

export function createAccountRepository() {
  return {
    async insert(account: Account): Promise<void> {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO accounts (id, name, type, balance, currency, icon, color, is_default, credit_mode, billing_date, deadline_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          account.id,
          account.name,
          account.type,
          account.balance,
          account.currency,
          account.icon,
          account.color,
          account.isDefault ? 1 : 0,
          account.creditMode ? 1 : 0,
          account.billingDate ?? null,
          account.deadlineDate ?? null,
          account.createdAt,
          account.updatedAt,
        ]
      );
    },

    async update(account: Account): Promise<void> {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE accounts SET name = ?, type = ?, balance = ?, currency = ?, icon = ?, color = ?, credit_mode = ?, billing_date = ?, deadline_date = ?, updated_at = ? WHERE id = ?`,
        [
          account.name,
          account.type,
          account.balance,
          account.currency,
          account.icon,
          account.color,
          account.creditMode ? 1 : 0,
          account.billingDate ?? null,
          account.deadlineDate ?? null,
          account.updatedAt,
          account.id,
        ]
      );
    },

    async delete(id: string): Promise<void> {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
    },

    async findById(id: string): Promise<Account | null> {
      const db = await getDatabase();
      const row = await db.getFirstAsync<AccountRow>('SELECT * FROM accounts WHERE id = ?', [id]);
      if (!row) return null;
      return mapRowToAccount(row);
    },

    async findAll(): Promise<Account[]> {
      const db = await getDatabase();
      const rows = await db.getAllAsync<AccountRow>('SELECT * FROM accounts ORDER BY is_default DESC, name ASC');
      return rows.map(mapRowToAccount);
    },

    async findByType(type: AccountType): Promise<Account[]> {
      const db = await getDatabase();
      const rows = await db.getAllAsync<AccountRow>(
        'SELECT * FROM accounts WHERE type = ? ORDER BY name ASC',
        [type]
      );
      return rows.map(mapRowToAccount);
    },

    async findDefault(): Promise<Account | null> {
      const db = await getDatabase();
      const row = await db.getFirstAsync<AccountRow>('SELECT * FROM accounts WHERE is_default = 1 LIMIT 1');
      if (!row) return null;
      return mapRowToAccount(row);
    },

    async updateBalance(id: string, balance: number): Promise<void> {
      const db = await getDatabase();
      await db.runAsync(
        'UPDATE accounts SET balance = ?, updated_at = ? WHERE id = ?',
        [balance, new Date().toISOString(), id]
      );
    },
  };
}

export type AccountRepository = ReturnType<typeof createAccountRepository>;

