import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
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
import { useTransactions } from "@/hooks/use-transactions";
import type {
  Transaction,
  TransactionFilter,
} from "@/modules/transaction/transaction.types";
import { formatSignedCurrency } from "@/modules/currency/currency.types";
import { useAccountStore } from "@/state/account.store";
import { useCategoryStore } from "@/state/category.store";
import { useTransactionStore } from "@/state/transaction.store";

interface TransactionItemProps {
  transaction: Transaction;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  accountName: string;
  accountCurrency: string;
  onPress: (id: string) => void;
}

function TransactionItem({
  transaction,
  categoryName,
  categoryIcon,
  categoryColor,
  accountName,
  accountCurrency,
  onPress,
}: TransactionItemProps) {
  const isExpense = transaction.type === "expense";
  const isTransfer = transaction.type === "transfer";
  const amountColor = isExpense ? "#FF6B6B" : isTransfer ? "#3B82F6" : "#05DF72";

  const formattedAmount = formatSignedCurrency(
    transaction.amount,
    transaction.type as "expense" | "income" | "transfer",
    accountCurrency
  );
  const formattedDate = new Date(transaction.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <Pressable
      onPress={() => onPress(transaction.id)}
      className="flex-row items-center px-4 py-3 bg-surface dark:bg-surface-dark mx-4 mb-2 rounded-bento"
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: categoryColor + "20" }}
      >
        <Ionicons name={categoryIcon as any} size={20} color={categoryColor} />
      </View>

      <View className="flex-1">
        <Text className="text-text-primary dark:text-text-primary-dark font-medium text-base">
          {categoryName}
        </Text>
        <Text className="text-text-muted dark:text-text-muted-dark text-sm">
          {transaction.description || accountName}
        </Text>
      </View>

      <View className="items-end">
        <Text
          style={{ color: amountColor }}
          className="font-semibold text-base"
        >
          {formattedAmount}
        </Text>
        <Text className="text-text-muted dark:text-text-muted-dark text-xs">
          {formattedDate}
        </Text>
      </View>
    </Pressable>
  );
}

interface DateGroup {
  title: string;
  data: Transaction[];
}

function groupByDate(transactions: Transaction[]): DateGroup[] {
  const groups: Record<string, Transaction[]> = {};
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  for (const t of transactions) {
    const key = t.date.split("T")[0];
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, data]) => {
      let title: string;
      if (key === today) {
        title = "Today";
      } else if (key === yesterday) {
        title = "Yesterday";
      } else {
        title = new Date(key).toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });
      }
      return { title, data };
    });
}

type ListItem =
  | { type: "header"; title: string; id: string }
  | { type: "item"; data: Transaction };

type DatePreset = "all" | "today" | "week" | "month" | "custom";

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "custom", label: "Custom" },
];

function getDateRange(preset: DatePreset): {
  startDate?: string;
  endDate?: string;
} {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  switch (preset) {
    case "today":
      return { startDate: today, endDate: today + "T23:59:59" };
    case "week": {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      return { startDate: weekStart.toISOString().split("T")[0] };
    }
    case "month": {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: monthStart.toISOString().split("T")[0] };
    }
    default:
      return {};
  }
}

