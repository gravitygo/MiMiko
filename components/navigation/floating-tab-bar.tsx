import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  iconFocused: IconName;
  iconDefault: IconName;
  label: string;
}

const TAB_CONFIG: Record<string, TabConfig> = {
  index: { iconFocused: 'home', iconDefault: 'home-outline', label: 'Home' },
  transactions: { iconFocused: 'list', iconDefault: 'list-outline', label: 'Transactions' },
  add: { iconFocused: 'add', iconDefault: 'add', label: '' },
  budgets: { iconFocused: 'pie-chart', iconDefault: 'pie-chart-outline', label: 'Budgets' },
  payables: { iconFocused: 'document-text', iconDefault: 'document-text-outline', label: 'Payables' },
  settings: { iconFocused: 'settings', iconDefault: 'settings-outline', label: 'Settings' },
};

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: colorScheme === 'dark'
            ? 'rgba(18, 18, 20, 0.85)'
            : 'rgba(255, 255, 255, 0.85)',
          borderColor: colorScheme === 'dark'
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.1)',
        }
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const config = TAB_CONFIG[route.name];
        const isAddButton = route.name === 'add';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        if (isAddButton) {
          return (
            <AddButton
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              primaryColor={colors.primary}
            />
          );
        }

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabButton}
          >
            <View style={[styles.tabIconContainer, isFocused && styles.tabIconFocused]}>
              <Ionicons
                name={isFocused ? config.iconFocused : config.iconDefault}
                size={24}
                color={isFocused ? colors.primary : colors.tabIconDefault}
              />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

interface AddButtonProps {
  onPress: () => void;
  onLongPress: () => void;
  primaryColor: string;
}

function AddButton({ onPress, onLongPress, primaryColor }: AddButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add transaction"
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.addButtonContainer}
    >
      <View style={[styles.addButtonGlow, { backgroundColor: primaryColor }]} />
      <View style={[styles.addButton, { backgroundColor: primaryColor }]}>
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 12,
    paddingHorizontal: 8,
    borderRadius: 28,
    borderWidth: 1,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    // Elevation for Android
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 32,
    borderRadius: 16,
  },
  tabIconFocused: {
    backgroundColor: 'rgba(0, 132, 209, 0.1)',
  },
  addButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -32,
    marginHorizontal: 8,
  },
  addButtonGlow: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    opacity: 0.3,
    // Glow effect
    shadowColor: '#0084D1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    // Button shadow
    shadowColor: '#0084D1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});

