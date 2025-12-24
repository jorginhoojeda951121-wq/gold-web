import { useEffect, useState } from 'react';

/**
 * useOfflineStorage - For UI state only (search queries, view modes, etc.)
 * Uses sessionStorage (cleared when browser closes)
 * NOT for persistent data - use useUserStorage for that
 */
export function useOfflineStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error saving to sessionStorage for key ${key}:`, error);
    }
  }, [key, storedValue]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
    } catch (error) {
      console.error(`Error updating sessionStorage for key ${key}:`, error);
    }
  };

  return { data: storedValue, updateData: setValue, loaded };
}
