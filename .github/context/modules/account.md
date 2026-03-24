# Account Module

Manages financial accounts (wallets) with balance tracking, multi-currency support, and credit card billing.

---

## account.types.ts

Types:
- `AccountType`: 'cash' | 'bank' | 'credit_card' | 'e_wallet'
- `Account`: domain entity (id, name, type, balance, currency, icon, color, isDefault, billingDate?, deadlineDate?, timestamps)
- `AccountRow`: DB row shape (snake_case)
- `CreateAccountInput`: name, type, balance?, currency?, icon?, color?, billingDate?, deadlineDate?
- `UpdateAccountInput`: all fields optional

---

## account.model.ts

- `createAccount(input)`: builds new Account with UUID + timestamps, default balance 0, currency 'php'
- `adjustBalance(account, amount)`: returns new Account with adjusted balance

---

## account.repository.ts

Factory: `createAccountRepository()`

- `insert(account)`: writes to DB
- `update(account)`: modifies existing
- `delete(id)`: removes by id
- `findById(id)`: single lookup
- `findAll()`: all accounts sorted by default first
- `findByType(type)`: filter by account type
- `findDefault()`: get default account
- `updateBalance(id, balance)`: direct balance update

---

## account.service.ts

Factory: `createAccountService()`

- `add(input)`: create + persist
- `edit(id, input)`: update metadata (not balance), supports currency and billing dates
- `remove(id)`: delete account
- `getById(id)`: single fetch
- `getAll()`: all accounts
- `getByType(type)`: filtered by type
- `getDefault()`: fetch default account
- `credit(id, amount)`: increase balance (used by income transactions)
- `debit(id, amount)`: decrease balance (used by expense transactions)
- `setBalance(id, balance)`: direct balance set
- `getTotalBalance()`: sum of all account balances

---

## credit-card.service.ts

Factory: `createCreditCardService()`

- `getBillingInfo(account)`: returns billing cycle info + aggregated amounts
- `countOccurrencesInPeriod(rule, start, end)`: counts recurring occurrences in period
- `getNextOccurrence(date, frequency)`: calculates next recurring date
- `getCreditCardReminders()`: all credit card reminders with due dates
- `getDueReminders(daysAhead)`: reminders due within N days

Types:
- `CreditCardBillingInfo`: billing cycle dates, amounts, grand total
- `CreditCardReminder`: account info, amount, deadline, overdue status

---

## account.mapper.ts

- `mapRowToAccount(row)`: DB row → domain entity
- `mapAccountToRow(account)`: domain entity → DB row

---

## DB Table: accounts

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT | PK, UUID |
| name | TEXT | display name |
| type | TEXT | 'cash', 'bank', etc |
| balance | REAL | current balance |
| currency | TEXT | currency code (default 'php') |
| icon | TEXT | icon identifier |
| color | TEXT | hex color |
| is_default | INTEGER | 1 = default account |
| billing_date | INTEGER | day of month (1-31), credit cards only |
| deadline_date | INTEGER | day of month (1-31), credit cards only |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

---

## Usage Pattern

```ts
// Basic account operations
const service = createAccountService();
const account = await service.getDefault();
await service.debit(account.id, 50000); // expense
await service.credit(account.id, 100000); // income

// Credit card billing
const ccService = createCreditCardService();
const reminders = await ccService.getDueReminders(7);
const billingInfo = await ccService.getBillingInfo(creditCardAccount);
```

