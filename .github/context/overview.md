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
- Recurring module (all files, endDate support, processDue for reminders)
- Debt module (replaces payable — types, model, mapper, repo, service)
- All Zustand stores (+ settings, debt stores)
- Database schema + seeds + migrations (end_date, payables, debts tables)
- resetAllData() for full data wipe

### ✅ Completed (Frontend)
- `app/(tabs)/_layout.tsx` - Tab navigator (5 tabs: home, transactions, add, budgets, settings; payables hidden)
- `app/(tabs)/index.tsx` - Dashboard (sparkline, reminders section with swipe, ghost allocated balance, useFocusEffect)
- `app/(tabs)/transactions.tsx` - Transaction list with edit/delete modal (DatePickerField, useFocusEffect)
- `app/(tabs)/add.tsx` - Add transaction/owe with 3 tabs (Expense | Income | Owe), recurring toggle, manage links
- `app/(tabs)/budgets.tsx` - Budgets with create + edit/delete modals, category picker, category pie chart (useFocusEffect)
- `app/(tabs)/settings.tsx` - Settings (appearance modal, currency modal, reset data button)
- `app/accounts.tsx` - Account management (CRUD, DB-connected)
- `app/categories.tsx` - Category management (CRUD, DB-connected)
- `components/ui/date-picker-field.tsx` - Reusable native DateTimePicker component
- `components/dashboard/reminders-list.tsx` - Swipeable reminder cards (recurring + debts)
- `components/dashboard/` - Dashboard components (balance card with ghost allocated)

### ✅ Completed (Voice)
- Voice module (types, model, mapper, repo, service)
- `state/voice.store.ts` - Voice log state
- `hooks/use-voice.ts` - Voice log CRUD
- `app/voice.tsx` - Voice recording modal (expo-speech-recognition, on-device)
- Voice log viewer in settings
- Database: voice_logs table

### ✅ New Features
- Reminders revert: swipe LEFT = undo, long press = skip, swipe RIGHT = paid
- Balance card: expandable account breakdown (tap to toggle)
- Transaction filters: type pills, category picker, date presets + custom range
- Voice mode: long press add button → voice recording modal

### ❌ Not Started
- AI module (voice → transaction parsing)

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
- reminders shown on dashboard (swipe to confirm/skip)
- does NOT auto-create transactions; user confirms via swipe

---

### Debts (Payables/Receivables)

→ [Debt Module](modules/debt.md)

- tracks who owes who
- payable = I owe them, receivable = they owe me
- settling creates real transaction
- ghost allocated in balance card

---

### Hooks

→ [State](state.md)

- `use-transactions.ts` - CRUD + fetch
- `use-categories.ts` - CRUD + fetch
- `use-accounts.ts` - CRUD + fetch
- `use-debts.ts` - CRUD + fetch + settle
- `use-recurring.ts` - CRUD + fetch

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

