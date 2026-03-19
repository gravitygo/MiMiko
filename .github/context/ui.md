# UI Components

Lightweight reference for UI components.

---

## Dashboard Components

Location: `components/dashboard/`

### bento-card.tsx
- `BentoCard`: base container for Bento Box UI
- sizes: `1x1`, `2x1`, `2x2`, `1x2`
- supports `onPress` for pressable cards

### balance-card.tsx
- `BalanceCard`: large 2x2 card showing total balance
- displays income/expense summary
- includes mini sparkline graph

### quick-add-card.tsx
- `QuickAddCard`: medium 2x1 shortcut to add transaction
- navigates to `/add` on press

### category-card.tsx
- `CategoryCard`: small 1x1 card for category spending
- shows icon, percentage bar, amount

### budget-summary-card.tsx
- `BudgetSummaryCard`: small 1x1 budget status card
- shows spent/total with progress bar
- color-coded by alert level (safe/warning/exceeded)

### recent-transaction-item.tsx
- `RecentTransactionItem`: list item for transactions
- shows category icon, description, amount, date

---

## Design System

### Bento Box UI Strategy
- Variable grid with different card sizes
- High border radius (`rounded-3xl`)
- Dark navy/charcoal background instead of pure black
- Subtle borders (`border-white/5`) instead of shadows

### NativeWind Classes
- Card: `bg-surface dark:bg-surface-dark border border-border/50 dark:border-white/5 rounded-3xl`
- Typography: `font-bold tracking-tight`
- Alert colors: safe (green), warning (yellow), exceeded (red)

---

## Icon System

- All icons use **Ionicons** from `@expo/vector-icons`
- Categories and accounts store icon names in DB (e.g., 'restaurant', 'cart', 'wallet')
- Icon rendering: `<Ionicons name={iconName as any} size={20} color={color} />`
- Colored circular backgrounds: `backgroundColor: color + '20'` (20% opacity)
- Fallback icon: 'wallet' for invalid/missing icon names

---

## Screens

### Home Dashboard (`app/(tabs)/index.tsx`)
- Bento Box layout with variable grid
- Components: BalanceCard, QuickAddCard, CategoryCards, BudgetSummaryCards, RecentTransactions
- Pull-to-refresh support
- Shows placeholder data when stores empty
- Safe area insets for notch devices

### Transactions (`app/(tabs)/transactions.tsx`)
- FlatList with grouped transactions by date
- Date headers: Today, Yesterday, or full date
- TransactionItem component with category icon, name, amount
- Edit/delete modal on tap: edit amount, description, date (DatePickerField), delete with confirmation
- Empty state with "Add Transaction" CTA
- Pull-to-refresh support

### Budgets (`app/(tabs)/budgets.tsx`)
- Budget list with progress indicators
- Create budget modal with Monthly vs Category type selector
- Edit budget modal on card tap (name, amount, delete)
- Category picker (horizontal scroll) when type is "category"
- Auto-names budget from selected category
- Alert level visualization (safe/warning/exceeded)
- Overview header with total budget stats
- Pull-to-refresh support

### Add Transaction (`app/(tabs)/add.tsx`)
- Transaction form with amount, description
- Category picker with Ionicons grid + "Manage" link to /categories
- Account selector with Ionicons + "Manage" link to /accounts
- Type toggle (expense/income)
- Recurring toggle (Switch) — shows frequency picker, next date (DatePickerField), end date (DatePickerField)
- On submit with recurring: creates both transaction + recurring rule

### Payables (`app/(tabs)/payables.tsx`)
- Tab screen for tracking debts/utang/installments
- Unpaid/Paid toggle filter
- Total outstanding header
- PayableItem with progress bar, due date, overdue indicator
- Create modal: name, total amount, due date (DatePickerField), description
- Detail modal: view total/remaining, make partial payment, mark fully paid, delete
- Uses `usePayables` hook

### Categories Management (`app/categories.tsx`)
- Full-screen modal (Stack.Screen)
- List of categories with icons and colors
- Add/edit category modal

### Recurring Payments (`app/recurring.tsx`)
- Full-screen route (Stack.Screen)
- FlatList of recurring rules with status badge (Active/Paused)
- Shows category icon, frequency, next date, amount
- Empty state with CTA to create first rule
- Create modal: type (expense/income), name, amount, description, frequency picker, next date, category picker, account picker
- Navigable from Settings > Account section
- Icon picker grid using CATEGORY_ICONS array
- Color picker for category colors
- Delete category with confirmation
- Uses `useCategories` hook

### Accounts Management (`app/accounts.tsx`)
- Full-screen modal (Stack.Screen)
- List of accounts with icons and balances
- Add/edit account modal
- Icon picker for account type
- Balance display
- Uses `useAccounts` hook

---

## Budget Components

Location: `components/budgets/`

### budget-card.tsx
- `BudgetCard`: full-width budget progress card
- shows spent/remaining/percentage
- color-coded progress bar by alert level

### add-budget-card.tsx
- `AddBudgetCard`: dashed border card to add new budget
- triggers add budget modal

### budget-overview-header.tsx
- `BudgetOverviewHeader`: summary card for all budgets
- shows total budget, spent, percentage used

### empty-budgets.tsx
- `EmptyBudgets`: placeholder when no budgets exist

---

## Navigation Components

Location: `components/navigation/`

### floating-tab-bar.tsx
- `FloatingTabBar`: custom bottom tab bar with floating dock design
- semi-transparent background with blur effect
- positioned with margins for floating appearance
- rounded corners (`rounded-3xl`)
- shadow for depth

- `AddButton`: enhanced center button with outer glow effect
- elevated position (floats above tab bar)
- primary color with glow shadow
- iOS/Android shadow support

### Tab Configuration
- Home: `home` / `home-outline` icons
- Transactions: `list` / `list-outline` icons
- Add: centered elevated button with `add` icon
- Budgets: `pie-chart` / `pie-chart-outline` icons
- Settings: `settings` / `settings-outline` icons

### Design Details
- Dark mode: `rgba(18, 18, 20, 0.85)` background
- Light mode: `rgba(255, 255, 255, 0.85)` background
- Border: subtle 10% opacity
- Button glow: primary color with 0.8 opacity shadow
- Safe area insets respected

