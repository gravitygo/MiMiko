import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useAccountStore } from '@/state/account.store';
import { useAccounts } from '@/hooks/use-accounts';
import type { Account, AccountType } from '@/modules/account/account.types';
import { SUPPORTED_CURRENCIES, getCurrencySymbol, formatCurrency } from '@/modules/currency/currency.types';

const ACCOUNT_TYPES: { type: AccountType; label: string; icon: string }[] = [
  { type: 'cash', label: 'Cash', icon: 'cash' },
  { type: 'bank', label: 'Bank', icon: 'business' },
  { type: 'credit_card', label: 'Credit Card', icon: 'card' },
  { type: 'e_wallet', label: 'E-Wallet', icon: 'phone-portrait' },
];

const COLORS = [
  '#05DF72', '#0084D1', '#FF6B6B', '#FFBA00', '#45B7D1',
  '#DDA0DD', '#4ECDC4', '#FF8C42', '#A855F7', '#EC4899',
];

interface AccountItemProps {
  account: Account;
  onPress: () => void;
}

function AccountItem({ account, onPress }: AccountItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center p-4 mb-3 rounded-bento"
      style={{ backgroundColor: colors.surface }}
    >
      <View
        className="w-12 h-12 rounded-full items-center justify-center mr-4"
        style={{ backgroundColor: account.color + '20' }}
      >
        <Ionicons
          name={account.icon as React.ComponentProps<typeof Ionicons>['name']}
          size={24}
          color={account.color}
        />
      </View>
      <View className="flex-1">
        <Text style={{ color: colors.text }} className="text-base font-semibold">
          {account.name}
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-sm">
          {ACCOUNT_TYPES.find((t) => t.type === account.type)?.label}
          {(account.creditMode || account.type === 'credit_card') ? ' · Credit Mode' : ''}
        </Text>
      </View>
      <View className="items-end">
        <Text
          style={{ color: account.creditMode ? '#FF6B6B' : colors.text }}
          className="text-base font-bold"
        >
          {formatCurrency(account.balance, account.currency || 'php')}
        </Text>
        <View className="flex-row items-center mt-0.5">
          {account.creditMode && (
            <View className="bg-red-500/10 px-1.5 py-0.5 rounded mr-1">
              <Text className="text-red-500 text-xs font-medium">Credit</Text>
            </View>
          )}
          {account.currency && account.currency !== 'php' && (
            <View className="bg-primary/10 px-1.5 py-0.5 rounded mr-1">
              <Text className="text-primary text-xs font-medium">
                {account.currency.toUpperCase()}
              </Text>
            </View>
          )}
          {account.isDefault && (
            <View className="bg-primary/20 px-2 py-0.5 rounded-full">
              <Text className="text-primary text-xs font-medium">Default</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function AccountsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<AccountType>('cash');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedCurrency, setSelectedCurrency] = useState('php');
  const [balance, setBalance] = useState('');
  const [billingDate, setBillingDate] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [creditMode, setCreditMode] = useState(false);

  const accounts = useAccountStore((s) => s.accounts);
  const { fetch: fetchAccounts, add, edit, remove } = useAccounts();

  useEffect(() => {
    fetchAccounts().finally(() => setLoading(false));
  }, [fetchAccounts]);

  const resetForm = useCallback(() => {
    setName('');
    setSelectedType('cash');
    setSelectedColor(COLORS[0]);
    setSelectedCurrency('php');
    setBalance('');
    setBillingDate('');
    setDeadlineDate('');
    setCreditMode(false);
    setEditingAccount(null);
  }, []);

  const handleOpenCreate = useCallback(() => {
    resetForm();
    setShowModal(true);
  }, [resetForm]);

  const handleOpenEdit = useCallback((account: Account) => {
    setEditingAccount(account);
    setName(account.name);
    setSelectedType(account.type);
    setSelectedColor(account.color);
    setSelectedCurrency(account.currency || 'php');
    setBalance(account.balance.toString());
    setBillingDate(account.billingDate?.toString() ?? '');
    setDeadlineDate(account.deadlineDate?.toString() ?? '');
    setCreditMode(account.creditMode === true || account.type === 'credit_card');
    setShowModal(true);
  }, []);

  const handleClose = useCallback(() => {
    setShowModal(false);
    resetForm();
  }, [resetForm]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;

    setSubmitting(true);

    const parsedBalance = parseFloat(balance) || 0;
    const isCreditMode = creditMode || selectedType === 'credit_card';
    const parsedBillingDate = isCreditMode && billingDate.trim()
      ? Math.min(31, Math.max(1, parseInt(billingDate, 10) || 1))
      : undefined;
    const parsedDeadlineDate = isCreditMode && deadlineDate.trim()
      ? Math.min(31, Math.max(1, parseInt(deadlineDate, 10) || 1))
      : undefined;

    if (editingAccount) {
      await edit(editingAccount.id, {
        name: name.trim(),
        type: selectedType,
        icon: ACCOUNT_TYPES.find((t) => t.type === selectedType)?.icon || 'cash',
        color: selectedColor,
        currency: selectedCurrency,
        creditMode: isCreditMode,
        billingDate: parsedBillingDate,
        deadlineDate: parsedDeadlineDate,
      });
    } else {
      await add({
        name: name.trim(),
        type: selectedType,
        icon: ACCOUNT_TYPES.find((t) => t.type === selectedType)?.icon || 'cash',
        color: selectedColor,
        currency: selectedCurrency,
        balance: parsedBalance,
        creditMode: isCreditMode,
        billingDate: parsedBillingDate,
        deadlineDate: parsedDeadlineDate,
      });
    }

    setSubmitting(false);
    handleClose();
  }, [name, selectedType, selectedColor, selectedCurrency, balance, billingDate, deadlineDate, creditMode, editingAccount, add, edit, handleClose]);

  const handleDelete = useCallback(async () => {
    if (!editingAccount) return;

    setSubmitting(true);
    await remove(editingAccount.id);
    setSubmitting(false);
    handleClose();
  }, [editingAccount, remove, handleClose]);

  const renderItem = useCallback(
    ({ item }: { item: Account }) => (
      <AccountItem account={item} onPress={() => handleOpenEdit(item)} />
    ),
    [handleOpenEdit]
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <Stack.Screen options={{ title: 'Accounts', headerShown: true }} />
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: 'Accounts',
          headerShown: true,
          headerRight: () => (
            <Pressable onPress={handleOpenCreate} className="mr-2">
              <Ionicons name="add-circle" size={28} color={colors.tint} />
            </Pressable>
          ),
        }}
      />

      <FlatList
        data={accounts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Ionicons name="wallet-outline" size={48} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted }} className="mt-4 text-base">
              No accounts yet
            </Text>
            <Pressable
              onPress={handleOpenCreate}
              className="mt-4 bg-primary px-6 py-3 rounded-bento"
            >
              <Text className="text-white font-semibold">Add Account</Text>
            </Pressable>
          </View>
        }
      />

      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={handleClose}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View style={{ backgroundColor: colors.surface }} className="rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text style={{ color: colors.text }} className="text-xl font-bold">
                {editingAccount ? 'Edit Account' : 'New Account'}
              </Text>
              <Pressable onPress={handleClose} className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: colors.surfaceHover }}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Name */}
            <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">
              Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Account name"
              placeholderTextColor={colors.textMuted}
              style={{ backgroundColor: colors.surfaceHover, color: colors.text }}
              className="rounded-xl px-4 py-3 mb-4"
            />

            {/* Type */}
            <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">
              Type
            </Text>
            <View className="flex-row flex-wrap mb-4">
              {ACCOUNT_TYPES.map((type) => (
                <Pressable
                  key={type.type}
                  onPress={() => setSelectedType(type.type)}
                  className="mr-2 mb-2 px-4 py-2 rounded-xl flex-row items-center"
                  style={{
                    backgroundColor: selectedType === type.type ? colors.tint : colors.surfaceHover,
                  }}
                >
                  <Ionicons
                    name={type.icon as React.ComponentProps<typeof Ionicons>['name']}
                    size={16}
                    color={selectedType === type.type ? '#FFFFFF' : colors.textSecondary}
                  />
                  <Text
                    className="ml-2 font-medium"
                    style={{ color: selectedType === type.type ? '#FFFFFF' : colors.text }}
                  >
                    {type.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Color */}
            <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">
              Color
            </Text>
            <View className="flex-row flex-wrap mb-4">
              {COLORS.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setSelectedColor(color)}
                  className="w-10 h-10 rounded-full mr-2 mb-2 items-center justify-center"
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  )}
                </Pressable>
              ))}
            </View>

            {/* Currency */}
            <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">
              Currency
            </Text>
            <Pressable
              onPress={() => setShowCurrencyPicker(true)}
              className="flex-row items-center justify-between rounded-xl px-4 py-3 mb-4"
              style={{ backgroundColor: colors.surfaceHover }}
            >
              <View className="flex-row items-center">
                <Text style={{ color: colors.text }} className="text-lg font-semibold mr-2">
                  {getCurrencySymbol(selectedCurrency)}
                </Text>
                <Text style={{ color: colors.text }} className="text-base">
                  {SUPPORTED_CURRENCIES.find(c => c.code === selectedCurrency)?.name || selectedCurrency.toUpperCase()}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>

            {/* Balance (only for new accounts) */}
            {!editingAccount && (
              <>
                <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">
                  Initial Balance
                </Text>
                <TextInput
                  value={balance}
                  onChangeText={setBalance}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  style={{ backgroundColor: colors.surfaceHover, color: colors.text }}
                  className="rounded-xl px-4 py-3 mb-4"
                />
              </>
            )}

            {/* Credit Mode Toggle */}
            {selectedType !== 'credit_card' && (
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1 mr-3">
                  <Text style={{ color: colors.text }} className="text-sm font-medium">
                    Credit Mode
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="text-xs mt-0.5">
                    Expenses accumulate as outstanding balance until due date
                  </Text>
                </View>
                <Switch
                  value={creditMode}
                  onValueChange={setCreditMode}
                  trackColor={{ false: colors.surfaceHover, true: colors.tint + '80' }}
                  thumbColor={creditMode ? colors.tint : colors.textMuted}
                />
              </View>
            )}

            {/* Credit / Credit Card Fields */}
            {(creditMode || selectedType === 'credit_card') && (
              <>
                <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">
                  Billing Day of Month
                </Text>
                <TextInput
                  value={billingDate}
                  onChangeText={(v) => setBillingDate(v.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 25 (day 1–31)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={{ backgroundColor: colors.surfaceHover, color: colors.text }}
                  className="rounded-xl px-4 py-3 mb-4"
                />
                <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">
                  Payment Due Day of Month
                </Text>
                <TextInput
                  value={deadlineDate}
                  onChangeText={(v) => setDeadlineDate(v.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 15 (day 1–31)"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={{ backgroundColor: colors.surfaceHover, color: colors.text }}
                  className="rounded-xl px-4 py-3 mb-4"
                />
              </>
            )}

            {/* Actions */}
            <View className="flex-row mt-2">
              {editingAccount && !editingAccount.isDefault && (
                <Pressable
                  onPress={handleDelete}
                  disabled={submitting}
                  className="flex-1 py-4 rounded-xl items-center mr-2"
                  style={{ backgroundColor: '#FF6B6B20' }}
                >
                  <Text style={{ color: '#FF6B6B' }} className="font-semibold">
                    Delete
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleSave}
                disabled={submitting || !name.trim()}
                className="flex-1 py-4 rounded-xl items-center"
                style={{
                  backgroundColor: name.trim() ? colors.tint : colors.surfaceHover,
                }}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text
                    className="font-semibold"
                    style={{ color: name.trim() ? '#FFFFFF' : colors.textMuted }}
                  >
                    {editingAccount ? 'Save' : 'Create'}
                  </Text>
                )}
              </Pressable>
            </View>

            <View style={{ height: insets.bottom + 16 }} />
          </View>
        </View>
      </Modal>

      {/* Currency Picker Modal */}
      <Modal
        visible={showCurrencyPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCurrencyPicker(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View style={{ backgroundColor: colors.surface }} className="rounded-t-3xl max-h-[70%]">
            <View className="flex-row items-center justify-between p-6 pb-4">
              <Text style={{ color: colors.text }} className="text-xl font-bold">
                Select Currency
              </Text>
              <Pressable
                onPress={() => setShowCurrencyPicker(false)}
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.surfaceHover }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView className="px-6" showsVerticalScrollIndicator={false}>
              {SUPPORTED_CURRENCIES.map((currency) => (
                <Pressable
                  key={currency.code}
                  onPress={() => {
                    setSelectedCurrency(currency.code);
                    setShowCurrencyPicker(false);
                  }}
                  className="flex-row items-center justify-between py-4 border-b"
                  style={{ borderColor: colors.surfaceHover }}
                >
                  <View className="flex-row items-center">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: colors.surfaceHover }}
                    >
                      <Text style={{ color: colors.text }} className="text-lg font-semibold">
                        {currency.symbol}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ color: colors.text }} className="text-base font-medium">
                        {currency.code.toUpperCase()}
                      </Text>
                      <Text style={{ color: colors.textSecondary }} className="text-sm">
                        {currency.name}
                      </Text>
                    </View>
                  </View>
                  {selectedCurrency === currency.code && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.tint} />
                  )}
                </Pressable>
              ))}
              <View style={{ height: insets.bottom + 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

