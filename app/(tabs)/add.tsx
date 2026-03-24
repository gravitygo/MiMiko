import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DatePickerField } from "@/components/ui/date-picker-field";
import { Colors } from "@/constants/theme";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDebts } from "@/hooks/use-debts";
import { useRecurring } from "@/hooks/use-recurring";
import { useTransactions } from "@/hooks/use-transactions";
import type { Account } from "@/modules/account/account.types";
import type { Category } from "@/modules/category/category.types";
import type { DebtDirection } from "@/modules/debt/debt.types";
import type {
  RecurringFrequency,
  WeekDay,
} from "@/modules/recurring/recurring.types";
import type { TransactionType } from "@/modules/transaction/transaction.types";
import { useAccountStore } from "@/state/account.store";
import { useCategoryStore } from "@/state/category.store";
import { getCurrencySymbol as getCurrencySymbolUtil } from "@/modules/currency/currency.types";

type TabType = "expense" | "income" | "owe";

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom Days" },
];

const WEEKDAYS: { value: WeekDay; label: string; short: string }[] = [
  { value: 0, label: "Sunday", short: "S" },
  { value: 1, label: "Monday", short: "M" },
  { value: 2, label: "Tuesday", short: "T" },
  { value: 3, label: "Wednesday", short: "W" },
  { value: 4, label: "Thursday", short: "T" },
  { value: 5, label: "Friday", short: "F" },
  { value: 6, label: "Saturday", short: "S" },
];

interface CategoryItemProps {
  category: Category;
  selected: boolean;
  onPress: () => void;
}

function CategoryItem({ category, selected, onPress }: CategoryItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  return (
    <Pressable
      onPress={onPress}
      className={`items-center justify-center p-3 rounded-bento-sm mr-2 mb-2 ${
        selected ? "bg-primary" : "bg-surface dark:bg-surface-dark"
      }`}
      style={{ width: 80 }}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mb-1"
        style={{
          backgroundColor: selected
            ? "rgba(255,255,255,0.2)"
            : category.color + "20",
        }}
      >
        <Ionicons
          name={category.icon as any}
          size={20}
          color={selected ? "#FFFFFF" : category.color}
        />
      </View>
      <Text
        className={`text-xs text-center ${
          selected
            ? "text-white"
            : "text-text-primary dark:text-text-primary-dark"
        }`}
        numberOfLines={1}
      >
        {category.name}
      </Text>
    </Pressable>
  );
}

interface AccountItemProps {
  account: Account;
  selected: boolean;
  onPress: () => void;
}

