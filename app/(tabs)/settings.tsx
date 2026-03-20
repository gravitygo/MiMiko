import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { resetAllData } from '@/database';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useVoice } from '@/hooks/use-voice';
import type { VoiceLog } from '@/modules/voice/voice.types';
import {
    CURRENCIES,
    useSettingsStore,
    type AppearanceMode
} from '@/state/settings.store';
import { useVoiceStore } from '@/state/voice.store';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface SettingsItemProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
}

function SettingsItem({ icon, title, subtitle, onPress, showChevron = true }: SettingsItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-4 px-4 active:opacity-70"
      style={{ backgroundColor: colors.surface }}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: colors.background }}
      >
        <Ionicons name={icon} size={20} color={colors.tint} />
      </View>
      <View className="flex-1">
        <Text style={{ color: colors.text }} className="text-base font-medium">
          {title}
        </Text>
        {subtitle && (
          <Text style={{ color: colors.textSecondary }} className="text-sm mt-0.5">
            {subtitle}
          </Text>
        )}
      </View>
      {showChevron && (
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      )}
    </Pressable>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View className="mb-6">
      <Text
        style={{ color: colors.textSecondary }}
        className="text-xs font-semibold uppercase px-4 mb-2"
      >
        {title}
      </Text>
      <View
        className="rounded-xl overflow-hidden mx-4"
        style={{ backgroundColor: colors.surface }}
      >
        {children}
      </View>
    </View>
  );
}

