/**
 * User-scoped storage hook
 * Reads directly from Supabase (no sync queue)
 * OPTIMIZED: Includes in-memory cache for instant subsequent reads
 */

import { useEffect, useState } from 'react';
import { fetchAll } from '@/lib/supabaseDirect';
import { getCurrentUserId } from '@/lib/userStorage';
import { getSupabase } from '@/lib/supabase';

// In-memory cache for instant reads (biggest performance win)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  userId: string;
}

const memoryCache: Record<string, CacheEntry<any>> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

// Promise cache to prevent duplicate concurrent fetches (fixes race condition)
// When multiple components fetch the same key simultaneously, they share one promise
const fetchingPromises: Record<string, Promise<any>> = {};

// Clear cache for a specific key (called on updates)
export function clearUserStorageCache(key: string): void {
  delete memoryCache[key];
  // Also clear any in-progress fetch promise to force fresh fetch
  delete fetchingPromises[key];
}

// Clear all cache (called on logout)
export function clearAllUserStorageCache(): void {
  Object.keys(memoryCache).forEach(key => delete memoryCache[key]);
  Object.keys(fetchingPromises).forEach(key => delete fetchingPromises[key]);
}

export function useUserStorage<T>(key: string, initialValue: T) {
  // Initialize with cached value if available (instant render)
  const cachedEntry = memoryCache[key];
  const [storedValue, setStoredValue] = useState<T | undefined>(
    cachedEntry?.data ?? undefined
  );
  const [loaded, setLoaded] = useState(!!cachedEntry);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load data directly from Supabase
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 500;

    const loadData = async (): Promise<void> => {
      try {
        // OPTIMIZATION: Wait for Supabase session to be ready (removes 200-500ms delay)
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
            setStoredValue(initialValue);
            setLoaded(true);
          }
          return;
        }

        const userId = session.user.id;
        
        // OPTIMIZATION: Check cache first (0ms read instead of 600ms)
        const cached = memoryCache[key];
        const now = Date.now();
        
        if (cached && cached.userId === userId && (now - cached.timestamp) < CACHE_TTL) {
          // Cache hit! Use cached data instantly
          if (isMounted) {
            setStoredValue(cached.data);
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
              // Process and store data (same logic as below)
              let processedData: T;
              if (Array.isArray(initialValue) && Array.isArray(data)) {
                processedData = (data.length > 0 ? data : initialValue) as T;
              } else if (Array.isArray(initialValue)) {
                processedData = initialValue;
              } else {
                processedData = (data && Object.keys(data).length > 0 ? data : initialValue) as T;
              }
              
              setStoredValue(processedData);
              setLoaded(true);
              
              // OPTIMIZATION: Update cache when using shared promise
              // This ensures cache is populated even if the initiating component unmounts
              memoryCache[key] = {
                data: processedData,
                timestamp: now,
                userId: userId
              };
            }
            return;
          } catch (error) {
            // If the shared promise failed, fall through to start a new fetch
            // (but only if this component is still mounted)
            if (!isMounted) return;
            // Continue to fetch below
          }
        }

        // Cache miss or stale - fetch from Supabase
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
          let processedData: T;
          if (Array.isArray(initialValue) && Array.isArray(data)) {
            processedData = (data.length > 0 ? data : initialValue) as T;
          } else if (Array.isArray(initialValue)) {
            processedData = initialValue;
          } else {
            processedData = (data && Object.keys(data).length > 0 ? data : initialValue) as T;
          }
          
          setStoredValue(processedData);
          setLoaded(true);
          
          // OPTIMIZATION: Store in cache for future reads
          memoryCache[key] = {
            data: processedData,
            timestamp: now,
            userId: userId
          };
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
    
    // OPTIMIZATION: Update cache when data changes
    const userId = await getCurrentUserId();
    if (userId) {
      memoryCache[key] = {
        data: valueToStore,
        timestamp: Date.now(),
        userId: userId
      };
    }
    
    // Dispatch custom event to notify other components using the same key
    window.dispatchEvent(new CustomEvent(`user-storage-updated:${key}`, {
      detail: { key, value: valueToStore }
    }));
  };

  // Listen for updates to this key from other components
  useEffect(() => {
    const handleKeyUpdate = async (event: CustomEvent) => {
      if (event.detail && event.detail.value !== undefined) {
        const newValue = event.detail.value as T;
        setStoredValue(newValue);
        
        // OPTIMIZATION: Update cache when data changes from other components
        const userId = await getCurrentUserId();
        if (userId) {
          memoryCache[key] = {
            data: newValue,
            timestamp: Date.now(),
            userId: userId
          };
        }
      }
    };

    window.addEventListener(`user-storage-updated:${key}`, handleKeyUpdate as EventListener);
    
    return () => {
      window.removeEventListener(`user-storage-updated:${key}`, handleKeyUpdate as EventListener);
    };
  }, [key]);

  // Expose refresh function (clears cache and refetches)
  const refresh = () => {
    clearUserStorageCache(key);
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

