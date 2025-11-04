// Web API for mobile sync
import { getDB, idbGet, idbSet } from '@/lib/indexedDb';

export interface SyncChange {
  id: string;
  operation: 'insert' | 'update' | 'delete';
  table_name: string;
  data: any;
  created_at: string;
}

export interface SyncRequest {
  changes: SyncChange[];
  timestamp: string;
}

export interface SyncResponse {
  success: boolean;
  message: string;
  changes?: SyncChange[];
}

// Handle upload from mobile
export async function handleUpload(request: SyncRequest): Promise<SyncResponse> {
  try {
    const db = await getDB();
    
    for (const change of request.changes) {
      await applyChangeToIndexedDB(change);
    }
    
    return {
      success: true,
      message: `Successfully processed ${request.changes.length} changes`,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Handle download to mobile
export async function handleDownload(since: string): Promise<SyncResponse> {
  try {
    const changes = await getChangesSince(since);
    
    return {
      success: true,
      message: `Found ${changes.length} changes since ${since}`,
      changes,
    };
  } catch (error) {
    console.error('Download error:', error);
    return {
      success: false,
      message: `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function applyChangeToIndexedDB(change: SyncChange): Promise<void> {
  const { table_name, operation, data } = change;
  
  // Map mobile table names to web IndexedDB keys
  const tableMapping: { [key: string]: string } = {
    'jewelry': 'jewelry_items',
    'gold': 'gold_items',
    'stones': 'stones_items',
    'craftsmen': 'craftsmen',
    'staff': 'staff_employees',
    'customers': 'customers',
    'sales': 'pos_recentInvoices',
  };
  
  const indexedDbKey = tableMapping[table_name] || table_name;
  
  switch (operation) {
    case 'insert':
    case 'update':
      await upsertToIndexedDB(indexedDbKey, data);
      break;
    case 'delete':
      await deleteFromIndexedDB(indexedDbKey, data.id);
      break;
    default:
      console.warn(`Unknown operation: ${operation}`);
  }
}

async function upsertToIndexedDB(key: string, data: any): Promise<void> {
  const items = (await idbGet<any[]>(key)) || [];
  const existingIndex = items.findIndex(item => item.id === data.id);
  
  if (existingIndex >= 0) {
    items[existingIndex] = { ...items[existingIndex], ...data };
  } else {
    items.push(data);
  }
  
  await idbSet(key, items);
}

async function deleteFromIndexedDB(key: string, id: string): Promise<void> {
  const items = (await idbGet<any[]>(key)) || [];
  const filtered = items.filter(item => item.id !== id);
  await idbSet(key, filtered);
}

async function getChangesSince(since: string): Promise<SyncChange[]> {
  const changes: SyncChange[] = [];
  const sinceDate = new Date(since);
  
  // Get changes from all relevant tables
  const tables = ['jewelry_items', 'gold_items', 'stones_items', 'craftsmen', 'staff_employees', 'customers', 'pos_recentInvoices'];
  
  for (const table of tables) {
    const items = (await idbGet<any[]>(table)) || [];
    
    for (const item of items) {
      const itemDate = new Date(item.updated_at || item.created_at || '1970-01-01');
      
      if (itemDate > sinceDate) {
        changes.push({
          id: `${table}_${item.id}_${Date.now()}`,
          operation: 'update',
          table_name: getTableNameFromKey(table),
          data: item,
          created_at: item.updated_at || item.created_at || new Date().toISOString(),
        });
      }
    }
  }
  
  return changes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

function getTableNameFromKey(key: string): string {
  const reverseMapping: { [key: string]: string } = {
    'jewelry_items': 'jewelry',
    'gold_items': 'gold',
    'stones_items': 'stones',
    'craftsmen': 'craftsmen',
    'staff_employees': 'staff',
    'customers': 'customers',
    'pos_recentInvoices': 'sales',
  };
  
  return reverseMapping[key] || key;
}

