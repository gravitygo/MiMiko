import { View, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { BentoCard } from './bento-card';

interface BalanceCardProps {
  totalBalance: number;
  income: number;
  expense: number;
  sparklineData?: number[];
}

function MiniSparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return (
    <View className="flex-row items-end h-12 gap-1 mt-2">
      {data.map((value, index) => {
        const height = ((value - min) / range) * 100;
        const isLast = index === data.length - 1;
        return (
          <View
            key={index}
            className={`flex-1 rounded-full ${isLast ? 'bg-primary' : 'bg-primary/30'}`}
            style={{ height: `${Math.max(height, 10)}%` }}
          />
        );
      })}
    </View>
  );
}

export function BalanceCard({ totalBalance, income, expense, sparklineData = [] }: BalanceCardProps) {
  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(totalBalance);

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <BentoCard size="2x2" className="justify-between">
      <View>
        <Text className="text-text-muted dark:text-text-muted-dark text-sm font-medium tracking-tight">
          Total Balance
        </Text>
        <Text className="text-text-primary dark:text-text-primary-dark text-4xl font-bold tracking-tight mt-1">
          {formattedBalance}
        </Text>
      </View>

      {sparklineData.length > 0 && <MiniSparkline data={sparklineData} />}

      <View className="mt-3">
        <Text className="text-text-muted dark:text-text-muted-dark text-xs font-medium mb-2">
          {currentMonth}
        </Text>
        <View className="flex-row justify-between">
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-full bg-secondary/20 items-center justify-center mr-2">
              <Ionicons name="arrow-down" size={16} color="#05DF72" />
            </View>
            <View>
              <Text className="text-text-muted dark:text-text-muted-dark text-xs">Income</Text>
              <Text className="text-secondary font-semibold">
                +${income.toLocaleString()}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-full bg-expense/20 items-center justify-center mr-2">
              <Ionicons name="arrow-up" size={16} color="#FF6B6B" />
            </View>
            <View>
              <Text className="text-text-muted dark:text-text-muted-dark text-xs">Expense</Text>
              <Text className="text-expense font-semibold">
                -${expense.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </BentoCard>
  );
}

