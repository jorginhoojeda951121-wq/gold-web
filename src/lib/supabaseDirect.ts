/**
 * Direct Supabase operations - NO SYNC, NO QUEUE
 * All operations go directly to Supabase database
 * OPTIMIZED: Clears cache on updates for instant UI updates
 */

import { getSupabase } from './supabase';
import { getCurrentUserId } from './userStorage';
import { clearUserStorageCache } from '@/hooks/useUserStorage';

/**
 * Insert or update a record directly in Supabase
 */
export async function upsertToSupabase(
  table: string,
  data: any
): Promise<void> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error('User must be authenticated');
  }

  // Map old table names to actual Supabase table names
  const tableMap: { [key: string]: string } = {
    'gold_items': 'inventory',
    'jewelry_items': 'inventory',
    'stone_items': 'inventory',
    'stones_items': 'inventory',
    'artificial_items': 'inventory',
    'inventory_items': 'inventory',
    'businessSettings': 'settings',
    'paymentSettings': 'payment_settings',
    'gold_rate_settings': 'gold_rates',
  };

  const actualTable = tableMap[table] || table;

  // Special handling for settings table (wide row) and payment_settings (wide row)
  if (actualTable === 'settings') {
    return upsertSettings(data, userId);
  }
  if (actualTable === 'payment_settings') {
    return upsertPaymentSettings(data, userId);
  }

  // Ensure user_id is set
  const record = {
    ...data,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  // Remove fields that don't exist in database
  const cleanedRecord = cleanRecordForTable(actualTable, record);

  // Handle tables without id field
  if (!cleanedRecord.id && actualTable !== 'settings') {
    cleanedRecord.id = data.id || `${actualTable}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  const { error } = await supabase
    .from(actualTable)
    .upsert(cleanedRecord, { onConflict: 'id' });

  if (error) {
    console.error(`Error upserting to ${actualTable}:`, error);
    throw error;
  }

  // Clear any in-progress fetch promises for related keys
  // This ensures fresh data is fetched on next read
  const keyMap: { [table: string]: string[] } = {
    'inventory': ['gold_items', 'jewelry_items', 'stone_items', 'stones_items', 'artificial_items', 'inventory_items'],
    'staff': ['staff'],
    'customers': ['customers'],
    'craftsmen': ['craftsmen'],
    'settings': ['businessSettings', 'notificationSettings'],
    'payment_settings': ['paymentSettings'],
    'gold_rates': ['gold_rate_settings'],
    'reservations': ['reservations'],
  };

  const keysToClear = keyMap[actualTable] || [table];
  keysToClear.forEach(key => clearUserStorageCache(key));
}

/**
 * Special handler for settings table (wide row per user_id)
 * Matches new schema: columns like business_address, business_phone, etc.,
 * with primary key on user_id.
 */
async function upsertSettings(data: any, userId: string): Promise<void> {
  const supabase = getSupabase();

  // Columns that exist in the new settings table (all lowercase in Postgres)
  const allowedColumns = new Set([
    'business_address',
    'business_businessname',
    'business_currency',
    'business_email',
    'business_gstnumber',
    'business_phone',
    'business_timezone',
    'updated_at'
  ]);

  const toColumnName = (key: string) => key.toLowerCase();

  // Build a single-row payload keyed by user_id
  const record: Record<string, any> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  const addEntry = (key: string, value: any) => {
    const column = toColumnName(key);
    if (!allowedColumns.has(column)) return;
    // Store non-string values as JSON text to avoid losing booleans/numbers
    record[column] = typeof value === 'string' ? value : JSON.stringify(value);
  };

  if (data && data.key && data.value !== undefined) {
    addEntry(data.key, data.value);
  } else if (data && typeof data === 'object') {
    Object.entries(data).forEach(([key, value]) => addEntry(key, value));
  }

  // If nothing matched the schema, do nothing to avoid errors
  const hasUpdatableFields = Object.keys(record).some(
    (key) => key !== 'user_id' && key !== 'updated_at'
  );
  if (!hasUpdatableFields) {
    return;
  }

  const { error } = await supabase
    .from('settings')
    .upsert(record, { onConflict: 'user_id' });

  if (error) {
    console.error('Error upserting settings:', error);
    throw error;
  }

  // Clear any in-progress fetch promises for settings keys
  clearUserStorageCache('businessSettings');
  clearUserStorageCache('notificationSettings');
}

/**
 * Handler for payment_settings table (wide row per user_id)
 */
async function upsertPaymentSettings(data: any, userId: string): Promise<void> {
  const supabase = getSupabase();

  const allowedColumns = new Set([
    'upi_id',
    'business_name',
    'gst_number',
    'bank_account',
    'ifsc_code',
    'updated_at'
  ]);

  const keyMap: Record<string, string> = {
    upiId: 'upi_id',
    businessName: 'business_name',
    gstNumber: 'gst_number',
    bankAccount: 'bank_account',
    ifscCode: 'ifsc_code',
  };

  const toColumnName = (key: string) => keyMap[key] || key.toLowerCase();

  const record: Record<string, any> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  const addEntry = (key: string, value: any) => {
    const column = toColumnName(key);
    if (!allowedColumns.has(column)) return;
    record[column] = typeof value === 'string' ? value : JSON.stringify(value);
  };

  if (data && data.key && data.value !== undefined) {
    addEntry(data.key, data.value);
  } else if (data && typeof data === 'object') {
    Object.entries(data).forEach(([key, value]) => addEntry(key, value));
  }

  const hasUpdatableFields = Object.keys(record).some(
    (key) => key !== 'user_id' && key !== 'updated_at'
  );
  if (!hasUpdatableFields) {
    return;
  }

  const { error } = await supabase
    .from('payment_settings')
    .upsert(record, { onConflict: 'user_id' });

  if (error) {
    console.error('Error upserting payment settings:', error);
    throw error;
  }

  // Clear any in-progress fetch promises for payment settings
  clearUserStorageCache('paymentSettings');
}

/**
 * Delete a record directly from Supabase
 */
export async function deleteFromSupabase(
  table: string,
  id: string
): Promise<void> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error('User must be authenticated');
  }

  // Map old table names to actual Supabase table names
  const tableMap: { [key: string]: string } = {
    'gold_items': 'inventory',
    'jewelry_items': 'inventory',
    'stone_items': 'inventory',
    'stones_items': 'inventory',
    'artificial_items': 'inventory',
    'inventory_items': 'inventory',
    'businessSettings': 'settings',
    'gold_rate_settings': 'gold_rates',
  };

  const actualTable = tableMap[table] || table;

  const { error } = await supabase
    .from(actualTable)
    .delete()
    .eq('id', id)
    .eq('user_id', userId); // Ensure user isolation

  if (error) {
    console.error(`Error deleting from ${actualTable}:`, error);
    throw error;
  }

  // Clear any in-progress fetch promises for related keys
  // This ensures fresh data is fetched on next read
  const keyMap: { [table: string]: string[] } = {
    'inventory': ['gold_items', 'jewelry_items', 'stone_items', 'stones_items', 'artificial_items', 'inventory_items'],
    'staff': ['staff'],
    'customers': ['customers'],
    'craftsmen': ['craftsmen'],
    'settings': ['businessSettings', 'notificationSettings'],
    'payment_settings': ['paymentSettings'],
    'gold_rates': ['gold_rate_settings'],
    'reservations': ['reservations'],
  };

  const keysToClear = keyMap[actualTable] || [table];
  keysToClear.forEach(key => clearUserStorageCache(key));
}

/**
 * Clean record to match actual database schema
 */
function cleanRecordForTable(table: string, record: any): any {
  const cleaned = { ...record };

  // Remove attributes field - doesn't exist in inventory table
  if (table === 'inventory' || table === 'inventory_items') {
    delete cleaned.attributes;

    // Remove stone-specific fields that don't exist in inventory table
    delete cleaned.clarity;
    delete cleaned.color;
    delete cleaned.size;
    delete cleaned.cut;
    delete cleaned.carat;
    delete cleaned.gemstone;
    delete cleaned.metal;
    delete cleaned.purity;
    delete cleaned.weight;
    delete cleaned.gross_weight;
    delete cleaned.net_weight;
    delete cleaned.making_charges;
    delete cleaned.is_artificial;

    // Map inventory_items fields to inventory table FIRST (before setting defaults)
    if (cleaned.item_type) {
      // Normalize category values to match database constraint
      // Allowed: 'gold', 'silver', 'platinum', 'stones', 'jewelry', 'artificial', 'equipment', 'other'
      let normalizedCategory = cleaned.item_type.toLowerCase();
      if (normalizedCategory === 'stone') {
        normalizedCategory = 'stones'; // Database uses plural 'stones'
      } else if (normalizedCategory === 'precious') {
        normalizedCategory = 'stones'; // Precious stones → stones
      }
      cleaned.category = normalizedCategory;
      delete cleaned.item_type;
    }

    // Also normalize category if it's set directly
    if (cleaned.category) {
      const normalized = cleaned.category.toLowerCase();
      if (normalized === 'stone') {
        cleaned.category = 'stones';
      } else if (normalized === 'precious') {
        cleaned.category = 'stones';
      }
    }

    // Map 'type' field to 'subcategory' (inventory table requires subcategory)
    if (cleaned.type) {
      cleaned.subcategory = cleaned.type;
      delete cleaned.type;
    }

    // Ensure subcategory has a value (required by database)
    // This check happens AFTER mapping item_type to category
    if (!cleaned.subcategory) {
      // Provide default based on category
      if (cleaned.category === 'gold') {
        cleaned.subcategory = 'Gold Bar';
      } else if (cleaned.category === 'stones' || cleaned.category === 'stone') {
        cleaned.subcategory = 'Gemstone';
      } else if (cleaned.category === 'artificial') {
        cleaned.subcategory = 'Artificial Stone';
      } else {
        cleaned.subcategory = 'General';
      }
    }
    if (cleaned.inStock !== undefined) {
      cleaned.stock = cleaned.inStock;
      delete cleaned.inStock;
    }
    // Map image fields - inventory table uses image_1, image_2, image_3, image_4
    // If we have 'image' field, map it to image_1 if image_1 doesn't exist
    if (cleaned.image && !cleaned.image_1) {
      cleaned.image_1 = cleaned.image;
    }
    // Remove old 'image_url' field if it exists (migration renamed it to image_1)
    delete cleaned.image_url;
    // Keep image_1, image_2, image_3, image_4 as they are supported by inventory table
    // Remove 'image' field after mapping to image_1
    if (cleaned.image_1) {
      delete cleaned.image;
    }
  }

  // Remove assigned_materials from craftsmen
  if (table === 'craftsmen') {
    delete cleaned.assigned_materials;
    delete cleaned.assignedMaterials;
  }

  // Clean sales table - remove fields that don't exist in schema
  if (table === 'sales') {
    // Remove old/invalid fields that don't exist in actual schema
    delete cleaned.invoice_number; // Not in schema
    delete cleaned.sale_date; // Use created_at instead
    delete cleaned.subtotal; // Not in schema
    delete cleaned.amount_paid; // Not in schema
    delete cleaned.balance_due; // Not in schema
  }

  // Map businessSettings to settings
  if (table === 'settings' || table === 'businessSettings') {
    // Settings table uses key-value pairs - handled in upsertSettings
    return cleaned;
  }

  return cleaned;
}

/**
 * Get records from Supabase
 * 
 * NOTE: Uses SELECT * for compatibility with complex data structures.
 * Most components need all fields (id, name, price, stock, images, category, etc.).
 * 
 * For future optimization: If you know exactly which columns you need, you can use:
 * .select('id, name, price, stock') instead of .select('*')
 * This would reduce data transfer size for large tables.
 */
export async function getFromSupabase<T>(
  table: string,
  filters?: { [key: string]: any },
  columns?: string // Optional: specify columns to fetch (e.g., 'id, name, price')
): Promise<T[]> {
  console.log("getFromSupabase table : ", table);

  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error('User must be authenticated');
  }

  let query = supabase
    .from(table)
    .select(columns || '*') // Use specified columns or all
    .eq('user_id', userId);

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Error fetching from ${table}:`, error);
    throw error;
  }

  return (data || []) as T[];
}

