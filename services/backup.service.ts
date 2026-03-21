import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { getDatabase } from "@/database";

const BACKUP_VERSION = 1;

interface BackupData {
  version: number;
  createdAt: string;
  data: {
    categories: unknown[];
    accounts: unknown[];
    transactions: unknown[];
    budgets: unknown[];
    recurring_rules: unknown[];
    debts: unknown[];
  };
}

async function exportAllData(): Promise<BackupData> {
  const db = await getDatabase();

  const [categories, accounts, transactions, budgets, recurringRules, debts] =
    await Promise.all([
      db.getAllAsync("SELECT * FROM categories"),
      db.getAllAsync("SELECT * FROM accounts"),
      db.getAllAsync("SELECT * FROM transactions"),
      db.getAllAsync("SELECT * FROM budgets"),
      db.getAllAsync("SELECT * FROM recurring_rules"),
      db.getAllAsync("SELECT * FROM debts"),
    ]);

  return {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    data: {
      categories,
      accounts,
      transactions,
      budgets,
      recurring_rules: recurringRules,
      debts,
    },
  };
}

async function importAllData(backup: BackupData): Promise<void> {
  const db = await getDatabase();

  // Clear existing data (except defaults)
  await db.execAsync(`
    DELETE FROM transactions;
    DELETE FROM recurring_rules;
    DELETE FROM budgets;
    DELETE FROM debts;
    DELETE FROM accounts;
    DELETE FROM categories;
  `);

  const now = new Date().toISOString();

  // Import categories
  for (const cat of backup.data.categories as Record<string, unknown>[]) {
    await db.runAsync(
      `INSERT OR REPLACE INTO categories (id, name, icon, color, type, budget_amount, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cat.id as string,
        cat.name as string,
        cat.icon as string,
        cat.color as string,
        cat.type as string,
        (cat.budget_amount as number) ?? 0,
        (cat.is_default as number) ?? 0,
        (cat.created_at as string) ?? now,
        (cat.updated_at as string) ?? now,
      ],
    );
  }

  // Import accounts
  for (const acc of backup.data.accounts as Record<string, unknown>[]) {
    await db.runAsync(
      `INSERT OR REPLACE INTO accounts (id, name, type, balance, icon, color, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        acc.id as string,
        acc.name as string,
        acc.type as string,
        (acc.balance as number) ?? 0,
        acc.icon as string,
        acc.color as string,
        (acc.is_default as number) ?? 0,
        (acc.created_at as string) ?? now,
        (acc.updated_at as string) ?? now,
      ],
    );
  }

  // Import transactions
  for (const tx of backup.data.transactions as Record<string, unknown>[]) {
    await db.runAsync(
      `INSERT OR REPLACE INTO transactions (id, type, amount, description, category_id, account_id, date, recurring_rule_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tx.id as string,
        tx.type as string,
        tx.amount as number,
        (tx.description as string) ?? null,
        tx.category_id as string,
        tx.account_id as string,
        tx.date as string,
        (tx.recurring_rule_id as string) ?? null,
        (tx.created_at as string) ?? now,
        (tx.updated_at as string) ?? now,
      ],
    );
  }

  // Import budgets
  for (const budget of backup.data.budgets as Record<string, unknown>[]) {
    await db.runAsync(
      `INSERT OR REPLACE INTO budgets (id, name, type, amount, category_id, start_date, end_date, alert_threshold, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        budget.id as string,
        budget.name as string,
        budget.type as string,
        budget.amount as number,
        (budget.category_id as string) ?? null,
        budget.start_date as string,
        budget.end_date as string,
        (budget.alert_threshold as number) ?? 0.8,
        (budget.created_at as string) ?? now,
        (budget.updated_at as string) ?? now,
      ],
    );
  }

  // Import recurring rules
  for (const rule of backup.data.recurring_rules as Record<string, unknown>[]) {
    await db.runAsync(
      `INSERT OR REPLACE INTO recurring_rules (id, name, type, amount, description, category_id, account_id, frequency, custom_days, next_date, end_date, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rule.id as string,
        rule.name as string,
        rule.type as string,
        rule.amount as number,
        (rule.description as string) ?? null,
        rule.category_id as string,
        rule.account_id as string,
        rule.frequency as string,
        (rule.custom_days as string) ?? null,
        rule.next_date as string,
        (rule.end_date as string) ?? null,
        (rule.is_active as number) ?? 1,
        (rule.created_at as string) ?? now,
        (rule.updated_at as string) ?? now,
      ],
    );
  }

  // Import debts
  for (const debt of backup.data.debts as Record<string, unknown>[]) {
    await db.runAsync(
      `INSERT OR REPLACE INTO debts (id, person_name, direction, amount, description, due_date, is_settled, category_id, account_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        debt.id as string,
        debt.person_name as string,
        debt.direction as string,
        debt.amount as number,
        (debt.description as string) ?? null,
        (debt.due_date as string) ?? null,
        (debt.is_settled as number) ?? 0,
        (debt.category_id as string) ?? null,
        (debt.account_id as string) ?? null,
        (debt.created_at as string) ?? now,
        (debt.updated_at as string) ?? now,
      ],
    );
  }
}

function validateBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== "object") return false;

  const obj = data as Record<string, unknown>;

  if (typeof obj.version !== "number") return false;
  if (typeof obj.createdAt !== "string") return false;
  if (!obj.data || typeof obj.data !== "object") return false;

  const backupData = obj.data as Record<string, unknown>;

  return (
    Array.isArray(backupData.categories) &&
    Array.isArray(backupData.accounts) &&
    Array.isArray(backupData.transactions) &&
    Array.isArray(backupData.budgets) &&
    Array.isArray(backupData.recurring_rules) &&
    Array.isArray(backupData.debts)
  );
}

export function createBackupService() {
  return {
    async backup(): Promise<{ success: boolean; error?: string }> {
      try {
        const data = await exportAllData();
        const json = JSON.stringify(data, null, 2);

        const filename = `mikiko-backup-${new Date().toISOString().slice(0, 10)}.json`;
        const baseDir =
          FileSystem.cacheDirectory ?? FileSystem.documentDirectory!;
        const filePath = `${baseDir}${filename}`;

        await FileSystem.writeAsStringAsync(filePath, json, {
          encoding: "utf8",
        });

        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          return {
            success: false,
            error: "Sharing is not available on this device",
          };
        }

        await Sharing.shareAsync(filePath, {
          mimeType: "application/json",
          dialogTitle: "Export MiKiko Backup",
          UTI: "public.json",
        });

        return { success: true };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: message };
      }
    },

    async restore(): Promise<{ success: boolean; error?: string }> {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: "application/json",
          copyToCacheDirectory: true,
        });

        if (result.canceled || !result.assets?.[0]) {
          return { success: false, error: "No file selected" };
        }

        const file = result.assets[0];
        const content = await FileSystem.readAsStringAsync(file.uri, {
          encoding: "utf8",
        });

        let parsed: unknown;
        try {
          parsed = JSON.parse(content);
        } catch {
          return { success: false, error: "Invalid JSON file" };
        }

        if (!validateBackup(parsed)) {
          return { success: false, error: "Invalid backup format" };
        }

        await importAllData(parsed);

        return { success: true };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: message };
      }
    },

    async getBackupInfo(): Promise<{
      transactionCount: number;
      categoryCount: number;
      accountCount: number;
    }> {
      const db = await getDatabase();

      const [transactions, categories, accounts] = await Promise.all([
        db.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM transactions",
        ),
        db.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM categories",
        ),
        db.getFirstAsync<{ count: number }>(
          "SELECT COUNT(*) as count FROM accounts",
        ),
      ]);

      return {
        transactionCount: transactions?.count ?? 0,
        categoryCount: categories?.count ?? 0,
        accountCount: accounts?.count ?? 0,
      };
    },
  };
}

export type BackupService = ReturnType<typeof createBackupService>;
