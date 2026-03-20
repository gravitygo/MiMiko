# Debt Module

Replaces old payable module. Tracks who owes who (payables/receivables).

## debt.types.ts
- `DebtDirection`: 'payable' | 'receivable'
- `Debt`: id, personName, direction, amount, description, dueDate, isSettled, categoryId, accountId
- `CreateDebtInput`: personName, direction, amount + optional description, dueDate, categoryId, accountId

## debt.model.ts
- `createDebt()`: creates Debt entity with UUID

## debt.mapper.ts
- `toDebt()`: DebtRow → Debt
- `toDebtRow()`: Debt → DebtRow

## debt.repository.ts
- `insert()`: write to DB
- `update()`: update debt
- `delete()`: remove debt
- `findUnsettled()`: all unsettled, ordered by due_date
- `settle()`: mark is_settled = 1
- `unsettle()`: mark is_settled = 0 (for undo/revert)
- `sumUnsettledPayables()`: total amount you owe (for ghost allocated)

## debt.service.ts
- `add()`: create new debt
- `edit()`: update debt info
- `remove()`: delete debt
- `settle()`: mark settled + create real transaction (expense for payable, income for receivable)
- `getUnsettled()`: all unsettled debts
- `getCommittedPayables()`: sum for ghost balance

## Flow
- User adds debt via Owe tab in add screen
- Unsettled debts show in dashboard reminders
- Swipe right to settle → creates real transaction
- Ghost allocated shows committed payable amount in balance card
