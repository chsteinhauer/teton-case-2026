import { getItem, setItem } from "@/utils/async-storage";
import { useCallback, useEffect, useState } from "react";

/**
 * useState that persists to AsyncStorage under `key`.
 * Returns [value, setValue, loaded] — `loaded` is false until the stored
 * value has been read, so screens can avoid flashing the default.
 */
export function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getItem<T>(key).then((stored) => {
      if (cancelled) return;
      if (stored !== null) setValue(stored);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      setItem(key, next);
    },
    [key],
  );

  return [value, update, loaded] as const;
}
