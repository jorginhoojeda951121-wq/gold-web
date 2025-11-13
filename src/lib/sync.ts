import { getSupabase } from '@/lib/supabase';
import { idbGet, idbSet, getDB } from '@/lib/indexedDb';
import { getCurrentUserId, getUserData, setUserData } from '@/lib/userStorage';

type Upserter<T> = (row: T) => Promise<void> | void;
type Deleter = (id: string) => Promise<void> | void;

// Map web app IndexedDB table names to Supabase table names
const WEB_TO_SUPABASE_MAPPING: Record<string, string> = {
	'inventory_items': 'inventory',
	'gold_items': 'gold',
	'jewelry_items': 'jewelry',
	'stones_items': 'stones',
	'staff_employees': 'staff',
	'customer_transactions': 'customer_ledger',
	'pos_recentInvoices': 'sales', // Special case - handled separately with sale_items
	'customers': 'customers',
	'craftsmen': 'craftsmen',
	// Additional tables - use same names for consistency
	'categories': 'categories',
	'products': 'products',
	'attendance': 'attendance',
	'performance': 'performance',
	'training': 'training',
	'salary_rules': 'salary_rules',
	'materials': 'materials',
	'materials_assigned': 'materials_assigned',
	'projects': 'projects',
	'transactions': 'transactions',
	'settings': 'settings',
	// Vendor management tables
	'vendors': 'vendors',
	'purchase_orders': 'purchase_orders',
	'purchase_order_items': 'purchase_order_items',
	'supplier_invoices': 'supplier_invoices',
	'vendor_payments': 'vendor_payments',
	// Reservations tables
	'reservations': 'reservations',
	'reservation_items': 'reservation_items',
	// Google Calendar settings
	'google_calendar_settings': 'google_calendar_settings',
	// Subscription management
	'user_subscriptions': 'user_subscriptions',
	'subscription_payments': 'subscription_payments',
};

// Map Supabase table names to web app IndexedDB table names
const SUPABASE_TO_WEB_MAPPING: Record<string, string> = {
	'inventory': 'inventory_items',
	'gold': 'gold_items',
	'jewelry': 'jewelry_items',
	'stones': 'stones_items',
	'staff': 'staff_employees',
	'customer_ledger': 'customer_transactions',
	'sales': 'pos_recentInvoices', // Special case - handled separately
	'sale_items': 'sale_items', // Local store for sale items
	'customers': 'customers',
	'craftsmen': 'craftsmen',
	// Additional tables - use same names for consistency
	'categories': 'categories',
	'products': 'products',
	'attendance': 'attendance',
	'performance': 'performance',
	'training': 'training',
	'salary_rules': 'salary_rules',
	'materials': 'materials',
	'materials_assigned': 'materials_assigned',
	'projects': 'projects',
	'transactions': 'transactions',
	'settings': 'settings',
	// Vendor management tables
	'vendors': 'vendors',
	'purchase_orders': 'purchase_orders',
	'purchase_order_items': 'purchase_order_items',
	'supplier_invoices': 'supplier_invoices',
	'vendor_payments': 'vendor_payments',
	// Reservations tables
	'reservations': 'reservations',
	'reservation_items': 'reservation_items',
	// Google Calendar settings
	'google_calendar_settings': 'google_calendar_settings',
	// Subscription management
	'user_subscriptions': 'user_subscriptions',
	'subscription_payments': 'subscription_payments',
};

async function syncTable<T>(
	supabaseTable: string, // Use Supabase table name
	upsert: Upserter<T>,
	remove: Deleter,
	sinceKey?: string
) {
	// Get current user ID - CRITICAL for data isolation
	const userId = await getCurrentUserId();
	if (!userId) {
		console.warn(`⚠️ No user ID found, skipping sync for ${supabaseTable}`);
		return;
	}

	const lastKey = sinceKey ?? `sync:last_${supabaseTable}`;
	const lastSyncAt = (await getUserData<string>(lastKey)) ?? '1970-01-01T00:00:00Z';
	const nowIso = new Date().toISOString();

	// CRITICAL FIX: Get ALL pending changes from changeQueue to avoid overwriting local modifications
	// This prevents data loss when user makes local changes and then pulls server data
	const db = await getDB();
	const tx = db.transaction('changeQueue', 'readonly');
	const store = tx.objectStore('changeQueue');
	const index = store.index('byTable');
	
	// Map Supabase table name back to web table name for changeQueue lookup
	// Note: changeQueue uses the table name passed to enqueueChange, which for staff is 'staff'
	// But we need to check both 'staff' and 'staff_employees' since the mapping might vary
	const webTableName = SUPABASE_TO_WEB_MAPPING[supabaseTable] || supabaseTable;
	const possibleTableNames = [webTableName, supabaseTable];
	const pendingDeletions = new Set<string>();
	const pendingModifications = new Set<string>(); // Track ALL pending changes (insert/update/delete)
	
	for (const tableName of possibleTableNames) {
		let cursor = await index.openCursor(IDBKeyRange.only(tableName));
		while (cursor) {
			const change = cursor.value as any;
			const itemId = change.payload?.id;
			
			if (itemId) {
				const idStr = String(itemId);
				
				// Track deletions separately (these should never be restored)
				if (change.action === 'delete') {
					pendingDeletions.add(idStr);
				}
				
				// Track ALL modifications (insert/update/delete) to prevent overwriting
				// This ensures local changes are NEVER lost during sync
				pendingModifications.add(idStr);
			}
			
			cursor = await cursor.continue();
		}
	}
	await tx.done;
	


	const supabase = getSupabase();
	const schema = ((import.meta as any).env?.VITE_SUPABASE_SCHEMA as string) || 'public';
	const sb = (supabase as any).schema ? (supabase as any).schema(schema) : supabase;
	
	// Try to filter by user_id first (for tables that have user_id column)
	let query = sb
		.from(supabaseTable)
		.select('*')
		.eq('user_id', userId) // CRITICAL: Only fetch data for current user
		.gt('updated_at', lastSyncAt)
		.order('updated_at', { ascending: true });
	
	let { data: updatedRows, error: upErr } = await query;
	
	// If column doesn't exist (error code 42703), retry without user_id filter
	// This handles tables that don't have user_id column yet
	if (upErr && upErr.code === '42703' && upErr.message?.includes('user_id')) {
		console.warn(`⚠️ Table ${supabaseTable} doesn't have user_id column, syncing without user filter (WARNING: No database-level isolation)`);
		const retryQuery = sb
			.from(supabaseTable)
			.select('*')
			.gt('updated_at', lastSyncAt)
			.order('updated_at', { ascending: true });
		const retryResult = await retryQuery;
		updatedRows = retryResult.data;
		upErr = retryResult.error;
	}
	
	if (upErr) {
		// Check if it's a "table not found" error (common when migrations haven't been run yet)
		const errorMsg = upErr?.message || '';
		const errorCode = upErr?.code || '';
		const isTableNotFound = errorCode === 'PGRST204' || errorCode === 'PGRST205' || 
		                         errorMsg.includes('schema cache') || 
		                         errorMsg.includes('does not exist') ||
		                         errorMsg.includes('Could not find the table');
		
		if (isTableNotFound) {
			// Table doesn't exist yet - this is normal if migrations haven't been run
			console.log(`⏭️ Skipping ${supabaseTable}: table not found in database (run migrations to enable)`);
			return; // Return silently - don't throw
		}
		
		// For other errors, log and throw
		console.error(`❌ Error fetching ${supabaseTable}:`, upErr);
		throw upErr;
	}

	const rows = (updatedRows as T[] | null) ?? [];
	
	let syncedCount = 0;
	let skippedModifiedCount = 0;
	let skippedDeletedCount = 0;
	
	for (const row of rows) {
		const rowId = String((row as any).id);
		
		// CRITICAL: Skip rows that have ANY pending changes (insert/update/delete)
		// This prevents overwriting local modifications that haven't been synced yet
		if (pendingModifications.has(rowId)) {
			if (pendingDeletions.has(rowId)) {
				skippedDeletedCount++;
			} else {
				skippedModifiedCount++;
			}
			continue;
		}
		
		// If table has user_id column, verify it matches current user
		// If table doesn't have user_id, trust that data isolation is handled at IndexedDB level
		if ((row as any).user_id !== undefined) {
			if ((row as any).user_id === userId) {
				await upsert(row);
				syncedCount++;
			} else {
				console.warn(`⚠️ Skipping row with mismatched user_id in ${supabaseTable}`);
			}
		} else {
			// Table doesn't have user_id column - sync anyway (isolation handled at IndexedDB level)
			await upsert(row);
			syncedCount++;
		}
	}

	if (syncedCount > 0) {
	}
	if (skippedModifiedCount > 0) {
	}
	if (skippedDeletedCount > 0) {
	}

	// Note: deleted_at column doesn't exist in schema, so we skip soft deletes
	// If you need soft deletes, add deleted_at column to tables or use a different approach
	// For now, we only sync updates (not deletes from server)

	await setUserData(lastKey, nowIso);
}

