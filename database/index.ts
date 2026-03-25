import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES, DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from './schema';

const DATABASE_NAME = 'mikiko.db';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  return db;
}

export async function initializeDatabase(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(CREATE_TABLES);

  // Migration: add end_date column if missing
  try {
    await database.execAsync('ALTER TABLE recurring_rules ADD COLUMN end_date TEXT');
  } catch {
    // Column already exists
  }

  // Migration: add custom_days column if missing
  try {
    await database.execAsync('ALTER TABLE recurring_rules ADD COLUMN custom_days TEXT');
  } catch {
    // Column already exists
  }

  // Migration: create payables table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS payables (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      total_amount REAL NOT NULL,
      remaining_amount REAL NOT NULL,
      due_date TEXT NOT NULL,
      description TEXT,
      is_paid INTEGER DEFAULT 0,
      category_id TEXT,
      account_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );
    CREATE INDEX IF NOT EXISTS idx_payables_due_date ON payables(due_date);
    CREATE INDEX IF NOT EXISTS idx_payables_is_paid ON payables(is_paid);
  `);

  // Migration: create debts table (replaces payables conceptually)
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY NOT NULL,
      person_name TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('payable', 'receivable')),
      amount REAL NOT NULL,
      description TEXT,
      due_date TEXT,
      is_settled INTEGER DEFAULT 0,
      category_id TEXT,
      account_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );
    CREATE INDEX IF NOT EXISTS idx_debts_direction ON debts(direction);
    CREATE INDEX IF NOT EXISTS idx_debts_is_settled ON debts(is_settled);
    CREATE INDEX IF NOT EXISTS idx_debts_due_date ON debts(due_date);
  `);

  // Migration: create voice_logs table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS voice_logs (
      id TEXT PRIMARY KEY NOT NULL,
      transcript TEXT NOT NULL,
      language TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_voice_logs_created_at ON voice_logs(created_at);
  `);

  // Migration: add currency column to accounts
  try {
    await database.execAsync("ALTER TABLE accounts ADD COLUMN currency TEXT DEFAULT 'php'");
  } catch {
    // Column already exists
  }

  // Migration: add billing_date column to accounts (for credit cards)
  try {
    await database.execAsync('ALTER TABLE accounts ADD COLUMN billing_date INTEGER');
  } catch {
    // Column already exists
  }

  // Migration: add deadline_date column to accounts (for credit cards)
  try {
    await database.execAsync('ALTER TABLE accounts ADD COLUMN deadline_date INTEGER');
  } catch {
    // Column already exists
  }

  // Migration: add credit_mode column to accounts
  try {
    await database.execAsync('ALTER TABLE accounts ADD COLUMN credit_mode INTEGER DEFAULT 0');
    // Auto-enable credit_mode for existing credit_card accounts
    await database.execAsync("UPDATE accounts SET credit_mode = 1 WHERE type = 'credit_card'");
  } catch {
    // Column already exists
  }

  // Migration: create exchange_rates table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS exchange_rates (
      id TEXT PRIMARY KEY NOT NULL,
      base_currency TEXT NOT NULL,
      rates_json TEXT NOT NULL,
      date TEXT NOT NULL,
      fetched_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_exchange_rates_base ON exchange_rates(base_currency);
  `);

  // Migration: add to_account_id column to transactions (for transfers)
  try {
    await database.execAsync('ALTER TABLE transactions ADD COLUMN to_account_id TEXT REFERENCES accounts(id)');
  } catch {
    // Column already exists
  }

  // Migration: add fee column to transactions (for transfer fees)
  try {
    await database.execAsync('ALTER TABLE transactions ADD COLUMN fee REAL DEFAULT 0');
  } catch {
    // Column already exists
  }

  // Migration: add to_amount column to transactions (for multi-currency transfers)
  try {
    await database.execAsync('ALTER TABLE transactions ADD COLUMN to_amount REAL');
  } catch {
    // Column already exists
  }

  // Migration: add exchange_rate column to transactions (for currency conversion)
  try {
    await database.execAsync('ALTER TABLE transactions ADD COLUMN exchange_rate REAL');
  } catch {
    // Column already exists
  }

  // Migration: create credit_card_cycles table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS credit_card_cycles (
      id TEXT PRIMARY KEY NOT NULL,
      account_id TEXT NOT NULL,
      billing_start_date TEXT NOT NULL,
      billing_end_date TEXT NOT NULL,
      deadline_date TEXT NOT NULL,
      carryover_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      is_closed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );
    CREATE INDEX IF NOT EXISTS idx_cc_cycles_account ON credit_card_cycles(account_id);
    CREATE INDEX IF NOT EXISTS idx_cc_cycles_billing_end ON credit_card_cycles(billing_end_date);
    CREATE INDEX IF NOT EXISTS idx_cc_cycles_closed ON credit_card_cycles(is_closed);
  `);

  await seedDefaultData(database);
}

export async function resetAllData(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(`
    DELETE FROM transactions;
    DELETE FROM recurring_rules;
    DELETE FROM budgets;
    DELETE FROM payables;
    DELETE FROM debts;
    DELETE FROM voice_logs;
    DELETE FROM accounts WHERE is_default = 0;
    DELETE FROM categories WHERE is_default = 0;
    UPDATE accounts SET balance = 0;
  `);
}

async function seedDefaultData(database: SQLite.SQLiteDatabase): Promise<void> {
  const now = new Date().toISOString();

  const existingCategories = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories WHERE is_default = 1'
  );

  if (!existingCategories || existingCategories.count === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      await database.runAsync(
        `INSERT OR IGNORE INTO categories (id, name, icon, color, type, budget_amount, is_default, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?)`,
        [cat.id, cat.name, cat.icon, cat.color, cat.type, now, now]
      );
    }
  }

  const existingAccounts = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM accounts'
  );

  if (!existingAccounts || existingAccounts.count === 0) {
    for (const acc of DEFAULT_ACCOUNTS) {
      await database.runAsync(
        `INSERT OR IGNORE INTO accounts (id, name, type, balance, icon, color, is_default, created_at, updated_at)
         VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)`,
        [acc.id, acc.name, acc.type, acc.icon, acc.color, acc.isDefault ? 1 : 0, now, now]
      );
    }
  }
}

export async function closeDatabase(): Promise<void> {
  if (!db) return;
  await db.closeAsync();
  db = null;
}

export { CREATE_TABLES, DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from './schema';

