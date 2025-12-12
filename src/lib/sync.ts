/**
 * SYNC DISABLED - All operations now go directly to Supabase
 * This file is kept for reference but all sync functionality is disabled
 * 
 * DO NOT USE enqueueChange, pushQueue, syncAll, or any sync functions
 * Use upsertToSupabase and deleteFromSupabase from supabaseDirect.ts instead
 */

// Export empty functions to prevent import errors
export async function enqueueChange() {
  console.warn('⚠️ enqueueChange is disabled. Use upsertToSupabase or deleteFromSupabase from supabaseDirect.ts instead');
}

export async function syncAll() {
  console.warn('⚠️ syncAll is disabled. All operations now go directly to Supabase');
}

export async function pushQueue() {
  console.warn('⚠️ pushQueue is disabled. All operations now go directly to Supabase');
}

export async function pushLocalChanges() {
  console.warn('⚠️ pushLocalChanges is disabled. All operations now go directly to Supabase');
}

export async function backfillAllFromIdb() {
  console.warn('⚠️ backfillAllFromIdb is disabled. All operations now go directly to Supabase');
}
