import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ReminderItem, ReminderType } from '@/components/dashboard';
import {
  BalanceCard,
  BudgetSummaryCard,
  CategoryCard,
  RecentTransactionItem,
  RemindersList,
} from '@/components/dashboard';
import { useAccounts } from '@/hooks/use-accounts';
import { useBudgets } from '@/hooks/use-budgets';
import { useCategories } from '@/hooks/use-categories';
import { useDebts } from '@/hooks/use-debts';
import { useRecurring } from '@/hooks/use-recurring';
import { useTransactions } from '@/hooks/use-transactions';
import { createDebtService } from '@/modules/debt/debt.service';
import { calculateNextDate } from '@/modules/recurring/recurring.model';
import { createRecurringService } from '@/modules/recurring/recurring.service';
import { createTransactionService } from '@/modules/transaction/transaction.service';
import { useAccountStore } from '@/state/account.store';
import { useBudgetStore } from '@/state/budget.store';
import { useCategoryStore } from '@/state/category.store';
import { useDebtStore } from '@/state/debt.store';
import { useRecurringStore } from '@/state/recurring.store';
import { useTransactionStore } from '@/state/transaction.store';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const BOTTOM_NAV_HEIGHT = 100;

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
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

  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, account) => sum + account.balance, 0);
  }, [accounts]);

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
      .slice(0, 4);
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

  // Build reminder items from recurring rules + unsettled debts
  const reminderItems = useMemo<ReminderItem[]>(() => {
    const today = new Date().toISOString().split('T')[0];
    const items: ReminderItem[] = [];

    // Recurring reminders
    for (const rule of recurringRules) {
      if (!rule.isActive) continue;
      const isOverdue = rule.nextDate <= today;
      const category = categories.find((c) => c.id === rule.categoryId);

      items.push({
        id: rule.id,
        type: 'recurring',
        title: rule.name,
        subtitle: `${rule.frequency} · ${category?.name || 'Unknown'}`,
        amount: rule.amount,
        icon: (category?.icon || 'repeat') as IconName,
        iconColor: category?.color || '#A8E6CF',
        dueLabel: isOverdue ? 'Due' : rule.nextDate,
        isOverdue,
        direction: rule.type === 'expense' ? 'payable' : 'receivable',
      });
    }

    // Debt reminders
    for (const debt of debts) {
      if (debt.isSettled) continue;
      const isOverdue = debt.dueDate ? debt.dueDate <= today : false;

      items.push({
        id: debt.id,
        type: 'debt',
        title: debt.personName,
        subtitle: debt.description || (debt.direction === 'receivable' ? 'Owes you' : 'You owe'),
        amount: debt.amount,
        icon: debt.direction === 'receivable' ? 'arrow-down' : 'arrow-up',
        iconColor: debt.direction === 'receivable' ? '#05DF72' : '#FF6B6B',
        dueLabel: debt.dueDate
          ? (isOverdue ? 'Overdue' : debt.dueDate)
          : 'No due date',
        isOverdue,
        direction: debt.direction,
      });
    }

    // Sort: overdue first, then by date
    return items.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return 0;
    });
  }, [recurringRules, debts, categories]);

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

      // Create the transaction
      const transactionService = createTransactionService();
      await transactionService.add({
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
      const nextDate = calculateNextDate(rule.nextDate, rule.frequency);

      // Check if end date exceeded
      if (rule.endDate && nextDate > rule.endDate) {
        await recurringService.pause(rule.id);
      } else {
        await recurringService.edit(rule.id, { nextDate });
      }

      await loadData();
    } else if (type === 'debt') {
      const debtService = createDebtService();
      await debtService.settle(id);
      await loadData();
    }
  }, [recurringRules, loadData]);

  const handleReminderDismiss = useCallback(async (id: string, type: ReminderType) => {
    if (type === 'recurring') {
      // Skip: advance nextDate without creating transaction
      const rule = recurringRules.find((r) => r.id === id);
      if (!rule) return;

      const recurringService = createRecurringService();
      await recurringService.skipNext(id);
      await loadData();
    }
    // For debts, swiping left does nothing (they can delete from add screen or we just ignore)
  }, [recurringRules, loadData]);

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
      />

      {/* Reminders Section */}
      {reminderItems.length > 0 && (
        <View className="mt-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-text-primary dark:text-text-primary-dark text-lg font-bold tracking-tight">
              Reminders
            </Text>
            <Text className="text-text-muted dark:text-text-muted-dark text-xs">
              Swipe → Paid · ← Skip
            </Text>
          </View>
          <RemindersList
            items={reminderItems}
            onConfirm={handleReminderConfirm}
            onDismiss={handleReminderDismiss}
          />
        </View>
      )}

      {/* Top Categories */}
      <View className="mt-6">
        <Text className="text-text-primary dark:text-text-primary-dark text-lg font-bold tracking-tight mb-3">
          Top Categories
        </Text>
        {topCategories.length > 0 ? (
          <View className="flex-row flex-wrap" style={{ marginHorizontal: -6 }}>
            {topCategories.map((cat) => (
              <View key={cat?.id} style={{ width: '50%', paddingHorizontal: 6, marginBottom: 12 }}>
                <CategoryCard
                  name={cat?.name || ''}
                  icon={cat?.icon || 'help-circle'}
                  color={cat?.color || '#888'}
                  percentage={cat?.percentage || 0}
                  amount={cat?.amount || 0}
                />
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

      {/* Budget Summary */}
      <View className="mt-6">
        <Text className="text-text-primary dark:text-text-primary-dark text-lg font-bold tracking-tight mb-3">
          Budget Overview
        </Text>
        {budgetStatuses.length > 0 ? (
          <View className="flex-row flex-wrap" style={{ marginHorizontal: -6 }}>
            {budgetStatuses.slice(0, 2).map((status) => (
              <View key={status.budget.id} style={{ width: '50%', paddingHorizontal: 6, marginBottom: 12 }}>
                <BudgetSummaryCard
                  name={status.budget.name}
                  spent={status.spent}
                  total={status.budget.amount}
                  percentage={Math.round(status.percentage * 100)}
                  alertLevel={status.alertLevel}
                />
              </View>
            ))}
          </View>
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

