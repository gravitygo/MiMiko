import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ReminderItem, ReminderType } from '@/components/dashboard';
import {
    BalanceCard,
    RecentTransactionItem,
    RemindersList,
} from '@/components/dashboard';
import { useAccounts } from '@/hooks/use-accounts';
import { useBudgets } from '@/hooks/use-budgets';
import { useCategories } from '@/hooks/use-categories';
import { useTotalBalance } from '@/hooks/use-currency';
import { useDebts } from '@/hooks/use-debts';
import { useRecurring } from '@/hooks/use-recurring';
import { useTransactions } from '@/hooks/use-transactions';
import { createCreditCardService, type CreditCardReminder } from '@/modules/account/credit-card.service';
import { createDebtRepository } from '@/modules/debt/debt.repository';
import { calculateNextDate } from '@/modules/recurring/recurring.model';
import { createRecurringService } from '@/modules/recurring/recurring.service';
import { createTransactionService } from '@/modules/transaction/transaction.service';
import { useAccountStore } from '@/state/account.store';
import { useBudgetStore } from '@/state/budget.store';
import { useCategoryStore } from '@/state/category.store';
import { useDebtStore } from '@/state/debt.store';
import { useRecurringStore } from '@/state/recurring.store';
import { formatCurrency } from '@/state/settings.store';
import { useTransactionStore } from '@/state/transaction.store';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const BOTTOM_NAV_HEIGHT = 130;
const UNDO_EXPIRY_MS = 30_000;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
function formatFrequency(frequency: string, customDays?: number[] | null): string {
  if (frequency === 'custom' && customDays?.length) {
    return customDays.map((d) => DAY_NAMES[d]).join(', ');
  }
  return frequency;
}

