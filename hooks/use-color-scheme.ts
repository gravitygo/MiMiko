import { useSettingsStore } from '@/state/settings.store';
import { useColorScheme as useRNColorScheme } from 'react-native';

export function useColorScheme() {
  const systemScheme = useRNColorScheme();
  const appearance = useSettingsStore((s) => s.appearance);

  if (appearance === 'system') return systemScheme;
  return appearance;
}
