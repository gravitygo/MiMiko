# Transaction Module

Core module for expense/income/transfer tracking with account balance management and multi-currency support.

---

## transaction.types.ts

Types:
- `TransactionType`: 'expense' | 'income' | 'transfer'
- `Transaction`: domain entity with transfer support
  - Base: id, type, amount, description, categoryId, accountId, date, timestamps
  - Transfer fields: toAccountId, toAmount, fee, feeAmount, exchangeRate
- `TransactionRow`: DB row shape (snake_case)
- `TransactionFilter`: query params (type?, categoryId?, accountId?, startDate?, endDate?, limit?, offset?)
- `CreateTransactionInput`: required fields for creation (includes transfer fields)
- `UpdateTransactionInput`: all fields optional for partial update

---

## transaction.model.ts

- `createTransaction(input)`: builds new Transaction with UUID + timestamps
- `duplicateTransaction(tx)`: clones with new id + today's date
- `isTransfer(tx)`: checks if transaction is a transfer type

---

## transaction.repository.ts

Factory: `createTransactionRepository()`

- `insert(tx)`: writes to DB (includes transfer columns)
- `update(tx)`: modifies existing (includes transfer columns)
- `delete(id)`: removes by id
- `findById(id)`: single lookup
- `findAll(filter)`: paginated fetch with optional filters
- `findByDateRange(start, end)`: date-bounded query
- `findByCategory(categoryId, limit)`: category-filtered
- `sumByType(type, start, end)`: total expense or income
- `sumByCategory(categoryId, start, end)`: category spending
- `count(filter)`: total matching records

---

## transaction.service.ts

Factory: `createTransactionService()`

- `add(input)`: create + persist + adjust account balance (handles transfers)
- `edit(id, input)`: update + rebalance account (reverses old, applies new)
- `remove(id)`: delete + reverse balance
- `duplicate(id)`: clone transaction with new id/date + adjust balance
- `getById(id)`: single fetch
- `getAll(filter)`: filtered list
- `getByDateRange(start, end)`: date range query
- `getByCategory(categoryId, limit)`: category transactions
- `getTotalExpenses(start, end)`: sum of expense type
- `getTotalIncome(start, end)`: sum of income type
- `getCategoryTotal(categoryId, start, end)`: category spending
- `count(filter)`: filtered count

**Key Logic:**
- `adjustAccountBalance()`: internal helper, credits/debits account based on transaction type
- `adjustTransferBalances(tx, toAmount?)`: handles transfer logic (debit source, credit destination with toAmount for multi-currency)

---

## transaction.mapper.ts

- `mapRowToTransaction(row)`: DB row → domain entity (includes transfer fields)

---

## DB Table: transactions

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | PK, UUID |
| type | TEXT | 'expense', 'income', or 'transfer' |
| amount | REAL | transaction amount (source currency) |
| description | TEXT | optional note |
| category_id | TEXT | FK to categories |
| account_id | TEXT | FK to accounts |
| to_account_id | TEXT | FK to accounts (transfer destination) |
| to_amount | REAL | destination amount (for multi-currency transfers) |
| fee | REAL | transfer fee amount |
| exchange_rate | REAL | currency conversion rate |
| date | TEXT | ISO timestamp |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

---

## Transfer Flow

### Same Currency
```
Source Account → (amount - fee) → Destination Account
```

### Multi-Currency
```
Source Account (USD) → amount → [exchange_rate] → toAmount → Destination Account (PHP)
```

- Debits source account by full amount (in source currency)
- Credits destination account by toAmount (in destination currency)
- Fee is absorbed as cost from source amount

---

## Multi-Currency Support

Each account has a `currency` field (e.g., 'php', 'usd', 'eur').

For multi-currency transfers:
- `amount`: value debited from source (in source currency)
- `toAmount`: value credited to destination (in destination currency)
- `exchangeRate`: conversion rate used

Example: Transfer $100 USD to PHP account at rate 56.5
- amount: 100
- toAmount: 5650
- exchangeRate: 56.5

---

## Usage Pattern

```ts
const service = createTransactionService();

// Regular expense
const expense = await service.add({
  type: 'expense',
  amount: 50000,
  categoryId: 'cat-id',
  accountId: 'acc-id',
  date: new Date().toISOString(),
});

// Same-currency transfer
const transfer = await service.add({
  type: 'transfer',
  amount: 10000,
  accountId: 'source-acc-id',
  toAccountId: 'dest-acc-id',
  fee: 50,
  date: new Date().toISOString(),
});

// Multi-currency transfer (USD to PHP)
const currencyTransfer = await service.add({
  type: 'transfer',
  amount: 100,           // $100 USD
  toAmount: 5650,        // ₱5,650 PHP
  exchangeRate: 56.5,
  accountId: 'usd-acc-id',
  toAccountId: 'php-acc-id',
  date: new Date().toISOString(),
});
```

