/**
 * User-scoped storage hook
 * Replaces useOfflineStorage to ensure data isolation per user
 */

import { useEffect, useState } from 'react';
import { getUserData, setUserData } from '@/lib/userStorage';

export function useUserStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [loaded, setLoaded] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load data from IndexedDB with retry if user ID not available
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 10; // Increased retries
    const retryDelay = 300; // Slightly longer delay

    const loadData = async (): Promise<void> => {
      try {
        // Check if user ID is available
        const { getCurrentUserId } = await import('@/lib/userStorage');
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

        // If still no userId after max retries, just mark as loaded with initial value
        if (!userId) {
          if (isMounted) {
            setStoredValue(initialValue);
            setLoaded(true);
          }
          return;
        }

        const valueFromDb = await getUserData<T>(key);
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
              await setUserData<T>(key, initialValue);
            } else {
              setStoredValue(valueFromDb);
            }
          } else {
            setStoredValue(valueFromDb);
          }
        }
      } catch (error) {
        console.log(`Error loading data for key ${key}, using initial value:`, error);
        // On error, keep the initial value
        if (isMounted) {
          setStoredValue(initialValue);
        }
      } finally {
        if (isMounted) setLoaded(true);
      }
    };

    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [key, refreshTrigger]); // Removed initialValue from dependencies to prevent reload loops

  // Listen for sync completion events to reload data in background
  useEffect(() => {
    const handleDataSynced = () => {
      // Trigger a re-fetch of data
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('data-synced', handleDataSynced);
    
    return () => {
      window.removeEventListener('data-synced', handleDataSynced);
    };
  }, [key]);

  const setValue = async (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      await setUserData<T>(key, valueToStore);
    } catch (error) {
      console.error(`Error saving user data for key ${key}:`, error);
    }
  };

  return { data: storedValue, updateData: setValue, loaded };
}

