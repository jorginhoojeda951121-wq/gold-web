// Client-side sync handler that saves data to web app's IndexedDB
import { idbGet, idbSet } from '@/lib/indexedDb';

export interface SyncChange {
  operation: 'insert' | 'update' | 'delete';
  table_name: string;
  data: any;
  id: string;
}

export interface SyncRequest {
  changes: SyncChange[];
  timestamp: string;
}

export interface SyncResponse {
  success: boolean;
  message: string;
  processed_changes?: SyncChange[];
}

// Map mobile table names to web app keys
const TABLE_KEY_MAPPING: Record<string, string> = {
  'jewelry': 'jewelry_items',
  'gold': 'gold_items',
  'stones': 'stones_items',
  'craftsmen': 'craftsmen',
  'staff': 'staff_employees',
  'customers': 'customers',
  'sales': 'pos_recentInvoices'
};

// Convert mobile data format to web app format
function convertMobileToWebData(tableName: string, mobileData: any): any {
  const key = TABLE_KEY_MAPPING[tableName];
  if (!key) return mobileData;

  // Convert jewelry data
  if (tableName === 'jewelry') {
    return {
      id: mobileData.id,
      name: mobileData.name,
      type: mobileData.type,
      price: mobileData.price,
      inStock: mobileData.in_stock || 0,
      gemstone: mobileData.gemstone || '',
      carat: mobileData.carat || 0,
      metal: mobileData.metal || '',
      description: mobileData.description || '',
      image: mobileData.image_url || '💍',
      created_at: mobileData.created_at,
      updated_at: mobileData.updated_at
    };
  }

  // Convert gold data
  if (tableName === 'gold') {
    return {
      id: mobileData.id,
      name: mobileData.name,
      purity: mobileData.purity,
      weight: mobileData.weight,
      pricePerGram: mobileData.price_per_gram,
      totalPrice: mobileData.total_price,
      inStock: mobileData.in_stock || 0,
      supplier: mobileData.supplier || '',
      description: mobileData.description || '',
      image: mobileData.image_url || '🥇',
      created_at: mobileData.created_at,
      updated_at: mobileData.updated_at
    };
  }

  // Convert craftsmen data
  if (tableName === 'craftsmen') {
    return {
      id: mobileData.id,
      name: mobileData.name,
      specialization: mobileData.specialization,
      experienceYears: mobileData.experience_years,
      phone: mobileData.phone,
      email: mobileData.email,
      hourlyRate: mobileData.hourly_rate,
      address: mobileData.address,
      skills: mobileData.skills,
      created_at: mobileData.created_at,
      updated_at: mobileData.updated_at
    };
  }

  // Convert staff data
  if (tableName === 'staff') {
    return {
      id: mobileData.id,
      name: mobileData.name,
      role: mobileData.role,
      department: mobileData.department,
      phone: mobileData.phone,
      email: mobileData.email,
      salary: mobileData.salary,
      address: mobileData.address,
      emergencyContact: mobileData.emergency_contact,
      emergencyPhone: mobileData.emergency_phone,
      created_at: mobileData.created_at,
      updated_at: mobileData.updated_at
    };
  }

  // Convert customers data
  if (tableName === 'customers') {
    return {
      id: mobileData.id,
      name: mobileData.name,
      email: mobileData.email,
      phone: mobileData.phone,
      address: mobileData.address,
      creditLimit: mobileData.credit_limit || 0,
      currentBalance: mobileData.current_balance || 0,
      totalPurchases: mobileData.total_purchases || 0,
      lastPurchaseDate: mobileData.last_purchase_date,
      status: mobileData.status || 'active',
      created_at: mobileData.created_at,
      updated_at: mobileData.updated_at
    };
  }

  // Default: return as-is
  return mobileData;
}

export async function handleUpload(request: SyncRequest): Promise<SyncResponse> {
  try {
    console.log('🔄 Processing sync upload from mobile...');
    console.log('📊 Changes received:', request.changes.length);

    if (!request.changes || request.changes.length === 0) {
      return {
        success: true,
        message: 'No changes to process',
        processed_changes: []
      };
    }

    const processedChanges: SyncChange[] = [];

    for (const change of request.changes) {
      try {
        const webKey = TABLE_KEY_MAPPING[change.table_name];
        if (!webKey) {
          console.log(`⚠️ Unknown table: ${change.table_name}, skipping`);
          continue;
        }

        // Get current data from web app's IndexedDB
        const currentData = await idbGet(webKey) || [];
        
        if (change.operation === 'insert') {
          // Convert mobile data to web format
          const webData = convertMobileToWebData(change.table_name, change.data);
          
          // Add to existing data
          const updatedData = [...currentData, webData];
          await idbSet(webKey, updatedData);
          
          console.log(`✅ Added ${change.table_name} item: ${webData.name}`);
          processedChanges.push(change);
          
        } else if (change.operation === 'update') {
          // Convert mobile data to web format
          const webData = convertMobileToWebData(change.table_name, change.data);
          
          // Update existing item
          const updatedData = currentData.map((item: any) => 
            item.id === change.data.id ? webData : item
          );
          await idbSet(webKey, updatedData);
          
          console.log(`✅ Updated ${change.table_name} item: ${webData.name}`);
          processedChanges.push(change);
          
        } else if (change.operation === 'delete') {
          // Remove item
          const updatedData = currentData.filter((item: any) => item.id !== change.data.id);
          await idbSet(webKey, updatedData);
          
          console.log(`✅ Deleted ${change.table_name} item: ${change.data.id}`);
          processedChanges.push(change);
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${change.table_name} change:`, error);
      }
    }

    console.log(`✅ Successfully processed ${processedChanges.length} changes`);
    
    return {
      success: true,
      message: `Successfully processed ${processedChanges.length} changes`,
      processed_changes: processedChanges
    };
    
  } catch (error) {
    console.error('❌ Upload processing error:', error);
    return {
      success: false,
      message: `Upload processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function handleDownload(since: string): Promise<SyncResponse> {
  try {
    console.log(`📥 Processing sync download since: ${since}`);
    
    // For now, return empty changes since we're primarily handling uploads
    // In a real implementation, you'd fetch changes from web app's IndexedDB
    
    return {
      success: true,
      message: `Found 0 changes since ${since}`,
      processed_changes: []
    };
    
  } catch (error) {
    console.error('❌ Download processing error:', error);
    return {
      success: false,
      message: `Download processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}