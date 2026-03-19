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
- Recurring module (all files, endDate support)
- Payable module (new — types, model, mapper, repo, service)
- All Zustand stores (+ settings store, payable store)
- Database schema + seeds + migrations (end_date, payables table)
- resetAllData() for full data wipe

### ✅ Completed (Frontend)
- `app/(tabs)/_layout.tsx` - Tab navigator (6 tabs: home, transactions, add, budgets, payables, settings)
- `app/(tabs)/index.tsx` - Dashboard (real sparkline, empty states, DB-connected)
- `app/(tabs)/transactions.tsx` - Transaction list with edit/delete modal (DatePickerField)
- `app/(tabs)/add.tsx` - Add transaction with recurring toggle (frequency, next date, end date pickers), manage links
- `app/(tabs)/budgets.tsx` - Budgets with create + edit/delete modals, category picker
- `app/(tabs)/payables.tsx` - Payables/utang tab (create, partial payment, mark paid, delete)
- `app/(tabs)/settings.tsx` - Settings (appearance modal, currency modal, reset data button)
- `app/accounts.tsx` - Account management (CRUD, DB-connected)
- `app/categories.tsx` - Category management (CRUD, DB-connected)
- `components/ui/date-picker-field.tsx` - Reusable native DateTimePicker component
- `components/dashboard/` - Dashboard components

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

