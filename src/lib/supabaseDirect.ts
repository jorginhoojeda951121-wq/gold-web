import { getSupabase } from './supabase';
import { getCurrentUserId } from './userStorage';
import { clearUserStorageCache } from '@/hooks/useUserStorage';

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

  if (actualTable === 'settings') {
    return upsertSettings(data, userId);
  }
  if (actualTable === 'payment_settings') {
    return upsertPaymentSettings(data, userId);
  }

  const record = {
    ...data,
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  const cleanedRecord = cleanRecordForTable(actualTable, record);

  if (!cleanedRecord.id && actualTable !== 'settings') {
    cleanedRecord.id = data.id || `${actualTable}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
console.log("cleanedRecord", cleanedRecord);

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
    'inventory': ['gold_items', 'jewelry_items', 'stone_items', 'stones_items', 'artificial_items', 'artificial_stones_items', 'inventory_items'],
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

async function upsertSettings(data: any, userId: string): Promise<void> {
  const supabase = getSupabase();

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
    .from('settings')
    .upsert(record, { onConflict: 'user_id' });

  if (error) {
    console.error('Error upserting settings:', error);
    throw error;
  }

  clearUserStorageCache('businessSettings');
    clearUserStorageCache('notificationSettings');
}

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

  clearUserStorageCache('paymentSettings');
}

export async function deleteFromSupabase(
  table: string,
  id: string
): Promise<void> {
  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error('User must be authenticated');
  }

  const tableMap: { [key: string]: string } = {
    'gold_items': 'inventory',
    'jewelry_items': 'inventory',
    'stone_items': 'inventory',
    'stones_items': 'inventory',
    'artificial_items': 'inventory',
    'artificial_stones_items': 'inventory',
    'inventory_items': 'inventory',
    'businessSettings': 'settings',
    'gold_rate_settings': 'gold_rates',
  };

  const actualTable = tableMap[table] || table;

  const { error } = await supabase
    .from(actualTable)
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error(`Error deleting from ${actualTable}:`, error);
    throw error;
  }

  // Clear any in-progress fetch promises for related keys
  // This ensures fresh data is fetched on next read
  const keyMap: { [table: string]: string[] } = {
    'inventory': ['gold_items', 'jewelry_items', 'stone_items', 'stones_items', 'artificial_items', 'artificial_stones_items', 'inventory_items'],
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

function cleanRecordForTable(table: string, record: any): any {
  const cleaned = { ...record };

  if (table === 'inventory' || table === 'inventory_items') {
    delete cleaned.attributes;

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

    if (cleaned.item_type) {
      let normalizedCategory = cleaned.item_type.toLowerCase();
      if (normalizedCategory === 'stone') {
        normalizedCategory = 'stones';
      } else if (normalizedCategory === 'precious') {
        normalizedCategory = 'stones';
      }
      cleaned.category = normalizedCategory;
      delete cleaned.item_type;
    }

    if (cleaned.category) {
      const normalized = cleaned.category.toLowerCase();
      if (normalized === 'stone') {
        cleaned.category = 'stones';
      } else if (normalized === 'precious') {
        cleaned.category = 'stones';
      }
    }

    if (cleaned.type) {
      cleaned.subcategory = cleaned.type;
      delete cleaned.type;
    }

    if (!cleaned.subcategory) {
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
    if (cleaned.image && !cleaned.image_1) {
      cleaned.image_1 = cleaned.image;
    }
    delete cleaned.image_url;
    if (cleaned.image_1) {
      delete cleaned.image;
    }
  }

  if (table === 'craftsmen') {
    delete cleaned.assigned_materials;
    delete cleaned.assignedMaterials;
  }

  if (table === 'sales') {
    delete cleaned.invoice_number;
    delete cleaned.sale_date;
    delete cleaned.subtotal;
    delete cleaned.amount_paid;
    delete cleaned.balance_due;
  }

  if (table === 'settings' || table === 'businessSettings') {
    return cleaned;
  }

  return cleaned;
}

export async function getFromSupabase<T>(
  table: string,
  filters?: { [key: string]: any },
  columns?: string
): Promise<T[]> {
  console.log("getFromSupabase table : ", table);

  const supabase = getSupabase();
  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error('User must be authenticated');
  }

  let query = supabase
    .from(table)
    .select(columns || '*')
    .eq('user_id', userId);

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  const { data, error } = await query;

  if (error) {
    if (error.code === 'PGRST205' || error.code === 'PGRST301') {
      console.warn(`Table '${table}' not found in schema. Returning empty array.`);
      return [] as T[];
    }
    console.error(`Error fetching from ${table}:`, error);
    throw error;
  }

  return (data || []) as T[];
}

export async function fetchAll<T>(tableName: string): Promise<T> {
  if (tableName === 'pos_cart' || tableName === 'pos_customerName') {
    return (tableName === 'pos_cart' ? [] : '') as T;
  }

  if (tableName === 'pos_recentInvoices') {
    return fetchRecentInvoices<T>() as Promise<T>;
  }

  const tableMap: { [key: string]: string } = {
    'gold_items': 'inventory',
    'jewelry_items': 'inventory',
    'stone_items': 'inventory',
    'stones_items': 'inventory',
    'artificial_items': 'inventory',
    'artificial_stones_items': 'inventory',
    'inventory_items': 'inventory',
    'businessSettings': 'settings',
    'paymentSettings': 'payment_settings',
    'notificationSettings': 'settings',
    'gold_rate_settings': 'gold_rates',
    'customer_transactions': 'payment_transactions',
  };

  const actualTable = tableMap[tableName] || tableName;

  if (actualTable === 'settings') {
    return fetchSettings<T>(tableName) as Promise<T>;
  }
  if (actualTable === 'payment_settings') {
    return fetchPaymentSettings<T>() as Promise<T>;
  }
  const data = await getFromSupabase<any>(actualTable);
  return (Array.isArray(data) ? data : []) as T;
}

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

  const invoices = (data || []).map((sale: any) => ({
    id: sale.id,
    items: [],
    subtotal: (sale.total_amount || 0) - (sale.tax_amount || 0),
    tax: sale.tax_amount || 0,
    total: sale.total_amount || 0,
    date: sale.created_at || new Date().toISOString(),
    customerName: sale.customer_name || null,
    paymentMethod: sale.payment_method || 'Cash',
  }));

  return invoices as T;
}

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

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching settings:', error);
    throw error;
  }

  if (!data) {
    return {} as T;
  }

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

export const upsertDirect = upsertToSupabase;
export const deleteDirect = deleteFromSupabase;
export const insertDirect = upsertToSupabase;
