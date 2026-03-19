import { useColorScheme as useRNColorScheme } from 'react-native';
import { useSettingsStore } from '@/state/settings.store';

export function useColorScheme() {
  const systemScheme = useRNColorScheme();
  const appearance = useSettingsStore((s) => s.appearance);

  if (appearance === 'system') return systemScheme;
  return appearance;
}
