export const SCHEMA_VERSION = 1;

export const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
    budget_amount REAL DEFAULT 0,
    is_default INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'credit_card', 'e_wallet')),
    balance REAL DEFAULT 0,
    currency TEXT DEFAULT 'php',
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    credit_mode INTEGER DEFAULT 0,
    billing_date INTEGER,
    deadline_date INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
    amount REAL NOT NULL,
    description TEXT,
    category_id TEXT,
    account_id TEXT NOT NULL,
    to_account_id TEXT,
    to_amount REAL,
    exchange_rate REAL,
    fee REAL DEFAULT 0,
    date TEXT NOT NULL,
    recurring_rule_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (to_account_id) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('monthly', 'category')),
    amount REAL NOT NULL,
    category_id TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    alert_threshold REAL DEFAULT 0.8,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS recurring_rules (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    amount REAL NOT NULL,
    description TEXT,
    category_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    frequency TEXT NOT NULL,
    custom_days TEXT,
    next_date TEXT NOT NULL,
    end_date TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
  CREATE INDEX IF NOT EXISTS idx_budgets_type ON budgets(type);
  CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);
  CREATE INDEX IF NOT EXISTS idx_recurring_rules_next_date ON recurring_rules(next_date);
  CREATE INDEX IF NOT EXISTS idx_recurring_rules_active ON recurring_rules(is_active);
`;

export const DEFAULT_CATEGORIES = [
  { id: 'cat_food', name: 'Food', icon: 'restaurant', color: '#FF6B6B', type: 'expense' as const },
  { id: 'cat_groceries', name: 'Groceries', icon: 'cart', color: '#4ECDC4', type: 'expense' as const },
  { id: 'cat_transport', name: 'Transport', icon: 'car', color: '#45B7D1', type: 'expense' as const },
  { id: 'cat_shopping', name: 'Shopping', icon: 'bag', color: '#96CEB4', type: 'expense' as const },
  { id: 'cat_entertainment', name: 'Entertainment', icon: 'game-controller', color: '#DDA0DD', type: 'expense' as const },
  { id: 'cat_utilities', name: 'Utilities', icon: 'flash', color: '#FFE66D', type: 'expense' as const },
  { id: 'cat_health', name: 'Health', icon: 'medical', color: '#FF8B94', type: 'expense' as const },
  { id: 'cat_subscriptions', name: 'Subscriptions', icon: 'repeat', color: '#A8E6CF', type: 'expense' as const },
  { id: 'cat_investment', name: 'Investment', icon: 'trending-up', color: '#6C5CE7', type: 'expense' as const },
  { id: 'cat_savings', name: 'Savings', icon: 'shield-checkmark', color: '#00B894', type: 'expense' as const },
  { id: 'cat_salary', name: 'Salary', icon: 'wallet', color: '#05DF72', type: 'income' as const },
  { id: 'cat_freelance', name: 'Freelance', icon: 'briefcase', color: '#0084D1', type: 'income' as const },
  { id: 'cat_gifts', name: 'Gifts', icon: 'gift', color: '#FFB6C1', type: 'income' as const },
  { id: 'cat_transfers', name: 'Transfers', icon: 'swap-horizontal', color: '#B4A7D6', type: 'income' as const },
];

export const DEFAULT_ACCOUNTS = [
  { id: 'acc_cash', name: 'Cash', type: 'cash' as const, icon: 'cash', color: '#05DF72', isDefault: true },
  { id: 'acc_bank', name: 'Bank Account', type: 'bank' as const, icon: 'business', color: '#0084D1', isDefault: false },
  { id: 'acc_credit', name: 'Credit Card', type: 'credit_card' as const, icon: 'card', color: '#FF6B6B', isDefault: false },
  { id: 'acc_ewallet', name: 'E-Wallet', type: 'e_wallet' as const, icon: 'phone-portrait', color: '#FFBA00', isDefault: false },
];