export default function TransactionsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Filter state
  const [filterType, setFilterType] = useState<"all" | "expense" | "income">(
    "all",
  );
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
  const [filterDatePreset, setFilterDatePreset] = useState<DatePreset>("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);

  const transactions = useTransactionStore((s) => s.transactions);
  const categories = useCategoryStore((s) => s.categories);
  const accounts = useAccountStore((s) => s.accounts);

  const {
    fetch: fetchTransactions,
    edit: editTransaction,
    remove: removeTransaction,
  } = useTransactions();
  const { fetch: fetchCategories } = useCategories();
  const { fetch: fetchAccounts } = useAccounts();

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editAccountId, setEditAccountId] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  const listData = useMemo<ListItem[]>(() => {
    const groups = groupByDate(transactions);
    const items: ListItem[] = [];
    for (const group of groups) {
      items.push({
        type: "header",
        title: group.title,
        id: `header-${group.title}`,
      });
      for (const t of group.data) {
        items.push({ type: "item", data: t });
      }
    }
    return items;
  }, [transactions]);

  const activeFilter = useMemo<TransactionFilter>(() => {
    const filter: TransactionFilter = { limit: 50 };
    if (filterType !== "all") filter.type = filterType;
    if (filterCategoryId) filter.categoryId = filterCategoryId;

    if (filterDatePreset === "custom") {
      if (filterStartDate) filter.startDate = filterStartDate;
      if (filterEndDate) filter.endDate = filterEndDate + "T23:59:59";
    } else {
      const range = getDateRange(filterDatePreset);
      if (range.startDate) filter.startDate = range.startDate;
      if (range.endDate) filter.endDate = range.endDate;
    }

    return filter;
  }, [
    filterType,
    filterCategoryId,
    filterDatePreset,
    filterStartDate,
    filterEndDate,
  ]);

  const loadData = useCallback(async () => {
    await Promise.all([
      fetchTransactions(activeFilter),
      fetchCategories(),
      fetchAccounts(),
    ]);
  }, [fetchTransactions, fetchCategories, fetchAccounts, activeFilter]);

  useFocusEffect(
    useCallback(() => {
      loadData().finally(() => setInitialLoading(false));
    }, [loadData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handlePress = useCallback(
    (id: string) => {
      const tx = transactions.find((t) => t.id === id);
      if (!tx) return;
      setEditingTx(tx);
      setEditAmount(tx.amount.toString());
      setEditDescription(tx.description ?? "");
      setEditDate(tx.date.split("T")[0]);
      setEditCategoryId(tx.categoryId);
      setEditAccountId(tx.accountId);
      setShowEditModal(true);
    },
    [transactions],
  );

  const handleEditSave = useCallback(async () => {
    if (!editingTx) return;
    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setEditSubmitting(true);
    await editTransaction(editingTx.id, {
      amount: parsedAmount,
      description: editDescription.trim() || undefined,
      date: editDate
        ? new Date(editDate + "T00:00:00").toISOString()
        : undefined,
      categoryId: editCategoryId ?? undefined,
      accountId: editAccountId ?? undefined,
    });
    setEditSubmitting(false);
    setShowEditModal(false);
    await fetchTransactions(activeFilter);
  }, [
    editingTx,
    editAmount,
    editDescription,
    editDate,
    editCategoryId,
    editAccountId,
    editTransaction,
    fetchTransactions,
    activeFilter,
  ]);

  const handleEditDelete = useCallback(async () => {
    if (!editingTx) return;
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await removeTransaction(editingTx.id);
            setShowEditModal(false);
          },
        },
      ],
    );
  }, [editingTx, removeTransaction]);

  const handleAddPress = useCallback(() => {
    router.push("/(tabs)/add");
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === "header") {
        return (
          <Text className="text-text-secondary dark:text-text-secondary-dark text-sm font-medium px-4 py-2 bg-background dark:bg-background-dark">
            {item.title}
          </Text>
        );
      }

      const t = item.data;
      const cat = categoryMap.get(t.categoryId);
      const acc = accountMap.get(t.accountId);

      return (
        <TransactionItem
          transaction={t}
          categoryName={cat?.name ?? "Unknown"}
          categoryIcon={cat?.icon ?? "wallet"}
          categoryColor={cat?.color ?? "#888888"}
          accountName={acc?.name ?? "Unknown"}
          accountCurrency={acc?.currency ?? "php"}
          onPress={handlePress}
        />
      );
    },
    [categoryMap, accountMap, handlePress],
  );

  const keyExtractor = useCallback((item: ListItem) => {
    return item.type === "header" ? item.id : item.data.id;
  }, []);

  const hasActiveFilters =
    filterType !== "all" ||
    filterCategoryId !== null ||
    filterDatePreset !== "all";

  const clearFilters = useCallback(() => {
    setFilterType("all");
    setFilterCategoryId(null);
    setFilterDatePreset("all");
    setFilterStartDate("");
    setFilterEndDate("");
  }, []);

  const selectedCategoryName = useMemo(() => {
    if (!filterCategoryId) return null;
    return categories.find((c) => c.id === filterCategoryId)?.name ?? null;
  }, [filterCategoryId, categories]);

  if (initialLoading) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark items-center justify-center">
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (transactions.length === 0 && !hasActiveFilters) {
    return (
      <View
        className="flex-1 bg-background dark:bg-background-dark items-center justify-center px-8"
        style={{ paddingTop: insets.top }}
      >
        <View className="w-20 h-20 rounded-full bg-surface dark:bg-surface-dark items-center justify-center mb-4">
          <Ionicons name="receipt-outline" size={40} color={colors.textMuted} />
        </View>
        <Text className="text-text-primary dark:text-text-primary-dark text-xl font-semibold mb-2">
          No transactions yet
        </Text>
        <Text className="text-text-muted dark:text-text-muted-dark text-center mb-6">
          Start tracking your expenses by adding your first transaction
        </Text>
        <Pressable
          onPress={handleAddPress}
          className="bg-primary px-6 py-3 rounded-bento"
        >
          <Text className="text-white font-semibold">Add Transaction</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      {/* Filter Bar */}
      <View
        style={{ paddingTop: insets.top + 8 }}
        className="px-4 pb-2 bg-background dark:bg-background-dark"
      >
        {/* Type Filter Pills */}
        <View className="flex-row gap-2 mb-2">
          {(["all", "expense", "income"] as const).map((type) => (
            <Pressable
              key={type}
              onPress={() => setFilterType(type)}
              className={`px-4 py-2 rounded-full ${
                filterType === type
                  ? "bg-primary"
                  : "bg-surface dark:bg-surface-dark"
              }`}
            >
              <Text
                className={`text-sm font-medium capitalize ${
                  filterType === type
                    ? "text-white"
                    : "text-text-primary dark:text-text-primary-dark"
                }`}
              >
                {type === "all" ? "All" : type}
              </Text>
            </Pressable>
          ))}

          {/* More Filters Button */}
          <Pressable
            onPress={() => setShowFilterModal(true)}
            className={`px-4 py-2 rounded-full flex-row items-center ${
              filterCategoryId || filterDatePreset !== "all"
                ? "bg-primary"
                : "bg-surface dark:bg-surface-dark"
            }`}
          >
            <Ionicons
              name="filter"
              size={14}
              color={
                filterCategoryId || filterDatePreset !== "all"
                  ? "#FFFFFF"
                  : colors.textSecondary
              }
            />
            <Text
              className={`text-sm font-medium ml-1 ${
                filterCategoryId || filterDatePreset !== "all"
                  ? "text-white"
                  : "text-text-primary dark:text-text-primary-dark"
              }`}
            >
              Filters
            </Text>
          </Pressable>
        </View>

        {/* Active filter tags */}
        {hasActiveFilters && (
          <View className="flex-row items-center gap-2">
            {selectedCategoryName && (
              <View className="flex-row items-center bg-primary/15 rounded-full px-3 py-1">
                <Text className="text-primary text-xs font-medium">
                  {selectedCategoryName}
                </Text>
                <Pressable
                  onPress={() => setFilterCategoryId(null)}
                  className="ml-1"
                >
                  <Ionicons name="close-circle" size={14} color={colors.tint} />
                </Pressable>
              </View>
            )}
            {filterDatePreset !== "all" && (
              <View className="flex-row items-center bg-primary/15 rounded-full px-3 py-1">
                <Text className="text-primary text-xs font-medium">
                  {filterDatePreset === "custom"
                    ? `${filterStartDate || "..."} → ${filterEndDate || "..."}`
                    : DATE_PRESETS.find((p) => p.value === filterDatePreset)
                        ?.label}
                </Text>
                <Pressable
                  onPress={() => {
                    setFilterDatePreset("all");
                    setFilterStartDate("");
                    setFilterEndDate("");
                  }}
                  className="ml-1"
                >
                  <Ionicons name="close-circle" size={14} color={colors.tint} />
                </Pressable>
              </View>
            )}
            <Pressable onPress={clearFilters}>
              <Text className="text-text-muted dark:text-text-muted-dark text-xs">
                Clear all
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
          />
        }
        contentContainerStyle={
          listData.length === 0
            ? { flexGrow: 1, paddingBottom: 100 }
            : { paddingBottom: 100 }
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          hasActiveFilters ? (
            <View className="flex-1 items-center justify-center px-8">
              <Ionicons
                name="search-outline"
                size={40}
                color={colors.textMuted}
              />
              <Text className="text-text-primary dark:text-text-primary-dark text-lg font-semibold mt-3 mb-1">
                No results
              </Text>
              <Text className="text-text-muted dark:text-text-muted-dark text-center mb-4">
                No transactions match your current filters
              </Text>
              <Pressable
                onPress={clearFilters}
                className="bg-primary px-5 py-2.5 rounded-full"
              >
                <Text className="text-white font-medium text-sm">
                  Clear Filters
                </Text>
              </Pressable>
            </View>
          ) : undefined
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-surface dark:bg-surface-dark rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-text-primary dark:text-text-primary-dark text-xl font-bold">
                Filters
              </Text>
              <Pressable
                onPress={() => setShowFilterModal(false)}
                className="w-8 h-8 rounded-full bg-surface-hover dark:bg-surface-hover-dark items-center justify-center"
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Category Filter */}
            <Text className="text-text-muted dark:text-text-muted-dark text-sm font-medium mb-2">
              Category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            >
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setFilterCategoryId(null)}
                  className={`px-4 py-2 rounded-full ${!filterCategoryId ? "bg-primary" : "bg-surface-hover dark:bg-surface-hover-dark"}`}
                >
                  <Text
                    className={`text-sm ${!filterCategoryId ? "text-white font-medium" : "text-text-primary dark:text-text-primary-dark"}`}
                  >
                    All
                  </Text>
                </Pressable>
                {categories.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => setFilterCategoryId(cat.id)}
                    className={`flex-row items-center px-3 py-2 rounded-full ${filterCategoryId === cat.id ? "bg-primary" : "bg-surface-hover dark:bg-surface-hover-dark"}`}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={14}
                      color={
                        filterCategoryId === cat.id ? "#FFFFFF" : cat.color
                      }
                    />
                    <Text
                      className={`text-sm ml-1.5 ${filterCategoryId === cat.id ? "text-white font-medium" : "text-text-primary dark:text-text-primary-dark"}`}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Date Filter */}
            <Text className="text-text-muted dark:text-text-muted-dark text-sm font-medium mb-2">
              Date Range
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {DATE_PRESETS.map((preset) => (
                <Pressable
                  key={preset.value}
                  onPress={() => setFilterDatePreset(preset.value)}
                  className={`px-4 py-2 rounded-full ${filterDatePreset === preset.value ? "bg-primary" : "bg-surface-hover dark:bg-surface-hover-dark"}`}
                >
                  <Text
                    className={`text-sm ${filterDatePreset === preset.value ? "text-white font-medium" : "text-text-primary dark:text-text-primary-dark"}`}
                  >
                    {preset.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Custom Date Range */}
            {filterDatePreset === "custom" && (
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <DatePickerField
                    label="From"
                    value={filterStartDate}
                    onChange={setFilterStartDate}
                  />
                </View>
                <View className="flex-1">
                  <DatePickerField
                    label="To"
                    value={filterEndDate}
                    onChange={setFilterEndDate}
                  />
                </View>
              </View>
            )}

            {/* Apply */}
            <View className="flex-row gap-3 mt-2">
              <Pressable
                onPress={() => {
                  clearFilters();
                  setShowFilterModal(false);
                }}
                className="flex-1 py-4 rounded-2xl items-center bg-surface-hover dark:bg-surface-hover-dark"
              >
                <Text className="text-text-primary dark:text-text-primary-dark font-semibold">
                  Reset
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowFilterModal(false)}
                className="flex-1 py-4 rounded-2xl items-center bg-primary"
              >
                <Text className="text-white font-semibold">Apply</Text>
              </Pressable>
            </View>

            <View style={{ height: insets.bottom + 16 }} />
          </View>
        </View>
      </Modal>

      {/* Edit/Delete Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-surface dark:bg-surface-dark rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-text-primary dark:text-text-primary-dark text-xl font-bold">
                Edit Transaction
              </Text>
              <Pressable
                onPress={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-surface-hover dark:bg-surface-hover-dark items-center justify-center"
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text className="text-text-muted dark:text-text-muted-dark text-sm mb-2">
              Amount
            </Text>
            <TextInput
              value={editAmount}
              onChangeText={(t) => setEditAmount(t.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
              className="bg-surface-hover dark:bg-surface-hover-dark text-text-primary dark:text-text-primary-dark rounded-bento px-4 py-3 mb-4"
            />

            <Text className="text-text-muted dark:text-text-muted-dark text-sm mb-2">
              Description
            </Text>
            <TextInput
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Description"
              placeholderTextColor={colors.textMuted}
              className="bg-surface-hover dark:bg-surface-hover-dark text-text-primary dark:text-text-primary-dark rounded-bento px-4 py-3 mb-4"
            />

            <DatePickerField
              label="Date"
              value={editDate}
              onChange={setEditDate}
            />

            <View className="h-4" />

            <View className="flex-row mt-2">
              <Pressable
                onPress={handleEditDelete}
                className="flex-1 py-4 rounded-bento items-center mr-2"
                style={{ backgroundColor: "#FF6B6B20" }}
              >
                <Text style={{ color: "#FF6B6B" }} className="font-semibold">
                  Delete
                </Text>
              </Pressable>
              <Pressable
                onPress={handleEditSave}
                disabled={editSubmitting}
                className="flex-1 py-4 rounded-bento items-center ml-2 bg-primary"
              >
                {editSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-semibold">Save</Text>
                )}
              </Pressable>
            </View>

            <View style={{ height: insets.bottom + 16 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
