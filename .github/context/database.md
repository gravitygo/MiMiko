# Database

SQLite via expo-sqlite.

---

## Tables

- transactions
- categories
- accounts
- budgets
- recurring_rules
- payables
- debts
- voice_logs
- exchange_rates

---

## Indexes

- transactions(date)
- transactions(category_id)
- transactions(account_id)
- transactions(type)
- budgets(type)
- budgets(category_id)
- recurring_rules(next_date)
- recurring_rules(is_active)

---

## Key Columns: transactions

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | PK |
| type | TEXT | 'expense', 'income', 'transfer' |
| amount | REAL | transaction amount |
| account_id | TEXT | FK to accounts |
| to_account_id | TEXT | FK (transfer destination) |
| to_amount | REAL | destination amount (multi-currency) |
| fee | REAL | transfer fee |
| exchange_rate | REAL | rate for currency conversion |
| category_id | TEXT | FK to categories |
| date | TEXT | ISO timestamp |

---

## Key Columns: accounts

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | PK |
| name | TEXT | account name |
| type | TEXT | 'cash', 'bank', 'credit_card', 'e_wallet' |
| currency | TEXT | 'php', 'usd', 'eur', etc. (default: 'php') |
| balance | REAL | current balance |

---

## Key Columns: exchange_rates

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | PK |
| base_currency | TEXT | base currency code |
| rates_json | TEXT | JSON of rates |
| date | TEXT | rate date |
| fetched_at | TEXT | fetch timestamp |

---

## database/schema.ts

- CREATE_TABLES: full SQL schema
- DEFAULT_CATEGORIES: 12 presets
- DEFAULT_ACCOUNTS: 4 presets

---

## database/index.ts

- getDatabase(): singleton connection
- initializeDatabase(): creates tables + seeds + migrations (payables, debts, voice_logs, transfer columns, multi-currency columns)
- resetAllData(): wipes transactions, recurring, budgets, payables, debts, voice_logs
- seedDefaultData(): inserts default categories + accounts

