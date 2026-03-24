import { View, Text, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { BudgetAlertLevel } from '@/modules/budget';
import { formatCurrency } from '@/state/settings.store';

interface BudgetCardProps {
  id: string;
  name: string;
  type: 'monthly' | 'category';
  spent: number;
  total: number;
  percentage: number;
  alertLevel: BudgetAlertLevel;
  categoryName?: string;
  categoryColor?: string;
  onPress?: () => void;
}

const alertConfig: Record<BudgetAlertLevel, { bg: string; border: string; icon: string; iconName: 'checkmark-circle' | 'alert-circle' | 'close-circle' }> = {
  safe: { bg: 'bg-secondary/10', border: 'border-secondary/30', icon: '#05DF72', iconName: 'checkmark-circle' },
  warning: { bg: 'bg-tertiary/10', border: 'border-tertiary/30', icon: '#FFBA00', iconName: 'alert-circle' },
  exceeded: { bg: 'bg-expense/10', border: 'border-expense/30', icon: '#FF6B6B', iconName: 'close-circle' },
};

const progressColors: Record<BudgetAlertLevel, string> = {
  safe: 'bg-secondary',
  warning: 'bg-tertiary',
  exceeded: 'bg-expense',
};

export function BudgetCard({
  name,
  type,
  spent,
  total,
  percentage,
  alertLevel,
  categoryName,
  categoryColor,
  onPress,
}: BudgetCardProps) {
  const config = alertConfig[alertLevel];
  const clampedPercentage = Math.min(percentage, 100);
  const remaining = total - spent;

  return (
    <Pressable
      onPress={onPress}
      className={`bg-surface dark:bg-surface-dark border border-border/50 dark:border-white/5 rounded-3xl p-4 mb-3 active:opacity-80`}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1">
          {categoryColor && (
            <View
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: categoryColor }}
            />
          )}
          <View className="flex-1">
            <Text
              className="text-text-primary dark:text-text-primary-dark text-base font-bold tracking-tight"
              numberOfLines={1}
            >
              {name}
            </Text>
            <Text className="text-text-muted dark:text-text-muted-dark text-xs">
              {type === 'monthly' ? 'Monthly Budget' : categoryName || 'Category Budget'}
            </Text>
          </View>
        </View>

        <View className={`px-2 py-1 rounded-full ${config.bg}`}>
          <Ionicons name={config.iconName} size={16} color={config.icon} />
        </View>
      </View>

      {/* Progress Bar */}
      <View className="h-3 bg-border dark:bg-border-dark rounded-full overflow-hidden mb-3">
        <View
          className={`h-full rounded-full ${progressColors[alertLevel]}`}
          style={{ width: `${clampedPercentage}%` }}
        />
      </View>

      {/* Stats */}
      <View className="flex-row justify-between">
        <View>
          <Text className="text-text-muted dark:text-text-muted-dark text-xs">Spent</Text>
          <Text className="text-text-primary dark:text-text-primary-dark text-base font-semibold">
            {formatCurrency(spent)}
          </Text>
        </View>

        <View className="items-center">
          <Text className="text-text-muted dark:text-text-muted-dark text-xs">Used</Text>
          <Text className={`text-base font-bold ${
            alertLevel === 'exceeded' ? 'text-expense' :
            alertLevel === 'warning' ? 'text-tertiary' : 'text-secondary'
          }`}>
            {percentage.toFixed(0)}%
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-text-muted dark:text-text-muted-dark text-xs">
            {remaining >= 0 ? 'Remaining' : 'Over'}
          </Text>
          <Text className={`text-base font-semibold ${remaining >= 0 ? 'text-text-primary dark:text-text-primary-dark' : 'text-expense'}`}>
            {formatCurrency(Math.abs(remaining))}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

