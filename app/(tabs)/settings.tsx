import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
          <Divider />
          <SettingsItem
            icon="repeat-outline"
            title="Recurring Payments"
            subtitle="Subscriptions & installments"
            onPress={() => router.push('/recurring')}
          />
        </SettingsSection>

        <SettingsSection title="Preferences">
          <SettingsItem
            icon="moon-outline"
            title="Appearance"
            subtitle="Dark mode, themes"
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
            subtitle="IDR - Indonesian Rupiah"
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
    </View>
  );
}

