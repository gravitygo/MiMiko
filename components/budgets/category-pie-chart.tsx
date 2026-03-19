import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

interface CategorySlice {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface CategoryPieChartProps {
  slices: CategorySlice[];
  totalSpent: number;
  budgetAmount?: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    'M', start.x, start.y,
    'A', r, r, 0, largeArc, 0, end.x, end.y,
    'L', cx, cy,
    'Z',
  ].join(' ');
}

const CHART_SIZE = 180;
const RADIUS = 75;
const CENTER = CHART_SIZE / 2;
const INNER_RADIUS = 45;

export function CategoryPieChart({ slices, totalSpent, budgetAmount }: CategoryPieChartProps) {
  if (slices.length === 0) {
    return (
      <View className="bg-surface dark:bg-surface-dark border border-border/50 dark:border-white/5 rounded-3xl p-6 items-center">
        <Text className="text-text-muted dark:text-text-muted-dark text-sm text-center">
          No spending data to display
        </Text>
      </View>
    );
  }

  let currentAngle = 0;
  const hasBudget = budgetAmount !== undefined && budgetAmount > 0;
  const isOverBudget = hasBudget && totalSpent > budgetAmount;
  const base = hasBudget ? Math.max(totalSpent, budgetAmount) : totalSpent;

  const paths = slices.map((slice) => {
    const angle = base > 0 ? (slice.amount / base) * 360 : 0;
    if (angle <= 0) return null;

    const startAngle = currentAngle;
    const endAngle = currentAngle + Math.min(angle, 359.99);
    currentAngle += angle;

    return (
      <Path
        key={slice.id}
        d={describeArc(CENTER, CENTER, RADIUS, startAngle, endAngle)}
        fill={slice.color}
      />
    );
  });

  // Remaining budget slice (gray)
  if (hasBudget && !isOverBudget && currentAngle < 360) {
    const remainAngle = 360 - currentAngle;
    if (remainAngle > 0.5) {
      paths.push(
        <Path
          key="remaining"
          d={describeArc(CENTER, CENTER, RADIUS, currentAngle, currentAngle + Math.min(remainAngle, 359.99))}
          fill="#E5E7EB"
          opacity={0.4}
        />
      );
    }
  }

  const centerLabel = hasBudget
    ? (isOverBudget ? `$${(totalSpent - budgetAmount).toLocaleString()} over` : `$${(budgetAmount - totalSpent).toLocaleString()} left`)
    : `$${totalSpent.toLocaleString()}`;
  const centerSublabel = hasBudget ? `of $${budgetAmount.toLocaleString()}` : 'Total';

  return (
    <View className="bg-surface dark:bg-surface-dark border border-border/50 dark:border-white/5 rounded-3xl p-4">
      <View className="items-center mb-4">
        <Svg width={CHART_SIZE} height={CHART_SIZE}>
          {paths}
          <Circle cx={CENTER} cy={CENTER} r={INNER_RADIUS} fill="transparent" />
        </Svg>
        <View
          style={{
            position: 'absolute',
            top: 16,
            width: CHART_SIZE,
            height: CHART_SIZE,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text className="text-text-muted dark:text-text-muted-dark text-xs">{centerSublabel}</Text>
          <Text className={`text-lg font-bold ${isOverBudget ? 'text-expense' : 'text-text-primary dark:text-text-primary-dark'}`}>
            {hasBudget
              ? (isOverBudget ? `$${(totalSpent - budgetAmount).toLocaleString()}` : `$${(budgetAmount - totalSpent).toLocaleString()}`)
              : `$${totalSpent.toLocaleString()}`}
          </Text>
          {hasBudget && (
            <Text className={`text-xs font-medium ${isOverBudget ? 'text-expense' : 'text-secondary'}`}>
              {isOverBudget ? 'over' : 'left'}
            </Text>
          )}
        </View>
      </View>

      {/* Legend */}
      <View className="gap-2">
        {slices.map((slice) => (
          <View key={slice.id} className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: slice.color }}
              />
              <Text
                className="text-text-primary dark:text-text-primary-dark text-sm"
                numberOfLines={1}
              >
                {slice.name}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-text-muted dark:text-text-muted-dark text-sm mr-2">
                {Math.round(slice.percentage)}%
              </Text>
              <Text className="text-text-primary dark:text-text-primary-dark text-sm font-medium w-20 text-right">
                ${slice.amount.toLocaleString()}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
