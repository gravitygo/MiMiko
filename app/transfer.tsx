import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router } from 'expo-router';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useAccounts } from '@/hooks/use-accounts';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTransactions } from '@/hooks/use-transactions';
import type { Account } from '@/modules/account/account.types';
import { createCurrencyService } from '@/modules/currency/currency.service';
import {
  formatCurrency,
  getCurrencySymbol,
} from '@/modules/currency/currency.types';
import { useAccountStore } from '@/state/account.store';

interface AccountSelectorProps {
  account: Account | null;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

function AccountSelector({ account, label, onPress, disabled }: AccountSelectorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-1 bg-surface dark:bg-surface-dark rounded-bento p-4"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Text className="text-text-muted dark:text-text-muted-dark text-xs mb-2">
        {label}
      </Text>
      {account ? (
        <View className="flex-row items-center">
          <View
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: account.color + '20' }}
          >
            <Ionicons
              name={account.icon as React.ComponentProps<typeof Ionicons>['name']}
              size={20}
              color={account.color}
            />
          </View>
          <View className="flex-1">
            <Text className="text-text-primary dark:text-text-primary-dark font-semibold">
              {account.name}
            </Text>
            <View className="flex-row items-center">
              <Text className="text-text-secondary dark:text-text-secondary-dark text-sm">
                {formatCurrency(account.balance, account.currency || 'php')}
              </Text>
              {account.currency && account.currency !== 'php' && (
                <View className="bg-primary/10 px-1.5 py-0.5 rounded ml-2">
                  <Text className="text-primary text-xs font-medium">
                    {account.currency.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
      ) : (
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full items-center justify-center mr-3 bg-border dark:bg-border-dark">
            <Ionicons name="wallet-outline" size={20} color={colors.textMuted} />
          </View>
          <Text className="text-text-muted dark:text-text-muted-dark">
            Select account
          </Text>
        </View>
      )}
    </Pressable>
  );
}

interface AccountPickerModalProps {
  visible: boolean;
  accounts: Account[];
  selectedId: string | null;
  excludeId?: string | null;
  onSelect: (account: Account) => void;
  onClose: () => void;
  title: string;
}

function AccountPickerModal({
  visible,
  accounts,
  selectedId,
  excludeId,
  onSelect,
  onClose,
  title,
}: AccountPickerModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const filteredAccounts = accounts.filter((a) => a.id !== excludeId);

  return (
    <View className="absolute inset-0 bg-black/50 z-50">
      <Pressable className="flex-1" onPress={onClose} />
      <View
        style={{ backgroundColor: colors.surface }}
        className="rounded-t-3xl max-h-[70%]"
      >
        <View className="flex-row items-center justify-between p-6 pb-4">
          <Text style={{ color: colors.text }} className="text-xl font-bold">
            {title}
          </Text>
          <Pressable
            onPress={onClose}
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.surfaceHover }}
          >
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView className="px-6" showsVerticalScrollIndicator={false}>
          {filteredAccounts.map((account) => (
            <Pressable
              key={account.id}
              onPress={() => onSelect(account)}
              className="flex-row items-center py-4 border-b"
              style={{ borderColor: colors.surfaceHover }}
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
                <View className="flex-row items-center">
                  <Text style={{ color: colors.textSecondary }} className="text-sm">
                    {formatCurrency(account.balance, account.currency || 'php')}
                  </Text>
                  {account.currency && account.currency !== 'php' && (
                    <View className="bg-primary/10 px-1.5 py-0.5 rounded ml-2">
                      <Text className="text-primary text-xs font-medium">
                        {account.currency.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              {selectedId === account.id && (
                <Ionicons name="checkmark-circle" size={24} color={colors.tint} />
              )}
            </Pressable>
          ))}
          <View style={{ height: insets.bottom + 16 }} />
        </ScrollView>
      </View>
    </View>
  );
}

export default function TransferScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const [fromAccount, setFromAccount] = useState<Account | null>(null);
  const [toAccount, setToAccount] = useState<Account | null>(null);
  const [amount, setAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fee, setFee] = useState('');
  const [description, setDescription] = useState('');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingRate, setFetchingRate] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  const accounts = useAccountStore((s) => s.accounts);
  const { fetch: fetchAccounts } = useAccounts();
  const { add: addTransaction } = useTransactions();

