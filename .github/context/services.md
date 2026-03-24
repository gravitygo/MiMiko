# Services

Shared services that don't belong to specific modules.

---

## Currency Hook (hooks/use-currency.ts)

Currency conversion with exchange rate fetching.

### useCurrency()
- `rates`: fetched exchange rate data
- `loading`: fetch status
- `error`: error message if failed
- `baseCurrency`: user's preferred currency from settings
- `convert(amount, fromCurrency)`: converts amount to base currency
- `refresh()`: manually refetch rates

### useTotalBalance(accounts)
- Computes total balance across all accounts converted to base currency
- Returns `{ totalBalance, loading }`
- Used by dashboard to show unified balance

### Conversion Logic
- Rates are FROM base currency TO other currencies
- Formula: `amount / rates[fromCurrency]`
- Example: If base=PHP, rates.usd=0.017, then 100 USD → 100/0.017 = ~5,882 PHP

---

## Transfer Screen (app/transfer.tsx)

Account-to-account transfer with multi-currency support.

### Features
- Source/destination account selection via modal pickers
- Automatic exchange rate fetching for different currencies
- Fee input (optional)
- Transfer summary with converted amounts
- Full form validation

### Flow
```
Select accounts → Enter amount → Fetch exchange rate (if needed) → Review summary → Execute transfer
```

### Uses
- `currencyService.getExchangeRate()` for live rates
- `transactionService.add()` with type='transfer'

### Important: Account Balance Sync
After any transaction (transfer, expense, income):
- Database is updated via `accountService.credit()`/`debit()`
- **Must call `fetchAccounts()` to sync store with database**
- Without refresh, UI shows stale balances

---

## model-manager.ts

Model download and management for on-device AI.

- `getModelPath(type)`: returns document directory path for model
- `isModelDownloaded(type)`: checks if file exists
- `downloadModel(type, onProgress)`: downloads from HuggingFace with progress
- `deleteModel(type)`: remove cached model
- `getModelStatus()`: summary of all models
- `isSetupComplete()`: checks if first-open setup completed
- `markSetupComplete()`: marks setup as done

Models:
- whisper: `ggml-small.en-q5_1.bin` (~181MB) - Speech-to-text
- llama: `tinyllama-1.1b-chat.Q4_K_M.gguf` (~636MB) - Transaction parsing

---

## backup.service.ts

Data backup and restore functionality.

- `createBackupService()`: factory function returning service instance

### Methods

- `backup()`: exports all data as JSON file via share sheet
  - Returns: `{ success: boolean; error?: string }`
  - Exports: categories, accounts, transactions, budgets, recurring_rules, debts

- `restore()`: imports backup from JSON file picker
  - Returns: `{ success: boolean; error?: string }`
  - Validates backup format before import
  - Replaces ALL existing data

- `getBackupInfo()`: returns counts of exportable data
  - Returns: `{ transactionCount, categoryCount, accountCount }`

### Backup Format (v1)

```json
{
  "version": 1,
  "createdAt": "ISO-8601",
  "data": {
    "categories": [...],
    "accounts": [...],
    "transactions": [...],
    "budgets": [...],
    "recurring_rules": [...],
    "debts": [...]
  }
}
```

### Dependencies
- expo-file-system/legacy (migrated from deprecated expo-file-system API)
- expo-sharing
- expo-document-picker

