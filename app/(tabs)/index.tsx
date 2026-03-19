import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
    BalanceCard,
    BudgetSummaryCard,
    CategoryCard,
    QuickAddCard,
    RecentTransactionItem,
} from '@/components/dashboard';
import { useAccounts } from '@/hooks/use-accounts';
import { useBudgets } from '@/hooks/use-budgets';
import { useCategories } from '@/hooks/use-categories';
import { useTransactions } from '@/hooks/use-transactions';
import { useAccountStore } from '@/state/account.store';
import { useBudgetStore } from '@/state/budget.store';
import { useCategoryStore } from '@/state/category.store';
import { useTransactionStore } from '@/state/transaction.store';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// Mock sparkline data for demonstration
const MOCK_SPARKLINE = [2400, 1800, 3200, 2800, 3600, 3100, 4200];

// Bottom nav bar height + padding
const BOTTOM_NAV_HEIGHT = 100;

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Hooks
  const { fetch: fetchTransactions } = useTransactions();
  const { fetch: fetchCategories } = useCategories();
  const { fetch: fetchAccounts } = useAccounts();
  const { fetchStatuses: fetchBudgetStatuses } = useBudgets();

  // Stores
  const accounts = useAccountStore((state) => state.accounts);
  const transactions = useTransactionStore((state) => state.transactions);
  const categories = useCategoryStore((state) => state.categories);
  const budgetStatuses = useBudgetStore((state) => state.statuses);

  // Calculate total balance from all accounts
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, account) => sum + account.balance, 0);
  }, [accounts]);

  // Calculate income and expense for current month
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

  // Get top spending categories
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

  // Get recent transactions
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

  // Format date for display
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
    ]);
  }, [fetchAccounts, fetchTransactions, fetchCategories, fetchBudgetStatuses]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleSeeAllTransactions = () => {
    router.push('/transactions');
  };

  const handleTransactionPress = (transactionId: string) => {
    // TODO: Navigate to transaction detail or show modal
    router.push(`/transactions?highlight=${transactionId}`);
  };



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
        <Pressable
          className="w-10 h-10 rounded-full bg-surface dark:bg-surface-dark border border-border/50 dark:border-white/5 items-center justify-center active:opacity-70"
          onPress={() => router.push('/settings')}
        >
          <Ionicons name="notifications-outline" size={20} color="#71717A" />
        </Pressable>
      </View>

      {/* Balance Card - Large 2x2 */}
      <BalanceCard
        totalBalance={totalBalance}
        income={monthlyIncome}
        expense={monthlyExpense}
        sparklineData={MOCK_SPARKLINE}
      />

      {/* Quick Add Card - Medium 2x1 */}
      <View className="mt-4">
        <QuickAddCard />
      </View>

      {/* Category Spending - 2 Column Grid */}
      <View className="mt-6">
        <Text className="text-text-primary dark:text-text-primary-dark text-lg font-bold tracking-tight mb-3">
          Top Categories
        </Text>
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
      </View>

      {/* Budget Summary - 2 Column Grid */}
      {budgetStatuses.length > 0 && (
        <View className="mt-6">
          <Text className="text-text-primary dark:text-text-primary-dark text-lg font-bold tracking-tight mb-3">
            Budget Overview
          </Text>
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
        </View>
      )}

      {/* Recent Transactions */}
      <View className="mt-6">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-text-primary dark:text-text-primary-dark text-lg font-bold tracking-tight">
            Recent Transactions
          </Text>
          <Pressable onPress={handleSeeAllTransactions} className="active:opacity-70">
            <Text className="text-primary text-sm font-medium">See All</Text>
          </Pressable>
        </View>

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
                onPress={() => handleTransactionPress(transaction.id)}
              />
              {index < arr.length - 1 && (
                <View className="h-px bg-border/50 dark:bg-white/5" />
              )}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

