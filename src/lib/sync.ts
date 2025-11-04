import { getSupabase } from '@/lib/supabase';
import { idbGet, idbSet, getDB } from '@/lib/indexedDb';

type Upserter<T> = (row: T) => Promise<void> | void;
type Deleter = (id: string) => Promise<void> | void;

async function syncTable<T>(
	table: string,
	upsert: Upserter<T>,
	remove: Deleter,
	sinceKey?: string
) {
	const lastKey = sinceKey ?? `sync:last_${table}`;
	const lastSyncAt = (await idbGet<string>(lastKey)) ?? '1970-01-01T00:00:00Z';
	const nowIso = new Date().toISOString();

	const supabase = getSupabase();
	const schema = ((import.meta as any).env?.VITE_SUPABASE_SCHEMA as string) || 'public';
	const sb = (supabase as any).schema ? (supabase as any).schema(schema) : supabase;
	const { data: updatedRows, error: upErr } = await sb
		.from(table)
		.select('*')
		.gt('updated_at', lastSyncAt)
		.order('updated_at', { ascending: true });
	if (upErr) throw upErr;

	for (const row of (updatedRows as T[] | null) ?? []) {
		await upsert(row);
	}

	const { data: deletedRows, error: delErr } = await sb
		.from(table)
		.select('id, deleted_at')
		.gt('deleted_at', lastSyncAt);
	if (delErr) throw delErr;

	for (const row of (deletedRows as { id: string }[] | null) ?? []) {
		await remove(row.id);
	}

	await idbSet(lastKey, nowIso);
}

