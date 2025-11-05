# Database Structure Comparison: Local IndexedDB vs Supabase Schema

## Executive Summary

**No, the local database structure does NOT fully match the Supabase schema.** There are significant differences in table names, structures, and missing tables. Here's a detailed breakdown:

---

## ✅ Currently Mapped Tables

### 1. Inventory Management

| Local IndexedDB Store | Supabase Table | Status | Notes |
|----------------------|----------------|--------|-------|
| `inventory_items` | `inventory` | ✅ **Mapped** | Main unified inventory table |
| `jewelry_items` | `jewelry` | ✅ **Mapped** | Derived from `inventory_items` |
| `gold_items` | `gold` | ✅ **Mapped** | Derived from `inventory_items` |
| `stones_items` | `stones` | ✅ **Mapped** | Derived from `inventory_items` |

**Current Implementation:**
- Local uses `inventory_items` as the source of truth
- `jewelry_items`, `gold_items`, `stones_items` are derived/denormalized views for UI
- Sync happens through `inventory_items`, then projected to type-specific stores

---

### 2. Sales & Invoices

| Local IndexedDB Store | Supabase Table | Status | Notes |
|----------------------|----------------|--------|-------|
| `pos_recentInvoices` | `sales` | ⚠️ **Partial Match** | Structure mismatch |
| N/A | `sale_items` | ❌ **Missing** | Items embedded in invoice object |

**Current Structure:**
```typescript
// Local Invoice (pos_recentInvoices)
interface Invoice {
  id: string;
  items: CartItem[];  // Embedded items array
  subtotal: number;
  tax: number;
  total: number;
  date: string;
  customerName?: string;
  paymentMethod: string;
}
```

**Supabase Schema:**
```sql
-- sales table (parent)
sales: id, customer_id, total_amount, tax_amount, payment_method, ...

-- sale_items table (child - separate table)
sale_items: id, sale_id, product_id, product_name, quantity, unit_price, ...
```

**Issue:** Local stores items as embedded array, but Supabase uses separate `sale_items` table with foreign keys.

---

### 3. Customers

| Local IndexedDB Store | Supabase Table | Status | Notes |
|----------------------|----------------|--------|-------|
| `customers` | `customers` | ✅ **Mapped** | Structure mostly matches |

**Field Mapping:**
- Local: `creditLimit`, `currentBalance`, `totalPurchases`
- Supabase: `ledger_balance`, `total_purchases` (similar)

---

### 4. Customer Ledger/Transactions

| Local IndexedDB Store | Supabase Table | Status | Notes |
|----------------------|----------------|--------|-------|
| `customer_transactions` | `customer_ledger` | ⚠️ **Name Mismatch** | Table name differs |

**Current Sync:**
```typescript
// sync.ts syncs 'customer_transactions' table
await run(() => syncTable('customer_transactions', ...))
```

**Supabase Schema:**
```sql
customer_ledger: id, customer_id, transaction_type, amount, balance_before, balance_after, ...
```

---

### 5. Staff Management

| Local IndexedDB Store | Supabase Table | Status | Notes |
|----------------------|----------------|--------|-------|
| `staff_employees` | `staff` | ⚠️ **Name Mismatch** | Also see `employees` in code |

**Current Sync:**
```typescript
// sync.ts syncs 'employees' table
await run(() => syncTable('employees', async (row: any) => {
  const employees = (await idbGet<any[]>('staff_employees')) ?? [];
  // ...
}))
```

**Supabase Schema:**
```sql
staff: id, name, phone, email, role, department, salary, hire_date, ...
```

---

### 6. Craftsmen

| Local IndexedDB Store | Supabase Table | Status | Notes |
|----------------------|----------------|--------|-------|
| `craftsmen` | `craftsmen` | ✅ **Mapped** | Should match |

---

## ❌ Missing Tables (Not Implemented Locally)

These Supabase tables exist but have NO local IndexedDB equivalent:

### Core Tables
1. **`categories`** - Product categorization
2. **`products`** - Separate products table (different from inventory)

### Staff Management
3. **`attendance`** - Staff attendance tracking
4. **`performance`** - Staff performance reviews
5. **`training`** - Staff training records
6. **`salary_rules`** - Salary calculation rules

### Craftsmen Management
7. **`materials`** - Materials assigned to craftsmen
8. **`materials_assigned`** - Material assignment tracking
9. **`projects`** - Craftsmen projects

### System Tables
10. **`transactions`** - General transaction log (different from sales)
11. **`settings`** - Application settings
12. **`sync_queue`** - Sync queue management (local has `changeQueue` but different structure)

---

## ⚠️ Structural Differences

### 1. Sales vs Sale Items

**Local (Embedded):**
```typescript
{
  id: "INV-123",
  items: [
    { id: "1", name: "Ring", quantity: 2, price: 5000 },
    { id: "2", name: "Necklace", quantity: 1, price: 10000 }
  ],
  total: 20000
}
```

**Supabase (Normalized):**
```sql
-- sales table
{ id: "INV-123", total_amount: 20000, ... }

-- sale_items table (separate)
{ id: "1", sale_id: "INV-123", product_name: "Ring", quantity: 2, unit_price: 5000 }
{ id: "2", sale_id: "INV-123", product_name: "Necklace", quantity: 1, unit_price: 10000 }
```

**Impact:** When syncing invoices to Supabase, you need to:
1. Insert into `sales` table
2. Insert each item into `sale_items` table with `sale_id` foreign key

---

### 2. Inventory Structure

**Local:**
- Uses `inventory_items` as unified table
- Projects to `jewelry_items`, `gold_items`, `stones_items` for UI
- All items have `item_type` field: 'gold', 'stone', 'jewelry'

