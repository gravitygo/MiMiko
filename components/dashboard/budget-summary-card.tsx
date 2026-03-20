import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import type { BudgetAlertLevel } from "@/modules/budget";
import { formatCurrency } from '@/state/settings.store';
import { BentoCard } from "./bento-card";

interface BudgetSummaryCardProps {
  name: string;
  spent: number;
  total: number;
  percentage: number;
  alertLevel: BudgetAlertLevel;
}

const alertColors: Record<
  BudgetAlertLevel,
  { bg: string; text: string; icon: string }
> = {
  safe: { bg: "bg-secondary/20", text: "text-secondary", icon: "#05DF72" },
  warning: { bg: "bg-tertiary/20", text: "text-tertiary", icon: "#FFBA00" },
  exceeded: { bg: "bg-expense/20", text: "text-expense", icon: "#FF6B6B" },
};

export function BudgetSummaryCard({
  name,
  spent,
  total,
  percentage,
  alertLevel,
}: BudgetSummaryCardProps) {
  const router = useRouter();
  const colors = alertColors[alertLevel];
  const clampedPercentage = Math.min(percentage, 100);

  const handlePress = () => {
    router.push("/budgets");
  };

  return (
    <BentoCard size="3x2" onPress={handlePress} className="justify-between">
      <View className="flex-row items-center justify-between">
        <Text
          className="text-text-primary dark:text-text-primary-dark text-sm font-semibold tracking-tight flex-1"
          numberOfLines={1}
        >
          {name}
        </Text>
        <View
          className={`w-6 h-6 rounded-full items-center justify-center ${colors.bg}`}
        >
          <Ionicons
            name={
              alertLevel === "exceeded"
                ? "alert"
                : alertLevel === "warning"
                  ? "warning"
                  : "checkmark"
            }
            size={12}
            color={colors.icon}
          />
        </View>
      </View>

      <View>
        <View className="flex-row items-baseline">
          <Text className={`text-lg font-bold tracking-tight ${colors.text}`}>
            {formatCurrency(spent)}
          </Text>
          <Text className="text-text-muted dark:text-text-muted-dark text-sm ml-1">
            / {formatCurrency(total)}
          </Text>
        </View>

        <View className="h-2 bg-border dark:bg-border-dark rounded-full mt-2 overflow-hidden">
          <View
            className={`h-full rounded-full ${
              alertLevel === "exceeded"
                ? "bg-expense"
                : alertLevel === "warning"
                  ? "bg-tertiary"
                  : "bg-secondary"
            }`}
            style={{ width: `${clampedPercentage}%` }}
          />
        </View>

        <Text className="text-text-muted dark:text-text-muted-dark text-xs mt-1">
          {percentage.toFixed(0)}% used
        </Text>
      </View>
    </BentoCard>
  );
}
