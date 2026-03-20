import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DatePickerField } from '@/components/ui/date-picker-field';
import { Colors } from '@/constants/theme';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategories } from '@/hooks/use-categories';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRecurring } from '@/hooks/use-recurring';
import type { RecurringFrequency, RecurringRule, RecurringType, WeekDay } from '@/modules/recurring/recurring.types';
import { useAccountStore } from '@/state/account.store';
import { useCategoryStore } from '@/state/category.store';
import { useRecurringStore } from '@/state/recurring.store';
import { formatCurrency } from '@/state/settings.store';

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom Days' },
];

const WEEKDAYS: { value: WeekDay; label: string; short: string }[] = [
  { value: 0, label: 'Sunday', short: 'S' },
  { value: 1, label: 'Monday', short: 'M' },
  { value: 2, label: 'Tuesday', short: 'T' },
  { value: 3, label: 'Wednesday', short: 'W' },
  { value: 4, label: 'Thursday', short: 'T' },
  { value: 5, label: 'Friday', short: 'F' },
  { value: 6, label: 'Saturday', short: 'S' },
];

interface RuleItemProps {
  rule: RecurringRule;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  accountName: string;
  onPress: () => void;
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
function formatFreq(frequency: string, customDays?: number[] | null): string {
  if (frequency === 'custom' && customDays?.length) {
    return customDays.map((d) => DAY_SHORT[d]).join(', ');
  }
  return frequency;
}

function RuleItem({ rule, categoryName, categoryIcon, categoryColor, accountName, onPress }: RuleItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isExpense = rule.type === 'expense';

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center p-4 mb-3 rounded-3xl"
      style={{ backgroundColor: colors.surface }}
    >
      <View
        className="w-12 h-12 rounded-full items-center justify-center mr-4"
        style={{ backgroundColor: categoryColor + '20' }}
      >
        <Ionicons name={categoryIcon as any} size={24} color={categoryColor} />
      </View>
      <View className="flex-1">
        <Text style={{ color: colors.text }} className="text-base font-semibold">{rule.name}</Text>
        <Text style={{ color: colors.textSecondary }} className="text-sm">
          {categoryName} • {accountName}
        </Text>
        <View className="flex-row items-center mt-1">
          <View className={`px-2 py-0.5 rounded-full mr-2 ${rule.isActive ? 'bg-secondary/20' : 'bg-border dark:bg-border-dark'}`}>
            <Text className={`text-xs font-medium ${rule.isActive ? 'text-secondary' : 'text-text-muted dark:text-text-muted-dark'}`}>
              {rule.isActive ? 'Active' : 'Paused'}
            </Text>
          </View>
          <Text style={{ color: colors.textMuted }} className="text-xs capitalize">
            {formatFreq(rule.frequency, rule.customDays)} • Next: {new Date(rule.nextDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>
      <Text className={`text-base font-bold ${isExpense ? 'text-expense' : 'text-secondary'}`}>
        {isExpense ? '-' : '+'}{formatCurrency(rule.amount)}
      </Text>
    </Pressable>
  );
}

export default function RecurringScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { editId } = useLocalSearchParams<{ editId?: string }>();

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state (shared for create)
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [ruleType, setRuleType] = useState<RecurringType>('expense');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [nextDate, setNextDate] = useState(new Date().toISOString().split('T')[0]);
  const [customDays, setCustomDays] = useState<WeekDay[]>([]);

  // Edit state
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editFrequency, setEditFrequency] = useState<RecurringFrequency>('monthly');
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editAccountId, setEditAccountId] = useState<string | null>(null);
  const [editNextDate, setEditNextDate] = useState('');
  const [editCustomDays, setEditCustomDays] = useState<WeekDay[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const rules = useRecurringStore((s) => s.rules);
  const categories = useCategoryStore((s) => s.categories);
  const accounts = useAccountStore((s) => s.accounts);

  const { fetch: fetchRules, add, edit, remove } = useRecurring();
  const { fetch: fetchCategories } = useCategories();
  const { fetch: fetchAccounts } = useAccounts();

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === ruleType),
    [categories, ruleType]
  );

  useEffect(() => {
    Promise.all([fetchRules(), fetchCategories(), fetchAccounts()]).finally(() => setLoading(false));
  }, [fetchRules, fetchCategories, fetchAccounts]);

  // Auto-open edit modal if navigated with editId param
  useEffect(() => {
    if (!loading && editId && rules.length > 0) {
      const rule = rules.find((r) => r.id === editId);
      if (rule) handleOpenEdit(rule);
    }
  }, [loading, editId, rules]);

  useEffect(() => {
    setSelectedCategoryId(null);
  }, [ruleType]);

  useEffect(() => {
    if (filteredCategories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(filteredCategories[0].id);
    }
  }, [filteredCategories, selectedCategoryId]);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      const def = accounts.find((a) => a.isDefault) ?? accounts[0];
      setSelectedAccountId(def.id);
    }
  }, [accounts, selectedAccountId]);

  const resetForm = useCallback(() => {
    setName('');
    setAmount('');
    setDescription('');
    setRuleType('expense');
    setFrequency('monthly');
    setCustomDays([]);
    setSelectedCategoryId(null);
    setSelectedAccountId(null);
    setNextDate(new Date().toISOString().split('T')[0]);
  }, []);

  const handleClose = useCallback(() => {
    setShowModal(false);
    resetForm();
  }, [resetForm]);

  const handleSave = useCallback(async () => {
    if (!name.trim() || !amount || !selectedCategoryId || !selectedAccountId) return;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setSubmitting(true);
    await add({
      name: name.trim(),
      type: ruleType,
      amount: parsedAmount,
      description: description.trim() || undefined,
      categoryId: selectedCategoryId,
      accountId: selectedAccountId,
      frequency,
      customDays: frequency === 'custom' ? customDays : undefined,
      nextDate,
    });
    setSubmitting(false);
    handleClose();
  }, [name, amount, description, ruleType, frequency, customDays, selectedCategoryId, selectedAccountId, nextDate, add, handleClose]);

  const handleDelete = useCallback(async (id: string) => {
    Alert.alert('Delete Recurring', 'Are you sure? Past transactions won\'t be affected.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await remove(id);
          setShowEditModal(false);
          setEditingRule(null);
        },
      },
    ]);
  }, [remove]);

  const handleOpenEdit = useCallback((rule: RecurringRule) => {
    setEditingRule(rule);
    setEditName(rule.name);
    setEditAmount(rule.amount.toString());
    setEditDescription(rule.description ?? '');
    setEditFrequency(rule.frequency);
    setEditCustomDays(rule.customDays ?? []);
    setEditCategoryId(rule.categoryId);
    setEditAccountId(rule.accountId);
    setEditNextDate(rule.nextDate);
    setShowEditModal(true);
  }, []);

  const handleCloseEdit = useCallback(() => {
    setShowEditModal(false);
    setEditingRule(null);
  }, []);

  const editFilteredCategories = useMemo(
    () => categories.filter((c) => c.type === (editingRule?.type ?? 'expense')),
    [categories, editingRule?.type]
  );

  const handleEditSave = useCallback(async () => {
    if (!editingRule) return;
    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;
    if (!editName.trim()) return;

    setEditSubmitting(true);
    await edit(editingRule.id, {
      name: editName.trim(),
      amount: parsedAmount,
      description: editDescription.trim() || undefined,
      frequency: editFrequency,
      customDays: editFrequency === 'custom' ? editCustomDays : undefined,
      categoryId: editCategoryId ?? undefined,
      accountId: editAccountId ?? undefined,
      nextDate: editNextDate || undefined,
    });
    setEditSubmitting(false);
    handleCloseEdit();
  }, [editingRule, editName, editAmount, editDescription, editFrequency, editCustomDays, editCategoryId, editAccountId, editNextDate, edit, handleCloseEdit]);

  const canEditSubmit = useMemo(() => {
    const parsedAmount = parseFloat(editAmount);
    const validCustom = editFrequency !== 'custom' || editCustomDays.length > 0;
    return !editSubmitting && editName.trim().length > 0 && !isNaN(parsedAmount) && parsedAmount > 0 && validCustom;
  }, [editSubmitting, editName, editAmount, editFrequency, editCustomDays]);

  const canSubmit = useMemo(() => {
    const parsedAmount = parseFloat(amount);
    const validCustom = frequency !== 'custom' || customDays.length > 0;
    return !submitting && name.trim().length > 0 && !isNaN(parsedAmount) && parsedAmount > 0 && selectedCategoryId && selectedAccountId && validCustom;
  }, [submitting, name, amount, selectedCategoryId, selectedAccountId, frequency, customDays]);

  const renderItem = useCallback(
    ({ item }: { item: RecurringRule }) => {
      const cat = categoryMap.get(item.categoryId);
      const acc = accountMap.get(item.accountId);
      return (
        <RuleItem
          rule={item}
          categoryName={cat?.name ?? 'Unknown'}
          categoryIcon={cat?.icon ?? 'help-circle'}
          categoryColor={cat?.color ?? '#888'}
          accountName={acc?.name ?? 'Unknown'}
          onPress={() => handleOpenEdit(item)}
        />
      );
    },
    [categoryMap, accountMap, handleDelete]
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Recurring', headerShown: true }} />
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: 'Recurring Payments',
          headerShown: true,
          headerRight: () => (
            <Pressable onPress={() => setShowModal(true)} className="mr-2">
              <Ionicons name="add-circle" size={28} color={colors.tint} />
            </Pressable>
          ),
        }}
      />

      <FlatList
        data={rules}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <View className="w-20 h-20 rounded-full items-center justify-center mb-4" style={{ backgroundColor: colors.surface }}>
              <Ionicons name="repeat-outline" size={40} color={colors.textMuted} />
            </View>
            <Text style={{ color: colors.text }} className="text-xl font-semibold mb-2">No recurring payments</Text>
            <Text style={{ color: colors.textMuted }} className="text-center mb-6 px-8">
              Set up recurring expenses like subscriptions, rent, or installments to auto-track them.
            </Text>
            <Pressable onPress={() => setShowModal(true)} className="bg-primary px-6 py-3 rounded-2xl">
              <Text className="text-white font-semibold">Add Recurring Payment</Text>
            </Pressable>
          </View>
        }
      />

      {/* Create Recurring Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={handleClose}>
        <View className="flex-1 justify-end bg-black/50">
          <View style={{ backgroundColor: colors.surface }} className="rounded-t-3xl p-6 max-h-[85%]">
            <View className="flex-row items-center justify-between mb-6">
              <Text style={{ color: colors.text }} className="text-xl font-bold">New Recurring Payment</Text>
              <Pressable onPress={handleClose} className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: colors.surfaceHover }}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Type */}
              <View className="flex-row mb-4">
                <Pressable
                  onPress={() => setRuleType('expense')}
                  className={`flex-1 py-3 rounded-2xl mr-2 items-center ${ruleType === 'expense' ? 'bg-expense' : ''}`}
                  style={ruleType !== 'expense' ? { backgroundColor: colors.surfaceHover } : undefined}
                >
                  <Text className={`font-semibold ${ruleType === 'expense' ? 'text-white' : ''}`} style={ruleType !== 'expense' ? { color: colors.text } : undefined}>Expense</Text>
                </Pressable>
                <Pressable
                  onPress={() => setRuleType('income')}
                  className={`flex-1 py-3 rounded-2xl ml-2 items-center ${ruleType === 'income' ? 'bg-income' : ''}`}
                  style={ruleType !== 'income' ? { backgroundColor: colors.surfaceHover } : undefined}
                >
                  <Text className={`font-semibold ${ruleType === 'income' ? 'text-white' : ''}`} style={ruleType !== 'income' ? { color: colors.text } : undefined}>Income</Text>
                </Pressable>
              </View>

              {/* Name */}
              <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g., Netflix, Rent, Phone installment"
                placeholderTextColor={colors.textMuted}
                style={{ backgroundColor: colors.surfaceHover, color: colors.text }}
                className="rounded-2xl px-4 py-3 mb-4"
              />

              {/* Amount */}
              <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">Amount</Text>
              <TextInput
                value={amount}
                onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
                placeholder="$0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={{ backgroundColor: colors.surfaceHover, color: colors.text }}
                className="rounded-2xl px-4 py-3 mb-4"
              />

              {/* Description */}
              <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">Description (optional)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="e.g., 12-month installment plan"
                placeholderTextColor={colors.textMuted}
                style={{ backgroundColor: colors.surfaceHover, color: colors.text }}
                className="rounded-2xl px-4 py-3 mb-4"
              />

              {/* Frequency */}
              <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">Frequency</Text>
              <View className="flex-row flex-wrap mb-4">
                {FREQUENCIES.map((f) => (
                  <Pressable
                    key={f.value}
                    onPress={() => setFrequency(f.value)}
                    className="mr-2 mb-2 px-4 py-2 rounded-2xl"
                    style={{ backgroundColor: frequency === f.value ? colors.tint : colors.surfaceHover }}
                  >
                    <Text className="font-medium" style={{ color: frequency === f.value ? '#FFFFFF' : colors.text }}>{f.label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Custom Weekday Picker */}
              {frequency === 'custom' && (
                <View className="mb-4">
                  <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">Select Days</Text>
                  <View className="flex-row justify-between">
                    {WEEKDAYS.map((day) => {
                      const selected = customDays.includes(day.value);
                      return (
                        <Pressable
                          key={day.value}
                          onPress={() => setCustomDays((prev) =>
                            selected ? prev.filter((d) => d !== day.value) : [...prev, day.value].sort()
                          )}
                          className="w-10 h-10 rounded-full items-center justify-center"
                          style={{ backgroundColor: selected ? colors.tint : colors.surfaceHover }}
                        >
                          <Text className="text-sm font-semibold" style={{ color: selected ? '#FFFFFF' : colors.text }}>{day.short}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Next Date */}
              <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">Next Payment Date</Text>
              <TextInput
                value={nextDate}
                onChangeText={setNextDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                style={{ backgroundColor: colors.surfaceHover, color: colors.text }}
                className="rounded-2xl px-4 py-3 mb-4"
              />

              {/* Category */}
              <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <View className="flex-row">
                  {filteredCategories.map((cat) => {
                    const sel = selectedCategoryId === cat.id;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => setSelectedCategoryId(cat.id)}
                        className={`items-center p-3 rounded-2xl mr-2 ${sel ? 'bg-primary' : ''}`}
                        style={!sel ? { backgroundColor: colors.surfaceHover } : undefined}
                      >
                        <View
                          className="w-9 h-9 rounded-full items-center justify-center mb-1"
                          style={{ backgroundColor: sel ? 'rgba(255,255,255,0.2)' : cat.color + '20' }}
                        >
                          <Ionicons name={cat.icon as any} size={18} color={sel ? '#FFFFFF' : cat.color} />
                        </View>
                        <Text className={`text-xs ${sel ? 'text-white' : ''}`} style={!sel ? { color: colors.text } : undefined} numberOfLines={1}>{cat.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Account */}
              <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">Account</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                <View className="flex-row">
                  {accounts.map((acc) => {
                    const sel = selectedAccountId === acc.id;
                    return (
                      <Pressable
                        key={acc.id}
                        onPress={() => setSelectedAccountId(acc.id)}
                        className={`flex-row items-center px-4 py-3 rounded-2xl mr-2 ${sel ? 'bg-primary' : ''}`}
                        style={!sel ? { backgroundColor: colors.surfaceHover } : undefined}
                      >
                        <View
                          className="w-8 h-8 rounded-full items-center justify-center mr-2"
                          style={{ backgroundColor: sel ? 'rgba(255,255,255,0.2)' : acc.color + '20' }}
                        >
                          <Ionicons name={acc.icon as any} size={16} color={sel ? '#FFFFFF' : acc.color} />
                        </View>
                        <Text className={`font-medium ${sel ? 'text-white' : ''}`} style={!sel ? { color: colors.text } : undefined}>{acc.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Save */}
              <Pressable
                onPress={handleSave}
                disabled={!canSubmit}
                className={`py-4 rounded-2xl items-center ${canSubmit ? 'bg-primary' : ''}`}
                style={!canSubmit ? { backgroundColor: colors.surfaceHover } : undefined}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className={`font-semibold text-base ${canSubmit ? 'text-white' : ''}`} style={!canSubmit ? { color: colors.textMuted } : undefined}>
                    Create Recurring Payment
                  </Text>
                )}
              </Pressable>

              <View style={{ height: insets.bottom + 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Recurring Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={handleCloseEdit}>
        <View className="flex-1 justify-end bg-black/50">
          <View style={{ backgroundColor: colors.surface }} className="rounded-t-3xl p-6 max-h-[85%]">
            <View className="flex-row items-center justify-between mb-6">
              <View>
                <Text style={{ color: colors.text }} className="text-xl font-bold">Edit Recurring</Text>
                <Text style={{ color: colors.textMuted }} className="text-xs mt-0.5">
                  Changes apply to future occurrences only
                </Text>
              </View>
              <Pressable onPress={handleCloseEdit} className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: colors.surfaceHover }}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Type Badge (read-only) */}
              <View className="flex-row items-center mb-4">
                <View className={`px-3 py-1.5 rounded-full ${editingRule?.type === 'expense' ? 'bg-expense/20' : 'bg-secondary/20'}`}>
                  <Text className={`text-sm font-medium ${editingRule?.type === 'expense' ? 'text-expense' : 'text-secondary'}`}>
                    {editingRule?.type === 'expense' ? 'Expense' : 'Income'}
                  </Text>
                </View>
                <View className="flex-row items-center ml-3 px-3 py-1.5 rounded-full" style={{ backgroundColor: colors.surfaceHover }}>
                  <Ionicons name={editingRule?.isActive ? 'checkmark-circle' : 'pause-circle'} size={14} color={editingRule?.isActive ? '#05DF72' : colors.textMuted} />
                  <Text style={{ color: colors.textSecondary }} className="text-sm ml-1">{editingRule?.isActive ? 'Active' : 'Paused'}</Text>
                </View>
              </View>

              {/* Name */}
              <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">Name</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g., Netflix, Rent"
                placeholderTextColor={colors.textMuted}
                style={{ backgroundColor: colors.surfaceHover, color: colors.text }}
                className="rounded-2xl px-4 py-3 mb-4"
              />

              {/* Amount */}
              <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">Amount</Text>
              <TextInput
                value={editAmount}
                onChangeText={(t) => setEditAmount(t.replace(/[^0-9.]/g, ''))}
                placeholder="$0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={{ backgroundColor: colors.surfaceHover, color: colors.text }}
                className="rounded-2xl px-4 py-3 mb-4"
              />

              {/* Description */}
              <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">Description (optional)</Text>
              <TextInput
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="e.g., updated rate"
                placeholderTextColor={colors.textMuted}
                style={{ backgroundColor: colors.surfaceHover, color: colors.text }}
                className="rounded-2xl px-4 py-3 mb-4"
              />

              {/* Frequency */}
              <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">Frequency</Text>
              <View className="flex-row flex-wrap mb-4">
                {FREQUENCIES.map((f) => (
                  <Pressable
                    key={f.value}
                    onPress={() => setEditFrequency(f.value)}
                    className="mr-2 mb-2 px-4 py-2 rounded-2xl"
                    style={{ backgroundColor: editFrequency === f.value ? colors.tint : colors.surfaceHover }}
                  >
                    <Text className="font-medium" style={{ color: editFrequency === f.value ? '#FFFFFF' : colors.text }}>{f.label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Custom Weekday Picker */}
              {editFrequency === 'custom' && (
                <View className="mb-4">
                  <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">Select Days</Text>
                  <View className="flex-row justify-between">
                    {WEEKDAYS.map((day) => {
                      const selected = editCustomDays.includes(day.value);
                      return (
                        <Pressable
                          key={day.value}
                          onPress={() => setEditCustomDays((prev) =>
                            selected ? prev.filter((d) => d !== day.value) : [...prev, day.value].sort()
                          )}
                          className="w-10 h-10 rounded-full items-center justify-center"
                          style={{ backgroundColor: selected ? colors.tint : colors.surfaceHover }}
                        >
                          <Text className="text-sm font-semibold" style={{ color: selected ? '#FFFFFF' : colors.text }}>{day.short}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Next Date */}
              <DatePickerField label="Next Payment Date" value={editNextDate} onChange={setEditNextDate} />
              <View className="h-4" />

              {/* Category */}
              <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <View className="flex-row">
                  {editFilteredCategories.map((cat) => {
                    const sel = editCategoryId === cat.id;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => setEditCategoryId(cat.id)}
                        className={`items-center p-3 rounded-2xl mr-2 ${sel ? 'bg-primary' : ''}`}
                        style={!sel ? { backgroundColor: colors.surfaceHover } : undefined}
                      >
                        <View
                          className="w-9 h-9 rounded-full items-center justify-center mb-1"
                          style={{ backgroundColor: sel ? 'rgba(255,255,255,0.2)' : cat.color + '20' }}
                        >
                          <Ionicons name={cat.icon as any} size={18} color={sel ? '#FFFFFF' : cat.color} />
                        </View>
                        <Text className={`text-xs ${sel ? 'text-white' : ''}`} style={!sel ? { color: colors.text } : undefined} numberOfLines={1}>{cat.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Account */}
              <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">Account</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                <View className="flex-row">
                  {accounts.map((acc) => {
                    const sel = editAccountId === acc.id;
                    return (
                      <Pressable
                        key={acc.id}
                        onPress={() => setEditAccountId(acc.id)}
                        className={`flex-row items-center px-4 py-3 rounded-2xl mr-2 ${sel ? 'bg-primary' : ''}`}
                        style={!sel ? { backgroundColor: colors.surfaceHover } : undefined}
                      >
                        <View
                          className="w-8 h-8 rounded-full items-center justify-center mr-2"
                          style={{ backgroundColor: sel ? 'rgba(255,255,255,0.2)' : acc.color + '20' }}
                        >
                          <Ionicons name={acc.icon as any} size={16} color={sel ? '#FFFFFF' : acc.color} />
                        </View>
                        <Text className={`font-medium ${sel ? 'text-white' : ''}`} style={!sel ? { color: colors.text } : undefined}>{acc.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => editingRule && handleDelete(editingRule.id)}
                  className="flex-1 py-4 rounded-2xl items-center"
                  style={{ backgroundColor: '#FF6B6B20' }}
                >
                  <Text style={{ color: '#FF6B6B' }} className="font-semibold">Delete</Text>
                </Pressable>
                <Pressable
                  onPress={handleEditSave}
                  disabled={!canEditSubmit}
                  className={`flex-1 py-4 rounded-2xl items-center ${canEditSubmit ? 'bg-primary' : ''}`}
                  style={!canEditSubmit ? { backgroundColor: colors.surfaceHover } : undefined}
                >
                  {editSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className={`font-semibold ${canEditSubmit ? 'text-white' : ''}`} style={!canEditSubmit ? { color: colors.textMuted } : undefined}>
                      Save Changes
                    </Text>
                  )}
                </Pressable>
              </View>

              <View style={{ height: insets.bottom + 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
