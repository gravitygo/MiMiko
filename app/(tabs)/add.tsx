import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategories } from '@/hooks/use-categories';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTransactions } from '@/hooks/use-transactions';
import type { Account } from '@/modules/account/account.types';
import type { Category } from '@/modules/category/category.types';
import type { TransactionType } from '@/modules/transaction/transaction.types';
import { useAccountStore } from '@/state/account.store';
import { useCategoryStore } from '@/state/category.store';

type TabType = 'expense' | 'income';

interface CategoryItemProps {
  category: Category;
  selected: boolean;
  onPress: () => void;
}

function CategoryItem({ category, selected, onPress }: CategoryItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Pressable
      onPress={onPress}
      className={`items-center justify-center p-3 rounded-bento-sm mr-2 mb-2 ${
        selected ? 'bg-primary' : 'bg-surface dark:bg-surface-dark'
      }`}
      style={{ width: 80 }}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mb-1"
        style={{ backgroundColor: selected ? 'rgba(255,255,255,0.2)' : category.color + '20' }}
      >
        <Ionicons
          name={category.icon as any}
          size={20}
          color={selected ? '#FFFFFF' : category.color}
        />
      </View>
      <Text
        className={`text-xs text-center ${
          selected ? 'text-white' : 'text-text-primary dark:text-text-primary-dark'
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
        selected ? 'bg-primary' : 'bg-surface dark:bg-surface-dark'
      }`}
    >
      <View
        className="w-8 h-8 rounded-full items-center justify-center mr-2"
        style={{ backgroundColor: selected ? 'rgba(255,255,255,0.2)' : account.color + '20' }}
      >
        <Ionicons
          name={account.icon as any}
          size={16}
          color={selected ? '#FFFFFF' : account.color}
        />
      </View>
      <Text
        className={`font-medium ${
          selected ? 'text-white' : 'text-text-primary dark:text-text-primary-dark'
        }`}
      >
        {account.name}
      </Text>
    </Pressable>
  );
}

export default function AddTransactionScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [activeTab, setActiveTab] = useState<TabType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const categories = useCategoryStore((s) => s.categories);
  const accounts = useAccountStore((s) => s.accounts);

  const { fetch: fetchCategories } = useCategories();
  const { fetch: fetchAccounts } = useAccounts();
  const { add: addTransaction } = useTransactions();

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === activeTab),
    [categories, activeTab]
  );

  useEffect(() => {
    Promise.all([fetchCategories(), fetchAccounts()]).finally(() => setLoading(false));
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
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmount(cleaned);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!amount || !selectedCategoryId || !selectedAccountId) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setSubmitting(true);

    const transaction = await addTransaction({
      type: activeTab as TransactionType,
      amount: parsedAmount,
      description: description.trim() || undefined,
      categoryId: selectedCategoryId,
      accountId: selectedAccountId,
      date: new Date().toISOString(),
    });

    setSubmitting(false);

    if (transaction) {
      setAmount('');
      setDescription('');
      router.back();
    }
  }, [amount, description, selectedCategoryId, selectedAccountId, activeTab, addTransaction]);

  const canSubmit = useMemo(() => {
    const parsedAmount = parseFloat(amount);
    return (
      !submitting &&
      amount.length > 0 &&
      !isNaN(parsedAmount) &&
      parsedAmount > 0 &&
      selectedCategoryId !== null &&
      selectedAccountId !== null
    );
  }, [amount, selectedCategoryId, selectedAccountId, submitting]);

  if (loading) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark items-center justify-center">
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background dark:bg-background-dark"
    >
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        {/* Tab Switcher */}
        <View className="flex-row mx-4 mt-4 p-1 bg-surface dark:bg-surface-dark rounded-bento">
          <Pressable
            onPress={() => setActiveTab('expense')}
            className={`flex-1 py-3 rounded-bento-sm items-center ${
              activeTab === 'expense' ? 'bg-expense' : ''
            }`}
          >
            <Text
              className={`font-semibold ${
                activeTab === 'expense' ? 'text-white' : 'text-text-secondary dark:text-text-secondary-dark'
              }`}
            >
              Expense
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('income')}
            className={`flex-1 py-3 rounded-bento-sm items-center ${
              activeTab === 'income' ? 'bg-income' : ''
            }`}
          >
            <Text
              className={`font-semibold ${
                activeTab === 'income' ? 'text-white' : 'text-text-secondary dark:text-text-secondary-dark'
              }`}
            >
              Income
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
              $
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
            placeholder="What was this for?"
            placeholderTextColor={colors.textMuted}
            className="bg-surface dark:bg-surface-dark rounded-bento px-4 py-3 text-text-primary dark:text-text-primary-dark"
          />
        </View>

        {/* Category Selection */}
        <View className="mt-6">
          <Text className="text-text-secondary dark:text-text-secondary-dark text-sm font-medium mb-2 mx-4">
            Category
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
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

        {/* Account Selection */}
        <View className="mt-6">
          <Text className="text-text-secondary dark:text-text-secondary-dark text-sm font-medium mb-2 mx-4">
            Account
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
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

        {/* Submit Button */}
        <View className="mx-4 mt-8 mb-8">
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            className={`py-4 rounded-bento items-center ${
              canSubmit ? 'bg-primary' : 'bg-surface-hover dark:bg-surface-hover-dark'
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                className={`font-semibold text-base ${
                  canSubmit ? 'text-white' : 'text-text-muted dark:text-text-muted-dark'
                }`}
              >
                Add {activeTab === 'expense' ? 'Expense' : 'Income'}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

