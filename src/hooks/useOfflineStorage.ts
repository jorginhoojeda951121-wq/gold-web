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
          // If valueFromDb is undefined, use initialValue
          // If valueFromDb is an empty array and initialValue is a non-empty array, use initialValue (for seed data)
          // Otherwise use valueFromDb
          if (valueFromDb === undefined) {
            setStoredValue(initialValue);
          } else if (
            Array.isArray(valueFromDb) && 
            Array.isArray(initialValue) && 
            valueFromDb.length === 0 && 
            initialValue.length > 0
          ) {
            // Empty array exists but we have seed data - use seed data if key is in seed list
            const seedableKeys = ['craftsmen', 'customers', 'staff_employees', 'jewelry_items', 'gold_items', 'stones_items', 'pos_recentInvoices'];
            if (seedableKeys.includes(key)) {
              setStoredValue(initialValue);
              // Also save seed data to IndexedDB
              await idbSet<T>(key, initialValue);
            } else {
              setStoredValue(valueFromDb);
            }
          } else {
            setStoredValue(valueFromDb);
          }
        }
      } catch (error) {
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
    }
  };

  return { data: storedValue, updateData: setValue, loaded };
}