function Divider() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return <View className="h-px ml-16" style={{ backgroundColor: colors.border }} />;
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const [showAppearance, setShowAppearance] = useState(false);
  const [showCurrency, setShowCurrency] = useState(false);
  const [showVoiceLogs, setShowVoiceLogs] = useState(false);

  const appearance = useSettingsStore((s) => s.appearance);
  const currency = useSettingsStore((s) => s.currency);
  const setAppearance = useSettingsStore((s) => s.setAppearance);
  const setCurrency = useSettingsStore((s) => s.setCurrency);

  const voiceLogs = useVoiceStore((s) => s.logs);
  const { fetch: fetchVoiceLogs, removeLog, clearAll: clearVoiceLogs } = useVoice();

  useFocusEffect(
    useCallback(() => {
      fetchVoiceLogs();
    }, [fetchVoiceLogs])
  );

  const appearanceLabel = appearance === 'system' ? 'System Default' : appearance === 'light' ? 'Light' : 'Dark';
  const currencyItem = CURRENCIES.find((c) => c.code === currency);
  const currencyLabel = currencyItem ? `${currencyItem.code} - ${currencyItem.name}` : currency;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 100 }}
      >

        <SettingsSection title="Account">
          <SettingsItem
            icon="wallet-outline"
            title="Accounts"
            subtitle="Manage your accounts"
            onPress={() => router.push('/accounts')}
          />
          <Divider />
          <SettingsItem
            icon="grid-outline"
            title="Categories"
            subtitle="Customize categories"
            onPress={() => router.push('/categories')}
          />
        </SettingsSection>

        <SettingsSection title="Preferences">
          <SettingsItem
            icon="moon-outline"
            title="Appearance"
            subtitle={appearanceLabel}
            onPress={() => setShowAppearance(true)}
          />
          <Divider />
          <SettingsItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Reminders & alerts"
          />
          <Divider />
          <SettingsItem
            icon="cash-outline"
            title="Currency"
            subtitle={currencyLabel}
            onPress={() => setShowCurrency(true)}
          />
        </SettingsSection>

        <SettingsSection title="Data">
          <SettingsItem
            icon="cloud-upload-outline"
            title="Backup"
            subtitle="Export your data"
          />
          <Divider />
          <SettingsItem
            icon="cloud-download-outline"
            title="Restore"
            subtitle="Import backup"
          />
          <Divider />
          <SettingsItem
            icon="trash-outline"
            title="Reset All Data"
            subtitle="Delete all transactions, budgets, etc."
            onPress={() => {
              Alert.alert(
                'Reset All Data',
                'This will permanently delete all your transactions, budgets, recurring rules, and payables. Default accounts and categories will be kept. This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                      await resetAllData();
                      Alert.alert('Done', 'All data has been reset.');
                    },
                  },
                ]
              );
            }}
          />
        </SettingsSection>

        <SettingsSection title="Voice">
          <SettingsItem
            icon="mic-outline"
            title="Voice Logs"
            subtitle={`${voiceLogs.length} recording${voiceLogs.length !== 1 ? 's' : ''}`}
            onPress={() => setShowVoiceLogs(true)}
          />
        </SettingsSection>

        <SettingsSection title="About">
          <SettingsItem
            icon="information-circle-outline"
            title="About MiKiko"
            subtitle="Version 1.0.0"
          />
          <Divider />
          <SettingsItem
            icon="help-circle-outline"
            title="Help & Support"
          />
        </SettingsSection>
      </ScrollView>

      {/* Appearance Modal */}
      <Modal visible={showAppearance} animationType="fade" transparent onRequestClose={() => setShowAppearance(false)}>
        <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setShowAppearance(false)}>
          <View style={{ backgroundColor: colors.surface }} className="rounded-t-3xl p-6" onStartShouldSetResponder={() => true}>
            <Text style={{ color: colors.text }} className="text-lg font-bold mb-4">Appearance</Text>
            {([
              { value: 'system' as AppearanceMode, label: 'System Default', icon: 'phone-portrait-outline' as const },
              { value: 'light' as AppearanceMode, label: 'Light Mode', icon: 'sunny-outline' as const },
              { value: 'dark' as AppearanceMode, label: 'Dark Mode', icon: 'moon-outline' as const },
            ]).map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => { setAppearance(opt.value); setShowAppearance(false); }}
                className="flex-row items-center py-3.5"
              >
                <Ionicons name={opt.icon} size={22} color={appearance === opt.value ? colors.tint : colors.textSecondary} />
                <Text style={{ color: colors.text }} className="text-base ml-3 flex-1">{opt.label}</Text>
                {appearance === opt.value && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.tint} />
                )}
              </Pressable>
            ))}
            <View style={{ height: insets.bottom + 8 }} />
          </View>
        </Pressable>
      </Modal>

      {/* Currency Modal */}
      <Modal visible={showCurrency} animationType="fade" transparent onRequestClose={() => setShowCurrency(false)}>
        <Pressable className="flex-1 bg-black/50 justify-end" onPress={() => setShowCurrency(false)}>
          <View style={{ backgroundColor: colors.surface }} className="rounded-t-3xl p-6" onStartShouldSetResponder={() => true}>
            <Text style={{ color: colors.text }} className="text-lg font-bold mb-4">Currency</Text>
            {CURRENCIES.map((c) => (
              <Pressable
                key={c.code}
                onPress={() => { setCurrency(c.code); setShowCurrency(false); }}
                className="flex-row items-center py-3.5"
              >
                <Text style={{ color: currency === c.code ? colors.tint : colors.textSecondary }} className="text-lg font-semibold w-10">{c.symbol}</Text>
                <View className="flex-1 ml-2">
                  <Text style={{ color: colors.text }} className="text-base font-medium">{c.name}</Text>
                  <Text style={{ color: colors.textSecondary }} className="text-sm">{c.code}</Text>
                </View>
                {currency === c.code && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.tint} />
                )}
              </Pressable>
            ))}
            <View style={{ height: insets.bottom + 8 }} />
          </View>
        </Pressable>
      </Modal>

      {/* Voice Logs Modal */}
      <Modal visible={showVoiceLogs} animationType="slide" transparent onRequestClose={() => setShowVoiceLogs(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View style={{ backgroundColor: colors.surface, maxHeight: '80%' }} className="rounded-t-3xl">
            <View className="flex-row items-center justify-between p-6 pb-3">
              <Text style={{ color: colors.text }} className="text-lg font-bold">Voice Logs</Text>
              <View className="flex-row items-center gap-3">
                {voiceLogs.length > 0 && (
                  <Pressable
                    onPress={() => {
                      Alert.alert('Clear All Logs', 'Delete all voice logs?', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Clear',
                          style: 'destructive',
                          onPress: async () => {
                            await clearVoiceLogs();
                          },
                        },
                      ]);
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                  </Pressable>
                )}
                <Pressable onPress={() => setShowVoiceLogs(false)} className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: colors.background }}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            {voiceLogs.length === 0 ? (
              <View className="items-center py-12 px-6">
                <Ionicons name="mic-off-outline" size={40} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary }} className="text-sm text-center mt-3">
                  No voice logs yet.{'\n'}Long press the + button to start recording.
                </Text>
              </View>
            ) : (
              <FlatList
                data={voiceLogs}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}
                renderItem={({ item }: { item: VoiceLog }) => {
                  const date = new Date(item.createdAt);
                  const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  const langLabel = item.language === 'fil-PH' ? 'Filipino' : 'English';
                  const durationSec = Math.round(item.durationMs / 1000);

                  return (
                    <View className="py-3 px-2 border-b border-border/30 dark:border-white/5">
                      <View className="flex-row items-start justify-between mb-1">
                        <View className="flex-row items-center gap-2">
                          <View className="px-2 py-0.5 rounded-full bg-primary/15">
                            <Text className="text-primary text-xs font-medium">{langLabel}</Text>
                          </View>
                          <Text style={{ color: colors.textSecondary }} className="text-xs">
                            {durationSec}s
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => removeLog(item.id)}
                          hitSlop={8}
                        >
                          <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                        </Pressable>
                      </View>
                      <Text style={{ color: colors.text }} className="text-sm leading-5 mb-1">
                        {item.transcript}
                      </Text>
                      <Text style={{ color: colors.textSecondary }} className="text-xs">
                        {formattedDate}
                      </Text>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

