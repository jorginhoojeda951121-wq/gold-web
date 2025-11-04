import { useEffect, useState } from 'react';
import { idbGet, idbSet } from '@/lib/indexedDb';

export function useOfflineStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const valueFromDb = await idbGet<T>(key);
        if (isMounted) {
          // Always set a value - use the one from DB if it exists, otherwise keep the initial value
          setStoredValue(valueFromDb !== undefined ? valueFromDb : initialValue);
        }
      } catch (error) {
        console.log(error);
        // On error, keep the initial value
        if (isMounted) {
          setStoredValue(initialValue);
        }
      } finally {
        if (isMounted) setLoaded(true);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [key, initialValue]);

  const setValue = async (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      await idbSet<T>(key, valueToStore);
    } catch (error) {
      console.log(error);
    }
  };

  return { data: storedValue, updateData: setValue, loaded };
}