/**
 * User-scoped storage hook
 * Reads directly from Supabase (no sync queue)
 */

import { useEffect, useState } from 'react';
import { fetchAll } from '@/lib/supabaseDirect';
import { getCurrentUserId } from '@/lib/userStorage';

export function useUserStorage<T>(key: string, initialValue: T) {
  // Don't apply initialValue until after loading completes
  const [storedValue, setStoredValue] = useState<T | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load data directly from Supabase
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 500;

    const loadData = async (): Promise<void> => {
      try {
        // Check if user ID is available
        const userId = await getCurrentUserId();
        
        // If no user ID and we haven't retried enough, wait and retry
        if (!userId && retryCount < maxRetries) {
          retryCount++;
          setTimeout(() => {
            if (isMounted) {
              loadData();
            }
          }, retryDelay);
          return;
        }

        // If still no userId after max retries, use initial value
        if (!userId) {
          if (isMounted) {
            setStoredValue(initialValue);
            setLoaded(true);
          }
          return;
        }

        // Fetch directly from Supabase
        const data = await fetchAll<T>(key);
        
        if (isMounted) {
          // Only apply initialValue if no stored data exists
          if (Array.isArray(initialValue) && Array.isArray(data)) {
            setStoredValue((data.length > 0 ? data : initialValue) as T);
          } else if (Array.isArray(initialValue)) {
            // If initialValue is array but data is not, use initialValue
            setStoredValue(initialValue);
          } else {
            // For non-array values (like settings objects)
            setStoredValue((data && Object.keys(data).length > 0 ? data : initialValue) as T);
          }
          setLoaded(true);
        }
      } catch (error) {
        console.error(`Error loading data for key ${key}:`, error);
        // On error, use initial value
        if (isMounted) {
          setStoredValue(initialValue);
          setLoaded(true);
        }
      }
    };

    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [key, refreshTrigger, initialValue]);

  const setValue = async (value: T | ((val: T) => T)) => {
    // This function is kept for compatibility but doesn't write to storage
    // Components should use direct Supabase operations instead
    const currentValue = storedValue !== undefined ? storedValue : initialValue;
    const valueToStore = value instanceof Function ? value(currentValue) : value;
    setStoredValue(valueToStore);
    
    // Dispatch custom event to notify other components using the same key
    window.dispatchEvent(new CustomEvent(`user-storage-updated:${key}`, {
      detail: { key, value: valueToStore }
    }));
  };

  // Listen for updates to this key from other components
  useEffect(() => {
    const handleKeyUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.value !== undefined) {
        setStoredValue(event.detail.value as T);
      }
    };

    window.addEventListener(`user-storage-updated:${key}`, handleKeyUpdate as EventListener);
    
    return () => {
      window.removeEventListener(`user-storage-updated:${key}`, handleKeyUpdate as EventListener);
    };
  }, [key]);

  // Expose refresh function
  const refresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Return initialValue as fallback until loaded, then return storedValue
  // This ensures components always have a value, but we don't overwrite stored data
  return { 
    data: (storedValue !== undefined ? storedValue : initialValue) as T, 
    updateData: setValue, 
    loaded, 
    refresh 
  };
}

