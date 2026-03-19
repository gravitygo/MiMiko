# Budget Module

## Architecture
- **1 monthly budget** = parent envelope (total spending limit)
- **N category budgets** = sub-limits within monthly budget
- Service enforces: only 1 monthly budget per month (upserts if exists)

## budget.types.ts
- BudgetType: 'monthly' | 'category'
- Budget: domain entity
- BudgetStatus: spent/remaining/percentage
- BudgetAlertLevel: 'safe' | 'warning' | 'exceeded'
- CreateBudgetInput / UpdateBudgetInput

## budget.model.ts
- createBudget(): builds new entity
- createBudgetStatus(): calculates progress
- getMonthDateRange(): current month bounds

## budget.repository.ts
- insert() / update() / delete()
- findById() / findAll() / findByType()
- findActive(): budgets for date
- findByCategory(): category budget
- findMonthlyBudget(): current monthly

## budget.service.ts
- add(): upserts monthly budget (enforces limit=1), creates category budgets
- edit() / remove()
- getById() / getAll() / getActive()
- getStatus(): single budget progress
- getCategoryBudgetStatus(): category progress
- getAllStatuses(): all progress
- getActiveAlerts(): warning/exceeded only
- createMonthlyBudget(): upsert monthly
- createCategoryBudget(): new category budget

## budget.mapper.ts
- mapRowToBudget(): DB → domain