  const currencyService = useMemo(() => createCurrencyService(), []);

  const isCrossCurrency = useMemo(() => {
    if (!fromAccount || !toAccount) return false;
    const fromCurrency = fromAccount.currency || 'php';
    const toCurrency = toAccount.currency || 'php';
    return fromCurrency !== toCurrency;
  }, [fromAccount, toAccount]);

  useEffect(() => {
    fetchAccounts().finally(() => setLoading(false));
  }, [fetchAccounts]);

  // Set default accounts
  useEffect(() => {
    if (accounts.length > 0 && !fromAccount) {
      const defaultAccount = accounts.find((a) => a.isDefault) ?? accounts[0];
      setFromAccount(defaultAccount);
    }
  }, [accounts, fromAccount]);

  // Fetch exchange rate when currencies differ
  useEffect(() => {
    if (!isCrossCurrency || !fromAccount || !toAccount) {
      setExchangeRate(null);
      setToAmount('');
      return;
    }

    const fetchRate = async () => {
      setFetchingRate(true);
      const fromCurrency = fromAccount.currency || 'php';
      const toCurrency = toAccount.currency || 'php';

      const rate = await currencyService.getRate(fromCurrency, toCurrency);
      setExchangeRate(rate);

      // Auto-calculate toAmount if amount is set
      if (rate && amount) {
        const parsedAmount = parseFloat(amount);
        if (!isNaN(parsedAmount)) {
          setToAmount((parsedAmount * rate).toFixed(2));
        }
      }

      setFetchingRate(false);
    };

    fetchRate();
  }, [isCrossCurrency, fromAccount, toAccount, currencyService]);

  // Recalculate toAmount when amount changes
  useEffect(() => {
    if (isCrossCurrency && exchangeRate && amount) {
      const parsedAmount = parseFloat(amount);
      if (!isNaN(parsedAmount)) {
        setToAmount((parsedAmount * exchangeRate).toFixed(2));
      }
    }
  }, [amount, exchangeRate, isCrossCurrency]);

