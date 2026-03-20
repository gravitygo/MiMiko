# Recurring Module

## recurring.types.ts
- RecurringFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
- RecurringType: 'expense' | 'income'
- RecurringRule: domain entity
- CreateRecurringRuleInput / UpdateRecurringRuleInput

## recurring.model.ts
- createRecurringRule(): builds new entity
- calculateNextDate(): computes next occurrence
- calculatePreviousDate(): computes previous occurrence (for undo/revert)

## recurring.repository.ts
- insert() / update() / delete()
- findById() / findAll()
- findActive(): enabled rules only
- findDue(): rules needing processing
- setActive(): enable/disable
- updateNextDate(): advance schedule

## recurring.service.ts
- add() / edit() / remove()
- getById() / getAll() / getActive()
- getDue(): rules ready to execute
- pause() / resume(): toggle active
- skipNext(): advance without creating
- processDue(): generate transactions

## recurring.mapper.ts
- mapRowToRecurringRule(): DB → domain

