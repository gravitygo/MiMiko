import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { formatCurrency } from '@/state/settings.store';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export type ReminderType = 'recurring' | 'debt' | 'credit_card';

export interface ReminderItem {
  id: string;
  type: ReminderType;
  title: string;
  subtitle: string;
  amount: number;
  icon: IconName;
  iconColor: string;
  dueDate: string | null;
  dueLabel: string;
  isOverdue: boolean;
  direction?: 'payable' | 'receivable';
  canRevert?: boolean;
}

interface ReminderCardProps {
  item: ReminderItem;
  onConfirm: (id: string, type: ReminderType) => void;
  onRevert: (id: string, type: ReminderType) => void;
  onSkip: (id: string, type: ReminderType) => void;
  onPress: (id: string, type: ReminderType) => void;
}

function renderRightAction(
  _progress: Animated.AnimatedInterpolation<number>,
  dragX: Animated.AnimatedInterpolation<number>,
  canRevert: boolean
) {
  if (!canRevert) return null;

  const scale = dragX.interpolate({
    inputRange: [-80, 0],
    outputRange: [1, 0.5],
    extrapolate: 'clamp',
  });

  return (
    <View className="flex-row items-center">
      <Animated.View
        style={{ transform: [{ scale }] }}
        className="bg-tertiary/20 rounded-2xl px-5 py-3 items-center justify-center ml-2 h-full"
      >
        <Ionicons name="arrow-undo" size={20} color="#FFBA00" />
        <Text className="text-tertiary text-xs mt-1 font-medium">Undo</Text>
      </Animated.View>
    </View>
  );
}

function renderLeftAction(
  _progress: Animated.AnimatedInterpolation<number>,
  dragX: Animated.AnimatedInterpolation<number>,
  type: ReminderType,
  direction?: 'payable' | 'receivable'
) {
  if (type === 'credit_card') return null;

  const scale = dragX.interpolate({
    inputRange: [0, 80],
    outputRange: [0.5, 1],
    extrapolate: 'clamp',
  });

  const label = type === 'debt'
    ? direction === 'receivable' ? 'Received' : 'Paid'
    : 'Paid';
  const color = '#05DF72';

  return (
    <View className="flex-row items-center">
      <Animated.View
        style={[{ transform: [{ scale }], backgroundColor: color + '20' }]}
        className="rounded-2xl px-5 py-3 items-center justify-center mr-2 h-full"
      >
        <Ionicons name="checkmark" size={20} color={color} />
        <Text style={{ color }} className="text-xs mt-1 font-medium">{label}</Text>
      </Animated.View>
    </View>
  );
}

export function ReminderCard({ item, onConfirm, onRevert, onSkip, onPress }: ReminderCardProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const handleSwipeLeft = () => {
    if (item.canRevert) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      onRevert(item.id, item.type);
    }
    swipeableRef.current?.close();
  };

  const handleSwipeRight = () => {
    if (item.type === 'credit_card') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm(item.id, item.type);
    swipeableRef.current?.close();
  };

  const handleLongPress = () => {
    if (item.type === 'recurring') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onSkip(item.id, item.type);
    }
  };

  const amountColor = item.direction === 'receivable' ? '#05DF72' : '#FF6B6B';
  const amountPrefix = item.direction === 'receivable' ? '+' : '-';
  const isCreditCard = item.type === 'credit_card';

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={
        item.canRevert
          ? (progress, dragX) => renderRightAction(progress, dragX, true)
          : undefined
      }
      renderLeftActions={
        isCreditCard
          ? undefined
          : (progress, dragX) => renderLeftAction(progress, dragX, item.type, item.direction)
      }
      onSwipeableOpen={(direction) => {
        if (direction === 'left') handleSwipeRight();
        else handleSwipeLeft();
      }}
      friction={2}
      overshootLeft={false}
      overshootRight={false}
    >
      <Pressable
        onPress={() => onPress(item.id, item.type)}
        onLongPress={handleLongPress}
        delayLongPress={800}
      >
        <View className="flex-row items-center bg-surface dark:bg-surface-dark rounded-2xl px-4 py-3">
          <View
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: item.iconColor + '20' }}
          >
            <Ionicons name={item.icon} size={20} color={item.iconColor} />
          </View>

          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-text-primary dark:text-text-primary-dark font-medium text-sm" numberOfLines={1}>
                {item.title}
              </Text>
              {item.canRevert && (
                <View className="ml-2 w-2 h-2 rounded-full bg-tertiary" />
              )}
            </View>
            <Text className="text-text-muted dark:text-text-muted-dark text-xs" numberOfLines={1}>
              {item.subtitle}
            </Text>
          </View>

          <View className="items-end ml-2">
            <Text style={{ color: amountColor }} className="font-semibold text-sm">
              {amountPrefix}{formatCurrency(item.amount)}
            </Text>
            <Text
              className={`text-xs ${item.isOverdue ? 'text-expense' : 'text-text-muted dark:text-text-muted-dark'}`}
            >
              {item.dueLabel}
            </Text>
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
}

interface RemindersListProps {
  items: ReminderItem[];
  onConfirm: (id: string, type: ReminderType) => void;
  onRevert: (id: string, type: ReminderType) => void;
  onSkip: (id: string, type: ReminderType) => void;
  onPress: (id: string, type: ReminderType) => void;
}

export function RemindersList({ items, onConfirm, onRevert, onSkip, onPress }: RemindersListProps) {
  if (items.length === 0) return null;

  return (
    <View className="gap-2">
      {items.map((item) => (
        <ReminderCard
          key={`${item.type}-${item.id}`}
          item={item}
          onConfirm={onConfirm}
          onRevert={onRevert}
          onSkip={onSkip}
          onPress={onPress}
        />
      ))}
    </View>
  );
}
