import { useSettingsStore } from '@/state/settings.store';
import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const systemScheme = useRNColorScheme();
  const appearance = useSettingsStore((s) => s.appearance);

  if (!hasHydrated) return 'light';
  if (appearance === 'system') return systemScheme;
  return appearance;

}
