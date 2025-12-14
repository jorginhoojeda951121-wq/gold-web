/**
 * User-scoped storage hook
 * Reads directly from Supabase (no sync queue, no caching)
 * Always fetches fresh data from Supabase on mount
 */

import { useEffect, useState, useRef } from 'react';
import { fetchAll } from '@/lib/supabaseDirect';
import { getSupabase } from '@/lib/supabase';

// Promise cache to prevent duplicate concurrent fetches (fixes race condition)
// When multiple components fetch the same key simultaneously, they share one promise
const fetchingPromises: Record<string, Promise<any>> = {};

// Clear cache for a specific key (no-op, kept for compatibility)
export function clearUserStorageCache(key: string): void {
  // Clear any in-progress fetch promise to force fresh fetch
  delete fetchingPromises[key];
}

// Clear all cache (no-op, kept for compatibility)
export function clearAllUserStorageCache(): void {
  Object.keys(fetchingPromises).forEach(key => delete fetchingPromises[key]);
}

export function useUserStorage<T>(key: string, initialValue: T) {
  // Always start with initial value - no cached data
  const [storedValue, setStoredValue] = useState<T | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Store initialValue in ref to avoid dependency issues
  const initialValueRef = useRef(initialValue);
  initialValueRef.current = initialValue;

  // Always fetch data directly from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 500;

    const loadData = async (): Promise<void> => {
      try {
        // Wait for Supabase session to be ready
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // If no session and we haven't retried enough, wait and retry
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(() => {
              if (isMounted) {
                loadData();
              }
            }, retryDelay);
            return;
          }
          
          // If still no session after max retries, use initial value
          if (isMounted) {
            setStoredValue(initialValueRef.current);
            setLoaded(true);
          }
          return;
        }

        // RACE CONDITION FIX: Check if there's already a fetch in progress for this key
        // If multiple components try to fetch simultaneously, they share the same promise
        if (fetchingPromises[key]) {
          try {
            // Wait for the existing fetch instead of starting a new one
            const data = await fetchingPromises[key];
            
            if (isMounted) {
              // Process and store data
              const currentInitialValue = initialValueRef.current;
              let processedData: T;
              if (Array.isArray(currentInitialValue) && Array.isArray(data)) {
                processedData = (data.length > 0 ? data : currentInitialValue) as T;
              } else if (Array.isArray(currentInitialValue)) {
                processedData = currentInitialValue;
              } else {
                processedData = (data && Object.keys(data).length > 0 ? data : currentInitialValue) as T;
              }
              
              setStoredValue(processedData);
              setLoaded(true);
            }
            return;
          } catch (error) {
            // If the shared promise failed, fall through to start a new fetch
            if (!isMounted) return;
            // Continue to fetch below
          }
        }

        // Always fetch fresh data from Supabase
        // Store the promise so other components can share it
        const fetchPromise = fetchAll<T>(key);
        fetchingPromises[key] = fetchPromise;
        
        let data: T;
        try {
          data = await fetchPromise;
        } finally {
          // Clear the promise when done (success or failure)
          delete fetchingPromises[key];
        }
        
        if (isMounted) {
          // Process and store data
          const currentInitialValue = initialValueRef.current;
          let processedData: T;
          if (Array.isArray(currentInitialValue) && Array.isArray(data)) {
            processedData = (data.length > 0 ? data : currentInitialValue) as T;
          } else if (Array.isArray(currentInitialValue)) {
            processedData = currentInitialValue;
          } else {
            processedData = (data && Object.keys(data).length > 0 ? data : currentInitialValue) as T;
          }
          
          setStoredValue(processedData);
          setLoaded(true);
        }
      } catch (error) {
        console.error(`Error loading data for key ${key}:`, error);
        // On error, use initial value
        if (isMounted) {
          setStoredValue(initialValueRef.current);
          setLoaded(true);
        }
      }
    };

    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [key, refreshTrigger]);

  const setValue = async (value: T | ((val: T) => T)) => {
    // This function is kept for compatibility but doesn't write to storage
    // Components should use direct Supabase operations instead
    const currentValue = storedValue !== undefined ? storedValue : initialValueRef.current;
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
        const newValue = event.detail.value as T;
        setStoredValue(newValue);
      }
    };

    window.addEventListener(`user-storage-updated:${key}`, handleKeyUpdate as EventListener);
    
    return () => {
      window.removeEventListener(`user-storage-updated:${key}`, handleKeyUpdate as EventListener);
    };
  }, [key]);

  // Expose refresh function (triggers refetch from Supabase)
  const refresh = () => {
    // Clear any in-progress fetch to force fresh fetch
    delete fetchingPromises[key];
    setRefreshTrigger(prev => prev + 1);
  };

  // Return initialValue as fallback until loaded, then return storedValue
  // This ensures components always have a value, but we don't overwrite stored data
  return { 
    data: (storedValue !== undefined ? storedValue : initialValueRef.current) as T, 
    updateData: setValue, 
    loaded, 
    refresh 
  };
}