  const handleAmountChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmount(cleaned);
  }, []);

  const handleToAmountChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setToAmount(cleaned);
  }, []);

  const handleFeeChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setFee(cleaned);
  }, []);

  const handleSwapAccounts = useCallback(() => {
    const temp = fromAccount;
    setFromAccount(toAccount);
    setToAccount(temp);
    // Swap amounts for cross-currency
    if (isCrossCurrency) {
      const tempAmount = amount;
      setAmount(toAmount);
      setToAmount(tempAmount);
    }
  }, [fromAccount, toAccount, amount, toAmount, isCrossCurrency]);

  const handleSubmit = useCallback(async () => {
    if (!fromAccount || !toAccount || !amount) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setSubmitting(true);

    const parsedFee = parseFloat(fee) || 0;
    const parsedToAmount = isCrossCurrency ? parseFloat(toAmount) || parsedAmount : null;
    const finalExchangeRate = isCrossCurrency && parsedToAmount
      ? parsedToAmount / parsedAmount
      : null;

    await addTransaction({
      type: 'transfer',
      amount: parsedAmount,
      description: description.trim() || undefined,
      categoryId: 'cat_transfers',
      accountId: fromAccount.id,
      toAccountId: toAccount.id,
      toAmount: parsedToAmount ?? undefined,
      fee: parsedFee > 0 ? parsedFee : undefined,
      exchangeRate: finalExchangeRate ?? undefined,
      date: new Date().toISOString(),
    });

    // Refresh accounts to sync store with updated database balances
    await fetchAccounts();

    setSubmitting(false);
    router.back();
  }, [fromAccount, toAccount, amount, toAmount, fee, description, isCrossCurrency, addTransaction, fetchAccounts]);

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (!fromAccount || !toAccount) return false;
    if (fromAccount.id === toAccount.id) return false;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return false;

    if (isCrossCurrency) {
      const parsedToAmount = parseFloat(toAmount);
      if (isNaN(parsedToAmount) || parsedToAmount <= 0) return false;
    }

    return true;
  }, [submitting, fromAccount, toAccount, amount, toAmount, isCrossCurrency]);

  const fromCurrency = fromAccount?.currency || 'php';
  const toCurrency = toAccount?.currency || 'php';

  if (loading) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark items-center justify-center">
        <Stack.Screen options={{ title: 'Transfer', headerShown: true }} />
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background dark:bg-background-dark"
    >
      <Stack.Screen
        options={{
          title: 'Transfer',
          headerShown: true,
        }}
      />

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Account Selection */}
        <View className="mx-4 mt-4">
          <View className="flex-row items-center">
            <AccountSelector
              account={fromAccount}
              label="From"
              onPress={() => setShowFromPicker(true)}
            />

            {/* Swap Button */}
            <Pressable
              onPress={handleSwapAccounts}
              className="mx-2 w-10 h-10 rounded-full bg-primary items-center justify-center"
              style={{ marginTop: 16 }}
            >
              <Ionicons name="swap-horizontal" size={20} color="#FFFFFF" />
            </Pressable>

            <AccountSelector
              account={toAccount}
              label="To"
              onPress={() => setShowToPicker(true)}
            />
          </View>
        </View>

        {/* Amount Input */}
        <View className="mx-4 mt-6">
          <Text className="text-text-secondary dark:text-text-secondary-dark text-sm font-medium mb-2">
            Amount to Transfer
          </Text>
          <View className="flex-row items-center bg-surface dark:bg-surface-dark rounded-bento px-4 py-3">
            <Text className="text-text-primary dark:text-text-primary-dark text-2xl font-bold mr-2">
              {getCurrencySymbol(fromCurrency)}
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
            {fromCurrency !== 'php' && (
              <View className="bg-primary/10 px-2 py-1 rounded">
                <Text className="text-primary text-sm font-medium">
                  {fromCurrency.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Cross-Currency Section */}
        {isCrossCurrency && (
          <View className="mx-4 mt-4">
            {/* Exchange Rate Display */}
            <View className="bg-tertiary/10 border border-tertiary/30 rounded-bento p-4 mb-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="swap-vertical" size={20} color="#FFBA00" />
                  <Text className="text-text-primary dark:text-text-primary-dark ml-2 font-medium">
                    Exchange Rate
                  </Text>
                </View>
                {fetchingRate ? (
                  <ActivityIndicator size="small" color={colors.tint} />
                ) : exchangeRate ? (
                  <Text className="text-text-primary dark:text-text-primary-dark font-semibold">
                    1 {fromCurrency.toUpperCase()} = {exchangeRate.toFixed(4)} {toCurrency.toUpperCase()}
                  </Text>
                ) : (
                  <Text className="text-expense font-medium">Rate unavailable</Text>
                )}
              </View>
            </View>

            {/* Received Amount */}
            <Text className="text-text-secondary dark:text-text-secondary-dark text-sm font-medium mb-2">
              Amount Received
            </Text>
            <View className="flex-row items-center bg-surface dark:bg-surface-dark rounded-bento px-4 py-3">
              <Text className="text-text-primary dark:text-text-primary-dark text-2xl font-bold mr-2">
                {getCurrencySymbol(toCurrency)}
              </Text>
              <TextInput
                value={toAmount}
                onChangeText={handleToAmountChange}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                className="flex-1 text-text-primary dark:text-text-primary-dark text-2xl font-bold"
              />
              {toCurrency !== 'php' && (
                <View className="bg-secondary/10 px-2 py-1 rounded">
                  <Text className="text-secondary text-sm font-medium">
                    {toCurrency.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-text-muted dark:text-text-muted-dark text-xs mt-1">
              You can adjust this amount manually if needed
            </Text>
          </View>
        )}

        {/* Fee Input (Optional) */}
        <View className="mx-4 mt-4">
          <Text className="text-text-secondary dark:text-text-secondary-dark text-sm font-medium mb-2">
            Transfer Fee (optional)
          </Text>
          <View className="flex-row items-center bg-surface dark:bg-surface-dark rounded-bento px-4 py-3">
            <Text className="text-text-primary dark:text-text-primary-dark text-lg font-bold mr-2">
              {getCurrencySymbol(fromCurrency)}
            </Text>
            <TextInput
              value={fee}
              onChangeText={handleFeeChange}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              className="flex-1 text-text-primary dark:text-text-primary-dark text-lg"
            />
          </View>
          <Text className="text-text-muted dark:text-text-muted-dark text-xs mt-1">
            Fee will be deducted from the source account
          </Text>
        </View>

        {/* Description Input */}
        <View className="mx-4 mt-4">
          <Text className="text-text-secondary dark:text-text-secondary-dark text-sm font-medium mb-2">
            Description (optional)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="e.g., Monthly savings transfer"
            placeholderTextColor={colors.textMuted}
            className="bg-surface dark:bg-surface-dark rounded-bento px-4 py-3 text-text-primary dark:text-text-primary-dark"
          />
        </View>

        {/* Transfer Summary */}
        {canSubmit && (
          <View className="mx-4 mt-6 bg-surface dark:bg-surface-dark rounded-bento p-4">
            <Text className="text-text-secondary dark:text-text-secondary-dark text-sm font-medium mb-3">
              Transfer Summary
            </Text>

            <View className="flex-row justify-between mb-2">
              <Text className="text-text-muted dark:text-text-muted-dark">From</Text>
              <Text className="text-text-primary dark:text-text-primary-dark font-medium">
                {fromAccount?.name}
              </Text>
            </View>

            <View className="flex-row justify-between mb-2">
              <Text className="text-text-muted dark:text-text-muted-dark">To</Text>
              <Text className="text-text-primary dark:text-text-primary-dark font-medium">
                {toAccount?.name}
              </Text>
            </View>

            <View className="flex-row justify-between mb-2">
              <Text className="text-text-muted dark:text-text-muted-dark">Amount</Text>
              <Text className="text-text-primary dark:text-text-primary-dark font-semibold">
                {formatCurrency(parseFloat(amount) || 0, fromCurrency)}
              </Text>
            </View>

            {isCrossCurrency && toAmount && (
              <View className="flex-row justify-between mb-2">
                <Text className="text-text-muted dark:text-text-muted-dark">Received</Text>
                <Text className="text-secondary font-semibold">
                  {formatCurrency(parseFloat(toAmount) || 0, toCurrency)}
                </Text>
              </View>
            )}

            {fee && parseFloat(fee) > 0 && (
              <View className="flex-row justify-between mb-2">
                <Text className="text-text-muted dark:text-text-muted-dark">Fee</Text>
                <Text className="text-expense font-medium">
                  -{formatCurrency(parseFloat(fee), fromCurrency)}
                </Text>
              </View>
            )}

            <View className="border-t border-border dark:border-border-dark mt-2 pt-2">
              <View className="flex-row justify-between">
                <Text className="text-text-primary dark:text-text-primary-dark font-medium">
                  Total Deducted
                </Text>
                <Text className="text-text-primary dark:text-text-primary-dark font-bold">
                  {formatCurrency(
                    (parseFloat(amount) || 0) + (parseFloat(fee) || 0),
                    fromCurrency
                  )}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Submit Button */}
        <View className="mx-4 mt-8">
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            className={`py-4 rounded-bento items-center flex-row justify-center ${
              canSubmit ? 'bg-primary' : 'bg-surface-hover dark:bg-surface-hover-dark'
            }`}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="swap-horizontal"
                  size={20}
                  color={canSubmit ? '#FFFFFF' : colors.textMuted}
                />
                <Text
                  className={`font-semibold text-base ml-2 ${
                    canSubmit ? 'text-white' : 'text-text-muted dark:text-text-muted-dark'
                  }`}
                >
                  Transfer
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* Account Picker Modals */}
      <AccountPickerModal
        visible={showFromPicker}
        accounts={accounts}
        selectedId={fromAccount?.id ?? null}
        excludeId={toAccount?.id}
        onSelect={(account) => {
          setFromAccount(account);
          setShowFromPicker(false);
        }}
        onClose={() => setShowFromPicker(false)}
        title="Select Source Account"
      />

      <AccountPickerModal
        visible={showToPicker}
        accounts={accounts}
        selectedId={toAccount?.id ?? null}
        excludeId={fromAccount?.id}
        onSelect={(account) => {
          setToAccount(account);
          setShowToPicker(false);
        }}
        onClose={() => setShowToPicker(false)}
        title="Select Destination Account"
      />
    </KeyboardAvoidingView>
  );
}

