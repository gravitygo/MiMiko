import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DatePickerField } from '@/components/ui/date-picker-field';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePayables } from '@/hooks/use-payables';
import type { Payable } from '@/modules/payable/payable.types';
import { usePayableStore } from '@/state/payable.store';

interface PayableItemProps {
  payable: Payable;
  onPress: () => void;
  colors: (typeof Colors)['light'];
}

function PayableItem({ payable, onPress, colors }: PayableItemProps) {
  const dueDate = new Date(payable.dueDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = !payable.isPaid && dueDate < today;
  const progress = payable.totalAmount > 0
    ? ((payable.totalAmount - payable.remainingAmount) / payable.totalAmount) * 100
    : 0;

  return (
    <Pressable
      onPress={onPress}
      className="p-4 mb-3 rounded-bento"
      style={{ backgroundColor: colors.surface }}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1">
          <View
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: payable.isPaid ? '#05DF7220' : isOverdue ? '#FF6B6B20' : '#0084D120' }}
          >
            <Ionicons
              name={payable.isPaid ? 'checkmark-circle' : isOverdue ? 'alert-circle' : 'time'}
              size={22}
              color={payable.isPaid ? '#05DF72' : isOverdue ? '#FF6B6B' : '#0084D1'}
            />
          </View>
          <View className="flex-1">
            <Text style={{ color: colors.text }} className="text-base font-semibold">{payable.name}</Text>
            {payable.description && (
              <Text style={{ color: colors.textMuted }} className="text-sm" numberOfLines={1}>{payable.description}</Text>
            )}
          </View>
        </View>
        <View className="items-end">
          <Text style={{ color: colors.text }} className="text-base font-bold">
            ${payable.totalAmount.toLocaleString()}
          </Text>
          {!payable.isPaid && (
            <Text style={{ color: isOverdue ? '#FF6B6B' : colors.textMuted }} className="text-xs">
              {isOverdue ? 'Overdue' : `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            </Text>
          )}
        </View>
      </View>
      {/* Progress bar */}
      <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.surfaceHover }}>
        <View
          className="h-2 rounded-full"
          style={{
            width: `${Math.min(progress, 100)}%`,
            backgroundColor: payable.isPaid ? '#05DF72' : '#0084D1',
          }}
        />
      </View>
      <View className="flex-row justify-between mt-1">
        <Text style={{ color: colors.textMuted }} className="text-xs">
          Paid ${(payable.totalAmount - payable.remainingAmount).toLocaleString()}
        </Text>
        <Text style={{ color: colors.textMuted }} className="text-xs">
          ${payable.remainingAmount.toLocaleString()} remaining
        </Text>
      </View>
    </Pressable>
  );
}

export default function PayablesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPaid, setShowPaid] = useState(false);

  // Create form
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  // Detail / payment
  const [selectedPayable, setSelectedPayable] = useState<Payable | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const payables = usePayableStore((s) => s.payables);
  const { fetch, add, remove, markPaid, makePayment } = usePayables();

  const displayPayables = useMemo(
    () => payables.filter((p) => (showPaid ? p.isPaid : !p.isPaid)),
    [payables, showPaid]
  );

  const totalOwed = useMemo(
    () => payables.filter((p) => !p.isPaid).reduce((sum, p) => sum + p.remainingAmount, 0),
    [payables]
  );

  useEffect(() => {
    fetch().finally(() => setLoading(false));
  }, [fetch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  }, [fetch]);

  const resetForm = useCallback(() => {
    setName('');
    setAmount('');
    setDueDate(new Date().toISOString().split('T')[0]);
    setDescription('');
  }, []);

  const handleSave = useCallback(async () => {
    const parsedAmount = parseFloat(amount);
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    setSubmitting(true);
    await add({
      name: name.trim(),
      totalAmount: parsedAmount,
      dueDate,
      description: description.trim() || undefined,
    });
    setSubmitting(false);
    setShowModal(false);
    resetForm();
  }, [name, amount, dueDate, description, add, resetForm]);

  const handleOpenDetail = useCallback((payable: Payable) => {
    setSelectedPayable(payable);
    setPaymentAmount('');
    setShowDetailModal(true);
  }, []);

  const handleMarkPaid = useCallback(async () => {
    if (!selectedPayable) return;
    await markPaid(selectedPayable.id);
    setShowDetailModal(false);
  }, [selectedPayable, markPaid]);

  const handleMakePayment = useCallback(async () => {
    if (!selectedPayable) return;
    const parsed = parseFloat(paymentAmount);
    if (isNaN(parsed) || parsed <= 0) return;
    await makePayment(selectedPayable.id, parsed);
    await fetch();
    setShowDetailModal(false);
  }, [selectedPayable, paymentAmount, makePayment, fetch]);

  const handleDelete = useCallback(async () => {
    if (!selectedPayable) return;
    Alert.alert('Delete Payable', `Remove "${selectedPayable.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await remove(selectedPayable.id);
          setShowDetailModal(false);
        },
      },
    ]);
  }, [selectedPayable, remove]);

  const renderItem = useCallback(
    ({ item }: { item: Payable }) => (
      <PayableItem payable={item} onPress={() => handleOpenDetail(item)} colors={colors} />
    ),
    [handleOpenDetail, colors]
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top }} className="px-4 pb-4">
        <View className="flex-row items-center justify-between mt-4">
          <View>
            <Text style={{ color: colors.textMuted }} className="text-sm">Total outstanding</Text>
            <Text style={{ color: colors.text }} className="text-2xl font-bold">${totalOwed.toLocaleString()}</Text>
          </View>
          <Pressable onPress={() => setShowModal(true)} className="w-10 h-10 rounded-full bg-primary items-center justify-center">
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
        {/* Toggle */}
        <View className="flex-row mt-4 p-1 rounded-bento" style={{ backgroundColor: colors.surface }}>
          <Pressable
            onPress={() => setShowPaid(false)}
            className={`flex-1 py-2.5 rounded-bento-sm items-center ${!showPaid ? 'bg-primary' : ''}`}
          >
            <Text className={`font-semibold ${!showPaid ? 'text-white' : ''}`} style={showPaid ? { color: colors.textSecondary } : undefined}>
              Unpaid
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setShowPaid(true)}
            className={`flex-1 py-2.5 rounded-bento-sm items-center ${showPaid ? 'bg-primary' : ''}`}
          >
            <Text className={`font-semibold ${showPaid ? 'text-white' : ''}`} style={!showPaid ? { color: colors.textSecondary } : undefined}>
              Paid
            </Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={displayPayables}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <View className="w-20 h-20 rounded-full items-center justify-center mb-4" style={{ backgroundColor: colors.surface }}>
              <Ionicons name={showPaid ? 'checkmark-done-outline' : 'receipt-outline'} size={40} color={colors.textMuted} />
            </View>
            <Text style={{ color: colors.text }} className="text-xl font-semibold mb-2">
              {showPaid ? 'No paid items' : 'No payables yet'}
            </Text>
            <Text style={{ color: colors.textMuted }} className="text-center mb-6 px-8">
              {showPaid ? 'Paid items will appear here.' : 'Track what you owe — installments, debts, or bills.'}
            </Text>
            {!showPaid && (
              <Pressable onPress={() => setShowModal(true)} className="bg-primary px-6 py-3 rounded-bento">
                <Text className="text-white font-semibold">Add Payable</Text>
              </Pressable>
            )}
          </View>
        }
      />

      {/* Create Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View style={{ backgroundColor: colors.surface }} className="rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text style={{ color: colors.text }} className="text-xl font-bold">New Payable</Text>
              <Pressable onPress={() => { setShowModal(false); resetForm(); }} className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: colors.surfaceHover }}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g., Phone installment, Rent"
                placeholderTextColor={colors.textMuted}
                style={{ backgroundColor: colors.surfaceHover, color: colors.text }}
                className="rounded-bento px-4 py-3 mb-4"
              />

              <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">Total Amount</Text>
              <TextInput
                value={amount}
                onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
                placeholder="$0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={{ backgroundColor: colors.surfaceHover, color: colors.text }}
                className="rounded-bento px-4 py-3 mb-4"
              />

              <DatePickerField
                label="Due Date"
                value={dueDate}
                onChange={setDueDate}
              />

              <View className="h-4" />

              <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">Description (optional)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="e.g., 12 monthly installments"
                placeholderTextColor={colors.textMuted}
                style={{ backgroundColor: colors.surfaceHover, color: colors.text }}
                className="rounded-bento px-4 py-3 mb-6"
              />

              <Pressable
                onPress={handleSave}
                disabled={submitting || !name.trim() || !amount}
                className="py-4 rounded-bento items-center"
                style={{ backgroundColor: name.trim() && amount ? colors.tint : colors.surfaceHover }}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="font-semibold text-base" style={{ color: name.trim() && amount ? '#FFFFFF' : colors.textMuted }}>
                    Add Payable
                  </Text>
                )}
              </Pressable>

              <View style={{ height: insets.bottom + 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Detail / Payment Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent onRequestClose={() => setShowDetailModal(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View style={{ backgroundColor: colors.surface }} className="rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text style={{ color: colors.text }} className="text-xl font-bold">{selectedPayable?.name}</Text>
              <Pressable onPress={() => setShowDetailModal(false)} className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: colors.surfaceHover }}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {selectedPayable && (
              <>
                <View className="flex-row justify-between mb-2">
                  <Text style={{ color: colors.textSecondary }}>Total</Text>
                  <Text style={{ color: colors.text }} className="font-bold">${selectedPayable.totalAmount.toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text style={{ color: colors.textSecondary }}>Remaining</Text>
                  <Text style={{ color: '#FF6B6B' }} className="font-bold">${selectedPayable.remainingAmount.toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between mb-4">
                  <Text style={{ color: colors.textSecondary }}>Due</Text>
                  <Text style={{ color: colors.text }}>
                    {new Date(selectedPayable.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>

                {!selectedPayable.isPaid && (
                  <>
                    <Text style={{ color: colors.textSecondary }} className="text-sm mb-2">Make a payment</Text>
                    <TextInput
                      value={paymentAmount}
                      onChangeText={(t) => setPaymentAmount(t.replace(/[^0-9.]/g, ''))}
                      placeholder="$0.00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                      style={{ backgroundColor: colors.surfaceHover, color: colors.text }}
                      className="rounded-bento px-4 py-3 mb-4"
                    />

                    <View className="flex-row mb-3">
                      <Pressable
                        onPress={handleMakePayment}
                        disabled={!paymentAmount}
                        className="flex-1 py-3.5 rounded-bento items-center mr-2"
                        style={{ backgroundColor: paymentAmount ? colors.tint : colors.surfaceHover }}
                      >
                        <Text className="font-semibold" style={{ color: paymentAmount ? '#FFFFFF' : colors.textMuted }}>
                          Pay Amount
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={handleMarkPaid}
                        className="flex-1 py-3.5 rounded-bento items-center ml-2"
                        style={{ backgroundColor: '#05DF7220' }}
                      >
                        <Text style={{ color: '#05DF72' }} className="font-semibold">Mark Fully Paid</Text>
                      </Pressable>
                    </View>
                  </>
                )}

                <Pressable
                  onPress={handleDelete}
                  className="py-3.5 rounded-bento items-center"
                  style={{ backgroundColor: '#FF6B6B20' }}
                >
                  <Text style={{ color: '#FF6B6B' }} className="font-semibold">Delete</Text>
                </Pressable>
              </>
            )}
            <View style={{ height: insets.bottom + 16 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