/**
 * Get all records from Supabase (for useUserStorage compatibility)
 */
export async function fetchAll<T>(tableName: string): Promise<T> {
  // Local-only storage keys (not database tables) - return empty values
  if (tableName === 'pos_cart' || tableName === 'pos_customerName') {
    return (tableName === 'pos_cart' ? [] : '') as T;
  }

  // Special handling for recent invoices - fetch from sales table, limit to 5 most recent
  if (tableName === 'pos_recentInvoices') {
    return fetchRecentInvoices<T>() as Promise<T>;
  }

  // Map old table names to actual Supabase table names
  const tableMap: { [key: string]: string } = {
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
    'customer_transactions': 'payment_transactions', // Map to correct table name
  };

  const actualTable = tableMap[tableName] || tableName;

  // Special handling for settings table
  if (actualTable === 'settings') {
    return fetchSettings<T>(tableName) as Promise<T>;
  }
  // Special handling for payment settings
  if (actualTable === 'payment_settings') {
    return fetchPaymentSettings<T>() as Promise<T>;
  }
  console.log("fetchAll actualTable : ", actualTable);
  // For inventory table, return all items (filtering happens in components)
  const data = await getFromSupabase<any>(actualTable);
  return (Array.isArray(data) ? data : []) as T;
}

/**
 * Fetch recent invoices from sales table (5 most recent)
 * Transforms sales table data to match Invoice interface
 */
