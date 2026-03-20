import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { formatSignedCurrency } from '@/state/settings.store';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface RecentTransactionItemProps {
  description: string;
  amount: number;
  type: 'expense' | 'income';
  categoryName: string;
  categoryIcon: IconName;
  categoryColor: string;
  date: string;
  onPress?: () => void;
}

export function RecentTransactionItem({
  description,
  amount,
  type,
  categoryName,
  categoryIcon,
  categoryColor,
  date,
  onPress,
}: RecentTransactionItemProps) {
  const isExpense = type === 'expense';
  const formattedAmount = formatSignedCurrency(amount, type);

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-3 active:opacity-70"
    >
      <View
        className="w-11 h-11 rounded-2xl items-center justify-center mr-3"
        style={{ backgroundColor: `${categoryColor}20` }}
      >
        <Ionicons name={categoryIcon} size={20} color={categoryColor} />
      </View>

      <View className="flex-1">
        <Text
          className="text-text-primary dark:text-text-primary-dark text-base font-semibold tracking-tight"
          numberOfLines={1}
        >
          {description || categoryName}
        </Text>
        <Text className="text-text-muted dark:text-text-muted-dark text-sm">
          {categoryName} • {date}
        </Text>
      </View>

      <Text
        className={`text-base font-bold tracking-tight ${
          isExpense ? 'text-expense' : 'text-secondary'
        }`}
      >
        {formattedAmount}
      </Text>
    </Pressable>
  );
}

