import { useFocusEffect } from '@react-navigation/native';
import { AppState } from 'react-native';
import { useCallback, useEffect } from 'react';

type Options = {
  intervalMs?: number;
};

export function useLiveSync(load: () => Promise<void>, options?: Options): void {
  const intervalMs = options?.intervalMs ?? 15000;

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    const id = setInterval(() => {
      load();
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, load]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        load();
      }
    });

    return () => subscription.remove();
  }, [load]);
}
