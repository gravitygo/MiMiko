# Payable Module

## payable.types.ts
- Payable: domain entity (id, name, totalAmount, remainingAmount, dueDate, description, isPaid, categoryId, accountId)
- PayableRow: DB row type
- CreatePayableInput: name, totalAmount, dueDate, optional description/categoryId/accountId
- UpdatePayableInput: all fields optional

## payable.model.ts
- createPayable(): builds new entity with remainingAmount = totalAmount

## payable.repository.ts
- insert() / update() / delete()
- findById() / findAll() / findUnpaid()
- markPaid(): sets isPaid=1, remainingAmount=0
- makePayment(): decrements remainingAmount, auto-marks paid if <= 0

## payable.service.ts
- add() / edit() / remove()
- getAll() / getUnpaid()
- markPaid(id, fromAccountId?): debits fromAccountId if provided, then marks paid
- makePayment(id, amount, fromAccountId?): debits fromAccountId if provided, then decrements remainingAmount

## payable.mapper.ts
- mapRowToPayable(): DB → domain
