import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import {
    AddBudgetCard,
    BudgetCard,
    BudgetOverviewHeader,
    CategoryPieChart,
    EmptyBudgets,
} from '@/components/budgets';
import { useBudgets } from '@/hooks/use-budgets';
import { useCategories } from '@/hooks/use-categories';
import { useTransactions } from '@/hooks/use-transactions';
import type { BudgetType } from '@/modules/budget';
import { getMonthDateRange } from '@/modules/budget';
import { useBudgetStore } from '@/state/budget.store';
import { useCategoryStore } from '@/state/category.store';
import { useTransactionStore } from '@/state/transaction.store';

export default function BudgetsScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState('');
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [newBudgetType, setNewBudgetType] = useState<BudgetType>('monthly');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const { fetchStatuses, add: addBudget, edit: editBudget, remove: removeBudget } = useBudgets();
  const { fetch: fetchCategories } = useCategories();
  const { fetch: fetchTransactions } = useTransactions();

  const budgetStatuses = useBudgetStore((state) => state.statuses);
  const categories = useCategoryStore((state) => state.categories);
  const transactions = useTransactionStore((state) => state.transactions);

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );

  // Edit state
  const [editBudgetId, setEditBudgetId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    await Promise.all([fetchStatuses(), fetchCategories(), fetchTransactions({ limit: 100 })]);
  }, [fetchStatuses, fetchCategories, fetchTransactions]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const { totalBudget, totalSpent } = useMemo(() => {
    return budgetStatuses.reduce(
      (acc, status) => {
        acc.totalBudget += status.budget.amount;
        acc.totalSpent += status.spent;
        return acc;
      },
      { totalBudget: 0, totalSpent: 0 }
    );
  }, [budgetStatuses]);

  const displayBudgets = useMemo(() => {
    return budgetStatuses.map((status) => {
      const category = status.budget.categoryId
        ? categories.find((c) => c.id === status.budget.categoryId)
        : null;
      return {
        id: status.budget.id,
        name: status.budget.name,
        type: status.budget.type,
        spent: status.spent,
        total: status.budget.amount,
        percentage: Math.round(status.percentage * 100),
        alertLevel: status.alertLevel,
        categoryName: category?.name,
        categoryColor: category?.color,
      };
    });
  }, [budgetStatuses, categories]);

  const { pieSlices, pieTotalSpent } = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const spending: Record<string, number> = {};

    transactions.forEach((t) => {
      if (t.type === 'expense' && t.date >= startOfMonth) {
        spending[t.categoryId] = (spending[t.categoryId] || 0) + t.amount;
      }
    });

    const total = Object.values(spending).reduce((sum, v) => sum + v, 0);

    const slices = Object.entries(spending)
      .map(([categoryId, amount]) => {
        const category = categories.find((c) => c.id === categoryId);
        if (!category) return null;
        return {
          id: categoryId,
          name: category.name,
          amount,
          percentage: total > 0 ? (amount / total) * 100 : 0,
          color: category.color,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.amount || 0) - (a?.amount || 0)) as { id: string; name: string; amount: number; percentage: number; color: string }[];

    return { pieSlices: slices, pieTotalSpent: total };
  }, [transactions, categories]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const resetModal = useCallback(() => {
    setShowAddModal(false);
    setNewBudgetName('');
    setNewBudgetAmount('');
    setNewBudgetType('monthly');
    setSelectedCategoryId(null);
  }, []);

  const handleSaveBudget = useCallback(async () => {
    const parsedAmount = parseFloat(newBudgetAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;
    if (newBudgetType === 'category' && !selectedCategoryId) return;

    const { startDate, endDate } = getMonthDateRange();
    const budgetName = newBudgetType === 'category'
      ? (newBudgetName.trim() || expenseCategories.find((c) => c.id === selectedCategoryId)?.name || 'Category Budget')
      : (newBudgetName.trim() || 'Monthly Budget');

    await addBudget({
      name: budgetName,
      type: newBudgetType,
      amount: parsedAmount,
      categoryId: newBudgetType === 'category' ? selectedCategoryId! : undefined,
      startDate,
      endDate,
    });

    await fetchStatuses();
    resetModal();
  }, [newBudgetName, newBudgetAmount, newBudgetType, selectedCategoryId, addBudget, fetchStatuses, resetModal, expenseCategories]);

  const handleBudgetPress = useCallback((id: string) => {
    const status = budgetStatuses.find((s) => s.budget.id === id);
    if (!status) return;
    setEditBudgetId(id);
    setEditName(status.budget.name);
    setEditAmount(status.budget.amount.toString());
    setShowEditModal(true);
  }, [budgetStatuses]);

  const handleEditSave = useCallback(async () => {
    if (!editBudgetId) return;
    const parsed = parseFloat(editAmount);
    if (isNaN(parsed) || parsed <= 0) return;

    setEditSubmitting(true);
    await editBudget(editBudgetId, { name: editName.trim(), amount: parsed });
    setEditSubmitting(false);
    setShowEditModal(false);
    await fetchStatuses();
  }, [editBudgetId, editName, editAmount, editBudget, fetchStatuses]);

  const handleEditDelete = useCallback(async () => {
    if (!editBudgetId) return;
    Alert.alert('Delete Budget', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeBudget(editBudgetId);
          setShowEditModal(false);
          await fetchStatuses();
        },
      },
    ]);
  }, [editBudgetId, removeBudget, fetchStatuses]);

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mt-4 mb-6">
          <View>
            <Text className="text-text-muted dark:text-text-muted-dark text-sm">Track your limits</Text>
            <Text className="text-text-primary dark:text-text-primary-dark text-2xl font-bold tracking-tight">Budgets</Text>
          </View>
          <Pressable
            onPress={() => setShowAddModal(true)}
            className="w-10 h-10 rounded-full bg-primary items-center justify-center"
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Overview Header */}
        {budgetStatuses.length > 0 && (
          <BudgetOverviewHeader totalBudget={totalBudget} totalSpent={totalSpent} budgetCount={displayBudgets.length} />
        )}

        {/* Category Spending Breakdown */}
        <View className="mt-4 mb-4">
          <Text className="text-text-primary dark:text-text-primary-dark text-lg font-bold tracking-tight mb-3">
            Spending Breakdown
          </Text>
          <CategoryPieChart slices={pieSlices} totalSpent={pieTotalSpent} />
        </View>

        {/* Budget List */}
        {displayBudgets.length > 0 ? (
          <View>
            <Text className="text-text-primary dark:text-text-primary-dark text-lg font-bold tracking-tight mb-3">Active Budgets</Text>
            {displayBudgets.map((budget) => (
              <BudgetCard
                key={budget.id}
                id={budget.id}
                name={budget.name}
                type={budget.type}
                spent={budget.spent}
                total={budget.total}
                percentage={budget.percentage}
                alertLevel={budget.alertLevel}
                categoryName={budget.categoryName}
                categoryColor={budget.categoryColor}
                onPress={() => handleBudgetPress(budget.id)}
              />
            ))}
          </View>
        ) : (
          <EmptyBudgets />
        )}

        <View className="mt-4">
          <AddBudgetCard onPress={() => setShowAddModal(true)} />
        </View>
      </ScrollView>

      {/* Create Budget Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={resetModal}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-surface dark:bg-surface-dark rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-text-primary dark:text-text-primary-dark text-xl font-bold tracking-tight">Create Budget</Text>
              <Pressable onPress={resetModal} className="w-8 h-8 rounded-full bg-surface-hover dark:bg-surface-hover-dark items-center justify-center">
                <Ionicons name="close" size={20} color="#71717A" />
              </Pressable>
            </View>

            {/* Budget Type */}
            <Text className="text-text-muted dark:text-text-muted-dark text-sm mb-2">Budget Type</Text>
            <View className="flex-row mb-2">
              <Pressable
                onPress={() => { setNewBudgetType('monthly'); setSelectedCategoryId(null); }}
                className={`flex-1 py-3 rounded-2xl mr-2 items-center ${newBudgetType === 'monthly' ? 'bg-primary' : 'bg-surface-hover dark:bg-surface-hover-dark'}`}
              >
                <Text className={newBudgetType === 'monthly' ? 'text-white font-semibold' : 'text-text-primary dark:text-text-primary-dark'}>Monthly</Text>
              </Pressable>
              <Pressable
                onPress={() => setNewBudgetType('category')}
                className={`flex-1 py-3 rounded-2xl ml-2 items-center ${newBudgetType === 'category' ? 'bg-primary' : 'bg-surface-hover dark:bg-surface-hover-dark'}`}
              >
                <Text className={newBudgetType === 'category' ? 'text-white font-semibold' : 'text-text-primary dark:text-text-primary-dark'}>Category</Text>
              </Pressable>
            </View>
            <Text className="text-text-muted dark:text-text-muted-dark text-xs mb-4">
              {newBudgetType === 'monthly'
                ? 'Tracks total spending across all categories this month.'
                : 'Tracks spending for a specific category this month.'}
            </Text>

            {/* Category Picker (only for category type) */}
            {newBudgetType === 'category' && (
              <View className="mb-4">
                <Text className="text-text-muted dark:text-text-muted-dark text-sm mb-2">Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row">
                    {expenseCategories.map((cat) => {
                      const isSelected = selectedCategoryId === cat.id;
                      return (
                        <Pressable
                          key={cat.id}
                          onPress={() => {
                            setSelectedCategoryId(cat.id);
                            if (!newBudgetName.trim()) setNewBudgetName(cat.name);
                          }}
                          className={`flex-row items-center px-3 py-2 rounded-2xl mr-2 ${isSelected ? 'bg-primary' : 'bg-surface-hover dark:bg-surface-hover-dark'}`}
                        >
                          <View
                            className="w-7 h-7 rounded-full items-center justify-center mr-2"
                            style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : cat.color + '20' }}
                          >
                            <Ionicons name={cat.icon as any} size={14} color={isSelected ? '#FFFFFF' : cat.color} />
                          </View>
                          <Text className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-text-primary dark:text-text-primary-dark'}`}>
                            {cat.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Name */}
            <Text className="text-text-muted dark:text-text-muted-dark text-sm mb-2">Name</Text>
            <TextInput
              value={newBudgetName}
              onChangeText={setNewBudgetName}
              placeholder={newBudgetType === 'monthly' ? 'e.g., Monthly Budget' : 'e.g., Food & Dining'}
              placeholderTextColor="#71717A"
              className="bg-surface-hover dark:bg-surface-hover-dark text-text-primary dark:text-text-primary-dark rounded-2xl px-4 py-3 mb-4"
            />

            {/* Amount */}
            <Text className="text-text-muted dark:text-text-muted-dark text-sm mb-2">Limit Amount</Text>
            <TextInput
              value={newBudgetAmount}
              onChangeText={setNewBudgetAmount}
              placeholder="$0.00"
              placeholderTextColor="#71717A"
              keyboardType="numeric"
              className="bg-surface-hover dark:bg-surface-hover-dark text-text-primary dark:text-text-primary-dark rounded-2xl px-4 py-3 mb-6"
            />

            {/* Save */}
            <Pressable
              onPress={handleSaveBudget}
              disabled={!newBudgetAmount || (newBudgetType === 'category' && !selectedCategoryId)}
              className={`py-4 rounded-2xl items-center active:opacity-80 ${
                newBudgetAmount && (newBudgetType === 'monthly' || selectedCategoryId) ? 'bg-primary' : 'bg-surface-hover dark:bg-surface-hover-dark'
              }`}
            >
              <Text className={`text-base font-semibold ${
                newBudgetAmount && (newBudgetType === 'monthly' || selectedCategoryId) ? 'text-white' : 'text-text-muted dark:text-text-muted-dark'
              }`}>
                Create Budget
              </Text>
            </Pressable>

            <View className="h-6" />
          </View>
        </View>
      </Modal>

      {/* Edit Budget Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-surface dark:bg-surface-dark rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-text-primary dark:text-text-primary-dark text-xl font-bold">Edit Budget</Text>
              <Pressable onPress={() => setShowEditModal(false)} className="w-8 h-8 rounded-full bg-surface-hover dark:bg-surface-hover-dark items-center justify-center">
                <Ionicons name="close" size={20} color="#71717A" />
              </Pressable>
            </View>

            <Text className="text-text-muted dark:text-text-muted-dark text-sm mb-2">Name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholderTextColor="#71717A"
              className="bg-surface-hover dark:bg-surface-hover-dark text-text-primary dark:text-text-primary-dark rounded-2xl px-4 py-3 mb-4"
            />

            <Text className="text-text-muted dark:text-text-muted-dark text-sm mb-2">Limit Amount</Text>
            <TextInput
              value={editAmount}
              onChangeText={(t) => setEditAmount(t.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              className="bg-surface-hover dark:bg-surface-hover-dark text-text-primary dark:text-text-primary-dark rounded-2xl px-4 py-3 mb-6"
            />

            <View className="flex-row">
              <Pressable
                onPress={handleEditDelete}
                className="flex-1 py-4 rounded-2xl items-center mr-2"
                style={{ backgroundColor: '#FF6B6B20' }}
              >
                <Text style={{ color: '#FF6B6B' }} className="font-semibold">Delete</Text>
              </Pressable>
              <Pressable
                onPress={handleEditSave}
                disabled={editSubmitting}
                className="flex-1 py-4 rounded-2xl items-center ml-2 bg-primary"
              >
                <Text className="text-white font-semibold">{editSubmitting ? 'Saving...' : 'Save'}</Text>
              </Pressable>
            </View>

            <View className="h-6" />
          </View>
        </View>
      </Modal>
    </View>
  );
}

