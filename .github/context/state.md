# State

Zustand stores for global UI state + hooks for service integration.

---

## Stores

### state/transaction.store.ts

- `useTransactionStore`
- `setTransactions()`: replace all
- `appendTransactions()`: pagination
- `addTransaction()`: prepend one
- `updateTransaction()`: update by id
- `removeTransaction()`: delete by id
- `setSelectedTransaction()`: for detail view
- `setFilter()`: update filter
- `setTotalCount()`: pagination count
- `setLoading()`: loading state
- `setError()`: error message
- `reset()`: clear all

---

### state/category.store.ts

- `useCategoryStore`
- `setCategories()`: replace all
- `addCategory()`: append one
- `updateCategory()`: update by id
- `removeCategory()`: delete by id
- `setSelectedCategory()`: for detail view
- `setLoading()`: loading state
- `setError()`: error message
- `reset()`: clear all

---

### state/account.store.ts

- `useAccountStore`
- `setAccounts()`: replace all
- `addAccount()`: append one
- `updateAccount()`: update by id
- `removeAccount()`: delete by id
- `setLoading()`: loading state
- `setError()`: error message
- `reset()`: clear all

---

### state/budget.store.ts

- `useBudgetStore`
- `setBudgets()`: replace all
- `addBudget()`: append one
- `updateBudget()`: update by id
- `removeBudget()`: delete by id

---

### state/recurring.store.ts

- `useRecurringStore`
- `setRules()`: replace all
- `addRule()`: append one
- `updateRule()`: update by id
- `removeRule()`: delete by id

---

### state/settings.store.ts

- `useSettingsStore`
- `appearance`: 'system' | 'light' | 'dark' (default: 'system')
- `currency`: 'USD' | 'PHP' | 'IDR' (default: 'USD')
- `setAppearance()`: change color scheme mode
- `setCurrency()`: change currency
- `getCurrencySymbol()`: helper to get symbol from code
- `CURRENCIES`: exported constant with code, symbol, name

---

## Hooks (Service Integration)

### hooks/use-transactions.ts

Bridge: UI ↔ TransactionService ↔ Store

- `fetch(filter?)`: load transactions with optional filter
- `add(input)`: create transaction
- `edit(id, input)`: update transaction
- `remove(id)`: delete transaction
- `duplicate(id)`: clone transaction

**Pattern:** Uses `store.getState()` inside callbacks to prevent infinite loops.

---

### hooks/use-categories.ts

Bridge: UI ↔ CategoryService ↔ Store

- `fetch()`: load all categories
- `add(input)`: create category
- `edit(id, input)`: update category
- `remove(id)`: delete category (blocks defaults)

---

### hooks/use-accounts.ts

Bridge: UI ↔ AccountService ↔ Store

- `fetch()`: load all accounts
- `add(input)`: create account
- `edit(id, input)`: update account
- `remove(id)`: delete account

---

## Hook Pattern (IMPORTANT)

```ts
// ✅ CORRECT: Use getState() in callbacks
const fetch = useCallback(async () => {
  const { setLoading, setError, setData } = useStore.getState();
  setLoading(true);
  // ...
}, []);

// ❌ WRONG: Causes infinite loop
const store = useStore();
const fetch = useCallback(async () => {
  store.setLoading(true); // store ref changes every render
}, [store]);
```

---

## Missing Hooks (TODO)

- `use-budgets.ts` - not created yet
- `use-recurring.ts` - not created yet

