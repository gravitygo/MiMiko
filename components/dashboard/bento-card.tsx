import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

type CardSize = "1x1" | "2x1" | "2x2" | "1x2" | "4x1" | "4x2" | "3x1" | "3x2" | "auto";

interface BentoCardProps {
  size?: CardSize;
  children: ReactNode;
  onPress?: () => void;
  className?: string;
}

const sizeClasses: Record<CardSize, string> = {
  "1x1": "w-full aspect-square",
  "2x1": "w-full h-24",
  "2x2": "w-full aspect-[2/1.1]",
  "1x2": "w-full aspect-[1/2]",
  "4x1": "w-full aspect-[4/1] ",
  "4x2": "w-full aspect-[2/1] ",
  "3x1": "w-full aspect-[3/1] ",
  "3x2": "w-full aspect-[3/2] ",
  "auto": "w-full",
};

export function BentoCard({
  size = "1x1",
  children,
  onPress,
  className = "",
}: BentoCardProps) {
  const baseClasses = `bg-surface dark:bg-surface-dark border border-border/50 dark:border-white/5 rounded-3xl p-4 ${sizeClasses[size]} ${className}`;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={`${baseClasses} active:opacity-80`}
      >
        {children}
      </Pressable>
    );
  }

  return <View className={baseClasses}>{children}</View>;
}
