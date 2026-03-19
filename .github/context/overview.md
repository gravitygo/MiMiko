# Overview

Lightweight architecture map for fast AI navigation.

---

## Core Flow

```
UI → Hooks → Service → Repository → Database
```

- UI: presentation only
- Hooks: bridge UI ↔ services, update stores
- Service: business logic
- Repository: data access
- Database: persistence layer

---

## Implementation Status

### ✅ Completed (Backend)
- Transaction module (all files)
- Category module (all files)
- Account module (all files)
- Budget module (all files)
- Recurring module (all files)
- All Zustand stores
- Database schema + seeds

### ✅ Completed (Frontend)
- `app/(tabs)/_layout.tsx` - Tab navigator
- `app/(tabs)/index.tsx` - Dashboard (real sparkline from last 7 days, empty state placeholders, DB-connected)
- `app/(tabs)/transactions.tsx` - Full transaction list (DB-connected)
- `app/(tabs)/add.tsx` - Add transaction form (DB-connected)
- `app/(tabs)/budgets.tsx` - Budgets screen (category picker for category-type budgets, explanations, DB-connected)
- `app/(tabs)/settings.tsx` - Settings screen (links to accounts, categories, recurring)
- `app/accounts.tsx` - Account management (CRUD, DB-connected)
- `app/categories.tsx` - Category management (CRUD, DB-connected)
- `app/recurring.tsx` - Recurring payments (list, create modal, category/account/frequency pickers, DB-connected)
- `components/dashboard/` - Dashboard components (BalanceCard, QuickAddCard, CategoryCard, BudgetSummaryCard, RecentTransactionItem)

### ❌ Not Started
- Voice module
- AI module

---

## Where To Look

### Transactions

→ [Transaction Module](modules/transaction.md)

- expense + income logic
- add / edit / delete transactions
- main entry for financial data flow

---

### Database

→ [Database](database.md)

- SQLite schema + indexes
- source of truth
- accessed ONLY via repositories

---

### Categories

→ [Category Module](modules/category.md)

- category definitions
- used by transactions
- supports budgeting

---

### Accounts

→ [Account Module](modules/account.md)

- wallet types (cash, bank, credit_card, e_wallet)
- balance tracking
- credit/debit operations

---

### Budgets

→ [Budget Module](modules/budget.md)

- budget calculations
- remaining balance
- usage tracking

---

### Recurring

→ [Recurring Module](modules/recurring.md)

- recurring transaction rules
- auto-generates transactions on due dates

---

### Hooks

→ [State](state.md)

- `use-transactions.ts` - CRUD + fetch
- `use-categories.ts` - CRUD + fetch
- `use-accounts.ts` - CRUD + fetch

---

### State

→ [State](state.md)

- global UI state (Zustand)
- no business logic

---

## Rules (Critical)

- UI MUST NOT access database directly
- all logic goes through services
- hooks use `store.getState()` in callbacks (prevents infinite loops)
- repositories handle ALL DB operations
- modules must stay isolated

---

## Navigation Strategy

If task is:

- UI change → `app/` screens
- business logic → `*.service.ts`
- data issue → repository → database
- state issue → `state/*.store.ts`
- hook issue → `hooks/use-*.ts`

---

## Goal

Minimize context usage.

Workflow:

1. read this file
2. jump via links
3. avoid scanning full codebase