async function fetchRecentInvoices<T>(): Promise<T> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error('User must be authenticated');
  }

  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching recent invoices:', error);
    throw error;
  }

  // Transform sales table data to match Invoice interface
  const invoices = (data || []).map((sale: any) => ({
    id: sale.id,
    items: [], // Items are in sale_items table, not fetched here for performance
    subtotal: (sale.total_amount || 0) - (sale.tax_amount || 0),
    tax: sale.tax_amount || 0,
    total: sale.total_amount || 0,
    date: sale.created_at || new Date().toISOString(),
    customerName: sale.customer_name || null,
    paymentMethod: sale.payment_method || 'Cash',
  }));

  return invoices as T;
}

/**
 * Fetch settings and map from wide row to object format
 */
async function fetchSettings<T>(tableName: string): Promise<T> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error('User must be authenticated');
  }

  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') { // 116: no rows found for single()
    console.error('Error fetching settings:', error);
    throw error;
  }

  if (!data) {
    return {} as T;
  }

  // Determine prefix based on tableName
  let prefix = '';
  if (tableName === 'businessSettings') {
    prefix = 'business_';
  } else if (tableName === 'notificationSettings') {
    prefix = 'notification_';
  }

  const result: any = {};

  Object.entries(data).forEach(([key, value]) => {
    if (!prefix || key.startsWith(prefix)) {
      const cleanKey = prefix ? key.replace(prefix, '') : key;
      // map snake/lowercase keys back to camelCase expected by UI
      const keyMap: Record<string, string> = {
        businessname: 'businessName',
        gstnumber: 'gstNumber',
        phone: 'phone',
        email: 'email',
        address: 'address',
        currency: 'currency',
        timezone: 'timezone',
      };
      const mappedKey = keyMap[cleanKey] || cleanKey;
      // Try to parse JSON text
      let parsed = value;
      if (typeof value === 'string') {
        try {
          parsed = JSON.parse(value);
        } catch {
          parsed = value;
        }
      }
      result[mappedKey] = parsed;
    }
  });

  return result as T;
}