interface UndoAction {
  action: 'confirm' | 'skip';
  previousNextDate: string;
  transactionId?: string;
  timestamp: number;
}

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  // Recurring: stack-based undo (no time limit, undo back to first txn)
  const [recurringUndoStack, setRecurringUndoStack] = useState<Map<string, UndoAction[]>>(new Map());
  // Debts: single undo with time limit
  const [debtUndoMap, setDebtUndoMap] = useState<Map<string, UndoAction>>(new Map());
  const [ccReminders, setCcReminders] = useState<CreditCardReminder[]>([]);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { fetch: fetchTransactions } = useTransactions();
  const { fetch: fetchCategories } = useCategories();
  const { fetch: fetchAccounts } = useAccounts();
  const { fetchStatuses: fetchBudgetStatuses } = useBudgets();
  const { fetch: fetchRecurring } = useRecurring();
  const { fetchUnsettled: fetchDebts } = useDebts();

  const accounts = useAccountStore((state) => state.accounts);
  const transactions = useTransactionStore((state) => state.transactions);
  const categories = useCategoryStore((state) => state.categories);
  const budgetStatuses = useBudgetStore((state) => state.statuses);
  const recurringRules = useRecurringStore((state) => state.rules);
  const debts = useDebtStore((state) => state.debts);

  // Use currency conversion hook for total balance across all accounts
  const { totalBalance } = useTotalBalance(accounts);

  // Single monthly budget (parent of all category budgets)
  const monthlyBudget = useMemo(
    () => budgetStatuses.find((s) => s.budget.type === 'monthly') ?? null,
    [budgetStatuses]
  );

  const { monthlyIncome, monthlyExpense } = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    return transactions.reduce(
      (acc, t) => {
        if (t.date >= startOfMonth) {
          if (t.type === 'income') {
            acc.monthlyIncome += t.amount;
          } else {
            acc.monthlyExpense += t.amount;
          }
        }
        return acc;
      },
      { monthlyIncome: 0, monthlyExpense: 0 }
    );
  }, [transactions]);

  // Build sparkline from last 7 days of net daily spend
  const sparklineData = useMemo(() => {
    const days: number[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayTotal = transactions
        .filter((t) => t.date.startsWith(dateStr) && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      days.push(dayTotal);
    }
    return days;
  }, [transactions]);

  const topCategories = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const categorySpending: Record<string, number> = {};

    transactions.forEach((t) => {
      if (t.type === 'expense' && t.date >= startOfMonth) {
        categorySpending[t.categoryId] = (categorySpending[t.categoryId] || 0) + t.amount;
      }
    });

    const totalSpending = Object.values(categorySpending).reduce((sum, v) => sum + v, 0);

    return Object.entries(categorySpending)
      .map(([categoryId, amount]) => {
        const category = categories.find((c) => c.id === categoryId);
        if (!category) return null;
        return {
          id: categoryId,
          name: category.name,
          icon: category.icon as IconName,
          color: category.color,
          amount,
          percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.amount || 0) - (a?.amount || 0))
      .slice(0, 5);
  }, [transactions, categories]);

  const recentTransactions = useMemo(() => {
    return transactions
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map((t) => {
        const category = categories.find((c) => c.id === t.categoryId);
        return {
          ...t,
          categoryName: category?.name || 'Unknown',
          categoryIcon: (category?.icon || 'help-circle') as IconName,
          categoryColor: category?.color || '#888888',
        };
      });
  }, [transactions, categories]);

  // Ghost allocated: unpaid payables you owe + next recurring expense amounts
  const committed = useMemo(() => {
    const payableTotal = debts
      .filter((d) => !d.isSettled && d.direction === 'payable')
      .reduce((sum, d) => sum + d.amount, 0);

    const recurringTotal = recurringRules
      .filter((r) => r.isActive && r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);

    return payableTotal + recurringTotal;
  }, [debts, recurringRules]);

  // Build reminder items from recurring rules + unsettled debts + credit card billing
  const reminderItems = useMemo<ReminderItem[]>(() => {
    const today = new Date().toISOString().split('T')[0];
    const now = Date.now();
    const items: ReminderItem[] = [];

    // Recurring reminders
    for (const rule of recurringRules) {
      if (!rule.isActive) continue;
      const isOverdue = rule.nextDate <= today;
      const category = categories.find((c) => c.id === rule.categoryId);
      const stack = recurringUndoStack.get(rule.id);
      const canRevert = stack !== undefined && stack.length > 0;

      items.push({
        id: rule.id,
        type: 'recurring',
        title: rule.name,
        subtitle: `${formatFrequency(rule.frequency, rule.customDays)} · ${category?.name || 'Unknown'}`,
        amount: rule.amount,
        icon: (category?.icon || 'repeat') as IconName,
        iconColor: category?.color || '#A8E6CF',
        dueDate: rule.nextDate,
        dueLabel: isOverdue ? 'Due' : rule.nextDate,
        isOverdue,
        direction: rule.type === 'expense' ? 'payable' : 'receivable',
        canRevert,
      });
    }

    // Debt reminders
    for (const debt of debts) {
      if (debt.isSettled) continue;
      const isOverdue = debt.dueDate ? debt.dueDate <= today : false;
      const undo = debtUndoMap.get(debt.id);
      const canRevert = undo !== undefined && (now - undo.timestamp) < UNDO_EXPIRY_MS;

      items.push({
        id: debt.id,
        type: 'debt',
        title: debt.personName,
        subtitle: debt.description || (debt.direction === 'receivable' ? 'Owes you' : 'You owe'),
        amount: debt.amount,
        icon: debt.direction === 'receivable' ? 'arrow-down' : 'arrow-up',
        iconColor: debt.direction === 'receivable' ? '#05DF72' : '#FF6B6B',
        dueDate: debt.dueDate ?? null,
        dueLabel: debt.dueDate
          ? (isOverdue ? 'Overdue' : debt.dueDate)
          : 'No due date',
        isOverdue,
        direction: debt.direction,
        canRevert,
      });
    }

    // Credit card billing reminders
    for (const cc of ccReminders) {
      const dueLabel = cc.isOverdue
        ? 'Overdue'
        : cc.daysUntilDeadline === 0
        ? 'Due today'
        : `Due ${cc.deadlineDate}`;

      const billingEndFormatted = new Date(cc.billingDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      items.push({
        id: cc.accountId,
        type: 'credit_card',
        title: cc.accountName,
        subtitle: `Credit card · cycle ends ${billingEndFormatted}`,
        amount: cc.amount,
        icon: 'card' as IconName,
        iconColor: '#0084D1',
        dueDate: cc.deadlineDate,
        dueLabel,
        isOverdue: cc.isOverdue,
        direction: 'payable',
      });
    }

    // Sort: overdue first, then chronologically by due date (earliest first)
    return items.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      const dateA = a.dueDate ?? '9999-12-31';
      const dateB = b.dueDate ?? '9999-12-31';
      return dateA.localeCompare(dateB);
    });
  }, [recurringRules, debts, ccReminders, categories, recurringUndoStack, debtUndoMap]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const loadData = useCallback(async () => {
    await Promise.all([
      fetchAccounts(),
      fetchTransactions({ limit: 50 }),
      fetchCategories(),
      fetchBudgetStatuses(),
      fetchRecurring(),
      fetchDebts(),
    ]);
    const ccService = createCreditCardService();
    const reminders = await ccService.getCreditCardReminders();
    setCcReminders(reminders);
  }, [fetchAccounts, fetchTransactions, fetchCategories, fetchBudgetStatuses, fetchRecurring, fetchDebts]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleReminderConfirm = useCallback(async (id: string, type: ReminderType) => {
    if (type === 'recurring') {
      const rule = recurringRules.find((r) => r.id === id);
      if (!rule) return;

      const previousNextDate = rule.nextDate;

      // Create the transaction
      const transactionService = createTransactionService();
      const transaction = await transactionService.add({
        type: rule.type,
        amount: rule.amount,
        description: rule.description ?? rule.name,
        categoryId: rule.categoryId,
        accountId: rule.accountId,
        date: new Date().toISOString(),
        recurringRuleId: rule.id,
      });

      // Advance nextDate
      const recurringService = createRecurringService();
      const nextDate = calculateNextDate(rule.nextDate, rule.frequency, rule.customDays);

      if (rule.endDate && nextDate > rule.endDate) {
        await recurringService.pause(rule.id);
      } else {
        await recurringService.edit(rule.id, { nextDate });
      }

      // Push to recurring undo stack (no time limit)
      setRecurringUndoStack((prev) => {
        const next = new Map(prev);
        const stack = next.get(id) ?? [];
        next.set(id, [...stack, {
          action: 'confirm',
          previousNextDate,
          transactionId: transaction.id,
          timestamp: Date.now(),
        }]);
        return next;
      });

      await loadData();
    } else if (type === 'debt') {
      const debt = debts.find((d) => d.id === id);
      if (!debt) return;

      // Create settlement transaction manually so we can track its ID
      const txType = debt.direction === 'payable' ? 'expense' : 'income';
      const transactionService = createTransactionService();
      const transaction = await transactionService.add({
        type: txType,
        amount: debt.amount,
        description: `${debt.direction === 'payable' ? 'Paid' : 'Received from'} ${debt.personName}${debt.description ? ': ' + debt.description : ''}`,
        categoryId: debt.categoryId ?? 'cat_transfers',
        accountId: debt.accountId ?? 'acc_cash',
        date: new Date().toISOString(),
      });

      // Mark debt as settled
      const debtRepo = createDebtRepository();
      await debtRepo.settle(id);

      // Track debt undo (with time limit)
      setDebtUndoMap((prev) => {
        const next = new Map(prev);
        next.set(id, {
          action: 'confirm',
          previousNextDate: '',
          transactionId: transaction.id,
          timestamp: Date.now(),
        });
        return next;
      });

      await loadData();
    }
  }, [recurringRules, debts, loadData]);

  const handleReminderRevert = useCallback(async (id: string, type: ReminderType) => {
    if (type === 'recurring') {
      const stack = recurringUndoStack.get(id);
      if (!stack || stack.length === 0) return;

      // Pop the most recent action
      const undo = stack[stack.length - 1];

      const recurringService = createRecurringService();
      await recurringService.edit(id, { nextDate: undo.previousNextDate });

      // Delete the auto-created transaction if it was a confirm
      if (undo.action === 'confirm' && undo.transactionId) {
        const transactionService = createTransactionService();
        await transactionService.remove(undo.transactionId);
      }

      // Pop from stack
      setRecurringUndoStack((prev) => {
        const next = new Map(prev);
        const currentStack = [...(next.get(id) ?? [])];
        currentStack.pop();
        if (currentStack.length === 0) {
          next.delete(id);
        } else {
          next.set(id, currentStack);
        }
        return next;
      });
    } else if (type === 'debt') {
      const undo = debtUndoMap.get(id);
      if (!undo) return;

      // Un-settle the debt
      const debtRepo = createDebtRepository();
      await debtRepo.unsettle(id);

      // Delete the auto-created transaction
      if (undo.transactionId) {
        const transactionService = createTransactionService();
        await transactionService.remove(undo.transactionId);
      }

      // Remove from debt undo map
      setDebtUndoMap((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    }

    await loadData();
  }, [recurringUndoStack, debtUndoMap, loadData]);

  const handleReminderSkip = useCallback(async (id: string, type: ReminderType) => {
    if (type === 'recurring') {
      const rule = recurringRules.find((r) => r.id === id);
      if (!rule) return;

      const previousNextDate = rule.nextDate;

      const recurringService = createRecurringService();
      await recurringService.skipNext(id);

      // Push skip to undo stack
      setRecurringUndoStack((prev) => {
        const next = new Map(prev);
        const stack = next.get(id) ?? [];
        next.set(id, [...stack, {
          action: 'skip',
          previousNextDate,
          timestamp: Date.now(),
        }]);
        return next;
      });

      await loadData();
    }
  }, [recurringRules, loadData]);

  const handleReminderPress = useCallback((id: string, type: ReminderType) => {
    if (type === 'recurring') {
      router.push({ pathname: '/recurring', params: { editId: id } });
    } else if (type === 'credit_card') {
      router.push('/accounts');
    }
  }, [router]);

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: insets.top + 8,
        paddingBottom: BOTTOM_NAV_HEIGHT + 16,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6">
        <View>
          <Text className="text-text-muted dark:text-text-muted-dark text-sm">
            Welcome back
          </Text>
          <Text className="text-text-primary dark:text-text-primary-dark text-2xl font-bold tracking-tight">
            Dashboard
          </Text>
        </View>
      </View>

      {/* Balance Card */}
      <BalanceCard
        totalBalance={totalBalance}
        income={monthlyIncome}
        expense={monthlyExpense}
        committed={committed}
        sparklineData={sparklineData}
        accounts={accounts.map((a) => ({
          id: a.id,
          name: a.name,
          balance: a.balance,
          icon: a.icon,
          color: a.color,
          type: a.type,
          currency: a.currency,
        }))}
      />

      {/* Quick Actions */}
      <View className="flex-row mt-4 gap-3">
        <Pressable
          onPress={() => router.push('/transfer')}
          className="flex-1 bg-surface dark:bg-surface-dark border border-border/50 dark:border-white/5 rounded-2xl py-3 px-4 flex-row items-center justify-center active:opacity-70"
        >
          <Ionicons name="swap-horizontal" size={18} color="#6366F1" />
          <Text className="text-text-primary dark:text-text-primary-dark text-sm font-medium ml-2">
            Transfer
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/accounts')}
          className="flex-1 bg-surface dark:bg-surface-dark border border-border/50 dark:border-white/5 rounded-2xl py-3 px-4 flex-row items-center justify-center active:opacity-70"
        >
          <Ionicons name="wallet-outline" size={18} color="#05DF72" />
          <Text className="text-text-primary dark:text-text-primary-dark text-sm font-medium ml-2">
            Accounts
          </Text>
        </Pressable>
      </View>

      {/* Reminders Section */}
      {reminderItems.length > 0 && (
        <View className="mt-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-text-primary dark:text-text-primary-dark text-lg font-bold tracking-tight">
              Reminders
            </Text>
            <Text className="text-text-muted dark:text-text-muted-dark text-xs">
              → Paid · ← Undo · Hold Skip
            </Text>
          </View>
          <RemindersList
            items={reminderItems}
            onConfirm={handleReminderConfirm}
            onRevert={handleReminderRevert}
            onSkip={handleReminderSkip}
            onPress={handleReminderPress}
          />
        </View>
      )}

      {/* Top Categories — Compact Ranking */}
      <View className="mt-6">
        <Text className="text-text-primary dark:text-text-primary-dark text-lg font-bold tracking-tight mb-3">
          Top Categories
        </Text>
        {topCategories.length > 0 ? (
          <View className="bg-surface dark:bg-surface-dark border border-border/50 dark:border-white/5 rounded-3xl px-4 py-2">
            {topCategories.map((cat, index) => (
              <View key={cat?.id}>
                <View className="flex-row items-center py-3">
                  <Text className="text-text-muted dark:text-text-muted-dark text-xs font-bold w-5">
                    {index + 1}
                  </Text>
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center mx-3"
                    style={{ backgroundColor: `${cat?.color || '#888'}20` }}
                  >
                    <Ionicons name={cat?.icon || 'help-circle'} size={16} color={cat?.color || '#888'} />
                  </View>
                  <Text className="text-text-primary dark:text-text-primary-dark text-sm font-medium flex-1" numberOfLines={1}>
                    {cat?.name}
                  </Text>
                  <Text className="text-text-primary dark:text-text-primary-dark text-sm font-semibold">
                    {formatCurrency(cat?.amount || 0)}
                  </Text>
                  <Text className="text-text-muted dark:text-text-muted-dark text-xs ml-2 w-10 text-right">
                    {(cat?.percentage || 0).toFixed(0)}%
                  </Text>
                </View>
                {index < topCategories.length - 1 && (
                  <View className="h-px bg-border/50 dark:bg-white/5" />
                )}
              </View>
            ))}
          </View>
        ) : (
          <View className="bg-surface dark:bg-surface-dark border border-border/50 dark:border-white/5 rounded-3xl p-6 items-center">
            <Ionicons name="grid-outline" size={32} color="#71717A" />
            <Text className="text-text-muted dark:text-text-muted-dark text-sm mt-2 text-center">
              No spending this month yet.{'\n'}Add expenses to see category breakdown.
            </Text>
          </View>
        )}
      </View>

      {/* Budget Overview — Single Monthly Budget */}
      <View className="mt-6">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-text-primary dark:text-text-primary-dark text-lg font-bold tracking-tight">
            Budget Overview
          </Text>
          <Pressable onPress={() => router.push('/budgets')} className="active:opacity-70">
            <Text className="text-primary text-sm font-medium">Details</Text>
          </Pressable>
        </View>
        {monthlyBudget ? (
          <Pressable
            onPress={() => router.push('/budgets')}
            className="bg-surface dark:bg-surface-dark border border-border/50 dark:border-white/5 rounded-3xl p-5 active:opacity-80"
          >
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-text-muted dark:text-text-muted-dark text-xs">Monthly Budget</Text>
                <Text className="text-text-primary dark:text-text-primary-dark text-2xl font-bold tracking-tight">
                  {formatCurrency(monthlyBudget.budget.amount)}
                </Text>
              </View>
              <View className={`px-3 py-1.5 rounded-full ${
                monthlyBudget.alertLevel === 'exceeded' ? 'bg-expense/20' :
                monthlyBudget.alertLevel === 'warning' ? 'bg-tertiary/20' : 'bg-secondary/20'
              }`}>
                <Text className={`text-sm font-bold ${
                  monthlyBudget.alertLevel === 'exceeded' ? 'text-expense' :
                  monthlyBudget.alertLevel === 'warning' ? 'text-tertiary' : 'text-secondary'
                }`}>
                  {Math.round(monthlyBudget.percentage * 100)}%
                </Text>
              </View>
            </View>

            <View className="h-3 bg-border dark:bg-border-dark rounded-full overflow-hidden mb-3">
              <View
                className={`h-full rounded-full ${
                  monthlyBudget.alertLevel === 'exceeded' ? 'bg-expense' :
                  monthlyBudget.alertLevel === 'warning' ? 'bg-tertiary' : 'bg-secondary'
                }`}
                style={{ width: `${Math.min(Math.round(monthlyBudget.percentage * 100), 100)}%` }}
              />
            </View>

            <View className="flex-row justify-between">
              <View>
                <Text className="text-text-muted dark:text-text-muted-dark text-xs">Spent</Text>
                <Text className="text-text-primary dark:text-text-primary-dark text-base font-semibold">
                  {formatCurrency(monthlyBudget.spent)}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-text-muted dark:text-text-muted-dark text-xs">
                  {monthlyBudget.remaining > 0 ? 'Remaining' : 'Over Budget'}
                </Text>
                <Text className={`text-base font-semibold ${monthlyBudget.spent > monthlyBudget.budget.amount ? 'text-expense' : 'text-secondary'}`}>
                  {formatCurrency(Math.abs(monthlyBudget.budget.amount - monthlyBudget.spent))}
                </Text>
              </View>
            </View>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.push('/budgets')}
            className="bg-surface dark:bg-surface-dark border border-border/50 dark:border-white/5 rounded-3xl p-6 items-center active:opacity-70"
          >
            <Ionicons name="pie-chart-outline" size={32} color="#71717A" />
            <Text className="text-text-muted dark:text-text-muted-dark text-sm mt-2 text-center">
              No budgets set up yet.{'\n'}Tap to create your first budget.
            </Text>
          </Pressable>
        )}
      </View>

      {/* Recent Transactions */}
      <View className="mt-6">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-text-primary dark:text-text-primary-dark text-lg font-bold tracking-tight">
            Recent Transactions
          </Text>
          {recentTransactions.length > 0 && (
            <Pressable onPress={() => router.push('/transactions')} className="active:opacity-70">
              <Text className="text-primary text-sm font-medium">See All</Text>
            </Pressable>
          )}
        </View>

        {recentTransactions.length > 0 ? (
          <View className="bg-surface dark:bg-surface-dark border border-border/50 dark:border-white/5 rounded-3xl px-4">
            {recentTransactions.map((transaction, index, arr) => (
              <View key={transaction.id}>
                <RecentTransactionItem
                  description={transaction.description || ''}
                  amount={transaction.amount}
                  type={transaction.type}
                  categoryName={transaction.categoryName}
                  categoryIcon={transaction.categoryIcon}
                  categoryColor={transaction.categoryColor}
                  date={formatDate(transaction.date)}
                  onPress={() => router.push(`/transactions?highlight=${transaction.id}`)}
                />
                {index < arr.length - 1 && (
                  <View className="h-px bg-border/50 dark:bg-white/5" />
                )}
              </View>
            ))}
          </View>
        ) : (
          <Pressable
            onPress={() => router.push('/add')}
            className="bg-surface dark:bg-surface-dark border border-border/50 dark:border-white/5 rounded-3xl p-6 items-center active:opacity-70"
          >
            <Ionicons name="receipt-outline" size={32} color="#71717A" />
            <Text className="text-text-muted dark:text-text-muted-dark text-sm mt-2 text-center">
              No transactions yet.{'\n'}Tap to add your first one.
            </Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

