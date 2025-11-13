/**
 * User-scoped storage utilities
 * Ensures each user only sees and manages their own data
 */

import { getSupabase } from './supabase';
import { idbGet, idbSet, idbDelete } from './indexedDb';

let cachedUserId: string | null = null;

/**
 * Get current user ID from Supabase session
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (cachedUserId) {
    return cachedUserId;
  }

  try {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user?.id) {
      cachedUserId = session.user.id;
      return cachedUserId;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

/**
 * Clear cached user ID (call on logout)
 */
export function clearUserIdCache(): void {
  cachedUserId = null;
}

/**
 * Get user-scoped storage key
 * Format: user:{userId}:{key}
 */
export async function getUserScopedKey(key: string): Promise<string | null> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return null;
  }
  return `user:${userId}:${key}`;
}

/**
 * Get user-scoped data from IndexedDB
 */
export async function getUserData<T>(key: string): Promise<T | undefined> {
  try {
    const scopedKey = await getUserScopedKey(key);
    if (!scopedKey) {
      // User not authenticated, return undefined silently
      return undefined;
    }
    return await idbGet<T>(scopedKey);
  } catch (error) {
    // Silent fail - just return undefined
    return undefined;
  }
}

/**
 * Set user-scoped data in IndexedDB
 */
export async function setUserData<T>(key: string, value: T): Promise<void> {
  try {
    const scopedKey = await getUserScopedKey(key);
    if (!scopedKey) {
      // User not authenticated, skip silently
      return;
    }
    await idbSet<T>(scopedKey, value);
  } catch (error) {
    console.error(`Error setting user data for key ${key}:`, error);
    throw error;
  }
}

/**
 * Delete user-scoped data from IndexedDB
 */
export async function deleteUserData(key: string): Promise<void> {
  try {
    const scopedKey = await getUserScopedKey(key);
    if (!scopedKey) {
      // User not authenticated, skip silently
      return;
    }
    await idbDelete(scopedKey);
  } catch (error) {
    console.error(`Error deleting user data for key ${key}:`, error);
    throw error;
  }
}

/**
 * Get all keys for current user
 * Useful for cleanup or migration
 */
export async function getUserKeys(): Promise<string[]> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return [];
  }

  try {
    const db = await import('./indexedDb').then(m => m.getDB());
    const tx = db.transaction('keyval', 'readonly');
    const store = tx.objectStore('keyval');
    const allKeys = await store.getAllKeys();
    
    const userPrefix = `user:${userId}:`;
    return (allKeys as string[])
      .filter(key => typeof key === 'string' && key.startsWith(userPrefix))
      .map(key => (key as string).replace(userPrefix, ''));
  } catch (error) {
    console.error('Error getting user keys:', error);
    return [];
  }
}

/**
 * Clear all data for current user
 * Useful for logout or account deletion
 */
export async function clearUserData(): Promise<void> {
  const keys = await getUserKeys();
  await Promise.all(keys.map(key => deleteUserData(key)));
  clearUserIdCache();
}