export async function syncAll() {
	// First push local queued changes, then pull latest
	await pushQueue();
	
	const syncResults: Record<string, { success: boolean; error?: string; count?: number }> = {};
	
	const run = async (tableName: string, fn: () => Promise<void>) => {
		try { 
			await fn(); 
			syncResults[tableName] = { success: true };
		} catch (e: any) {
			const msg = e?.message || '';
			// Ignore missing table/schema cache errors so app still works if a table isn't set up yet
			if (typeof msg === 'string' && (msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('relation') || msg.includes('permission denied'))) {
				console.warn(`⚠️ Skipping sync for ${tableName}:`, msg);
				syncResults[tableName] = { success: false, error: msg };
				return;
			}
			console.error(`❌ Error syncing ${tableName}:`, e);
			syncResults[tableName] = { success: false, error: msg };
			// Don't throw - continue with other tables
		}
	};

	// Staff (mapped from Supabase 'staff' to web 'staff_employees')
	await run('staff', () => syncTable('staff', async (row: any) => {
		const employees = (await getUserData<any[]>('staff_employees')) ?? [];
		const idx = employees.findIndex((e) => e.id === row.id);
		// Map Supabase staff fields to web app format
		const mapped = {
			id: row.id,
			name: row.name,
			phone: row.phone,
			email: row.email,
			role: row.role,
			department: row.department,
			salary: row.salary,
			hireDate: row.hire_date,
			status: row.is_active ? 'active' : 'inactive',
			address: row.address,
			emergencyContact: row.emergency_contact,
			emergencyPhone: row.emergency_phone,
			created_at: row.created_at,
			updated_at: row.updated_at,
		};
		if (idx >= 0) employees[idx] = mapped;
		else employees.push(mapped);
		await setUserData('staff_employees', employees);
	}, async (id: string) => {
		const employees = (await getUserData<any[]>('staff_employees')) ?? [];
		const filtered = employees.filter((e) => e.id !== id);
		await setUserData('staff_employees', filtered);
	}));

	// Craftsmen - Map Supabase fields to web app format
	await run('craftsmen', () => syncTable('craftsmen', async (row: any) => {
		const list = (await getUserData<any[]>('craftsmen')) ?? [];
		const idx = list.findIndex((e) => e.id === row.id);
		// Get existing item to preserve local-only fields
		const existingItem = idx >= 0 ? list[idx] : {};
		// Map Supabase craftsmen fields to web app format
		const mapped = {
			id: row.id,
			name: row.name,
			specialty: row.specialty || row.specialization || existingItem.specialty || '',
			specialization: row.specialization || row.specialty || existingItem.specialization || '', // Keep both
			experience: row.experience ?? row.experience_years ?? existingItem.experience ?? 0,
			experience_years: row.experience_years ?? row.experience ?? existingItem.experience_years ?? 0, // Keep both
			contact: row.phone || row.contact || existingItem.contact || '',
			phone: row.phone || row.contact || existingItem.phone || '', // Keep both
			email: row.email || existingItem.email || '',
			address: row.address || existingItem.address || '',
			status: row.status || existingItem.status || 'available',
			rating: row.rating ?? existingItem.rating ?? 0.0,
			hourly_rate: row.hourly_rate ?? existingItem.hourly_rate,
			// Firm type fields from Supabase
			type: row.type || existingItem.type || 'individual',
			firmName: row.firm_name || existingItem.firmName,
			firmContact: row.firm_contact || existingItem.firmContact,
			firmAddress: row.firm_address || existingItem.firmAddress,
			firmGSTNumber: row.firm_gst_number || existingItem.firmGSTNumber,
			contactPerson: row.contact_person || existingItem.contactPerson,
			// Payment tracking fields from Supabase
			totalAmountDue: row.total_amount_due ?? existingItem.totalAmountDue ?? 0,
			totalAmountPaid: row.total_amount_paid ?? existingItem.totalAmountPaid ?? 0,
			pendingAmount: row.pending_amount ?? existingItem.pendingAmount ?? 0,
			// Preserve local-only fields that don't exist in Supabase
			currentProjects: existingItem.currentProjects ?? 0,
			assignedMaterials: existingItem.assignedMaterials ?? [],
			paymentHistory: existingItem.paymentHistory ?? [],
			is_active: row.is_active ?? existingItem.is_active ?? 1,
			created_at: row.created_at || existingItem.created_at || new Date().toISOString(),
			updated_at: row.updated_at || new Date().toISOString(),
		};
		if (idx >= 0) list[idx] = mapped;
		else list.push(mapped);
		await setUserData('craftsmen', list);
	}, async (id: string) => {
		const list = (await getUserData<any[]>('craftsmen')) ?? [];
		const filtered = list.filter((e) => e.id !== id);
		await setUserData('craftsmen', filtered);
	}));

	// Inventory (mapped from Supabase 'inventory' to web 'inventory_items')
	// CRITICAL: Check local timestamps to prevent overwriting recent local changes
	await run('inventory', () => syncTable('inventory', async (row: any) => {
		const all = (await getUserData<any[]>('inventory_items')) ?? [];
		const idx = all.findIndex((e) => e.id === row.id);
		
		// Conflict resolution: Prefer local changes if they're more recent
		if (idx >= 0) {
			const localItem = all[idx];
			const localUpdatedAt = localItem.updated_at ? new Date(localItem.updated_at).getTime() : 0;
			const serverUpdatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
			
			// If local has more recent update, keep local and merge only non-critical fields
			if (localUpdatedAt > serverUpdatedAt && localItem.inStock !== undefined) {
			// Merge server data but keep local inStock and timestamp
			const mergedItem: any = {
				...row,
				inStock: localItem.inStock, // Preserve local stock quantity
				stock: localItem.inStock, // Also set stock field
				updated_at: localItem.updated_at, // Keep local timestamp
				// Preserve image from Supabase image_url field (prioritize image_url from Supabase, then local)
				image: (row.image_url && row.image_url.trim()) || (localItem.image && localItem.image.trim()) || (row.image && row.image.trim()) || '',
				image_url: (row.image_url && row.image_url.trim()) || (row.image && row.image.trim()) || (localItem.image_url && localItem.image_url.trim()) || (localItem.image && localItem.image.trim()) || '',
			};
				// Only include isMissing/isArtificial if they exist in local item (they may not exist in Supabase schema)
				if (localItem.isMissing !== undefined) mergedItem.isMissing = localItem.isMissing;
				if (localItem.isArtificial !== undefined) mergedItem.isArtificial = localItem.isArtificial;
				all[idx] = mergedItem;
			} else {
				// Server data is newer or local doesn't have stock, use server data
				const mergedItem: any = {
					...row,
					inStock: row.stock ?? row.inStock ?? all[idx].inStock ?? 0, // Map stock to inStock
					// Preserve image from Supabase image_url field (prioritize image_url from Supabase)
					image: (row.image_url && row.image_url.trim()) || (row.image && row.image.trim()) || (all[idx].image && all[idx].image.trim()) || '',
					image_url: (row.image_url && row.image_url.trim()) || (row.image && row.image.trim()) || (all[idx].image_url && all[idx].image_url.trim()) || (all[idx].image && all[idx].image.trim()) || '',
				};
				// Only include isMissing/isArtificial if they exist in server data
				if (row.isMissing !== undefined) mergedItem.isMissing = row.isMissing;
				if (row.isArtificial !== undefined) mergedItem.isArtificial = row.isArtificial;
				all[idx] = mergedItem;
			}
		} else {
			const newItem: any = {
				...row,
				inStock: row.stock ?? row.inStock ?? 0, // Map stock to inStock
				// Preserve image from Supabase image_url field (prioritize image_url from Supabase)
				image: (row.image_url && row.image_url.trim()) || (row.image && row.image.trim()) || '',
				image_url: (row.image_url && row.image_url.trim()) || (row.image && row.image.trim()) || '',
			};
			// Only include isMissing/isArtificial if they exist in server data
			if (row.isMissing !== undefined) newItem.isMissing = row.isMissing;
			if (row.isArtificial !== undefined) newItem.isArtificial = row.isArtificial;
			all.push(newItem);
		}
		await setUserData('inventory_items', all);

		// Map Supabase inventory fields to web app format
		// Determine item_type from category or row data
		const itemType = (row.category || row.item_type || 'jewelry').toLowerCase();
		
		// CRITICAL: Project into per-page keys with inStock preserved
		if (itemType === 'gold' || row.category === 'gold') {
			const gold = (await getUserData<any[]>('gold_items')) ?? [];
			const gi = gold.findIndex((e) => e.id === row.id);
			const mapped = { 
				id: row.id, 
				name: row.name, 
				weight: row.weight ?? row.attributes?.weight ?? '', 
				purity: row.purity ?? row.attributes?.purity ?? '', 
				price: row.price ?? 0, 
				image: (row.image && row.image.trim()) || (row.image_url && row.image_url.trim()) || (row.images?.[0] && String(row.images[0]).trim()) || (gold[gi]?.image && gold[gi].image.trim()) || '',
				inStock: row.stock ?? row.inStock ?? gold[gi]?.inStock ?? gold[gi]?.stock ?? 10, // Preserve stock
				stock: row.stock ?? row.inStock ?? gold[gi]?.inStock ?? gold[gi]?.stock ?? 10,
			};
			if (gi >= 0) gold[gi] = mapped; else gold.push(mapped);
			await setUserData('gold_items', gold);
		}
		if (itemType === 'jewelry' || row.category === 'jewelry') {
			const list = (await getUserData<any[]>('jewelry_items')) ?? [];
			const ji = list.findIndex((e) => e.id === row.id);
			const mapped = { 
				id: row.id, 
				name: row.name, 
				description: row.description ?? row.attributes?.description ?? '', 
				price: row.price ?? 0, 
				image: (row.image && row.image.trim()) || (row.image_url && row.image_url.trim()) || (row.images?.[0] && String(row.images[0]).trim()) || (list[ji]?.image && list[ji].image.trim()) || '',
				inStock: row.stock ?? row.inStock ?? list[ji]?.inStock ?? 10, // Preserve stock
				type: row.subcategory ?? row.type ?? list[ji]?.type ?? 'Ring',
				gemstone: row.description ?? row.attributes?.description ?? list[ji]?.gemstone ?? 'None',
				carat: row.attributes?.carat ?? list[ji]?.carat ?? 0,
				metal: row.purity ?? row.attributes?.purity ?? list[ji]?.metal ?? 'Gold 18K',
				isArtificial: (row.isArtificial === 1 || row.isArtificial === true) ? true : false, // Map from INTEGER to boolean
			};
			if (ji >= 0) list[ji] = mapped; else list.push(mapped);
			await setUserData('jewelry_items', list);
		}
		if (itemType === 'stones' || row.category === 'stones') {
			const list = (await getUserData<any[]>('stones_items')) ?? [];
			const si = list.findIndex((e) => e.id === row.id);
			const mapped = { 
				id: row.id, 
				name: row.name, 
				carat: row.carat_weight ?? row.attributes?.carat ?? '', 
				clarity: row.clarity ?? row.attributes?.clarity ?? '', 
				cut: row.cut ?? row.attributes?.cut ?? '', 
				price: row.total_price ?? row.price ?? 0, 
				image: (row.image && row.image.trim()) || (row.image_url && row.image_url.trim()) || (row.images?.[0] && String(row.images[0]).trim()) || (list[si]?.image && list[si].image.trim()) || '',
				inStock: row.stock_quantity ?? row.stock ?? row.inStock ?? list[si]?.inStock ?? 10, // Preserve stock
			};
			if (si >= 0) list[si] = mapped; else list.push(mapped);
			await setUserData('stones_items', list);
		}
	}, async (id: string) => {
		const all = (await getUserData<any[]>('inventory_items')) ?? [];
		await setUserData('inventory_items', all.filter((e) => e.id !== id));
		const goldItems = (await getUserData<any[]>('gold_items')) ?? [];
		await setUserData('gold_items', goldItems.filter((e) => e.id !== id));
		const jewelryItems = (await getUserData<any[]>('jewelry_items')) ?? [];
		await setUserData('jewelry_items', jewelryItems.filter((e) => e.id !== id));
		const stonesItems = (await getUserData<any[]>('stones_items')) ?? [];
		await setUserData('stones_items', stonesItems.filter((e) => e.id !== id));
	}));

	// Gold table (separate from inventory)
	await run('gold', () => syncTable('gold', async (row: any) => {
		const list = (await getUserData<any[]>('gold_items')) ?? [];
		const idx = list.findIndex((e) => e.id === row.id);
		const mapped = {
			id: row.id,
			name: row.name,
			purity: row.purity,
			weight: row.weight,
			pricePerGram: row.price_per_gram,
			price: row.total_price,
			inStock: row.in_stock ?? row.stock ?? 0,
			stock: row.in_stock ?? row.stock ?? 0,
			supplier: row.supplier,
			description: row.description,
			image: (row.image_url && row.image_url.trim()) || (row.image && row.image.trim()) || '',
			// Tax rate fields
			taxRate: row.tax_rate ?? 3,
			taxIncluded: row.tax_included ?? false,
			taxCategory: row.tax_category ?? 'jewelry',
			created_at: row.created_at,
			updated_at: row.updated_at,
		};
		if (idx >= 0) list[idx] = mapped;
		else list.push(mapped);
		await setUserData('gold_items', list);
		// Also update inventory_items if exists
		const all = (await getUserData<any[]>('inventory_items')) ?? [];
		const invIdx = all.findIndex((e) => e.id === row.id);
		if (invIdx >= 0) {
			all[invIdx] = { ...all[invIdx], ...mapped, category: 'gold', item_type: 'gold' };
			await setUserData('inventory_items', all);
		}
	}, async (id: string) => {
		const list = (await getUserData<any[]>('gold_items')) ?? [];
		await setUserData('gold_items', list.filter((e) => e.id !== id));
	}));

	// Jewelry table (separate from inventory)
	await run('jewelry', () => syncTable('jewelry', async (row: any) => {
		const list = (await getUserData<any[]>('jewelry_items')) ?? [];
		const idx = list.findIndex((e) => e.id === row.id);
		const mapped = {
			id: row.id,
			name: row.name,
			type: row.type,
			gemstone: row.gemstone,
			carat: row.carat ?? 0,
			metal: row.metal,
			price: row.price,
			inStock: row.in_stock ?? row.stock ?? 0,
			stock: row.in_stock ?? row.stock ?? 0,
			isArtificial: row.is_artificial === 1 || row.is_artificial === true,
			is_artificial: row.is_artificial === 1 || row.is_artificial === true,
			description: row.description,
			image: (row.image_url && row.image_url.trim()) || (row.image && row.image.trim()) || '',
			// Tax rate fields
			taxRate: row.tax_rate ?? 3,
			taxIncluded: row.tax_included ?? false,
			taxCategory: row.tax_category ?? 'jewelry',
			created_at: row.created_at,
			updated_at: row.updated_at,
		};
		if (idx >= 0) list[idx] = mapped;
		else list.push(mapped);
		await setUserData('jewelry_items', list);
		// Also update inventory_items if exists
		const all = (await getUserData<any[]>('inventory_items')) ?? [];
		const invIdx = all.findIndex((e) => e.id === row.id);
		if (invIdx >= 0) {
			all[invIdx] = { ...all[invIdx], ...mapped, category: 'jewelry', item_type: 'jewelry' };
			await setUserData('inventory_items', all);
		}
	}, async (id: string) => {
		const list = (await getUserData<any[]>('jewelry_items')) ?? [];
		const filtered = list.filter((e) => e.id !== id);
		await setUserData('jewelry_items', filtered);
	}));

	// Stones table (separate from inventory)
	await run('stones', () => syncTable('stones', async (row: any) => {
		const list = (await getUserData<any[]>('stones_items')) ?? [];
		const idx = list.findIndex((e) => e.id === row.id);
		const mapped = {
			id: row.id,
			name: row.name,
			type: row.type,
			carat: row.carat_weight ?? row.carat ?? '',
			color: row.color,
			clarity: row.clarity,
			cut: row.cut,
			pricePerCarat: row.price_per_carat,
			price: row.total_price ?? row.price,
			inStock: row.stock_quantity ?? row.stock ?? 0,
			stock: row.stock_quantity ?? row.stock ?? 0,
			supplier: row.supplier,
			certificateNumber: row.certificate_number,
			image: (row.image_url && row.image_url.trim()) || (row.image && row.image.trim()) || '',
			status: row.is_active === 1 ? 'active' : 'inactive',
			is_active: row.is_active,
			// Tax rate fields
			taxRate: row.tax_rate ?? 5,  // Default 5% for stones
			taxIncluded: row.tax_included ?? false,
			taxCategory: row.tax_category ?? 'gemstones',
			created_at: row.created_at,
			updated_at: row.updated_at,
		};
		if (idx >= 0) list[idx] = mapped;
		else list.push(mapped);
		await setUserData('stones_items', list);
		// Also update inventory_items if exists
		const all = (await getUserData<any[]>('inventory_items')) ?? [];
		const invIdx = all.findIndex((e) => e.id === row.id);
		if (invIdx >= 0) {
			all[invIdx] = { ...all[invIdx], ...mapped, category: 'stones', item_type: 'stones' };
			await setUserData('inventory_items', all);
		}
	}, async (id: string) => {
		const list = (await getUserData<any[]>('stones_items')) ?? [];
		const filtered = list.filter((e) => e.id !== id);
		await setUserData('stones_items', filtered);
	}));

	// Sale Items table (separate sync for sale_items)
	// Note: sale_items table doesn't have updated_at, only created_at, so we use created_at for syncing
	await run('sale_items', async () => {
		const supabase = getSupabase();
		const schema = ((import.meta as any).env?.VITE_SUPABASE_SCHEMA as string) || 'public';
		const sb = (supabase as any).schema ? (supabase as any).schema(schema) : supabase;
		
		const lastKey = 'sync:last_sale_items';
		const lastSyncAt = (await idbGet<string>(lastKey)) ?? '1970-01-01T00:00:00Z';
		const nowIso = new Date().toISOString();

		// Use created_at instead of updated_at since sale_items doesn't have updated_at
		const { data: updatedRows, error: upErr } = await sb
			.from('sale_items')
			.select('*')
			.gt('created_at', lastSyncAt)
			.order('created_at', { ascending: true });
		
		if (upErr) {
			// If error is about missing column, skip gracefully
			if (typeof upErr.message === 'string' && upErr.message.includes('does not exist')) {
				console.warn('Skipping sync for sale_items:', upErr.message);
				return;
			}
			throw upErr;
		}

		const list = (await getUserData<any[]>('sale_items')) ?? [];
		
		for (const row of (updatedRows as any[] | null) ?? []) {
			const idx = list.findIndex((e) => e.id === row.id);
			const mapped = {
				id: row.id,
				saleId: row.sale_id,
				sale_id: row.sale_id,
				productId: row.product_id,
				product_id: row.product_id,
				productName: row.product_name,
				product_name: row.product_name,
				quantity: row.quantity,
				unitPrice: row.unit_price,
				unit_price: row.unit_price,
				totalPrice: row.total_price,
				total_price: row.total_price,
				created_at: row.created_at,
			};
			if (idx >= 0) list[idx] = mapped;
			else list.push(mapped);
		}
		
		await setUserData('sale_items', list);
		await setUserData(lastKey, nowIso);
	});

	// Sales/Invoices (mapped from Supabase 'sales' + 'sale_items' to web 'pos_recentInvoices')
	// This is special - we need to fetch both sales and sale_items, then combine into embedded format
	await run('sales', async () => {
		// Get current user ID - CRITICAL for data isolation
		const userId = await getCurrentUserId();
		if (!userId) {
			console.warn('⚠️ No user ID found, skipping sales sync');
			return;
		}

		const supabase = getSupabase();
		const schema = ((import.meta as any).env?.VITE_SUPABASE_SCHEMA as string) || 'public';
		const sb = (supabase as any).schema ? (supabase as any).schema(schema) : supabase;
		
		const lastKey = 'sync:last_sales';
		const lastSyncAt = (await getUserData<string>(lastKey)) ?? '1970-01-01T00:00:00Z';
		const nowIso = new Date().toISOString();

		// Fetch updated sales - FILTER BY USER_ID (if column exists)
		let salesQuery = sb
			.from('sales')
			.select('*')
			.eq('user_id', userId) // CRITICAL: Only fetch sales for current user
			.gt('updated_at', lastSyncAt)
			.order('updated_at', { ascending: true });
		
		let { data: sales, error: salesErr } = await salesQuery;
		
		// If column doesn't exist (error code 42703), retry without user_id filter
		if (salesErr && salesErr.code === '42703' && salesErr.message?.includes('user_id')) {
			console.warn(`⚠️ Table sales doesn't have user_id column, syncing without user filter (WARNING: No database-level isolation)`);
			const retryQuery = sb
				.from('sales')
				.select('*')
				.gt('updated_at', lastSyncAt)
				.order('updated_at', { ascending: true });
			const retryResult = await retryQuery;
			sales = retryResult.data;
			salesErr = retryResult.error;
		}
		
		if (salesErr) throw salesErr;

		if (sales && sales.length > 0) {
			// Fetch sale_items for each sale (sale_items should also have user_id, but we filter by sale_id which belongs to user)
			const saleIds = sales.map((s: any) => s.id);
			const { data: saleItems, error: itemsErr } = await sb
				.from('sale_items')
				.select('*')
				.in('sale_id', saleIds);
			
			if (itemsErr) throw itemsErr;

			const list = (await getUserData<any[]>('pos_recentInvoices')) ?? [];
			
			// Transform normalized sales + sale_items to embedded invoice format
			for (const sale of sales) {
				// Extra safety: ensure sale belongs to current user
				if (sale.user_id !== userId) {
					console.warn(`⚠️ Skipping sale ${sale.id} with mismatched user_id`);
					continue;
				}

				const items = (saleItems || []).filter((item: any) => item.sale_id === sale.id);
				const mapped = {
					id: sale.id,
					items: items.map((item: any) => ({
						id: item.product_id || item.id,
						name: item.product_name,
						quantity: item.quantity,
						price: item.unit_price,
						type: '', // Can be looked up from inventory if needed
					})),
					subtotal: sale.total_amount - (sale.tax_amount || 0),
					tax: sale.tax_amount || 0,
					total: sale.total_amount,
					date: sale.created_at,
					customerName: sale.customer_name || '',
					paymentMethod: sale.payment_method || '',
				};
				
				const idx = list.findIndex((e) => e.id === sale.id);
				if (idx >= 0) list[idx] = mapped;
				else list.unshift(mapped);
			}
			
			await setUserData('pos_recentInvoices', list.slice(0, 50)); // Keep more invoices
		}

		await setUserData(lastKey, nowIso);
	});

	// Customers - Map Supabase fields to web app format
	await run('customers', () => syncTable('customers', async (row: any) => {
		const list = (await getUserData<any[]>('customers')) ?? [];
		const idx = list.findIndex((e) => e.id === row.id);
		// Map Supabase customer fields to web app format (camelCase)
		const mapped = {
			id: row.id,
			name: row.name,
			email: row.email,
			phone: row.phone,
			address: row.address,
			city: row.city,
			state: row.state,
			pincode: row.pincode,
			dateOfBirth: row.date_of_birth,
			anniversaryDate: row.anniversary_date,
			customerType: row.customer_type || 'regular',
			totalPurchases: parseFloat(String(row.total_purchases ?? 0)) || 0,
			currentBalance: parseFloat(String(row.ledger_balance ?? 0)) || 0,
			ledger_balance: parseFloat(String(row.ledger_balance ?? 0)) || 0, // Keep both for compatibility
			lastPurchaseDate: row.last_purchase_date,
			notes: row.notes,
			status: row.is_active === 1 ? 'active' : 'inactive',
			is_active: row.is_active,
			created_at: row.created_at,
			updated_at: row.updated_at,
		};
		if (idx >= 0) list[idx] = mapped;
		else list.push(mapped);
		await setUserData('customers', list);
	}, async (id: string) => {
		const list = (await getUserData<any[]>('customers')) ?? [];
		await setUserData('customers', list.filter((e) => e.id !== id));
	}));

	// Customer Ledger (mapped from Supabase 'customer_ledger' to web 'customer_transactions')
	await run('customer_ledger', () => syncTable('customer_ledger', async (row: any) => {
		const list = (await getUserData<any[]>('customer_transactions')) ?? [];
		const idx = list.findIndex((e) => e.id === row.id);
		// Map Supabase customer_ledger fields to web app format
		const mapped = {
			id: row.id,
			customerId: row.customer_id,
			type: row.transaction_type === 'sale' ? 'purchase' : row.transaction_type === 'payment' ? 'payment' : 'credit_adjustment',
			amount: row.amount,
			description: row.notes || `Transaction ${row.transaction_type}`,
			date: row.created_at,
			invoiceId: row.sale_id,
			paymentMethod: row.payment_method,
			balanceBefore: row.balance_before,
			balanceAfter: row.balance_after,
		};
		if (idx >= 0) list[idx] = mapped;
		else list.push(mapped);
		await setUserData('customer_transactions', list);
	}, async (id: string) => {
		const list = (await getUserData<any[]>('customer_transactions')) ?? [];
		const filtered = list.filter((e) => e.id !== id);
		await setUserData('customer_transactions', filtered);
	}));

	// Categories
	await run('categories', () => syncTable('categories', async (row: any) => {
		const list = (await idbGet<any[]>('categories')) ?? [];
		const idx = list.findIndex((e) => e.id === row.id);
		if (idx >= 0) list[idx] = row; else list.push(row);
		await idbSet('categories', list);
	}, async (id: string) => {
		const list = (await idbGet<any[]>('categories')) ?? [];
		await idbSet('categories', list.filter((e) => e.id !== id));
	}));

	// Products
	await run('products', () => syncTable('products', async (row: any) => {
		const list = (await idbGet<any[]>('products')) ?? [];
		const idx = list.findIndex((e) => e.id === row.id);
		if (idx >= 0) list[idx] = row; else list.push(row);
		await idbSet('products', list);
	}, async (id: string) => {
		const list = (await idbGet<any[]>('products')) ?? [];
		await idbSet('products', list.filter((e) => e.id !== id));
	}));

	// Attendance
	await run('attendance', () => syncTable('attendance', async (row: any) => {
		const list = (await idbGet<any[]>('attendance')) ?? [];
		const idx = list.findIndex((e) => e.id === row.id);
		if (idx >= 0) list[idx] = row; else list.push(row);
		await idbSet('attendance', list);
	}, async (id: string) => {
		const list = (await idbGet<any[]>('attendance')) ?? [];
		await idbSet('attendance', list.filter((e) => e.id !== id));
	}));

	// Performance
	await run('performance', () => syncTable('performance', async (row: any) => {
		const list = (await idbGet<any[]>('performance')) ?? [];
		const idx = list.findIndex((e) => e.id === row.id);
		if (idx >= 0) list[idx] = row; else list.push(row);
		await idbSet('performance', list);
	}, async (id: string) => {
		const list = (await idbGet<any[]>('performance')) ?? [];
		await idbSet('performance', list.filter((e) => e.id !== id));
	}));

	// Training
	await run('training', () => syncTable('training', async (row: any) => {
		const list = (await idbGet<any[]>('training')) ?? [];
		const idx = list.findIndex((e) => e.id === row.id);
		if (idx >= 0) list[idx] = row; else list.push(row);
		await idbSet('training', list);
	}, async (id: string) => {
		const list = (await idbGet<any[]>('training')) ?? [];
		await idbSet('training', list.filter((e) => e.id !== id));
	}));

	// Salary Rules
	await run('salary_rules', () => syncTable('salary_rules', async (row: any) => {
		const list = (await idbGet<any[]>('salary_rules')) ?? [];
		const idx = list.findIndex((e) => e.id === row.id);
		if (idx >= 0) list[idx] = row; else list.push(row);
		await idbSet('salary_rules', list);
	}, async (id: string) => {
		const list = (await idbGet<any[]>('salary_rules')) ?? [];
		await idbSet('salary_rules', list.filter((e) => e.id !== id));
	}));

	// Materials
	await run('materials', () => syncTable('materials', async (row: any) => {
		const list = (await idbGet<any[]>('materials')) ?? [];
		const idx = list.findIndex((e) => e.id === row.id);
		if (idx >= 0) list[idx] = row; else list.push(row);
		await idbSet('materials', list);
	}, async (id: string) => {
		const list = (await idbGet<any[]>('materials')) ?? [];
		await idbSet('materials', list.filter((e) => e.id !== id));
	}));

	// Materials Assigned
	await run('materials_assigned', () => syncTable('materials_assigned', async (row: any) => {
		const list = (await idbGet<any[]>('materials_assigned')) ?? [];
		const idx = list.findIndex((e) => e.id === row.id);
		if (idx >= 0) list[idx] = row; else list.push(row);
		await idbSet('materials_assigned', list);
	}, async (id: string) => {
		const list = (await idbGet<any[]>('materials_assigned')) ?? [];
		await idbSet('materials_assigned', list.filter((e) => e.id !== id));
	}));

	// Projects
	await run('projects', () => syncTable('projects', async (row: any) => {
		const list = (await idbGet<any[]>('projects')) ?? [];
		const idx = list.findIndex((e) => e.id === row.id);
		if (idx >= 0) list[idx] = row; else list.push(row);
		await idbSet('projects', list);
	}, async (id: string) => {
		const list = (await idbGet<any[]>('projects')) ?? [];
		await idbSet('projects', list.filter((e) => e.id !== id));
	}));

	// Transactions (general transaction log)
	await run('transactions', () => syncTable('transactions', async (row: any) => {
		const list = (await idbGet<any[]>('transactions')) ?? [];
		const idx = list.findIndex((e) => e.id === row.id);
		if (idx >= 0) list[idx] = row; else list.push(row);
		await idbSet('transactions', list);
	}, async (id: string) => {
		const list = (await idbGet<any[]>('transactions')) ?? [];
		await idbSet('transactions', list.filter((e) => e.id !== id));
	}));

	// Settings
	await run('settings', () => syncTable('settings', async (row: any) => {
		const list = (await getUserData<any[]>('settings')) ?? [];
		const idx = list.findIndex((e) => e.key === row.key);
		if (idx >= 0) list[idx] = row; else list.push(row);
		await setUserData('settings', list);
		
		// Also update the corresponding user-scoped settings keys
		const userId = await getCurrentUserId();
		if (userId && row.key) {
			// Map settings keys back to component storage keys
			if (row.key.startsWith('business_')) {
				const settingKey = row.key.replace('business_', '');
				const current = await getUserData<any>('businessSettings') || {};
				try {
					const value = typeof row.value === 'string' ? (row.value.startsWith('{') || row.value.startsWith('[') ? JSON.parse(row.value) : row.value) : row.value;
					current[settingKey] = value;
					await setUserData('businessSettings', current);
				} catch (e) {
					console.warn('Failed to parse setting value:', row.value);
				}
			} else if (row.key.startsWith('payment_')) {
				const settingKey = row.key.replace('payment_', '');
				const current = await getUserData<any>('paymentSettings') || {};
				try {
					const value = typeof row.value === 'string' ? (row.value.startsWith('{') || row.value.startsWith('[') ? JSON.parse(row.value) : row.value) : row.value;
					current[settingKey] = value;
					await setUserData('paymentSettings', current);
				} catch (e) {
					console.warn('Failed to parse setting value:', row.value);
				}
			} else if (row.key.startsWith('notification_')) {
				const settingKey = row.key.replace('notification_', '');
				const current = await getUserData<any>('notificationSettings') || {};
				try {
					const value = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
					current[settingKey] = value;
					await setUserData('notificationSettings', current);
				} catch (e) {
					console.warn('Failed to parse setting value:', row.value);
				}
			}
		}
	}, async (key: string) => {
		const list = (await getUserData<any[]>('settings')) ?? [];
		const filtered = list.filter((e) => e.key !== key);
		await setUserData('settings', filtered);
	}));

	// Gold Rates (current rates and making charges)
	// NOTE: This requires the gold-rate-settings.sql migration to be run
	// The sync will automatically skip if table doesn't exist
	await run('gold_rates', () => syncTable('gold_rates', async (row: any) => {
		if (!row.is_active) return; // Only sync active rates
		
		const goldSettings = (await getUserData<any>('gold_rate_settings')) || {
			currentRates: {},
			makingCharges: {},
			rateHistory: [],
		};
		
		// Update current rates
		goldSettings.currentRates = {
			rate24K: row.rate_24k ?? 6800,
			rate22K: row.rate_22k ?? 6200,
			rate18K: row.rate_18k ?? 5100,
			rate14K: row.rate_14k ?? 4000,
			lastUpdated: row.updated_at || new Date().toISOString(),
			updatedBy: row.updated_by,
		};
		
		// Update making charges
		goldSettings.makingCharges = {
			gold24K: {
				type: 'per_gram',
				value: row.making_24k ?? 600,
				minimumCharge: row.min_making_24k ?? 500,
			},
			gold22K: {
				type: 'per_gram',
				value: row.making_22k ?? 550,
				minimumCharge: row.min_making_22k ?? 450,
			},
			gold18K: {
				type: 'per_gram',
				value: row.making_18k ?? 500,
				minimumCharge: row.min_making_18k ?? 400,
			},
			gold14K: {
				type: 'per_gram',
				value: row.making_14k ?? 450,
				minimumCharge: row.min_making_14k ?? 350,
			},
		};
		
		await setUserData('gold_rate_settings', goldSettings);
	}, async (id: string) => {
		// Don't delete gold rates, just mark as inactive
	}));
	
	// Log sync results
	const successful = Object.values(syncResults).filter(r => r.success).length;
	const failed = Object.values(syncResults).filter(r => !r.success).length;
}