/**
 * Fetch payment settings (wide row)
 */
async function fetchPaymentSettings<T>(): Promise<T> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error('User must be authenticated');
  }

  const { data, error } = await supabase
    .from('payment_settings')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching payment settings:', error);
    throw error;
  }

  if (!data) {
    return {} as T;
  }

  const result: any = {};
  Object.entries(data).forEach(([key, value]) => {
    if (key === 'user_id' || key === 'id' || key === 'created_at' || key === 'updated_at') {
      return;
    }
    let parsed = value;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
      } catch {
        parsed = value;
      }
    }
    // map snake_case columns back to camelCase used in UI
    switch (key) {
      case 'upi_id':
        result.upiId = parsed;
        break;
      case 'business_name':
        result.businessName = parsed;
        break;
      case 'gst_number':
        result.gstNumber = parsed;
        break;
      case 'bank_account':
        result.bankAccount = parsed;
        break;
      case 'ifsc_code':
        result.ifscCode = parsed;
        break;
      default:
        result[key] = parsed;
    }
  });

  return result as T;
}

/**
 * Alias for backward compatibility
 */
export const upsertDirect = upsertToSupabase;

/**
 * Alias for backward compatibility
 */
export const deleteDirect = deleteFromSupabase;

/**
 * Alias for backward compatibility (insert is same as upsert)
 */
export const insertDirect = upsertToSupabase;
