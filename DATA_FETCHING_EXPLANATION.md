# Data Fetching from Supabase - Complete Explanation

## Overview

This project uses a **two-layer data fetching strategy** for optimal performance:
1. **Instant Load**: In-memory cache (0ms) - shows data immediately
2. **Background Sync**: Supabase fetch (600ms+) - updates data in background

## Architecture

### 1. Core Components

#### `src/lib/supabase.ts`
- Creates and caches the Supabase client
- Configures authentication with localStorage persistence
- Single instance pattern (cached client)

#### `src/lib/supabaseDirect.ts`
- **`fetchAll<T>(tableName: string)`**: Main function that fetches all records from a table
- **`getFromSupabase<T>(table, filters?, columns?)`**: Lower-level function that builds queries
- **Key Features**:
  - Automatically filters by `user_id` for data isolation
  - Maps legacy table names to actual Supabase tables
  - Special handling for settings tables (wide rows)
  - Uses `SELECT *` by default (can be optimized with `columns` parameter)

#### `src/hooks/useUserStorage.ts`
- **Primary hook** used by all pages for data fetching
- **In-memory cache** with 5-minute TTL
- **Race condition prevention**: Multiple components can fetch the same key simultaneously
- **Automatic retry logic**: Retries up to 5 times if session not ready

## Data Fetching Flow Per Page

### Step-by-Step Process

```
1. Page Component Mounts
   ↓
2. useUserStorage Hook Called
   ↓
3. Check In-Memory Cache (0ms)
   ├─ Cache Hit → Return instantly (UI shows data immediately)
   └─ Cache Miss → Continue to step 4
   ↓
4. Check if Fetch Already in Progress
   ├─ Yes → Wait for existing promise (prevents duplicate fetches)
   └─ No → Start new fetch
   ↓
5. Wait for Supabase Session
   ├─ Session Ready → Continue
   └─ No Session → Retry (up to 5 times, 500ms delay)
   ↓
6. Call fetchAll() from supabaseDirect.ts
   ↓
7. Map Table Name (e.g., 'inventory_items' → 'inventory')
   ↓
8. Build Supabase Query:
   supabase
     .from(table)
     .select('*')
     .eq('user_id', userId)  // Automatic user isolation
     [+ optional filters]
   ↓
9. Execute Query → Get Data
   ↓
10. Store in In-Memory Cache
   ↓
11. Update Component State → UI Renders
```

## Example: How a Page Fetches Data

### Example 1: Vendors Page (`src/pages/Vendors.tsx`)

```typescript
// Step 1: Use the hook with a storage key
const { data: vendorsRaw, updateData: setVendors, loaded } = useUserStorage<Vendor[]>('vendors', []);

// Step 2: useUserStorage internally:
//   - Checks memoryCache['vendors']
//   - If not found, calls fetchAll('vendors')
//   - fetchAll maps 'vendors' → 'vendors' (no mapping needed)
//   - Calls getFromSupabase('vendors')
//   - Executes: supabase.from('vendors').select('*').eq('user_id', userId)
//   - Returns all vendor records for the current user

// Step 3: Background sync (optional, after initial load)
useEffect(() => {
  if (!loaded) return; // Wait for initial load
  
  const syncFromSupabase = async () => {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    // Direct query to Supabase
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('name', { ascending: true });
    
    await setVendors(data || []);
  };
  
  syncFromSupabase();
}, [loaded, setVendors]);
```

### Example 2: Index Page (`src/pages/Index.tsx`)

```typescript
// Uses getUserData (from userStorage.ts) which internally uses useUserStorage
const inventoryData = await getUserData<any[]>("inventory_items") || [];

// Flow:
// 1. getUserData('inventory_items')
// 2. Internally uses useUserStorage('inventory_items', [])
// 3. fetchAll('inventory_items')
// 4. Maps 'inventory_items' → 'inventory' (table mapping)
// 5. getFromSupabase('inventory')
// 6. Query: supabase.from('inventory').select('*').eq('user_id', userId)
// 7. Returns all inventory items
```

### Example 3: Reservations Page (`src/pages/Reservations.tsx`)

```typescript
// Same pattern as Vendors
const { data: reservationsRaw, updateData: setReservations, loaded } = 
  useUserStorage<Reservation[]>('reservations', []);

// Background sync with data transformation
useEffect(() => {
  if (!loaded) return;
  
  const syncFromSupabase = async () => {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    // Query with ordering
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .order('event_date', { ascending: true });
    
    // Transform data (parse JSON fields, add computed fields)
    const transformedData = (data || []).map((reservation: any) => ({
      ...reservation,
      category_preferences: parseJSON(reservation.category_preferences),
      color_preferences: parseJSON(reservation.color_preferences),
      is_overdue: computeOverdueStatus(reservation)
    }));
    
    await setReservations(transformedData);
  };
  
  syncFromSupabase();
}, [loaded, setReservations]);
```

