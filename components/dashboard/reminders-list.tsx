import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export type ReminderType = 'recurring' | 'debt';

export interface ReminderItem {
  id: string;
  type: ReminderType;
  title: string;
  subtitle: string;
  amount: number;
  icon: IconName;
  iconColor: string;
  dueLabel: string;
  isOverdue: boolean;
  direction?: 'payable' | 'receivable';
}

interface ReminderCardProps {
  item: ReminderItem;
  onConfirm: (id: string, type: ReminderType) => void;
  onDismiss: (id: string, type: ReminderType) => void;
}

function renderRightAction(
  _progress: Animated.AnimatedInterpolation<number>,
  dragX: Animated.AnimatedInterpolation<number>
) {
  const scale = dragX.interpolate({
    inputRange: [-80, 0],
    outputRange: [1, 0.5],
    extrapolate: 'clamp',
  });

  return (
    <View className="flex-row items-center">
      <Animated.View
        style={{ transform: [{ scale }] }}
        className="bg-text-muted/20 rounded-2xl px-5 py-3 items-center justify-center ml-2 h-full"
      >
        <Ionicons name="close" size={20} color="#71717A" />
        <Text className="text-text-muted text-xs mt-1">Skip</Text>
      </Animated.View>
    </View>
  );
}

function renderLeftAction(
  _progress: Animated.AnimatedInterpolation<number>,
  dragX: Animated.AnimatedInterpolation<number>,
  isDebt: boolean,
  direction?: 'payable' | 'receivable'
) {
  const scale = dragX.interpolate({
    inputRange: [0, 80],
    outputRange: [0.5, 1],
    extrapolate: 'clamp',
  });

  const label = isDebt
    ? direction === 'receivable' ? 'Received' : 'Paid'
    : 'Paid';
  const color = isDebt && direction === 'receivable' ? '#05DF72' : '#05DF72';

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

export function ReminderCard({ item, onConfirm, onDismiss }: ReminderCardProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const handleSwipeLeft = () => {
    onDismiss(item.id, item.type);
    swipeableRef.current?.close();
  };

  const handleSwipeRight = () => {
    onConfirm(item.id, item.type);
    swipeableRef.current?.close();
  };

  const amountColor = item.direction === 'receivable' ? '#05DF72' : '#FF6B6B';
  const amountPrefix = item.direction === 'receivable' ? '+' : '-';

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightAction}
      renderLeftActions={(progress, dragX) =>
        renderLeftAction(progress, dragX, item.type === 'debt', item.direction)
      }
      onSwipeableOpen={(direction) => {
        if (direction === 'left') handleSwipeRight();
        else handleSwipeLeft();
      }}
      friction={2}
      overshootLeft={false}
      overshootRight={false}
    >
      <View className="flex-row items-center bg-surface dark:bg-surface-dark rounded-2xl px-4 py-3">
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: item.iconColor + '20' }}
        >
          <Ionicons name={item.icon} size={20} color={item.iconColor} />
        </View>

        <View className="flex-1">
          <Text className="text-text-primary dark:text-text-primary-dark font-medium text-sm" numberOfLines={1}>
            {item.title}
          </Text>
          <Text className="text-text-muted dark:text-text-muted-dark text-xs" numberOfLines={1}>
            {item.subtitle}
          </Text>
        </View>

        <View className="items-end ml-2">
          <Text style={{ color: amountColor }} className="font-semibold text-sm">
            {amountPrefix}${item.amount.toLocaleString()}
          </Text>
          <Text
            className={`text-xs ${item.isOverdue ? 'text-expense' : 'text-text-muted dark:text-text-muted-dark'}`}
          >
            {item.dueLabel}
          </Text>
        </View>
      </View>
    </Swipeable>
  );
}

interface RemindersListProps {
  items: ReminderItem[];
  onConfirm: (id: string, type: ReminderType) => void;
  onDismiss: (id: string, type: ReminderType) => void;
}

export function RemindersList({ items, onConfirm, onDismiss }: RemindersListProps) {
  if (items.length === 0) return null;

  return (
    <View className="gap-2">
      {items.map((item) => (
        <ReminderCard
          key={`${item.type}-${item.id}`}
          item={item}
          onConfirm={onConfirm}
          onDismiss={onDismiss}
        />
      ))}
    </View>
  );
}