export async function syncAll() {
	// First push local queued changes, then pull latest
	await pushQueue();
	const run = async (fn: () => Promise<void>) => {
		try { await fn(); } catch (e: any) {
			const msg = e?.message || '';
			// Ignore missing table/schema cache errors so app still works if a table isn't set up yet
			if (typeof msg === 'string' && (msg.includes('schema cache') || msg.includes('does not exist'))) {
				console.warn('Skipping sync for missing table:', msg);
				return;
			}
			throw e;
		}
	};

	// Employees
	await run(() => syncTable('employees', async (row: any) => {
		const employees = (await idbGet<any[]>('staff_employees')) ?? [];
		const idx = employees.findIndex((e) => e.id === row.id);
		if (idx >= 0) employees[idx] = row;
		else employees.push(row);
		await idbSet('staff_employees', employees);
	}, async (id: string) => {
		const employees = (await idbGet<any[]>('staff_employees')) ?? [];
		const filtered = employees.filter((e) => e.id !== id);
		await idbSet('staff_employees', filtered);
	}));

	// Craftsmen
	await run(() => syncTable('craftsmen', async (row: any) => {
		const list = (await idbGet<any[]>('craftsmen')) ?? [];
		const idx = list.findIndex((e) => e.id === row.id);
		if (idx >= 0) list[idx] = row; else list.push(row);
		await idbSet('craftsmen', list);
	}, async (id: string) => {
		const list = (await idbGet<any[]>('craftsmen')) ?? [];
		await idbSet('craftsmen', list.filter((e) => e.id !== id));
	}));

	// Inventory (single table, fan out by type into respective keys if desired)
	await run(() => syncTable('inventory_items', async (row: any) => {
		const all = (await idbGet<any[]>('inventory_items')) ?? [];
		const idx = all.findIndex((e) => e.id === row.id);
		if (idx >= 0) all[idx] = row; else all.push(row);
		await idbSet('inventory_items', all);

		// Optional: also project into per-page keys for current UI
		if (row.item_type === 'gold') {
			const gold = (await idbGet<any[]>('gold_items')) ?? [];
			const gi = gold.findIndex((e) => e.id === row.id);
			const mapped = { id: row.id, name: row.name, weight: row.attributes?.weight ?? '', purity: row.attributes?.purity ?? '', price: row.price ?? 0, image: row.image ?? '' };
			if (gi >= 0) gold[gi] = mapped; else gold.push(mapped);
			await idbSet('gold_items', gold);
		}
		if (row.item_type === 'jewelry') {
			const list = (await idbGet<any[]>('jewelry_items')) ?? [];
			const ji = list.findIndex((e) => e.id === row.id);
			const mapped = { id: row.id, name: row.name, description: row.attributes?.description ?? '', price: row.price ?? 0, image: row.image ?? '' };
			if (ji >= 0) list[ji] = mapped; else list.push(mapped);
			await idbSet('jewelry_items', list);
		}
		if (row.item_type === 'stone') {
			const list = (await idbGet<any[]>('stones_items')) ?? [];
			const si = list.findIndex((e) => e.id === row.id);
			const mapped = { id: row.id, name: row.name, carat: row.attributes?.carat ?? '', clarity: row.attributes?.clarity ?? '', cut: row.attributes?.cut ?? '', price: row.price ?? 0, image: row.image ?? '' };
			if (si >= 0) list[si] = mapped; else list.push(mapped);
			await idbSet('stones_items', list);
		}
	}, async (id: string) => {
		const all = (await idbGet<any[]>('inventory_items')) ?? [];
		await idbSet('inventory_items', all.filter((e) => e.id !== id));
		await idbSet('gold_items', ((await idbGet<any[]>('gold_items')) ?? []).filter((e) => e.id !== id));
		await idbSet('jewelry_items', ((await idbGet<any[]>('jewelry_items')) ?? []).filter((e) => e.id !== id));
		await idbSet('stones_items', ((await idbGet<any[]>('stones_items')) ?? []).filter((e) => e.id !== id));
	}));

	// POS invoices
	await run(() => syncTable('pos_invoices', async (row: any) => {
		const list = (await idbGet<any[]>('pos_recentInvoices')) ?? [];
		const idx = list.findIndex((e) => e.id === row.id);
		const mapped = { id: row.id, items: row.items ?? [], subtotal: row.subtotal ?? 0, tax: row.tax ?? 0, total: row.total ?? 0, date: row.date, customerName: row.customer_name ?? '', paymentMethod: row.payment_method ?? '' };
		if (idx >= 0) list[idx] = mapped; else list.unshift(mapped);
		await idbSet('pos_recentInvoices', list.slice(0, 5));
	}, async (id: string) => {
		const list = (await idbGet<any[]>('pos_recentInvoices')) ?? [];
		await idbSet('pos_recentInvoices', list.filter((e) => e.id !== id));
	}));

	// Customers
	await run(() => syncTable('customers', async (row: any) => {
		const list = (await idbGet<any[]>('customers')) ?? [];
		const idx = list.findIndex((e) => e.id === row.id);
		if (idx >= 0) list[idx] = row; else list.push(row);
		await idbSet('customers', list);
	}, async (id: string) => {
		const list = (await idbGet<any[]>('customers')) ?? [];
		await idbSet('customers', list.filter((e) => e.id !== id));
	}));

	// Customer transactions
	await run(() => syncTable('customer_transactions', async (row: any) => {
		const list = (await idbGet<any[]>('customer_transactions')) ?? [];
		const idx = list.findIndex((e) => e.id === row.id);
		if (idx >= 0) list[idx] = row; else list.push(row);
		await idbSet('customer_transactions', list);
	}, async (id: string) => {
		const list = (await idbGet<any[]>('customer_transactions')) ?? [];
		await idbSet('customer_transactions', list.filter((e) => e.id !== id));
	}));
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
export async function backfillAllFromIdb() {
	const supabase = getSupabase();
	const schema = ((import.meta as any).env?.VITE_SUPABASE_SCHEMA as string) || 'public';
	const sb = (supabase as any).schema ? (supabase as any).schema(schema) : supabase;

	// Employees
	const employees = (await idbGet<any[]>('staff_employees')) ?? [];
	if (employees.length > 0) {
		await sb.from('employees').upsert(
			employees.map((e) => ({
				id: e.id,
				name: e.name,
				email: e.email,
				phone: e.phone,
				role: e.role,
				department: e.department,
				salary: e.salary,
				status: e.status,
				hire_date: e.hireDate,
				updated_at: new Date().toISOString(),
			})),
			{ onConflict: 'id' }
		);
	}

	// Inventory (gold/jewelry/stones)
	const gold = (await idbGet<any[]>('gold_items')) ?? [];
	const jewelry = (await idbGet<any[]>('jewelry_items')) ?? [];
	const stones = (await idbGet<any[]>('stones_items')) ?? [];
	const items: any[] = [];
	for (const g of gold) items.push({ id: g.id, item_type: 'gold', name: g.name, attributes: { weight: g.weight, purity: g.purity }, price: g.price, image: g.image, updated_at: new Date().toISOString() });
	for (const j of jewelry) items.push({ id: j.id, item_type: 'jewelry', name: j.name, attributes: { description: j.description }, price: j.price, image: j.image, updated_at: new Date().toISOString() });
	for (const s of stones) items.push({ id: s.id, item_type: 'stone', name: s.name, attributes: { carat: s.carat, clarity: s.clarity, cut: s.cut }, price: s.price, image: s.image, updated_at: new Date().toISOString() });
	if (items.length > 0) {
		await sb.from('inventory_items').upsert(items, { onConflict: 'id' });
	}

	// POS invoices (optional)
	const inv = (await idbGet<any[]>('pos_recentInvoices')) ?? [];
	if (inv.length > 0) {
		await sb.from('pos_invoices').upsert(
			inv.map((x) => ({
				id: x.id,
				customer_name: x.customerName,
				subtotal: x.subtotal,
				tax: x.tax,
				total: x.total,
				date: x.date,
				payment_method: x.paymentMethod,
				items: x.items ?? [],
				updated_at: new Date().toISOString(),
			})),
			{ onConflict: 'id' }
		);
	}

	// Customers
	const customers = (await idbGet<any[]>('customers')) ?? [];
	if (customers.length > 0) {
		await sb.from('customers').upsert(
			customers.map((c) => ({
				id: c.id,
				name: c.name,
				email: c.email,
				phone: c.phone,
				address: c.address,
				credit_limit: c.creditLimit ?? 0,
				current_balance: c.currentBalance ?? 0,
				total_purchases: c.totalPurchases ?? 0,
				last_purchase_date: c.lastPurchaseDate ?? null,
				status: c.status ?? 'active',
				updated_at: new Date().toISOString(),
			})),
			{ onConflict: 'id' }
		);
	}

	// Customer transactions
	const transactions = (await idbGet<any[]>('customer_transactions')) ?? [];
	if (transactions.length > 0) {
		await sb.from('customer_transactions').upsert(
			transactions.map((t) => ({
				id: t.id,
				customer_id: t.customerId,
				type: t.type,
				amount: t.amount,
				description: t.description,
				date: t.date,
				invoice_id: t.invoiceId ?? null,
				payment_method: t.paymentMethod ?? null,
				updated_at: new Date().toISOString(),
			})),
			{ onConflict: 'id' }
		);
	}
}
async function pushQueue() {
	const db = await getDB();
	const tx = db.transaction('changeQueue', 'readwrite');
	const store = tx.objectStore('changeQueue');
	const index = store.index('byCreated');
	const all: ChangeOp[] = [] as any;
	let cursor = await index.openCursor();
	while (cursor) {
		all.push(cursor.value as ChangeOp);
		cursor = await cursor.continue();
	}

	if (all.length === 0) {
		await tx.done;
		return;
	}

	const supabase = getSupabase();
	const schema = ((import.meta as any).env?.VITE_SUPABASE_SCHEMA as string) || 'public';
	const sb = (supabase as any).schema ? (supabase as any).schema(schema) : supabase;
	for (const change of all) {
		try {
			if (change.action === 'delete') {
				await sb.from(change.table).delete().eq('id', change.payload?.id);
			} else {
				await sb.from(change.table).upsert(change.payload, { onConflict: 'id' });
			}
			await store.delete(change.id);
		} catch (e) {
			// Stop pushing on first failure to retry next time
			break;
		}
	}
	await tx.done;
}