## Table Name Mapping

The project uses legacy table names in the UI but maps them to actual Supabase tables:

```typescript
// From supabaseDirect.ts
const tableMap = {
  'gold_items': 'inventory',
  'jewelry_items': 'inventory',
  'stone_items': 'inventory',
  'stones_items': 'inventory',
  'artificial_items': 'inventory',
  'inventory_items': 'inventory',
  'businessSettings': 'settings',
  'paymentSettings': 'payment_settings',
  'notificationSettings': 'settings',
  'gold_rate_settings': 'gold_rates',
  'customer_transactions': 'payment_transactions',
};
```

## Important Notes

### 1. **No Pagination**
- **All records are fetched at once** - no server-side pagination
- Filtering happens **client-side** using `useMemo` or `filter()`
- This works well for small to medium datasets (< 10,000 records)

### 2. **User Isolation**
- **Every query automatically includes `.eq('user_id', userId)`**
- This ensures users only see their own data (Row Level Security)
- Implemented in `getFromSupabase()` function

### 3. **Caching Strategy**
- **In-memory cache**: 5-minute TTL
- **Cache invalidation**: When data is updated via `upsertToSupabase()` or `deleteFromSupabase()`
- **Cache keys**: Based on storage key (e.g., 'vendors', 'inventory_items')

### 4. **Query Pattern**
```typescript
// Standard query pattern used throughout:
supabase
  .from(tableName)
  .select('*')  // Fetches all columns
  .eq('user_id', userId)  // User isolation
  .order('column_name', { ascending: true })  // Optional ordering
  // No .limit() or .range() - fetches ALL records
```

### 5. **Performance Optimizations**
- **In-memory cache**: Reduces 600ms fetch to 0ms for cached data
- **Promise sharing**: Multiple components fetching same key share one promise
- **Background sync**: Initial load from cache, then sync in background
- **Session waiting**: Waits for Supabase session before fetching (prevents errors)

## When Data is Fetched

### On Page Load
1. Component mounts
2. `useUserStorage` hook runs
3. Checks cache → if miss, fetches from Supabase
4. Data loads (either instantly from cache or after Supabase query)

### Background Sync (Optional)
Many pages have a second `useEffect` that:
1. Waits for initial load to complete (`if (!loaded) return`)
2. Fetches fresh data from Supabase in background
3. Updates state without blocking UI

### On Data Updates
- When `upsertToSupabase()` or `deleteFromSupabase()` is called
- Cache is automatically cleared via `clearUserStorageCache(key)`
- Next read will fetch fresh data from Supabase

### On User Change
- Auth state change listener clears cache
- New user's data is fetched automatically

## Common Patterns Across Pages

### Pattern 1: Simple Fetch (Most Common)
```typescript
const { data: items, loaded } = useUserStorage<Item[]>('items', []);
// That's it! Data is automatically fetched on mount.
```

### Pattern 2: Fetch + Background Sync
```typescript
const { data: items, updateData: setItems, loaded } = useUserStorage<Item[]>('items', []);

useEffect(() => {
  if (!loaded) return;
  
  const syncFromSupabase = async () => {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) {
      await setItems(data || []);
    }
  };
  
  syncFromSupabase();
}, [loaded, setItems]);
```

### Pattern 3: Direct Query (Less Common)
```typescript
// Used when you need custom queries not covered by useUserStorage
const supabase = getSupabase();
const { data, error } = await supabase
  .from('sales')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 'pending')
  .limit(10);
```

## Summary

**Key Points:**
1. ✅ **All data fetching goes through `useUserStorage` hook**
2. ✅ **Automatic user isolation** (`.eq('user_id', userId)`)
3. ✅ **In-memory caching** for instant subsequent reads
4. ✅ **No pagination** - all records fetched at once
5. ✅ **Client-side filtering** after data is loaded
6. ✅ **Background sync** pattern for fresh data updates
7. ✅ **Table name mapping** for legacy compatibility

**When you navigate to a page:**
- Data is fetched automatically via `useUserStorage`
- If cached, shows instantly (0ms)
- If not cached, fetches from Supabase (~600ms)
- Background sync may update data after initial load

