/**
 * Data Migration Utility - Single Source of Truth
 * 
 * Migrates data from type-specific tables (jewelry_items, gold_items, stones_items)
 * to a unified inventory_items table with item_type field.
 * 
 * Features:
 * - Safe migration with backup
 * - Rollback capability
 * - Idempotent (can run multiple times safely)
 */

import { getUserData, setUserData } from './userStorage';

export interface MigrationResult {
  success: boolean;
  migrated: number;
  errors: string[];
  backupCreated: boolean;
}

/**
 * Creates a backup of all existing data before migration
 */
async function createBackup(): Promise<boolean> {
  try {
    const [jewelry, gold, stones, inventory] = await Promise.all([
      getUserData<any[]>('jewelry_items') || [],
      getUserData<any[]>('gold_items') || [],
      getUserData<any[]>('stones_items') || [],
      getUserData<any[]>('inventory_items') || [],
    ]);

    const backup = {
      jewelry_items: jewelry,
      gold_items: gold,
      stones_items: stones,
      inventory_items: inventory,
      timestamp: new Date().toISOString(),
    };

    await setUserData('_migration_backup', backup);
    return true;
  } catch (error) {
    console.error('Failed to create backup:', error);
    return false;
  }
}

/**
 * Migrates data from type-specific tables to unified inventory_items
 */
export async function migrateToSingleSource(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migrated: 0,
    errors: [],
    backupCreated: false,
  };

  try {
    // Step 1: Create backup
    console.log('Creating backup...');
    result.backupCreated = await createBackup();
    if (!result.backupCreated) {
      result.errors.push('Failed to create backup');
      return result;
    }

    // Step 2: Load existing data
    const [jewelry, gold, stones, existingInventory] = await Promise.all([
      getUserData<any[]>('jewelry_items') || [],
      getUserData<any[]>('gold_items') || [],
      getUserData<any[]>('stones_items') || [],
      getUserData<any[]>('inventory_items') || [],
    ]);

    // Step 3: Create unified inventory with item_type
    const itemsMap = new Map<string, any>();

    // Add existing inventory_items (preserve sync data)
    existingInventory.forEach((item: any) => {
      if (item.id) {
        itemsMap.set(item.id, {
          ...item,
          // Ensure item_type exists
          item_type: item.item_type || 'jewelry',
        });
      }
    });

    // Migrate jewelry_items
    jewelry.forEach((item: any) => {
      if (item.id) {
        itemsMap.set(item.id, {
          ...item,
          item_type: 'jewelry',
          // Preserve all image fields
          image: item.image || item.image_1 || '',
          image_1: item.image_1 || item.image || '',
          image_2: item.image_2 || '',
          image_3: item.image_3 || '',
          image_4: item.image_4 || '',
          // Standardize field names
          inStock: item.inStock || item.stock || 0,
          stock: item.stock || item.inStock || 0,
          // Ensure sync fields
          updated_at: item.updated_at || new Date().toISOString(),
          created_at: item.created_at || new Date().toISOString(),
        });
      }
    });

    // Migrate gold_items
    gold.forEach((item: any) => {
      if (item.id) {
        itemsMap.set(item.id, {
          ...item,
          item_type: 'gold',
          // Preserve all image fields
          image: item.image || item.image_1 || '',
          image_1: item.image_1 || item.image || '',
          image_2: item.image_2 || '',
          image_3: item.image_3 || '',
          image_4: item.image_4 || '',
          // Standardize field names
          inStock: item.inStock || item.stock || 0,
          stock: item.stock || item.inStock || 0,
          // Gold-specific fields
          weight: item.weight || '',
          purity: item.purity || item.metal || '',
          // Ensure sync fields
          updated_at: item.updated_at || new Date().toISOString(),
          created_at: item.created_at || new Date().toISOString(),
        });
      }
    });

    // Migrate stones_items
    stones.forEach((item: any) => {
      if (item.id) {
        itemsMap.set(item.id, {
          ...item,
          item_type: 'stone',
          // Preserve all image fields
          image: item.image || item.image_1 || '',
          image_1: item.image_1 || item.image || '',
          image_2: item.image_2 || '',
          image_3: item.image_3 || '',
          image_4: item.image_4 || '',
          // Standardize field names
          inStock: item.inStock || item.stock || 0,
          stock: item.stock || item.inStock || 0,
          // Stone-specific fields
          carat: item.carat || '',
          clarity: item.clarity || '',
          cut: item.cut || '',
          // Ensure sync fields
          updated_at: item.updated_at || new Date().toISOString(),
          created_at: item.created_at || new Date().toISOString(),
        });
      }
    });

    // Step 4: Save unified inventory
    const unifiedInventory = Array.from(itemsMap.values());
    await setUserData('inventory_items', unifiedInventory);

    // Step 5: Mark migration as complete
    await setUserData('_migration_complete', {
      timestamp: new Date().toISOString(),
      version: '1.0',
      migratedCount: unifiedInventory.length,
    });

    result.success = true;
    result.migrated = unifiedInventory.length;

    console.log(`Migration complete: ${result.migrated} items migrated`);
    return result;
  } catch (error: any) {
    result.errors.push(error.message || 'Unknown error during migration');
    console.error('Migration failed:', error);
    return result;
  }
}

/**
 * Rollback migration by restoring from backup
 */
export async function rollbackMigration(): Promise<boolean> {
  try {
    const backup = await getUserData<any>('_migration_backup');
    if (!backup) {
      console.error('No backup found');
      return false;
    }

    // Restore all tables
    await setUserData('jewelry_items', backup.jewelry_items || []);
    await setUserData('gold_items', backup.gold_items || []);
    await setUserData('stones_items', backup.stones_items || []);
    await setUserData('inventory_items', backup.inventory_items || []);

    // Remove migration markers
    await setUserData('_migration_complete', null);
    await setUserData('_migration_backup', null);

    console.log('Rollback complete');
    return true;
  } catch (error) {
    console.error('Rollback failed:', error);
    return false;
  }
}

/**
 * Check if migration has been completed
 */
export async function isMigrationComplete(): Promise<boolean> {
  try {
    const migrationStatus = await getUserData<any>('_migration_complete');
    return !!migrationStatus;
  } catch {
    return false;
  }
}

/**
 * Get migration status
 */
export async function getMigrationStatus(): Promise<{
  complete: boolean;
  timestamp?: string;
  migratedCount?: number;
}> {
  try {
    const status = await getUserData<any>('_migration_complete');
    return {
      complete: !!status,
      timestamp: status?.timestamp,
      migratedCount: status?.migratedCount,
    };
  } catch {
    return { complete: false };
  }
}

