import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { DatePickerField } from '@/components/ui/date-picker-field';
import { Colors } from '@/constants/theme';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategories } from '@/hooks/use-categories';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTransactions } from '@/hooks/use-transactions';
import type { Transaction } from '@/modules/transaction/transaction.types';
import { useAccountStore } from '@/state/account.store';
import { useCategoryStore } from '@/state/category.store';
import { useTransactionStore } from '@/state/transaction.store';

interface TransactionItemProps {
  transaction: Transaction;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  accountName: string;
  onPress: (id: string) => void;
}

function TransactionItem({
  transaction,
  categoryName,
  categoryIcon,
  categoryColor,
  accountName,
  onPress,
}: TransactionItemProps) {
  const isExpense = transaction.type === 'expense';
  const amountColor = isExpense ? '#FF6B6B' : '#05DF72';
  const amountPrefix = isExpense ? '-' : '+';

  const formattedAmount = `${amountPrefix}$${transaction.amount.toFixed(2)}`;
  const formattedDate = new Date(transaction.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Pressable
      onPress={() => onPress(transaction.id)}
      className="flex-row items-center px-4 py-3 bg-surface dark:bg-surface-dark mx-4 mb-2 rounded-bento"
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: categoryColor + '20' }}
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
        <Text style={{ color: amountColor }} className="font-semibold text-base">
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
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  for (const t of transactions) {
    const key = t.date.split('T')[0];
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, data]) => {
      let title: string;
      if (key === today) {
        title = 'Today';
      } else if (key === yesterday) {
        title = 'Yesterday';
      } else {
        title = new Date(key).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });
      }
      return { title, data };
    });
}

type ListItem = { type: 'header'; title: string; id: string } | { type: 'item'; data: Transaction };

export default function TransactionsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const transactions = useTransactionStore((s) => s.transactions);
  const categories = useCategoryStore((s) => s.categories);
  const accounts = useAccountStore((s) => s.accounts);

  const { fetch: fetchTransactions, edit: editTransaction, remove: removeTransaction } = useTransactions();
  const { fetch: fetchCategories } = useCategories();
  const { fetch: fetchAccounts } = useAccounts();

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editAccountId, setEditAccountId] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const listData = useMemo<ListItem[]>(() => {
    const groups = groupByDate(transactions);
    const items: ListItem[] = [];
    for (const group of groups) {
      items.push({ type: 'header', title: group.title, id: `header-${group.title}` });
      for (const t of group.data) {
        items.push({ type: 'item', data: t });
      }
    }
    return items;
  }, [transactions]);

  const loadData = useCallback(async () => {
    await Promise.all([
      fetchTransactions({ limit: 50 }),
      fetchCategories(),
      fetchAccounts(),
    ]);
  }, [fetchTransactions, fetchCategories, fetchAccounts]);

  useFocusEffect(
    useCallback(() => {
      loadData().finally(() => setInitialLoading(false));
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handlePress = useCallback((id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;
    setEditingTx(tx);
    setEditAmount(tx.amount.toString());
    setEditDescription(tx.description ?? '');
    setEditDate(tx.date.split('T')[0]);
    setEditCategoryId(tx.categoryId);
    setEditAccountId(tx.accountId);
    setShowEditModal(true);
  }, [transactions]);

  const handleEditSave = useCallback(async () => {
    if (!editingTx) return;
    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setEditSubmitting(true);
    await editTransaction(editingTx.id, {
      amount: parsedAmount,
      description: editDescription.trim() || undefined,
      date: editDate ? new Date(editDate + 'T00:00:00').toISOString() : undefined,
      categoryId: editCategoryId ?? undefined,
      accountId: editAccountId ?? undefined,
    });
    setEditSubmitting(false);
    setShowEditModal(false);
    await fetchTransactions({ limit: 50 });
  }, [editingTx, editAmount, editDescription, editDate, editCategoryId, editAccountId, editTransaction, fetchTransactions]);

  const handleEditDelete = useCallback(async () => {
    if (!editingTx) return;
    Alert.alert('Delete Transaction', 'Are you sure you want to delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeTransaction(editingTx.id);
          setShowEditModal(false);
        },
      },
    ]);
  }, [editingTx, removeTransaction]);

  const handleAddPress = useCallback(() => {
    router.push('/(tabs)/add');
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'header') {
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
          categoryName={cat?.name ?? 'Unknown'}
          categoryIcon={cat?.icon ?? 'wallet'}
          categoryColor={cat?.color ?? '#888888'}
          accountName={acc?.name ?? 'Unknown'}
          onPress={handlePress}
        />
      );
    },
    [categoryMap, accountMap, handlePress]
  );

  const keyExtractor = useCallback((item: ListItem) => {
    return item.type === 'header' ? item.id : item.data.id;
  }, []);

  if (initialLoading) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark items-center justify-center">
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (transactions.length === 0) {
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
        <Pressable onPress={handleAddPress} className="bg-primary px-6 py-3 rounded-bento">
          <Text className="text-white font-semibold">Add Transaction</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Edit/Delete Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-surface dark:bg-surface-dark rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-text-primary dark:text-text-primary-dark text-xl font-bold">Edit Transaction</Text>
              <Pressable onPress={() => setShowEditModal(false)} className="w-8 h-8 rounded-full bg-surface-hover dark:bg-surface-hover-dark items-center justify-center">
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text className="text-text-muted dark:text-text-muted-dark text-sm mb-2">Amount</Text>
            <TextInput
              value={editAmount}
              onChangeText={(t) => setEditAmount(t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              className="bg-surface-hover dark:bg-surface-hover-dark text-text-primary dark:text-text-primary-dark rounded-bento px-4 py-3 mb-4"
            />

            <Text className="text-text-muted dark:text-text-muted-dark text-sm mb-2">Description</Text>
            <TextInput
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Description"
              placeholderTextColor={colors.textMuted}
              className="bg-surface-hover dark:bg-surface-hover-dark text-text-primary dark:text-text-primary-dark rounded-bento px-4 py-3 mb-4"
            />

            <DatePickerField label="Date" value={editDate} onChange={setEditDate} />

            <View className="h-4" />

            <View className="flex-row mt-2">
              <Pressable
                onPress={handleEditDelete}
                className="flex-1 py-4 rounded-bento items-center mr-2"
                style={{ backgroundColor: '#FF6B6B20' }}
              >
                <Text style={{ color: '#FF6B6B' }} className="font-semibold">Delete</Text>
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

