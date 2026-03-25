import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { formatCurrency } from '@/state/settings.store';
import { formatCurrency as formatWithCurrency } from '@/modules/currency/currency.types';
import { BentoCard } from './bento-card';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface AccountBreakdown {
  id: string;
  name: string;
  balance: number;
  icon: string;
  color: string;
  type: string;
  currency?: string;
  creditMode?: boolean;
}

interface BalanceCardProps {
  totalBalance: number;
  income: number;
  expense: number;
  committed: number;
  sparklineData?: number[];
  accounts?: AccountBreakdown[];
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

function getBalanceTextColor(acc: AccountBreakdown): string {
  const isCreditAccount = acc.creditMode || acc.type === 'credit_card';
  if (isCreditAccount && acc.balance > 0) return 'text-expense';
  return acc.balance >= 0 ? 'text-secondary' : 'text-expense';
}

export function BalanceCard({ totalBalance, income, expense, committed, sparklineData = [], accounts = [] }: BalanceCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const formattedBalance = formatCurrency(totalBalance);

  const available = totalBalance - committed;
  const formattedAvailable = formatCurrency(available);

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <BentoCard size="auto" className="justify-between">
      <View>
        <Pressable onPress={() => setShowBreakdown((prev) => !prev)} className="active:opacity-80">
          <View className="flex-row items-center justify-between">
            <Text className="text-text-muted dark:text-text-muted-dark text-sm font-medium tracking-tight">
              Total Balance
            </Text>
            {accounts.length > 1 && (
              <Ionicons
                name={showBreakdown ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#71717A"
              />
            )}
          </View>
          <Text className={`text-4xl font-bold tracking-tight mt-1 ${totalBalance < 0 ? 'text-expense' : 'text-text-primary dark:text-text-primary-dark'}`}>
            {formattedBalance}
          </Text>
        </Pressable>
        {committed > 0 && (
          <View className="flex-row items-center mt-1">
            <Ionicons name="lock-closed" size={12} color="#FFBA00" />
            <Text className="text-text-muted dark:text-text-muted-dark text-xs ml-1">
              {formattedAvailable} available
            </Text>
            <Text className="text-tertiary text-xs ml-1">
              ({formatCurrency(committed)} committed)
            </Text>
          </View>
        )}

        {/* Account Breakdown */}
        {showBreakdown && accounts.length > 0 && (
          <View className="mt-3 pt-3 border-t border-border/30 dark:border-white/10">
            {accounts.map((acc) => (
              <View key={acc.id} className="flex-row items-center py-1.5">
                <View
                  className="w-7 h-7 rounded-full items-center justify-center mr-2.5"
                  style={{ backgroundColor: acc.color + '20' }}
                >
                  <Ionicons name={acc.icon as IconName} size={14} color={acc.color} />
                </View>
                <Text className="text-text-primary dark:text-text-primary-dark text-sm flex-1" numberOfLines={1}>
                  {acc.name}
                </Text>
                <View className="flex-row items-center">
                  {acc.currency && acc.currency !== 'php' && (
                    <View className="bg-primary/10 px-1 py-0.5 rounded mr-1.5">
                      <Text className="text-primary text-[10px] font-medium">
                        {acc.currency.toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {(acc.creditMode || acc.type === 'credit_card') && acc.balance > 0 && (
                    <View className="bg-expense/10 px-1 py-0.5 rounded mr-1.5">
                      <Text className="text-expense text-[10px] font-medium">Owed</Text>
                    </View>
                  )}
                  <Text className={`text-sm font-semibold ${getBalanceTextColor(acc)}`}>
                    {formatWithCurrency(acc.balance, acc.currency || 'php')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
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
                +{formatCurrency(income)}
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
                -{formatCurrency(expense)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </BentoCard>
  );
}

