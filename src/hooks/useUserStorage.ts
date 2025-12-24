import { useEffect, useState, useRef } from 'react';
import { fetchAll, upsertToSupabase } from '@/lib/supabaseDirect';
import { getSupabase } from '@/lib/supabase';
import { getCurrentUserId } from '@/lib/userStorage';

const fetchingPromises: Record<string, Promise<any>> = {};

export function clearUserStorageCache(key: string): void {
  delete fetchingPromises[key];
}

export function clearAllUserStorageCache(): void {
  Object.keys(fetchingPromises).forEach(key => delete fetchingPromises[key]);
}

export function useUserStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const initialValueRef = useRef(initialValue);
  initialValueRef.current = initialValue;

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 500;

    const loadData = async (): Promise<void> => {
      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(() => {
              if (isMounted) {
                loadData();
              }
            }, retryDelay);
            return;
          }
          
          if (isMounted) {
            setStoredValue(initialValueRef.current);
            setLoaded(true);
          }
          return;
        }

        // For pos_cart and pos_customerName, keep in React state only (no persistence)
        if (key === 'pos_cart' || key === 'pos_customerName') {
          if (isMounted) {
            setStoredValue(initialValueRef.current);
            setLoaded(true);
          }
          return;
        }

        if (fetchingPromises[key]) {
          try {
            const data = await fetchingPromises[key];
            
            if (isMounted) {
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
            if (!isMounted) return;
          }
        }

        const fetchPromise = fetchAll<T>(key);
        fetchingPromises[key] = fetchPromise;
        
        let data: T;
        try {
          data = await fetchPromise;
        } finally {
          delete fetchingPromises[key];
        }
        
        if (isMounted) {
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
    const currentValue = storedValue !== undefined ? storedValue : initialValueRef.current;
    const valueToStore = value instanceof Function ? value(currentValue) : value;
    setStoredValue(valueToStore);
    
    // For pos_cart and pos_customerName, no persistence needed (React state only)
    if (key === 'pos_cart' || key === 'pos_customerName') {
      window.dispatchEvent(new CustomEvent(`user-storage-updated:${key}`, {
        detail: { key, value: valueToStore }
      }));
      return;
    }

    // Don't persist transformed inventory data (gold_items, jewelry_items, etc.)
    // These are read-only transformed views of the inventory table
    // They contain UI-specific fields (image, image_1, etc.) that don't exist in Supabase schema
    const readOnlyKeys = ['gold_items', 'jewelry_items', 'stone_items', 'stones_items', 'artificial_items'];
    if (readOnlyKeys.includes(key)) {
      window.dispatchEvent(new CustomEvent(`user-storage-updated:${key}`, {
        detail: { key, value: valueToStore }
      }));
      return;
    }

    // For arrays, upsert each item to Supabase
    if (Array.isArray(valueToStore)) {
      const tableMap: { [key: string]: string } = {
        'inventory_items': 'inventory',
        'craftsmen': 'craftsmen',
        'customers': 'customers',
        'staff': 'staff',
        'vendors': 'vendors',
        'reservations': 'reservations',
        'customer_transactions': 'payment_transactions',
        'attendance': 'attendance',
      };
      
      const table = tableMap[key];
      if (table) {
        try {
          // Upsert all items to Supabase
          for (const item of valueToStore) {
            await upsertToSupabase(table, item);
          }
        } catch (error) {
          console.error(`Error persisting ${key} to Supabase:`, error);
        }
      }
    } else if (typeof valueToStore === 'object' && valueToStore !== null) {
      // For settings objects, settings are handled by fetchAll which calls fetchSettings/fetchPaymentSettings
      // The actual persistence happens through BusinessSettings component using upsertToSupabase
      // We don't need to persist here as useUserStorage is primarily for reading
      // Settings updates should go through the BusinessSettings component
    }
    
    window.dispatchEvent(new CustomEvent(`user-storage-updated:${key}`, {
      detail: { key, value: valueToStore }
    }));
  };

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

  const refresh = () => {
    delete fetchingPromises[key];
    setRefreshTrigger(prev => prev + 1);
  };

  return { 
    data: (storedValue !== undefined ? storedValue : initialValueRef.current) as T, 
    updateData: setValue, 
    loaded, 
    refresh 
  };
}