function AccountItem({ account, selected, onPress }: AccountItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center px-4 py-3 rounded-bento-sm mr-2 ${
        selected ? "bg-primary" : "bg-surface dark:bg-surface-dark"
      }`}
    >
      <View
        className="w-8 h-8 rounded-full items-center justify-center mr-2"
        style={{
          backgroundColor: selected
            ? "rgba(255,255,255,0.2)"
            : account.color + "20",
        }}
      >
        <Ionicons
          name={account.icon as any}
          size={16}
          color={selected ? "#FFFFFF" : account.color}
        />
      </View>
      <Text
        className={`font-medium ${
          selected
            ? "text-white"
            : "text-text-primary dark:text-text-primary-dark"
        }`}
      >
        {account.name}
      </Text>
    </Pressable>
  );
}

export default function AddTransactionScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>("monthly");
  const [customDays, setCustomDays] = useState<WeekDay[]>([]);
  const [nextDate, setNextDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState("");

  // Owe-specific state
  const [personName, setPersonName] = useState("");
  const [debtDirection, setDebtDirection] =
    useState<DebtDirection>("receivable");
  const [debtDueDate, setDebtDueDate] = useState("");

  const categories = useCategoryStore((s) => s.categories);
  const accounts = useAccountStore((s) => s.accounts);

  const { fetch: fetchCategories } = useCategories();
  const { fetch: fetchAccounts } = useAccounts();
  const { add: addTransaction } = useTransactions();
  const { add: addRecurringRule } = useRecurring();
  const { add: addDebt } = useDebts();

  const filteredCategories = useMemo(
    () =>
      categories.filter(
        (c) => c.type === (activeTab === "owe" ? "expense" : activeTab),
      ),
    [categories, activeTab],
  );

  useEffect(() => {
    Promise.all([fetchCategories(), fetchAccounts()]).finally(() =>
      setLoading(false),
    );
  }, [fetchCategories, fetchAccounts]);

  useEffect(() => {
    if (filteredCategories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(filteredCategories[0].id);
    }
  }, [filteredCategories, selectedCategoryId]);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      const defaultAccount = accounts.find((a) => a.isDefault) ?? accounts[0];
      setSelectedAccountId(defaultAccount.id);
    }
  }, [accounts, selectedAccountId]);

  useEffect(() => {
    setSelectedCategoryId(null);
  }, [activeTab]);

  const handleAmountChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmount(cleaned);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!amount) return;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setSubmitting(true);

    if (activeTab === "owe") {
      if (!personName.trim()) {
        setSubmitting(false);
        return;
      }

      await addDebt({
        personName: personName.trim(),
        direction: debtDirection,
        amount: parsedAmount,
        description: description.trim() || undefined,
        dueDate: debtDueDate || undefined,
        categoryId: selectedCategoryId ?? undefined,
        accountId: selectedAccountId ?? undefined,
      });

      setSubmitting(false);
      setAmount("");
      setDescription("");
      setPersonName("");
      setDebtDueDate("");
      router.back();
      return;
    }

    if (!selectedCategoryId || !selectedAccountId) {
      setSubmitting(false);
      return;
    }

    const transaction = await addTransaction({
      type: activeTab as TransactionType,
      amount: parsedAmount,
      description: description.trim() || undefined,
      categoryId: selectedCategoryId,
      accountId: selectedAccountId,
      date: new Date().toISOString(),
    });

    if (transaction && isRecurring) {
      await addRecurringRule({
        name: description.trim() || `Recurring ${activeTab}`,
        type: activeTab,
        amount: parsedAmount,
        description: description.trim() || undefined,
        categoryId: selectedCategoryId,
        accountId: selectedAccountId,
        frequency,
        customDays: frequency === "custom" ? customDays : undefined,
        nextDate,
        endDate: endDate || undefined,
      });
    }

    // Refresh accounts to sync store with updated database balances
    if (transaction) {
      await fetchAccounts();
    }

    setSubmitting(false);

    if (transaction) {
      setAmount("");
      setDescription("");
      setIsRecurring(false);
      setCustomDays([]);
      setEndDate("");
      router.back();
    }
  }, [
    amount,
    description,
    selectedCategoryId,
    selectedAccountId,
    activeTab,
    addTransaction,
    isRecurring,
    addRecurringRule,
    frequency,
    customDays,
    nextDate,
    endDate,
    personName,
    debtDirection,
    debtDueDate,
    addDebt,
  ]);

  const canSubmit = useMemo(() => {
    const parsedAmount = parseFloat(amount);
    const validAmount =
      !submitting &&
      amount.length > 0 &&
      !isNaN(parsedAmount) &&
      parsedAmount > 0;
    if (!validAmount) return false;

    if (activeTab === "owe") return personName.trim().length > 0;

    return selectedCategoryId !== null && selectedAccountId !== null;
  }, [
    amount,
    selectedCategoryId,
    selectedAccountId,
    submitting,
    activeTab,
    personName,
  ]);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId),
    [accounts, selectedAccountId]
  );

  const currencySymbol = useMemo(
    () => getCurrencySymbolUtil(selectedAccount?.currency || "php"),
    [selectedAccount?.currency]
  );

  if (loading) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark items-center justify-center">
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background dark:bg-background-dark"
    >
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 64 }}
      >
        {/* Tab Switcher */}
        <View className="flex-row mx-4 mt-4 p-1 bg-surface dark:bg-surface-dark rounded-bento">
          <Pressable
            onPress={() => setActiveTab("expense")}
            className={`flex-1 py-3 rounded-bento-sm items-center ${
              activeTab === "expense" ? "bg-expense" : ""
            }`}
          >
            <Text
              className={`font-semibold ${
                activeTab === "expense"
                  ? "text-white"
                  : "text-text-secondary dark:text-text-secondary-dark"
              }`}
            >
              Expense
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("income")}
            className={`flex-1 py-3 rounded-bento-sm items-center ${
              activeTab === "income" ? "bg-income" : ""
            }`}
          >
            <Text
              className={`font-semibold ${
                activeTab === "income"
                  ? "text-white"
                  : "text-text-secondary dark:text-text-secondary-dark"
              }`}
            >
              Income
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("owe")}
            className={`flex-1 py-3 rounded-bento-sm items-center ${
              activeTab === "owe" ? "bg-primary" : ""
            }`}
          >
            <Text
              className={`font-semibold ${
                activeTab === "owe"
                  ? "text-white"
                  : "text-text-secondary dark:text-text-secondary-dark"
              }`}
            >
              Owe
            </Text>
          </Pressable>
        </View>

        {/* Amount Input */}
        <View className="mx-4 mt-6">
          <Text className="text-text-secondary dark:text-text-secondary-dark text-sm font-medium mb-2">
            Amount
          </Text>
          <View className="flex-row items-center bg-surface dark:bg-surface-dark rounded-bento px-4 py-3">
            <Text className="text-text-primary dark:text-text-primary-dark text-2xl font-bold mr-2">
              {currencySymbol}
            </Text>
            <TextInput
              value={amount}
              onChangeText={handleAmountChange}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              className="flex-1 text-text-primary dark:text-text-primary-dark text-2xl font-bold"
              autoFocus
            />
          </View>
        </View>

        {/* Description Input */}
        <View className="mx-4 mt-4">
          <Text className="text-text-secondary dark:text-text-secondary-dark text-sm font-medium mb-2">
            Description (optional)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={
              activeTab === "owe"
                ? "e.g., Dinner at restaurant"
                : "What was this for?"
            }
            placeholderTextColor={colors.textMuted}
            className="bg-surface dark:bg-surface-dark rounded-bento px-4 py-3 text-text-primary dark:text-text-primary-dark"
          />
        </View>

        {/* Owe-specific fields */}
        {activeTab === "owe" && (
          <>
            {/* Person Name */}
            <View className="mx-4 mt-4">
              <Text className="text-text-secondary dark:text-text-secondary-dark text-sm font-medium mb-2">
                Person Name
              </Text>
              <TextInput
                value={personName}
                onChangeText={setPersonName}
                placeholder="Who owes / who you owe"
                placeholderTextColor={colors.textMuted}
                className="bg-surface dark:bg-surface-dark rounded-bento px-4 py-3 text-text-primary dark:text-text-primary-dark"
              />
            </View>

            {/* Direction */}
            <View className="mx-4 mt-4">
              <Text className="text-text-secondary dark:text-text-secondary-dark text-sm font-medium mb-2">
                Direction
              </Text>
              <View className="flex-row p-1 bg-surface dark:bg-surface-dark rounded-bento">
                <Pressable
                  onPress={() => setDebtDirection("receivable")}
                  className={`flex-1 py-3 rounded-bento-sm items-center ${
                    debtDirection === "receivable" ? "bg-income" : ""
                  }`}
                >
                  <Text
                    className={`font-semibold ${
                      debtDirection === "receivable"
                        ? "text-white"
                        : "text-text-secondary dark:text-text-secondary-dark"
                    }`}
                  >
                    They owe me
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setDebtDirection("payable")}
                  className={`flex-1 py-3 rounded-bento-sm items-center ${
                    debtDirection === "payable" ? "bg-expense" : ""
                  }`}
                >
                  <Text
                    className={`font-semibold ${
                      debtDirection === "payable"
                        ? "text-white"
                        : "text-text-secondary dark:text-text-secondary-dark"
                    }`}
                  >
                    I owe them
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Due Date */}
            <View className="mx-4 mt-4">
              <Text className="text-text-secondary dark:text-text-secondary-dark text-sm font-medium mb-2">
                Due Date (optional)
              </Text>
              <DatePickerField
                value={debtDueDate}
                onChange={setDebtDueDate}
                placeholder="No due date"
              />
            </View>
          </>
        )}

        {/* Category Selection (all tabs) */}
        <View className="mt-6">
          <View className="flex-row items-center justify-between mx-4 mb-2">
            <Text className="text-text-secondary dark:text-text-secondary-dark text-sm font-medium">
              Category{activeTab === "owe" ? " (optional)" : ""}
            </Text>
            <Pressable onPress={() => router.push("/categories")}>
              <Text
                style={{ color: colors.tint }}
                className="text-sm font-medium"
              >
                Manage
              </Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            <View className="flex-row flex-wrap">
              {filteredCategories.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  selected={selectedCategoryId === category.id}
                  onPress={() => setSelectedCategoryId(category.id)}
                />
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Account Selection (expense/income only) */}
        {activeTab !== "owe" && (
          <View className="mt-6">
            <View className="flex-row items-center justify-between mx-4 mb-2">
              <Text className="text-text-secondary dark:text-text-secondary-dark text-sm font-medium">
                Account
              </Text>
              <Pressable onPress={() => router.push("/accounts")}>
                <Text
                  style={{ color: colors.tint }}
                  className="text-sm font-medium"
                >
                  Manage
                </Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              <View className="flex-row">
                {accounts.map((account) => (
                  <AccountItem
                    key={account.id}
                    account={account}
                    selected={selectedAccountId === account.id}
                    onPress={() => setSelectedAccountId(account.id)}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Recurring Toggle (expense/income only) */}
        {activeTab !== "owe" && (
          <>
            <View className="mx-4 mt-4">
              <View className="flex-row items-center justify-between bg-surface dark:bg-surface-dark rounded-bento px-4 py-3">
                <View className="flex-row items-center">
                  <Ionicons name="repeat" size={20} color={colors.tint} />
                  <Text className="text-text-primary dark:text-text-primary-dark font-medium ml-2">
                    Recurring
                  </Text>
                </View>
                <Switch
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                  trackColor={{ false: colors.surfaceHover, true: colors.tint }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Recurring Options */}
            {isRecurring && (
              <View className="mx-4 mt-3">
                <Text className="text-text-secondary dark:text-text-secondary-dark text-sm font-medium mb-2">
                  Frequency
                </Text>
                <View className="flex-row flex-wrap mb-3">
                  {FREQUENCIES.map((f) => (
                    <Pressable
                      key={f.value}
                      onPress={() => setFrequency(f.value)}
                      className="mr-2 mb-2 px-4 py-2 rounded-bento-sm"
                      style={{
                        backgroundColor:
                          frequency === f.value
                            ? colors.tint
                            : colors.surfaceHover,
                      }}
                    >
                      <Text
                        className="font-medium"
                        style={{
                          color:
                            frequency === f.value ? "#FFFFFF" : colors.text,
                        }}
                      >
                        {f.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Custom Weekday Picker */}
                {frequency === "custom" && (
                  <View className="mb-3">
                    <Text className="text-text-secondary dark:text-text-secondary-dark text-sm font-medium mb-2">
                      Select Days
                    </Text>
                    <View className="flex-row justify-between">
                      {WEEKDAYS.map((day) => {
                        const selected = customDays.includes(day.value);
                        return (
                          <Pressable
                            key={day.value}
                            onPress={() =>
                              setCustomDays((prev) =>
                                selected
                                  ? prev.filter((d) => d !== day.value)
                                  : [...prev, day.value].sort(),
                              )
                            }
                            className="w-10 h-10 rounded-full items-center justify-center"
                            style={{
                              backgroundColor: selected
                                ? colors.tint
                                : colors.surfaceHover,
                            }}
                          >
                            <Text
                              className="text-sm font-semibold"
                              style={{
                                color: selected ? "#FFFFFF" : colors.text,
                              }}
                            >
                              {day.short}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}

                <Text className="text-text-secondary dark:text-text-secondary-dark text-sm font-medium mb-2">
                  Next Payment Date
                </Text>
                <DatePickerField value={nextDate} onChange={setNextDate} />
                <View className="h-3" />
                <Text className="text-text-secondary dark:text-text-secondary-dark text-sm font-medium mb-2">
                  End Date (optional)
                </Text>
                <DatePickerField
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="No end date"
                />
              </View>
            )}
          </>
        )}

        {/* Submit Button */}
        <View className="mx-4 mt-8 mb-8">
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            className={`py-4 rounded-bento items-center ${
              canSubmit
                ? "bg-primary"
                : "bg-surface-hover dark:bg-surface-hover-dark"
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                className={`font-semibold text-base ${
                  canSubmit
                    ? "text-white"
                    : "text-text-muted dark:text-text-muted-dark"
                }`}
              >
                {activeTab === "owe"
                  ? `Add ${debtDirection === "receivable" ? "Receivable" : "Payable"}`
                  : `Add ${activeTab === "expense" ? "Expense" : "Income"}`}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