type ChangeOp = {
	id: string;
	table: string;
	action: 'upsert' | 'delete';
	payload?: any;
	createdAt: string;
};

export async function enqueueChange(table: string, action: 'upsert' | 'delete', payload?: any) {
	const db = await getDB();
	const store = db.transaction('changeQueue', 'readwrite').objectStore('changeQueue');
	const change: ChangeOp = {
		id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
		table,
		action,
		payload,
		createdAt: new Date().toISOString(),
	};
	await store.put(change);
}

// One-time backfill: push current IndexedDB datasets into Supabase (server-wins on conflict)
// OPTIMIZED: Smart push that only uploads changed data, not everything
export async function pushLocalChanges() {
	
	// Get current user ID - CRITICAL for data isolation
	const userId = await getCurrentUserId();
	if (!userId) {
		console.warn('⚠️ No user ID found, skipping push');
		return;
	}

	// First, push pending changes from changeQueue (most efficient)
	await pushQueue();

	// Done! Changed data is now synced
}

// LEGACY: Full backfill (uploads ALL data) - USE ONLY FOR INITIAL SETUP
export async function backfillAllFromIdb() {
	
	// Get current user ID - CRITICAL for data isolation
	const userId = await getCurrentUserId();
	if (!userId) {
		console.warn('⚠️ No user ID found, skipping backfill');
		return;
	}

	const supabase = getSupabase();
	const schema = ((import.meta as any).env?.VITE_SUPABASE_SCHEMA as string) || 'public';
	const sb = (supabase as any).schema ? (supabase as any).schema(schema) : supabase;

	let totalUploaded = 0;
	const startTime = Date.now();

	// Staff (map to Supabase 'staff' table)
	const employees = (await getUserData<any[]>('staff_employees')) ?? [];
	if (employees.length > 0) {
		await sb.from('staff').upsert(
			employees.map((e) => ({
				id: e.id,
				user_id: userId, // CRITICAL: Include user_id for data isolation
				name: e.name,
				email: e.email,
				phone: e.phone,
				role: e.role,
				department: e.department,
				salary: e.salary,
				is_active: e.status === 'active' ? 1 : 0,
				hire_date: e.hireDate,
				address: e.address,
				emergency_contact: e.emergencyContact,
				emergency_phone: e.emergencyPhone,
				updated_at: new Date().toISOString(),
			})),
			{ onConflict: 'id' }
		);
		totalUploaded += employees.length;
	}

	// Inventory (map to Supabase 'inventory' table)
	const inventory = (await getUserData<any[]>('inventory_items')) ?? [];
	if (inventory.length > 0) {
		const inventoryDataArray = inventory.map((item: any) => {
			// IMPORTANT: Remove image fields to avoid syncing large base64 data
			// Images stay in IndexedDB only, not synced to Supabase
			const { image, image_url, images, ...itemWithoutImages } = item;
			
			// Map item_type to category (must be: gold, stones, jewelry, artificial)
			let category = 'jewelry';
			if (itemWithoutImages.item_type) {
				const typeMap: Record<string, string> = {
					'gold': 'gold',
					'stone': 'stones',
					'stones': 'stones',
					'jewelry': 'jewelry',
					'artificial': 'artificial'
				};
				category = typeMap[itemWithoutImages.item_type.toLowerCase()] || 'jewelry';
			} else if (itemWithoutImages.category) {
				category = itemWithoutImages.category.toLowerCase();
				if (!['gold', 'stones', 'jewelry', 'artificial'].includes(category)) {
					category = 'jewelry';
				}
			}
			
			// Validate and cap price to DECIMAL(10, 2) limit: max 99999999.99
			let price = parseFloat(String(itemWithoutImages.price || 0));
			const MAX_PRICE = 99999999.99; // DECIMAL(10, 2) maximum
			if (price > MAX_PRICE) {
				console.warn(`⚠️ Price ${price} exceeds maximum ${MAX_PRICE}, capping to maximum`);
				price = MAX_PRICE;
			}
			if (isNaN(price) || price < 0) price = 0;
			
			const inventoryData: any = {
				id: String(itemWithoutImages.id),
				user_id: userId, // CRITICAL: Include user_id for data isolation
				name: String(itemWithoutImages.name || 'Unnamed Item'),
				category: category,
				subcategory: String(itemWithoutImages.type || itemWithoutImages.subcategory || 'general'),
				price: price,
				stock: parseInt(String(itemWithoutImages.inStock ?? itemWithoutImages.stock ?? 0), 10),
				updated_at: new Date().toISOString(),
			};
			
			// Add optional fields based on schema - check attributes object first
			// weight DECIMAL(10, 3) - check attributes.weight first (common pattern)
			// Validate and cap weight to DECIMAL(10, 3) limit: max 9999999.999
			const weightValue = itemWithoutImages.attributes?.weight ?? itemWithoutImages.weight;
			if (weightValue !== undefined && weightValue !== null && weightValue !== '') {
				let weight = parseFloat(String(weightValue));
				if (!isNaN(weight)) {
					const MAX_WEIGHT = 9999999.999; // DECIMAL(10, 3) maximum
					if (weight > MAX_WEIGHT) {
						console.warn(`⚠️ Weight ${weight} exceeds maximum ${MAX_WEIGHT}, capping to maximum`);
						weight = MAX_WEIGHT;
					}
					if (weight < 0) weight = 0;
					inventoryData.weight = weight;
				}
			}
			// purity TEXT - check attributes.purity, attributes.metal, then direct fields
			const purityValue = itemWithoutImages.attributes?.purity ?? itemWithoutImages.attributes?.metal ?? itemWithoutImages.purity ?? itemWithoutImages.metal;
			if (purityValue !== undefined && purityValue !== null && purityValue !== '') {
				inventoryData.purity = String(purityValue);
			}
			// description TEXT - check both direct field and attributes object
			const descriptionValue = itemWithoutImages.description ?? itemWithoutImages.attributes?.description;
			if (descriptionValue !== undefined && descriptionValue !== null && descriptionValue !== '') {
				inventoryData.description = String(descriptionValue);
			}
			// Note: isMissing and isArtificial columns may not exist in all Supabase schemas
			// Only include them if they exist in your schema
			// Uncomment the following if your Supabase schema has these columns:
			// if (item.isMissing !== undefined) {
			// 	inventoryData.isMissing = item.isMissing ? 1 : 0;
			// }
			// if (item.isArtificial !== undefined) {
			// 	inventoryData.isArtificial = item.isArtificial ? 1 : 0;
			// }
			// Sync image_url to Supabase if it's a valid URL (not base64 or emoji)
			// Skip base64 data (starts with 'data:') and emojis (single Unicode character)
			const imageValue = item.image ?? item.image_url ?? item.images?.[0] ?? '';
			if (imageValue && typeof imageValue === 'string') {
				const trimmedImage = imageValue.trim();
				// Check if it's a valid URL (http/https) or a data URL that's reasonably small
				if (trimmedImage.startsWith('http://') || trimmedImage.startsWith('https://')) {
					// Valid HTTP/HTTPS URL - sync it
					inventoryData.image_url = trimmedImage;
				} else if (trimmedImage.startsWith('data:image/')) {
					// Base64 image - check size (skip if too large, > 100KB)
					const base64Length = trimmedImage.length;
					const estimatedSizeKB = (base64Length * 3) / 4 / 1024; // Approximate size
					if (estimatedSizeKB < 100) {
						// Small base64 - allow it
						inventoryData.image_url = trimmedImage;
					} else {
						console.warn(`⚠️ Skipping large base64 image for item ${inventoryData.id} (${estimatedSizeKB.toFixed(2)}KB)`);
					}
				}
				// Skip emojis and invalid formats
			}
			
			return inventoryData;
		}).filter((item: any) => item !== null);
		
		if (inventoryDataArray.length > 0) {
			const { error } = await sb.from('inventory').upsert(inventoryDataArray, { onConflict: 'id' });
			if (error) {
				console.error('❌ Inventory backfill error:', error);
				console.error('❌ Failed data sample (first item):', inventoryDataArray[0] ? JSON.stringify(inventoryDataArray[0], null, 2) : 'No items');
				console.error('❌ Error details:', error.message, error.details, error.hint);
				throw error;
			}
			totalUploaded += inventoryDataArray.length;
		}
	}

	// Gold items (map to Supabase 'gold' table)
	const goldItems = (await getUserData<any[]>('gold_items')) ?? [];
	if (goldItems.length > 0) {
		const goldDataArray = goldItems.map((item: any) => {
			const { image, image_url, images, ...itemWithoutImages } = item;
			return {
				id: String(item.id),
				user_id: userId, // CRITICAL: Include user_id for data isolation
				name: String(item.name || 'Unnamed Gold'),
				purity: String(item.purity || ''),
				weight: parseFloat(String(item.weight || 0)),
				price_per_gram: parseFloat(String(item.pricePerGram ?? item.price_per_gram ?? 0)),
				total_price: parseFloat(String(item.price ?? item.total_price ?? 0)),
				in_stock: parseInt(String(item.inStock ?? item.stock ?? 0), 10),
				supplier: item.supplier || null,
				description: item.description || null,
				// Tax rate fields
				tax_rate: parseFloat(String(item.taxRate ?? 3)),
				tax_included: item.taxIncluded ?? false,
				tax_category: item.taxCategory ?? 'jewelry',
				updated_at: new Date().toISOString(),
			};
		});
		if (goldDataArray.length > 0) {
			await sb.from('gold').upsert(goldDataArray, { onConflict: 'id' });
			totalUploaded += goldDataArray.length;
		}
	}

	// Jewelry items (map to Supabase 'jewelry' table)
	const jewelryItems = (await getUserData<any[]>('jewelry_items')) ?? [];
	if (jewelryItems.length > 0) {
		const jewelryDataArray = jewelryItems.map((item: any) => {
			const { image, image_url, images, ...itemWithoutImages } = item;
			return {
				id: String(item.id),
				user_id: userId, // CRITICAL: Include user_id for data isolation
				name: String(item.name || 'Unnamed Jewelry'),
				type: String(item.type || ''),
				gemstone: item.gemstone || null,
				carat: parseFloat(String(item.carat || 0)),
				metal: item.metal || null,
				price: parseFloat(String(item.price || 0)),
				in_stock: parseInt(String(item.inStock ?? item.stock ?? 0), 10),
				is_artificial: (item.isArtificial === true || item.is_artificial === 1) ? 1 : 0,
				description: item.description || null,
				// Tax rate fields
				tax_rate: parseFloat(String(item.taxRate ?? 3)),
				tax_included: item.taxIncluded ?? false,
				tax_category: item.taxCategory ?? 'jewelry',
				updated_at: new Date().toISOString(),
			};
		});
		if (jewelryDataArray.length > 0) {
			await sb.from('jewelry').upsert(jewelryDataArray, { onConflict: 'id' });
			totalUploaded += jewelryDataArray.length;
		}
	}

	// Stones items (map to Supabase 'stones' table)
	const stonesItems = (await getUserData<any[]>('stones_items')) ?? [];
	if (stonesItems.length > 0) {
		const stonesDataArray = stonesItems.map((item: any) => {
			const { image, image_url, images, ...itemWithoutImages } = item;
			return {
				id: String(item.id),
				user_id: userId, // CRITICAL: Include user_id for data isolation
				name: String(item.name || 'Unnamed Stone'),
				type: String(item.type || ''),
				carat_weight: parseFloat(String(item.carat ?? item.carat_weight ?? 0)),
				color: item.color || null,
				clarity: item.clarity || null,
				cut: item.cut || null,
				price_per_carat: parseFloat(String(item.pricePerCarat ?? item.price_per_carat ?? 0)),
				total_price: parseFloat(String(item.price ?? item.total_price ?? 0)),
				stock_quantity: parseInt(String(item.inStock ?? item.stock ?? 0), 10),
				supplier: item.supplier || null,
				certificate_number: item.certificateNumber ?? item.certificate_number ?? null,
				is_active: (item.is_active === 1 || item.status === 'active') ? 1 : 1,
				// Tax rate fields
				tax_rate: parseFloat(String(item.taxRate ?? 5)),  // Default 5% for stones
				tax_included: item.taxIncluded ?? false,
				tax_category: item.taxCategory ?? 'gemstones',
				updated_at: new Date().toISOString(),
			};
		});
		if (stonesDataArray.length > 0) {
			await sb.from('stones').upsert(stonesDataArray, { onConflict: 'id' });
			totalUploaded += stonesDataArray.length;
		}
	}

	// Sale Items (map to Supabase 'sale_items' table)
	const saleItems = (await idbGet<any[]>('sale_items')) ?? [];
	if (saleItems.length > 0) {
		const saleItemsDataArray = saleItems.map((item: any) => ({
			id: String(item.id),
			sale_id: String(item.saleId ?? item.sale_id ?? ''),
			product_id: String(item.productId ?? item.product_id ?? ''),
			product_name: String(item.productName ?? item.product_name ?? ''),
			quantity: parseInt(String(item.quantity ?? 0), 10),
			unit_price: parseFloat(String(item.unitPrice ?? item.unit_price ?? 0)),
			total_price: parseFloat(String(item.totalPrice ?? item.total_price ?? 0)),
			created_at: item.created_at || new Date().toISOString(),
		}));
		if (saleItemsDataArray.length > 0) {
			await sb.from('sale_items').upsert(saleItemsDataArray, { onConflict: 'id' });
		}
	}

	// Sales/Invoices (map to Supabase 'sales' + 'sale_items' tables - normalized structure)
	const inv = (await getUserData<any[]>('pos_recentInvoices')) ?? [];
	if (inv.length > 0) {
		// Transform embedded invoices to normalized sales + sale_items
		for (const invoice of inv) {
			// Try to find customer_id from customer_name
			let customer_id = null;
			if (invoice.customerName && invoice.customerName !== 'Walk-in Customer') {
				const customers = (await getUserData<any[]>('customers')) ?? [];
				const customer = customers.find((c: any) => c.name === invoice.customerName);
				if (customer) {
					customer_id = customer.id;
				}
			}
			
			// Insert into sales table
			await sb.from('sales').upsert({
				id: invoice.id,
				user_id: userId, // CRITICAL: Include user_id for data isolation
				customer_id: customer_id,
				customer_name: invoice.customerName || 'Walk-in Customer',
				customer_phone: invoice.customerPhone || null,
				customer_email: invoice.customerEmail || null,
				total_amount: invoice.total,
				tax_amount: invoice.tax,
				discount_amount: invoice.discount || 0,
				payment_method: invoice.paymentMethod,
				payment_status: invoice.paymentStatus || 'completed',
				transaction_id: invoice.transactionId || null,
				notes: invoice.notes || null,
				created_at: invoice.date,
				updated_at: new Date().toISOString(),
			}, { onConflict: 'id' });

			// Insert items into sale_items table
			if (invoice.items && invoice.items.length > 0) {
				const saleItems = invoice.items.map((item: any, index: number) => ({
					id: `${invoice.id}-item-${index}`,
					sale_id: invoice.id,
					product_id: item.id || `${item.name}-${index}`,
					product_name: item.name,
					quantity: item.quantity,
					unit_price: item.price,
					total_price: item.price * item.quantity,
					created_at: invoice.date,
				}));

				// Delete existing sale_items for this sale first
				await sb.from('sale_items').delete().eq('sale_id', invoice.id);
				
				// Insert new sale_items
				if (saleItems.length > 0) {
					await sb.from('sale_items').insert(saleItems);
				}
			}
		}
	}

	// Customers - Transform local structure to Supabase format
	const customers = (await getUserData<any[]>('customers')) ?? [];
	if (customers.length > 0) {
		await sb.from('customers').upsert(
			customers.map((c) => ({
				id: c.id,
				user_id: userId, // CRITICAL: Include user_id for data isolation
				name: String(c.name || ''),
				phone: String(c.phone || ''),
				email: String(c.email || ''),
				address: String(c.address || ''),
				city: c.city || null,
				state: c.state || null,
				pincode: c.pincode || null,
				date_of_birth: c.dateOfBirth ?? c.date_of_birth ?? null,
				anniversary_date: c.anniversaryDate ?? c.anniversary_date ?? null,
				customer_type: c.customer_type || c.customerType || 'regular',
				total_purchases: parseFloat(String(c.totalPurchases ?? c.total_purchases ?? 0)),
				ledger_balance: parseFloat(String(c.currentBalance ?? c.ledger_balance ?? c.current_balance ?? 0)),
				last_purchase_date: c.lastPurchaseDate ?? c.last_purchase_date ?? null,
				notes: c.notes || null,
				is_active: (c.status === 'active' || c.is_active === 1) ? 1 : 1,
				updated_at: new Date().toISOString(),
			})),
			{ onConflict: 'id' }
		);
	}

	// Craftsmen - Transform local structure to Supabase format
	const craftsmen = (await getUserData<any[]>('craftsmen')) ?? [];
	if (craftsmen.length > 0) {
		await sb.from('craftsmen').upsert(
			craftsmen.map((c) => {
				// Parse experience - handle both string ("15 years") and number
				let experience = 0;
				if (c.experience !== undefined) {
					if (typeof c.experience === 'string') {
						const match = c.experience.match(/(\d+)/);
						experience = match ? parseInt(match[1]) : 0;
					} else {
						experience = parseInt(String(c.experience)) || 0;
					}
				}
				
				// Map status: local may have 'active'|'busy'|'available'|'on-leave'
				// Supabase expects 'available'|'busy'|'unavailable'
				let status = 'available';
				if (c.status) {
					if (c.status === 'active' || c.status === 'available') {
						status = 'available';
					} else if (c.status === 'busy') {
						status = 'busy';
					} else {
						status = 'unavailable';
					}
				}
				
				return {
					id: c.id,
					user_id: userId, // CRITICAL: Include user_id for data isolation
					name: String(c.name || ''),
					specialty: String(c.specialty || ''),
					experience: experience,
					phone: String(c.phone || c.contact || ''),
					email: String(c.email || ''),
					address: String(c.address || ''),
					status: status,
					rating: parseFloat(String(c.rating || 0.0)) || 0.0,
					created_at: c.created_at || new Date().toISOString(),
					updated_at: new Date().toISOString(),
				};
			}),
			{ onConflict: 'id' }
		);
	}

	// Customer Ledger (map to Supabase 'customer_ledger' table)
	const transactions = (await getUserData<any[]>('customer_transactions')) ?? [];
	if (transactions.length > 0) {
		// Get customers list once (outside map to avoid async issues)
		const customers = (await getUserData<any[]>('customers')) ?? [];
		
		const ledgerDataArray = transactions.map((t) => {
			// Validate required fields
			if (!t.id || !String(t.id).trim()) {
				console.warn('⚠️ Skipping customer_transaction without valid ID:', t);
				return null;
			}
			if (!t.customerId || !String(t.customerId).trim()) {
				console.warn(`⚠️ Skipping customer_transaction ${t.id} without valid customerId:`, t.customerId);
				return null;
			}
			
			// Verify customer exists (to avoid foreign key constraint errors)
			const customerExists = customers.some((c: any) => String(c.id) === String(t.customerId));
			if (!customerExists) {
				console.warn(`⚠️ Skipping customer_transaction ${t.id} - customer ${t.customerId} does not exist in customers table`);
				return null;
			}
			
			// Map transaction type - ensure it matches Supabase CHECK constraint: ('sale', 'payment', 'refund', 'adjustment')
			let transaction_type = 'adjustment';
			if (t.type === 'purchase') {
				transaction_type = 'sale';
			} else if (t.type === 'payment') {
				transaction_type = 'payment';
			} else if (t.type === 'refund') {
				transaction_type = 'refund';
			} else if (t.type === 'credit_adjustment' || t.type === 'adjustment') {
				transaction_type = 'adjustment';
			}
			
			// Validate and parse amounts to DECIMAL(10, 2)
			const amount = parseFloat(String(t.amount ?? 0)) || 0;
			const balance_before = parseFloat(String(t.balanceBefore ?? 0)) || 0;
			// balance_after calculation:
			// - sale: balance increases (customer owes more)
			// - payment: balance decreases (customer pays)
			// - refund: balance decreases (money returned)
			// - adjustment: can be positive or negative
			let balance_after = parseFloat(String(t.balanceAfter ?? 0));
			if (t.balanceAfter === undefined || t.balanceAfter === null || isNaN(balance_after)) {
				// Calculate balance_after if not provided or invalid
				if (transaction_type === 'sale') {
					balance_after = balance_before + amount; // Customer owes more
				} else if (transaction_type === 'payment') {
					balance_after = balance_before - amount; // Customer pays, owes less
				} else if (transaction_type === 'refund') {
					balance_after = balance_before - amount; // Refund reduces balance
				} else {
					// adjustment - can go either way, default to using provided amount direction
					balance_after = balance_before + amount;
				}
			}
			
			// Cap to DECIMAL(10, 2) limits
			const MAX_DECIMAL = 99999999.99;
			const capDecimal = (val: number) => Math.min(Math.max(val, -MAX_DECIMAL), MAX_DECIMAL);
			
			// Ensure all required fields are valid
			const ledgerRecord: any = {
				id: String(t.id).trim(),
				user_id: userId, // CRITICAL: Include user_id for data isolation
				customer_id: String(t.customerId).trim(), // Required NOT NULL
				transaction_type: transaction_type, // Required NOT NULL, must match CHECK constraint
				amount: capDecimal(amount), // Required NOT NULL, DECIMAL(10, 2)
				balance_before: capDecimal(balance_before), // Required NOT NULL, DECIMAL(10, 2)
				balance_after: capDecimal(balance_after), // Required NOT NULL, DECIMAL(10, 2)
				created_at: t.date || new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};
			
			// Optional fields
			if (t.invoiceId && String(t.invoiceId).trim()) {
				ledgerRecord.sale_id = String(t.invoiceId).trim();
			}
			if (t.paymentMethod && String(t.paymentMethod).trim()) {
				ledgerRecord.payment_method = String(t.paymentMethod).trim();
			}
			if (t.description && String(t.description).trim()) {
				ledgerRecord.notes = String(t.description).trim();
			}
			
			return ledgerRecord;
		}).filter((item: any) => item !== null);
		
		if (ledgerDataArray.length > 0) {
			try {
				const { error } = await sb.from('customer_ledger').upsert(ledgerDataArray, { onConflict: 'id' });
				if (error) {
					console.error('❌ Customer ledger backfill error:', error);
					console.error('❌ Failed data sample (first item):', ledgerDataArray[0] ? JSON.stringify(ledgerDataArray[0], null, 2) : 'No items');
					console.error('❌ Error details:', error.message, error.details, error.hint);
					throw error;
				}
			} catch (error: any) {
				console.error('❌ Error upserting customer_ledger:', error);
				// Continue with other tables instead of failing completely
			}
		}
	}

	// Categories
	const categories = (await idbGet<any[]>('categories')) ?? [];
	if (categories.length > 0) {
		await sb.from('categories').upsert(categories, { onConflict: 'id' });
	}

	// Products
	const products = (await idbGet<any[]>('products')) ?? [];
	if (products.length > 0) {
		await sb.from('products').upsert(products, { onConflict: 'id' });
	}

	// Attendance
	const attendance = (await idbGet<any[]>('attendance')) ?? [];
	if (attendance.length > 0) {
		await sb.from('attendance').upsert(attendance, { onConflict: 'id' });
	}

	// Performance
	const performance = (await idbGet<any[]>('performance')) ?? [];
	if (performance.length > 0) {
		await sb.from('performance').upsert(performance, { onConflict: 'id' });
	}

	// Training
	const training = (await idbGet<any[]>('training')) ?? [];
	if (training.length > 0) {
		await sb.from('training').upsert(training, { onConflict: 'id' });
	}

	// Salary Rules
	const salaryRules = (await idbGet<any[]>('salary_rules')) ?? [];
	if (salaryRules.length > 0) {
		await sb.from('salary_rules').upsert(salaryRules, { onConflict: 'id' });
	}

	// Materials
	const materials = (await idbGet<any[]>('materials')) ?? [];
	if (materials.length > 0) {
		await sb.from('materials').upsert(materials, { onConflict: 'id' });
	}

	// Materials Assigned
	const materialsAssigned = (await idbGet<any[]>('materials_assigned')) ?? [];
	if (materialsAssigned.length > 0) {
		await sb.from('materials_assigned').upsert(materialsAssigned, { onConflict: 'id' });
	}

	// Projects
	const projects = (await idbGet<any[]>('projects')) ?? [];
	if (projects.length > 0) {
		await sb.from('projects').upsert(projects, { onConflict: 'id' });
	}

	// Transactions (general transaction log)
	const generalTransactions = (await idbGet<any[]>('transactions')) ?? [];
	if (generalTransactions.length > 0) {
		await sb.from('transactions').upsert(generalTransactions, { onConflict: 'id' });
	}

	// Settings - convert from component storage to key-value format
	const businessSettings = await getUserData<any>('businessSettings');
	const paymentSettings = await getUserData<any>('paymentSettings');
	const notificationSettings = await getUserData<any>('notificationSettings');
	
	const settingsArray: any[] = [];
	
	// Convert businessSettings to key-value pairs
	if (businessSettings) {
		Object.entries(businessSettings).forEach(([key, value]) => {
			settingsArray.push({
				key: `business_${key}`,
				value: typeof value === 'string' ? value : JSON.stringify(value),
				user_id: userId, // CRITICAL: Include user_id for data isolation
				updated_at: new Date().toISOString(),
			});
		});
	}
	
	// Convert paymentSettings to key-value pairs
	if (paymentSettings) {
		Object.entries(paymentSettings).forEach(([key, value]) => {
			settingsArray.push({
				key: `payment_${key}`,
				value: typeof value === 'string' ? value : JSON.stringify(value),
				user_id: userId, // CRITICAL: Include user_id for data isolation
				updated_at: new Date().toISOString(),
			});
		});
	}
	
	// Convert notificationSettings to key-value pairs
	if (notificationSettings) {
		Object.entries(notificationSettings).forEach(([key, value]) => {
			settingsArray.push({
				key: `notification_${key}`,
				value: JSON.stringify(value),
				user_id: userId, // CRITICAL: Include user_id for data isolation
				updated_at: new Date().toISOString(),
			});
		});
	}
	
	// Also include any existing settings from the settings array
	const existingSettings = (await getUserData<any[]>('settings')) ?? [];
	existingSettings.forEach((setting: any) => {
		// Only add if not already in array (avoid duplicates)
		if (!settingsArray.find(s => s.key === setting.key)) {
			settingsArray.push({
				...setting,
				user_id: userId, // CRITICAL: Include user_id for data isolation
				updated_at: setting.updated_at || new Date().toISOString(),
			});
		}
	});

	// Upload gold rate settings
	const goldRateSettings = (await getUserData<any>('gold_rate_settings'));
	if (goldRateSettings && goldRateSettings.currentRates) {
		const rates = goldRateSettings.currentRates;
		const making = goldRateSettings.makingCharges;
		
		const goldRateData = {
			user_id: userId,
			rate_24k: parseFloat(String(rates.rate24K ?? 6800)),
			rate_22k: parseFloat(String(rates.rate22K ?? 6200)),
			rate_18k: parseFloat(String(rates.rate18K ?? 5100)),
			rate_14k: parseFloat(String(rates.rate14K ?? 4000)),
			making_24k: parseFloat(String(making.gold24K?.value ?? 600)),
			making_22k: parseFloat(String(making.gold22K?.value ?? 550)),
			making_18k: parseFloat(String(making.gold18K?.value ?? 500)),
			making_14k: parseFloat(String(making.gold14K?.value ?? 450)),
			min_making_24k: parseFloat(String(making.gold24K?.minimumCharge ?? 500)),
			min_making_22k: parseFloat(String(making.gold22K?.minimumCharge ?? 450)),
			min_making_18k: parseFloat(String(making.gold18K?.minimumCharge ?? 400)),
			min_making_14k: parseFloat(String(making.gold14K?.minimumCharge ?? 350)),
			is_active: true,
			updated_by: rates.updatedBy || null,
			updated_at: rates.lastUpdated || new Date().toISOString(),
		};
		
		try {
			// First, deactivate all existing rates for this user
			await sb.from('gold_rates').update({ is_active: false }).eq('user_id', userId).eq('is_active', true);
			
			// Then insert new rate
			const { error } = await sb.from('gold_rates').insert(goldRateData);
			if (error) {
				console.error('❌ Gold rate upload error:', error);
			} else {
				totalUploaded++;
			}
		} catch (e) {
			console.error('❌ Error uploading gold rates:', e);
		}
	}
	
	if (settingsArray.length > 0) {
		await sb.from('settings').upsert(settingsArray, { onConflict: 'key,user_id' });
	}

	// Final summary
	const duration = ((Date.now() - startTime) / 1000).toFixed(2);
}

