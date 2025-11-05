# Local IndexedDB Table Names (Keys)

This document lists all IndexedDB table names (keys) used in the gold-crafts web application.

## 📦 Main Data Tables

These are the core data tables that sync with Supabase:

### Inventory Management
- **`inventory_items`** - Unified inventory table (synced from Supabase `inventory`)
- **`gold_items`** - Gold items (synced from Supabase `gold`)
- **`jewelry_items`** - Jewelry items (synced from Supabase `jewelry`)
- **`stones_items`** - Precious stones (synced from Supabase `stones`)

### Sales & Customers
- **`pos_recentInvoices`** - Recent sales/invoices (synced from Supabase `sales` + `sale_items`)
- **`sale_items`** - Individual sale items (synced from Supabase `sale_items`)
- **`customers`** - Customer records (synced from Supabase `customers`)
- **`customer_transactions`** - Customer ledger transactions (synced from Supabase `customer_ledger`)

### Staff Management
- **`staff_employees`** - Staff/employee records (synced from Supabase `staff`)
- **`attendance`** - Staff attendance records (synced from Supabase `attendance`)
- **`performance`** - Staff performance reviews (synced from Supabase `performance`)
- **`training`** - Staff training records (synced from Supabase `training`)
- **`salary_rules`** - Salary calculation rules (synced from Supabase `salary_rules`)

### Craftsmen Management
- **`craftsmen`** - Craftsmen records (synced from Supabase `craftsmen`)
- **`materials`** - Materials assigned to craftsmen (synced from Supabase `materials`)
- **`materials_assigned`** - Material assignment tracking (synced from Supabase `materials_assigned`)
- **`projects`** - Craftsmen projects (synced from Supabase `projects`)

### Product Management
- **`categories`** - Product categories (synced from Supabase `categories`)
- **`products`** - Product catalog (synced from Supabase `products`)

### System Tables
- **`transactions`** - General transaction log (synced from Supabase `transactions`)
- **`settings`** - Application settings (synced from Supabase `settings`)

---

## 🎨 UI State / Application Settings

These keys store UI state and application preferences (NOT synced to Supabase):

### POS (Point of Sale) State
- **`pos_cart`** - Current shopping cart items
- **`pos_customerName`** - Selected customer name in POS

### Application Settings
- **`businessSettings`** - Business information (name, address, contact, GST, etc.)
- **`paymentSettings`** - Payment configuration (UPI, bank details, etc.)
- **`notificationSettings`** - Notification preferences

### Page-Specific UI State
- **`gold_search`** - Search query for Gold Collection page
- **`gold_viewMode`** - View mode ('grid' or 'list') for Gold Collection
- **`stones_search`** - Search query for Precious Stones page
- **`stones_viewMode`** - View mode for Precious Stones page
- **`jewelry_search`** - Search query for Jewelry Collection page
- **`jewelry_viewMode`** - View mode for Jewelry Collection page
- **`staff_search`** - Search query for Staff page
- **`staff_departmentFilter`** - Department filter for Staff page
- **`staff_statusFilter`** - Status filter for Staff page
- **`analytics_location`** - Selected location filter for Analytics
- **`analytics_dateRange`** - Date range filter for Analytics
- **`analytics_search`** - Search query for Analytics page

---

## 🔄 Sync Tracking Keys

These keys track the last sync timestamp for each table (format: `sync:last_[table_name]`):

- **`sync:last_staff`**
- **`sync:last_craftsmen`**
- **`sync:last_inventory`**
- **`sync:last_gold`**
- **`sync:last_jewelry`**
- **`sync:last_stones`**
- **`sync:last_sale_items`**
- **`sync:last_sales`**
- **`sync:last_customers`**
- **`sync:last_customer_ledger`**
- **`sync:last_categories`**
- **`sync:last_products`**
- **`sync:last_attendance`**
- **`sync:last_performance`**
- **`sync:last_training`**
- **`sync:last_salary_rules`**
- **`sync:last_materials`**
- **`sync:last_materials_assigned`**
- **`sync:last_projects`**
- **`sync:last_transactions`**
- **`sync:last_settings`**

---

## 📊 Summary

### Total Count by Category:
- **Main Data Tables**: 21 tables
- **UI State/Settings**: 14 keys
- **Sync Tracking**: 21 keys
- **Grand Total**: ~56 IndexedDB keys

### Data Tables That Sync with Supabase:
1. inventory_items ↔ inventory
2. gold_items ↔ gold
3. jewelry_items ↔ jewelry
4. stones_items ↔ stones
5. staff_employees ↔ staff
6. customers ↔ customers
7. customer_transactions ↔ customer_ledger
8. pos_recentInvoices ↔ sales (+ sale_items)
9. sale_items ↔ sale_items
10. craftsmen ↔ craftsmen
11. categories ↔ categories
12. products ↔ products
13. attendance ↔ attendance
14. performance ↔ performance
15. training ↔ training
16. salary_rules ↔ salary_rules
17. materials ↔ materials
18. materials_assigned ↔ materials_assigned
19. projects ↔ projects
20. transactions ↔ transactions
21. settings ↔ settings

---

## 🔍 How to View in Browser DevTools

1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Expand **IndexedDB** → **gold-crafts-db**
4. Click on **keyval** object store
5. All keys are stored in the keyval store (key-value pairs)

---

**Last Updated**: Based on current codebase analysis
**Note**: This list may change as new features are added