**Supabase:**
- Has separate tables: `inventory`, `jewelry`, `gold`, `stones`
- All have `inventory` table, but also separate tables

**Current Sync Logic:**
- Syncs `inventory_items` to Supabase
- Projects to local type-specific stores when pulling from server

---

### 3. Table Naming Conventions

**Local → Supabase Mapping:**
```typescript
const tableMapping = {
  'jewelry_items' → 'jewelry',      // Through inventory_items
  'gold_items' → 'gold',            // Through inventory_items
  'stones_items' → 'stones',        // Through inventory_items
  'inventory_items' → 'inventory',  // Direct
  'staff_employees' → 'employees',  // Name mismatch
  'customers' → 'customers',        // Direct
  'pos_recentInvoices' → 'sales',    // Name mismatch, structure mismatch
  'customer_transactions' → 'customer_ledger' // Name mismatch
};
```

---

## 🔧 Recommendations

### 1. Fix Sales Structure (High Priority)

**Option A: Normalize Locally**
- Create separate `sale_items` IndexedDB store
- Update invoice creation to split items
- Update sync to handle both tables

**Option B: Transform on Sync**
- Keep local structure (embedded items)
- Transform to normalized structure when syncing to Supabase:
  ```typescript
  // When syncing invoice to Supabase
  const sale = {
    id: invoice.id,
    customer_id: customerId,
    total_amount: invoice.total,
    // ... other fields
  };
  
  // Insert into sales table
  await supabase.from('sales').upsert(sale);
  
  // Insert items into sale_items table
  const saleItems = invoice.items.map(item => ({
    sale_id: invoice.id,
    product_name: item.name,
    quantity: item.quantity,
    unit_price: item.price,
    total_price: item.price * item.quantity
  }));
  await supabase.from('sale_items').insert(saleItems);
  ```

---

### 2. Standardize Table Names

**Rename Local Stores:**
- `staff_employees` → `staff` (or keep local name, map in sync)
- `pos_recentInvoices` → `sales` (or keep local name, map in sync)
- `customer_transactions` → `customer_ledger` (or keep local name, map in sync)

**Current Approach (Recommended):**
- Keep local names for clarity
- Map in sync handlers (already done in `sync-handler.ts`)

---

### 3. Add Missing Tables (If Needed)

If you need these features, add local IndexedDB stores:
- `attendance` - Staff attendance
- `performance` - Performance reviews
- `training` - Training records
- `materials` - Craftsmen materials
- `projects` - Craftsmen projects
- `settings` - App settings

---

### 4. Sync Implementation Updates

**Current Sync Flow:**
```typescript
// sync.ts
await syncTable('inventory_items', ...)  // ✅ Works
await syncTable('pos_invoices', ...)      // ⚠️ Should be 'sales'
await syncTable('customer_transactions', ...) // ⚠️ Should be 'customer_ledger'
await syncTable('employees', ...)        // ⚠️ Should be 'staff'
```

**Recommended Updates:**
```typescript
// Use correct Supabase table names
await syncTable('sales', ...)  // Instead of 'pos_invoices'
await syncTable('customer_ledger', ...)  // Instead of 'customer_transactions'
await syncTable('staff', ...)  // Instead of 'employees'
```

---

## 📊 Summary Table

| Category | Local Stores | Supabase Tables | Match Status |
|----------|-------------|-----------------|--------------|
| **Inventory** | 4 stores | 4 tables | ✅ Mostly aligned |
| **Sales** | 1 store (embedded) | 2 tables (normalized) | ⚠️ Structure mismatch |
| **Customers** | 1 store | 1 table | ✅ Matches |
| **Ledger** | 1 store | 1 table | ⚠️ Name mismatch |
| **Staff** | 1 store | 1 table | ⚠️ Name mismatch |
| **Craftsmen** | 1 store | 1 table | ✅ Matches |
| **Missing** | 0 stores | 12 tables | ❌ Not implemented |

---

## 🎯 Action Items

1. **✅ Current Status:** Core functionality works with current mapping
2. **⚠️ Fix Sales Sync:** Implement sale_items table handling
3. **⚠️ Standardize Names:** Update sync to use correct Supabase table names
4. **📋 Add Missing Tables:** If needed for full feature parity
5. **🧪 Test Sync:** Ensure all data flows correctly in both directions

---

## 💡 Quick Fix for Sales Sync

Update `sync.ts` to handle normalized sales structure:

```typescript
// In sync.ts, update the pos_invoices sync
await run(() => syncTable('sales', async (row: any) => {
  // Get sale_items for this sale
  const { data: saleItems } = await sb
    .from('sale_items')
    .select('*')
    .eq('sale_id', row.id);
  
  // Transform to local invoice format
  const invoice = {
    id: row.id,
    items: saleItems.map((item: any) => ({
      id: item.product_id,
      name: item.product_name,
      quantity: item.quantity,
      price: item.unit_price,
      type: '' // Might need to look up from inventory
    })),
    subtotal: row.total_amount - (row.tax_amount || 0),
    tax: row.tax_amount || 0,
    total: row.total_amount,
    date: row.created_at,
    customerName: row.customer_name,
    paymentMethod: row.payment_method
  };
  
  const list = (await idbGet<any[]>('pos_recentInvoices')) ?? [];
  const idx = list.findIndex((e) => e.id === invoice.id);
  if (idx >= 0) list[idx] = invoice; 
  else list.unshift(invoice);
  await idbSet('pos_recentInvoices', list.slice(0, 5));
}, ...));
```

---

**Last Updated:** Based on current codebase analysis
**Next Steps:** Implement sales normalization sync handler