async function pushQueue() {
	const db = await getDB();
	
	// Get current user ID - CRITICAL for data isolation
	const userId = await getCurrentUserId();
	if (!userId) {
		console.warn('⚠️ No user ID found, skipping pushQueue');
		return;
	}
	
	// First, read all changes (within a read transaction)
	let all: ChangeOp[] = [];
	{
		const tx = db.transaction('changeQueue', 'readonly');
		const store = tx.objectStore('changeQueue');
		const index = store.index('byCreated');
		let cursor = await index.openCursor();
		while (cursor) {
			all.push(cursor.value as ChangeOp);
			cursor = await cursor.continue();
		}
		await tx.done;
	}

	if (all.length === 0) {
		return;
	}

	const supabase = getSupabase();
	const schema = ((import.meta as any).env?.VITE_SUPABASE_SCHEMA as string) || 'public';
	const sb = (supabase as any).schema ? (supabase as any).schema(schema) : supabase;
	
	// Process changes and collect successful ones to delete
	const successfulChanges: string[] = [];
	
	// Process all sync operations (async Supabase calls)
	for (const change of all) {
		try {
			// Map web app table name to Supabase table name
			const supabaseTable = WEB_TO_SUPABASE_MAPPING[change.table] || change.table;
			
			if (change.action === 'delete') {
				// Special handling for sales/invoices (need to delete sale_items too)
				if (change.table === 'pos_recentInvoices' || supabaseTable === 'sales') {
					// Delete from sale_items first (foreign key constraint)
					await sb.from('sale_items').delete().eq('sale_id', change.payload?.id).eq('user_id', userId);
					// Then delete from sales table with user_id filter
					const { error: salesError } = await sb.from('sales').delete().eq('id', change.payload?.id).eq('user_id', userId);
					if (salesError && salesError.code === '42703') {
						// user_id column doesn't exist, try without it
						await sb.from('sales').delete().eq('id', change.payload?.id);
					}
				} else {
					// Delete with user_id filter for data isolation
					const { error: deleteError } = await sb.from(supabaseTable).delete().eq('id', change.payload?.id).eq('user_id', userId);
					if (deleteError && deleteError.code === '42703') {
						// user_id column doesn't exist, try without it
						await sb.from(supabaseTable).delete().eq('id', change.payload?.id);
					}
				}
				successfulChanges.push(change.id);
			} else {
				// Special handling for invoices (transform embedded to normalized)
				if (change.table === 'pos_recentInvoices') {
					const invoice = change.payload;
					
					// Try to find customer_id from customer_name
					let customer_id = null;
					if (invoice.customerName && invoice.customerName !== 'Walk-in Customer') {
						const customers = (await getUserData<any[]>('customers')) ?? [];
						const customer = customers.find((c: any) => c.name === invoice.customerName);
						if (customer) {
							customer_id = customer.id;
						}
					}
					
					// Insert/update sales table with user_id
					await sb.from('sales').upsert({
						id: invoice.id,
						user_id: userId, // CRITICAL: Include user_id for data isolation
						customer_id: customer_id,
						customer_name: invoice.customerName || 'Walk-in Customer',
						customer_phone: invoice.customerPhone || null,
						customer_email: invoice.customerEmail || null,
						total_amount: invoice.total,
						tax_amount: invoice.tax,
						discount_amount: invoice.discount || 0,
						payment_method: invoice.paymentMethod,
						payment_status: invoice.paymentStatus || 'completed',
						transaction_id: invoice.transactionId || null,
						notes: invoice.notes || null,
						created_at: invoice.date,
						updated_at: new Date().toISOString(),
					}, { onConflict: 'id' });

					// Handle sale_items
					if (invoice.items && invoice.items.length > 0) {
						// Delete existing items
						await sb.from('sale_items').delete().eq('sale_id', invoice.id);
						
						// Insert new items with user_id
						const saleItems = invoice.items.map((item: any, index: number) => ({
							id: `${invoice.id}-item-${index}`,
							user_id: userId, // CRITICAL: Include user_id for data isolation
							sale_id: invoice.id,
							product_id: item.id || `${item.name}-${index}`,
							product_name: item.name,
							quantity: item.quantity,
							unit_price: item.price,
							total_price: item.price * item.quantity,
							created_at: invoice.date,
						}));
						
						if (saleItems.length > 0) {
							await sb.from('sale_items').insert(saleItems);
						}
					}
					successfulChanges.push(change.id);
				} else if (change.table === 'inventory_items') {
					// Transform inventory_items to inventory format - EXACT schema match
					// IMPORTANT: Remove image fields from payload to avoid syncing large base64 data
					const { image, image_url, images, ...itemWithoutImages } = change.payload;
					const item = itemWithoutImages;
					
					// Map item_type to category (must be: gold, stones, jewelry, artificial)
					let category = 'jewelry';
					if (item.item_type) {
						const typeMap: Record<string, string> = {
							'gold': 'gold',
							'stone': 'stones',
							'stones': 'stones',
							'jewelry': 'jewelry',
							'artificial': 'artificial'
						};
						category = typeMap[item.item_type.toLowerCase()] || 'jewelry';
					} else if (item.category) {
						category = item.category.toLowerCase();
						if (!['gold', 'stones', 'jewelry', 'artificial'].includes(category)) {
							category = 'jewelry';
						}
					}
					
					// Validate required fields
					if (!item.id) {
						console.warn('⚠️ Skipping inventory item without ID:', item);
						continue;
					}
					
					// Build inventory data matching EXACT Supabase schema
					// Explicitly exclude all image-related fields
					
					// Validate and cap price to DECIMAL(10, 2) limit: max 99999999.99
					let price = parseFloat(String(item.price || 0));
					const MAX_PRICE = 99999999.99; // DECIMAL(10, 2) maximum
					if (price > MAX_PRICE) {
						console.warn(`⚠️ Price ${price} exceeds maximum ${MAX_PRICE}, capping to maximum`);
						price = MAX_PRICE;
					}
					if (isNaN(price) || price < 0) price = 0;
					
					const inventoryData: any = {
						id: String(item.id),
						user_id: userId, // CRITICAL: Include user_id for data isolation
						name: String(item.name || 'Unnamed Item'),
						category: category,
						subcategory: String(item.type || item.subcategory || 'general'),
						price: price,
						stock: parseInt(String(item.inStock ?? item.stock ?? 0), 10),
						updated_at: new Date().toISOString(),
					};
					
					// Add optional fields based on schema - check both direct field and attributes object
					// weight DECIMAL(10, 3) - check attributes.weight first (common pattern)
					// Validate and cap weight to DECIMAL(10, 3) limit: max 9999999.999
					const weightValue = item.attributes?.weight ?? item.weight;
					if (weightValue !== undefined && weightValue !== null && weightValue !== '') {
						let weight = parseFloat(String(weightValue));
						if (!isNaN(weight)) {
							const MAX_WEIGHT = 9999999.999; // DECIMAL(10, 3) maximum
							if (weight > MAX_WEIGHT) {
								console.warn(`⚠️ Weight ${weight} exceeds maximum ${MAX_WEIGHT}, capping to maximum`);
								weight = MAX_WEIGHT;
							}
							if (weight < 0) weight = 0;
							inventoryData.weight = weight;
						}
					}
					// purity TEXT - check attributes.purity, attributes.metal, then direct fields
					const purityValue = item.attributes?.purity ?? item.attributes?.metal ?? item.purity ?? item.metal;
					if (purityValue !== undefined && purityValue !== null && purityValue !== '') {
						inventoryData.purity = String(purityValue);
					}
					// description TEXT - check both direct field and attributes object
					const descriptionValue = item.description ?? item.attributes?.description;
					if (descriptionValue !== undefined && descriptionValue !== null && descriptionValue !== '') {
						inventoryData.description = String(descriptionValue);
					}
					// Sync image_url to Supabase if it's a valid URL (not base64 or emoji)
					// Skip base64 data (starts with 'data:') and emojis (single Unicode character)
					const imageValue = item.image ?? item.image_url ?? item.images?.[0] ?? '';
					if (imageValue && typeof imageValue === 'string') {
						const trimmedImage = imageValue.trim();
						// Check if it's a valid URL (http/https) or a data URL that's reasonably small
						if (trimmedImage.startsWith('http://') || trimmedImage.startsWith('https://')) {
							// Valid HTTP/HTTPS URL - sync it
							inventoryData.image_url = trimmedImage;
						} else if (trimmedImage.startsWith('data:image/')) {
							// Base64 image - check size (skip if too large, > 100KB)
							const base64Length = trimmedImage.length;
							const estimatedSizeKB = (base64Length * 3) / 4 / 1024; // Approximate size
							if (estimatedSizeKB < 100) {
								// Small base64 - allow it
								inventoryData.image_url = trimmedImage;
							} else {
								console.warn(`⚠️ Skipping large base64 image for item ${inventoryData.id} (${estimatedSizeKB.toFixed(2)}KB)`);
							}
						}
						// Skip emojis and invalid formats
					}
					
					// Note: isMissing and isArtificial columns may not exist in all Supabase schemas
					// Only include them if they exist in your schema
					// Uncomment the following if your Supabase schema has these columns:
					// if (item.isMissing !== undefined) {
					// 	inventoryData.isMissing = item.isMissing ? 1 : 0;
					// }
					// if (item.isArtificial !== undefined) {
					// 	inventoryData.isArtificial = item.isArtificial ? 1 : 0;
					// }
					// Images: Do NOT sync images to Supabase - keep them local only
					// Images are stored in IndexedDB and not synced to avoid large payloads
					
					const { data, error } = await sb.from('inventory').upsert(inventoryData, { onConflict: 'id' });
					if (error) {
						console.error('❌ Inventory upsert error:', error);
						console.error('❌ Failed data:', JSON.stringify(inventoryData, null, 2));
						console.error('❌ Original item:', JSON.stringify(item, null, 2));
						// Don't throw - continue with other items
						continue;
					}
					successfulChanges.push(change.id);
				} else if (change.table === 'gold_items') {
					// Transform gold_items to gold table format
					const item = change.payload;
					if (!item.id) {
						console.warn('⚠️ Skipping gold item without ID:', item);
						continue;
					}
					const { image, image_url, images, ...itemWithoutImages } = item;
					const goldData: any = {
						id: String(item.id),
						name: String(item.name || 'Unnamed Gold'),
						purity: String(item.purity || ''),
						weight: parseFloat(String(item.weight || 0)),
						price_per_gram: parseFloat(String(item.pricePerGram ?? item.price_per_gram ?? 0)),
						total_price: parseFloat(String(item.price ?? item.total_price ?? 0)),
						in_stock: parseInt(String(item.inStock ?? item.stock ?? 0), 10),
						supplier: item.supplier || null,
						description: item.description || null,
						updated_at: new Date().toISOString(),
					};
					if (goldData.image_url) delete goldData.image_url;
					const { error } = await sb.from('gold').upsert(goldData, { onConflict: 'id' });
					if (error) {
						console.error('❌ Gold upsert error:', error);
						continue;
					}
					successfulChanges.push(change.id);
				} else if (change.table === 'jewelry_items') {
					// Transform jewelry_items to jewelry table format
					const item = change.payload;
					if (!item.id) {
						console.warn('⚠️ Skipping jewelry item without ID:', item);
						continue;
					}
					const { image, image_url, images, ...itemWithoutImages } = item;
					const jewelryData: any = {
						id: String(item.id),
						name: String(item.name || 'Unnamed Jewelry'),
						type: String(item.type || ''),
						gemstone: item.gemstone || null,
						carat: parseFloat(String(item.carat || 0)),
						metal: item.metal || null,
						price: parseFloat(String(item.price || 0)),
						in_stock: parseInt(String(item.inStock ?? item.stock ?? 0), 10),
						is_artificial: (item.isArtificial === true || item.is_artificial === 1) ? 1 : 0,
						description: item.description || null,
						updated_at: new Date().toISOString(),
					};
					if (jewelryData.image_url) delete jewelryData.image_url;
					const { error } = await sb.from('jewelry').upsert(jewelryData, { onConflict: 'id' });
					if (error) {
						console.error('❌ Jewelry upsert error:', error);
						continue;
					}
					successfulChanges.push(change.id);
				} else if (change.table === 'stones_items') {
					// Transform stones_items to stones table format
					const item = change.payload;
					if (!item.id) {
						console.warn('⚠️ Skipping stone item without ID:', item);
						continue;
					}
					const { image, image_url, images, ...itemWithoutImages } = item;
					const stonesData: any = {
						id: String(item.id),
						name: String(item.name || 'Unnamed Stone'),
						type: String(item.type || ''),
						carat_weight: parseFloat(String(item.carat ?? item.carat_weight ?? 0)),
						color: item.color || null,
						clarity: item.clarity || null,
						cut: item.cut || null,
						price_per_carat: parseFloat(String(item.pricePerCarat ?? item.price_per_carat ?? 0)),
						total_price: parseFloat(String(item.price ?? item.total_price ?? 0)),
						stock_quantity: parseInt(String(item.inStock ?? item.stock ?? 0), 10),
						supplier: item.supplier || null,
						certificate_number: item.certificateNumber ?? item.certificate_number ?? null,
						is_active: (item.is_active === 1 || item.status === 'active') ? 1 : 1,
						updated_at: new Date().toISOString(),
					};
					if (stonesData.image_url) delete stonesData.image_url;
					const { error } = await sb.from('stones').upsert(stonesData, { onConflict: 'id' });
					if (error) {
						console.error('❌ Stones upsert error:', error);
						continue;
					}
					successfulChanges.push(change.id);
				} else if (change.table === 'sale_items') {
					// Transform sale_items to Supabase format
					const item = change.payload;
					if (!item.id) {
						console.warn('⚠️ Skipping sale item without ID:', item);
						continue;
					}
					const saleItemData: any = {
						id: String(item.id),
						sale_id: String(item.saleId ?? item.sale_id ?? ''),
						product_id: String(item.productId ?? item.product_id ?? ''),
						product_name: String(item.productName ?? item.product_name ?? ''),
						quantity: parseInt(String(item.quantity ?? 0), 10),
						unit_price: parseFloat(String(item.unitPrice ?? item.unit_price ?? 0)),
						total_price: parseFloat(String(item.totalPrice ?? item.total_price ?? 0)),
						created_at: item.created_at || new Date().toISOString(),
					};
					const { error } = await sb.from('sale_items').upsert(saleItemData, { onConflict: 'id' });
					if (error) {
						console.error('❌ Sale items upsert error:', error);
						continue;
					}
					successfulChanges.push(change.id);
				} else if (change.table === 'staff_employees') {
					// Transform staff_employees to staff format
					const emp = change.payload;
					await sb.from('staff').upsert({
						id: emp.id,
						user_id: userId, // CRITICAL: Include user_id for data isolation
						name: emp.name,
						email: emp.email,
						phone: emp.phone,
						role: emp.role,
						department: emp.department,
						salary: emp.salary,
						is_active: emp.status === 'active' ? 1 : 0,
						hire_date: emp.hireDate,
						address: emp.address,
						emergency_contact: emp.emergencyContact,
						emergency_phone: emp.emergencyPhone,
						updated_at: new Date().toISOString(),
					}, { onConflict: 'id' });
					successfulChanges.push(change.id);
				} else if (change.table === 'customer_transactions') {
					// Transform customer_transactions to customer_ledger format
					const trans = change.payload;
					
					// Validate required fields
					if (!trans.id || !String(trans.id).trim()) {
						console.warn('⚠️ Skipping customer_transaction without valid ID:', trans);
						continue;
					}
					if (!trans.customerId || !String(trans.customerId).trim()) {
						console.warn(`⚠️ Skipping customer_transaction ${trans.id} without valid customerId:`, trans.customerId);
						continue;
					}
					
					// Verify customer exists (to avoid foreign key constraint errors)
					// Note: We check this but don't block - if customer doesn't exist, Supabase will reject with foreign key error
					// This is just a warning/pre-check
					const customers = (await getUserData<any[]>('customers')) ?? [];
					const customerExists = customers.some((c: any) => String(c.id) === String(trans.customerId));
					if (!customerExists) {
						console.warn(`⚠️ Warning: customer_transaction ${trans.id} references customer ${trans.customerId} which may not exist in Supabase`);
						// Continue anyway - let Supabase handle the foreign key constraint
					}
					
					// Map transaction type - must match CHECK constraint: ('sale', 'payment', 'refund', 'adjustment')
					let transaction_type = 'adjustment';
					if (trans.type === 'purchase') {
						transaction_type = 'sale';
					} else if (trans.type === 'payment') {
						transaction_type = 'payment';
					} else if (trans.type === 'refund') {
						transaction_type = 'refund';
					} else if (trans.type === 'credit_adjustment' || trans.type === 'adjustment') {
						transaction_type = 'adjustment';
					}
					
					// Validate and parse amounts
					const amount = parseFloat(String(trans.amount ?? 0)) || 0;
					const balance_before = parseFloat(String(trans.balanceBefore ?? 0)) || 0;
					let balance_after = parseFloat(String(trans.balanceAfter ?? 0));
					if (trans.balanceAfter === undefined || trans.balanceAfter === null || isNaN(balance_after)) {
						// Calculate if not provided or invalid
						if (transaction_type === 'sale') {
							balance_after = balance_before + amount; // Customer owes more
						} else if (transaction_type === 'payment') {
							balance_after = balance_before - amount; // Customer pays, owes less
						} else if (transaction_type === 'refund') {
							balance_after = balance_before - amount; // Refund reduces balance
						} else {
							// adjustment - default to using provided amount
							balance_after = balance_before + amount;
						}
					}
					
					// Cap to DECIMAL(10, 2) limits
					const MAX_DECIMAL = 99999999.99;
					const capDecimal = (val: number) => Math.min(Math.max(val, -MAX_DECIMAL), MAX_DECIMAL);
					
					try {
						// Build ledger record with only valid fields
						const ledgerRecord: any = {
							id: String(trans.id).trim(),
							user_id: userId, // CRITICAL: Include user_id for data isolation
							customer_id: String(trans.customerId).trim(),
							transaction_type: transaction_type,
							amount: capDecimal(amount),
							balance_before: capDecimal(balance_before),
							balance_after: capDecimal(balance_after),
							created_at: trans.date || new Date().toISOString(),
							updated_at: new Date().toISOString(),
						};
						
						// Add optional fields only if they have values
						if (trans.invoiceId && String(trans.invoiceId).trim()) {
							ledgerRecord.sale_id = String(trans.invoiceId).trim();
						}
						if (trans.paymentMethod && String(trans.paymentMethod).trim()) {
							ledgerRecord.payment_method = String(trans.paymentMethod).trim();
						}
						if (trans.description && String(trans.description).trim()) {
							ledgerRecord.notes = String(trans.description).trim();
						}
						
						const { error } = await sb.from('customer_ledger').upsert(ledgerRecord, { onConflict: 'id' });
						
						if (error) {
							console.error('❌ Customer ledger upsert error:', error);
							console.error('❌ Failed data:', JSON.stringify(trans, null, 2));
							continue; // Skip this item but continue with others
						}
						
						successfulChanges.push(change.id);
					} catch (e: any) {
						console.error('❌ Exception upserting customer_ledger:', e);
						continue;
					}
				} else if (change.table === 'craftsmen') {
					// Transform craftsmen from local structure to Supabase format
					const craftsman = change.payload;
					
					// Validate required fields
					if (!craftsman.id) {
						console.warn('⚠️ Skipping craftsman without ID:', craftsman);
						continue;
					}
					
					// Map local fields to Supabase fields
					// Local may have: contact, specialty, experience (string or number), status, etc.
					// Supabase expects: phone, specialty, experience (INTEGER), status ('available'|'busy'|'unavailable')
					let experience = 0;
					if (craftsman.experience !== undefined) {
						if (typeof craftsman.experience === 'string') {
							// Parse "15 years" or "15" to integer
							const match = craftsman.experience.match(/(\d+)/);
							experience = match ? parseInt(match[1]) : 0;
						} else {
							experience = parseInt(String(craftsman.experience)) || 0;
						}
					}
					
					// Map status: local has 'active'|'busy'|'available'|'on-leave', Supabase has 'available'|'busy'|'unavailable'
					let status = 'available';
					if (craftsman.status) {
						if (craftsman.status === 'active' || craftsman.status === 'available') {
							status = 'available';
						} else if (craftsman.status === 'busy') {
							status = 'busy';
						} else {
							status = 'unavailable';
						}
					}
					
				const craftsmanData = {
					id: String(craftsman.id),
					name: String(craftsman.name || ''),
					specialty: String(craftsman.specialty || ''),
					experience: experience,
					phone: String(craftsman.phone || craftsman.contact || ''),
					email: String(craftsman.email || ''),
					address: String(craftsman.address || ''),
					status: status,
					rating: parseFloat(String(craftsman.rating || 0.0)) || 0.0,
					// Firm type fields
					type: craftsman.type || 'individual',
					firm_name: craftsman.firmName || null,
					firm_contact: craftsman.firmContact || null,
					firm_address: craftsman.firmAddress || null,
					firm_gst_number: craftsman.firmGSTNumber || null,
					contact_person: craftsman.contactPerson || null,
					// Payment tracking fields
					total_amount_due: parseFloat(String(craftsman.totalAmountDue || 0)) || 0,
					total_amount_paid: parseFloat(String(craftsman.totalAmountPaid || 0)) || 0,
					pending_amount: parseFloat(String(craftsman.pendingAmount || 0)) || 0,
					created_at: craftsman.created_at || new Date().toISOString(),
					updated_at: new Date().toISOString(),
				};
					
					// Add user_id to craftsman data
					const craftsmanDataWithUserId = {
						...craftsmanData,
						user_id: userId, // CRITICAL: Include user_id for data isolation
					};
					
					const { data, error } = await sb.from('craftsmen').upsert(craftsmanDataWithUserId, { onConflict: 'id' });
					if (error) {
						console.error('❌ Craftsmen upsert error:', error);
						console.error('❌ Failed data:', JSON.stringify(craftsmanData, null, 2));
						console.error('❌ Original item:', JSON.stringify(craftsman, null, 2));
						// Don't throw - continue with other items
						continue;
					}
					successfulChanges.push(change.id);
				} else if (change.table === 'customers') {
					// Transform customers to Supabase format - handle both camelCase and snake_case
					const customer = change.payload;
					await sb.from('customers').upsert({
						id: customer.id,
						user_id: userId, // CRITICAL: Include user_id for data isolation
						name: String(customer.name || ''),
						phone: String(customer.phone || ''),
						email: String(customer.email || ''),
						address: String(customer.address || ''),
						city: customer.city || null,
						state: customer.state || null,
						pincode: customer.pincode || null,
						date_of_birth: customer.dateOfBirth ?? customer.date_of_birth ?? null,
						anniversary_date: customer.anniversaryDate ?? customer.anniversary_date ?? null,
						customer_type: customer.customer_type || customer.customerType || 'regular',
						total_purchases: parseFloat(String(customer.totalPurchases ?? customer.total_purchases ?? 0)),
						ledger_balance: parseFloat(String(customer.currentBalance ?? customer.ledger_balance ?? customer.current_balance ?? 0)),
						last_purchase_date: customer.lastPurchaseDate ?? customer.last_purchase_date ?? null,
						notes: customer.notes || null,
						is_active: (customer.status === 'active' || customer.is_active === 1) ? 1 : 1,
						updated_at: customer.updated_at || new Date().toISOString(),
					}, { onConflict: 'id' });
					successfulChanges.push(change.id);
				} else {
					// Direct mapping for other tables (categories, products, attendance, performance, training, salary_rules, materials, materials_assigned, projects, transactions, settings)
					// Add user_id to payload for data isolation
					const payloadWithUserId = {
						...change.payload,
						user_id: userId, // CRITICAL: Include user_id for data isolation
					};
					
					// For settings table, use 'key' as the conflict column
					// CRITICAL: user_id is included in payload for data isolation, and sync queries filter by user_id
					if (supabaseTable === 'settings') {
						// Ensure key exists in payload
						if (!payloadWithUserId.key) {
							console.warn('⚠️ Skipping settings upsert without key:', payloadWithUserId);
							continue;
						}
						// Use 'key' for conflict resolution - user_id in payload ensures proper isolation
						await sb.from(supabaseTable).upsert(payloadWithUserId, { onConflict: 'key' });
					} else {
						await sb.from(supabaseTable).upsert(payloadWithUserId, { onConflict: 'id' });
					}
					successfulChanges.push(change.id);
				}
			}
		} catch (e) {
			console.error(`Error syncing ${change.table}:`, e);
			// Continue with next item instead of breaking
			// This allows other changes to sync even if one fails
			continue;
		}
	}
	
	// Delete successful changes from queue (in a separate write transaction)
	if (successfulChanges.length > 0) {
		const tx = db.transaction('changeQueue', 'readwrite');
		const store = tx.objectStore('changeQueue');
		for (const changeId of successfulChanges) {
			try {
				await store.delete(changeId);
			} catch (e) {
				console.warn(`Failed to delete change ${changeId} from queue:`, e);
			}
		}
		await tx.done;
	}
}
