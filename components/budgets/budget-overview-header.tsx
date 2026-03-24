import { View, Text } from 'react-native';

import { formatCurrency } from '@/state/settings.store';

interface BudgetOverviewHeaderProps {
  totalBudget: number;
  totalSpent: number;
  budgetCount: number;
}

export function BudgetOverviewHeader({ totalBudget, totalSpent, budgetCount }: BudgetOverviewHeaderProps) {
  const remaining = totalBudget - totalSpent;
  const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const isOverBudget = remaining < 0;

  return (
    <View className="bg-surface dark:bg-surface-dark border border-border/50 dark:border-white/5 rounded-3xl p-5 mb-4">
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-text-muted dark:text-text-muted-dark text-sm">
            Total Budget
          </Text>
          <Text className="text-text-primary dark:text-text-primary-dark text-3xl font-bold tracking-tight">
            {formatCurrency(totalBudget)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-text-muted dark:text-text-muted-dark text-sm">
            {budgetCount} budget{budgetCount !== 1 ? 's' : ''}
          </Text>
          <Text className={`text-lg font-bold ${percentage > 100 ? 'text-expense' : percentage > 80 ? 'text-tertiary' : 'text-secondary'}`}>
            {percentage.toFixed(0)}% used
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View className="h-3 bg-border dark:bg-border-dark rounded-full overflow-hidden mb-3">
        <View
          className={`h-full rounded-full ${percentage > 100 ? 'bg-expense' : percentage > 80 ? 'bg-tertiary' : 'bg-secondary'}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </View>

      {/* Stats Row */}
      <View className="flex-row justify-between">
        <View>
          <Text className="text-text-muted dark:text-text-muted-dark text-xs">Spent</Text>
          <Text className="text-text-primary dark:text-text-primary-dark text-base font-semibold">
            {formatCurrency(totalSpent)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-text-muted dark:text-text-muted-dark text-xs">
            {isOverBudget ? 'Over Budget' : 'Remaining'}
          </Text>
          <Text className={`text-base font-semibold ${isOverBudget ? 'text-expense' : 'text-secondary'}`}>
            {formatCurrency(Math.abs(remaining))}
          </Text>
        </View>
      </View>
    </View>
  );
}

