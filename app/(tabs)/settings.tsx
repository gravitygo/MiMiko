import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  CURRENCIES,
  type AppearanceMode,
  type CurrencyCode,
  useSettingsStore,
} from '@/state/settings.store';

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

  const appearance = useSettingsStore((s) => s.appearance);
  const currency = useSettingsStore((s) => s.currency);
  const setAppearance = useSettingsStore((s) => s.setAppearance);
  const setCurrency = useSettingsStore((s) => s.setCurrency);

  const appearanceLabel = appearance === 'system' ? 'System Default' : appearance === 'light' ? 'Light' : 'Dark';
  const currencyItem = CURRENCIES.find((c) => c.code === currency);
  const currencyLabel = currencyItem ? `${currencyItem.code} - ${currencyItem.name}` : currency;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 100 }}
      >
        <View className="px-4 py-6">
          <Text style={{ color: colors.text }} className="text-2xl font-bold">
            Settings
          </Text>
        </View>

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
    </View>
  );
}

