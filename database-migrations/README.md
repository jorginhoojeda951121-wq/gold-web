# Gold POS Database Migrations

Complete database migration files for the Gold POS system - a comprehensive point-of-sale solution designed for Indian jewelers.

## Migration Execution Order

**IMPORTANT**: Run migrations in this exact order to avoid dependency errors:

### 1. Base Schema (Run First)
```sql
00-base-schema.sql
```
Creates all core tables: customers, inventory, jewelry, gold, stones, products, craftsmen, materials_assigned, sales, sale_items, customer_ledger, staff, attendance, and categories.

### 2. User Isolation & Data Security
```sql
add-user-id-columns.sql
add-rls-policies-for-user-isolation.sql
assign-existing-data-to-user.sql
```
Ensures multi-tenant data isolation and row-level security (RLS) policies.

### 3. Subscription Management
```sql
subscription-table.sql
add-subscription-insert-policy.sql
```
Adds subscription tracking for SaaS model.

### 4. Core Feature Enhancements (Run in any order)
```sql
gold-rate-settings.sql              # Gold rate tracking & auto-calculation
custom-tax-rates.sql                # Per-item custom GST rates
barcode-support.sql                 # Barcode & SKU support
multiple-images-support.sql         # Up to 4 images per item
```

### 5. Artisan/Craftsman Management
```sql
craftsman-firm-type.sql             # Individual vs Firm support
craftsman-payments-tracking.sql     # Payment tracking for artisans
artisan-employee-invoices.sql       # Formal invoice generation
```

### 6. Vendor & Supply Chain
```sql
vendor-supplier-management.sql      # Complete vendor management system
```

### 7. Reservation & Booking
```sql
reservations-system.sql             # Wedding/event reservations
```

## System Overview

### Core Features

#### 1. **Inventory Management**
- **Multiple Item Types**: Jewelry, Gold bars, Gemstones, General inventory, Products
- **Categories by Metal**: Gold, Silver, Platinum, Diamond, Gemstone, Artificial
- **Detailed Attributes**: Weight, purity, carat, metal type, gemstone details
- **Multiple Images**: Up to 4 images per item
- **Barcode/SKU Support**: Quick lookup via scanner
- **Stock Tracking**: Real-time stock levels with min stock alerts

#### 2. **Artisan/Craftsman Management**
- **Individual & Firm Support**: Track both individual artisans and companies
- **Material Assignment**: Allocate gold, gemstones, and materials to artisans
- **Work Tracking**: Assign tasks for new items or modifications to existing inventory
- **Payment Tracking**: Track agreed amounts, partial payments, and balances
- **Quality Management**: Rate completed work (1-5 stars)
- **Own Material Usage**: Track when artisans use their own materials
- **Invoice Generation**: Formal invoices for artisan payments

#### 3. **Vendor/Supplier Management**
- **Vendor Master**: Complete vendor information with specialization
- **Purchase Orders**: Create and track POs with multiple items
- **Supplier Invoices**: Record and track supplier bills
- **Payment History**: Complete payment tracking
- **Credit Management**: Track outstanding balances and credit limits

#### 4. **Employee Management & Payroll**
- **Employee Master**: Complete employee information with PF/ESI details
- **Attendance Tracking**: Daily attendance with present/absent/late/half-day
- **Payroll Calculation**: 
  - ✅ Uses actual days in month (30/31 or 28/29 for February)
  - Automatic calculation of HRA, PF, ESI, Professional Tax
  - Custom salary rules support
  - Deductions for late coming, absences
- **Payslip Generation**: Formal monthly payslips with PDF export

#### 5. **Customer Management**
- **Customer Ledger**: Track credit sales and EMI
- **Credit Limit**: Set and enforce customer credit limits
- **Transaction History**: Complete purchase and payment history
- **Balance Tracking**: Real-time customer balance calculation

#### 6. **Point of Sale (POS)**
- **Multi-Item Sales**: Sell jewelry, gold, stones, and products
- **Payment Methods**: Cash, UPI, Card, Bank Transfer, Credit, Cheque
- **Credit Sales**: Automatic ledger entry for credit transactions
- **Stock Updates**: Automatic stock reduction on sale
- **Receipt Generation**: Professional PDF receipts
- **Barcode Scanning**: Quick item lookup and addition to cart

#### 7. **Reservation System**
- **Event Types**: Wedding, Anniversary, Engagement, Birthday, Festival
- **Customer Preferences**: Category, color, polish quality preferences
- **Item Allocation**: Assign specific items to reservations
- **Status Tracking**: Pending → Confirmed → Ready → Picked Up → Returned

#### 8. **Tax Management**
- **Custom Tax Rates**: Set different GST rates per item (3% jewelry, 12% artificial, etc.)
- **Tax Categories**: Jewelry, Artificial, Gemstones, Other
- **Tax Included/Excluded**: Configure if price includes tax
- **Sale Tax Tracking**: Track tax collected per sale item

#### 9. **Gold Rate Management**
- **Multiple Purities**: 24K, 22K, 18K, 14K rates
- **Making Charges**: Per-gram making charges with minimums
- **Auto-Calculation**: Calculate item prices automatically
- **Rate History**: Track gold rate changes over time

#### 10. **Reporting & Analytics**
- **Sales Reports**: Daily, weekly, monthly sales analysis
- **Inventory Reports**: Stock levels, valuation, low stock alerts
- **Financial Reports**: Revenue, expenses, profit margins
- **Employee Reports**: Attendance, salary summaries
- **Tax Reports**: GST collection by category and rate

#### 11. **Image & Catalog Sharing**
- **Multiple Images**: Store up to 4 images per item
- **WhatsApp Sharing**: Share individual items or bulk catalogs
- **Message Templates**: Simple, Detailed, Promotional, Inquiry
- **Catalog Generation**: Auto-generate catalog messages for multiple items

#### 12. **Data Synchronization**
- **Web-Mobile Sync**: Seamless sync between web app and mobile
- **Offline Support**: Mobile app works offline, syncs when online
- **Conflict Resolution**: Intelligent merge of conflicting changes
- **User Isolation**: Each user's data is completely isolated

## Database Tables Reference

### Core Tables
- `customers` - Customer master data
- `inventory` - General inventory items
- `jewelry` - Specialized jewelry items with detailed attributes
- `gold` - Gold bars, coins, raw gold
- `stones` - Gemstones and diamonds
- `products` - General products and equipment
- `categories` - Product categories organized by metal type

### Sales & POS
- `sales` - Sales transactions/invoices
- `sale_items` - Line items in sales
- `customer_ledger` - Customer credit/EMI tracking

### Artisan Management
- `craftsmen` - Artisan/craftsman master
- `materials_assigned` - Work assignments to artisans
- `craftsman_payments` - Payment history for artisans
- `artisan_invoices` - Formal invoices for artisan payments

### Employee Management
- `staff` - Employee master data
- `attendance` - Daily attendance records
- `employee_payslips` - Monthly salary payslips

### Vendor Management
- `vendors` - Vendor/supplier master
- `purchase_orders` - Purchase orders
- `purchase_order_items` - PO line items
- `supplier_invoices` - Supplier invoices
- `vendor_payments` - Vendor payment history

### Reservations
- `reservations` - Event/wedding reservations
- `reservation_items` - Items in each reservation

### Settings
- `gold_rates` - Current gold rates and making charges
- `gold_rate_history` - Historical rate changes
- `subscription` - Subscription/license tracking

## Key Features by Requirement

✅ **Artisan task assignment** - `materials_assigned` table with detailed tracking  
✅ **Individual & Company artisans** - `type` field in `craftsmen` table  
✅ **Raw material tracking** - Gold, stones, and other materials in `materials_assigned`  
✅ **Real & synthetic jewelry** - `is_artificial` flag in jewelry table  
✅ **Unique item codes** - `item_code` field in assignments  
✅ **Catalog sharing** - WhatsApp integration with templates  
✅ **Synthetic gemstone assignment** - `stone_details` JSONB field  
✅ **Artisan own materials** - Tracked in `notes` and `other_materials`  
✅ **Vendor management** - Complete vendor management system  
✅ **Artisan invoices** - `artisan_invoices` table with PDF support  
✅ **Employee invoices/payslips** - `employee_payslips` table  
✅ **POS processing** - Complete sales system with all payment methods  
✅ **4 images per item** - `image_1`, `image_2`, `image_3`, `image_4` columns  
✅ **WhatsApp sharing** - WhatsAppShare component implemented  
✅ **Reservations** - Complete reservation system for events  
✅ **Custom payroll** - Custom salary rules with PDF generation  
✅ **30/31 day calculation** - ✅ Already fixed in code (line 200)  
✅ **Weighted inventory** - Weight fields on all inventory tables  
✅ **Current gold price** - `gold_rates` table with auto-calculation  
✅ **Custom tax categories** - Per-item tax rates and categories  
✅ **Artisan payment tracking** - Complete payment history and status  
✅ **Metal-based categories** - `metal_type` field in categories  
✅ **Customer credit ledger** - `customer_ledger` for EMI/credit sales  
✅ **Reporting & analytics** - Comprehensive reporting dashboard  
✅ **Single branch** - Multi-branch removed, single tenant per user  
✅ **Mobile sync** - Complete sync system implemented  
✅ **Barcode scanning** - Barcode fields and search function  
✅ **Smooth synchronization** - Optimized sync with conflict resolution  

## Important Notes

### Multi-Image Support
- Each item can have up to 4 images
- Images stored as URLs or base64 data
- Use `get_item_images(table_name, item_id)` function to retrieve all images
- Query `inventory_with_image_count` view to see items with image counts

### Gold Price Calculation
- Use `calculate_gold_price(weight, purity, user_id, tax_rate)` function
- Returns: gold_rate, gold_cost, making_charges, subtotal, gst, total
- Automatically applies minimum making charges

### Artisan Work Assignment
- `is_new_item` flag indicates if creating new item or modifying existing
- `target_item_id` references item in jewelry/gold/stones tables
- `stone_details` stored as JSONB array for multiple stones

### Employee Payroll
- **Actual days in month** calculation (not fixed 26 days)
- Automatic PF calculation (12% of base salary)
- ESI calculation (0.75% for salary ≤ ₹21,000)
- Professional Tax (₹200 for salary > ₹10,000)

### Tax Management
- Default 3% for jewelry
- 12% for artificial jewelry
- 5% for gemstones
- Custom rates supported per item

### Data Isolation
- All tables have `user_id` column
- RLS policies ensure complete data isolation
- Users only see their own data

## Verification Queries

### Check inventory with images
```sql
SELECT * FROM inventory_with_image_count WHERE user_id = auth.uid();
```

### Get current gold rates
```sql
SELECT * FROM current_gold_rates_summary WHERE user_id = auth.uid();
```

### Calculate gold item price
```sql
SELECT * FROM calculate_gold_price(10.5, '22K', auth.uid(), 3.0);
```

### View pending artisan payments
```sql
SELECT * FROM craftsman_payment_summary 
WHERE user_id = auth.uid() AND pending_amount > 0
ORDER BY pending_amount DESC;
```

### Get unpaid supplier invoices
```sql
SELECT * FROM supplier_invoices_summary 
WHERE user_id = auth.uid() AND payment_status IN ('unpaid', 'overdue')
ORDER BY due_date;
```

### View upcoming reservations
```sql
SELECT * FROM reservations_summary 
WHERE user_id = auth.uid() 
AND event_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
ORDER BY event_date;
```

### Search items by barcode
```sql
SELECT * FROM search_by_barcode('BARCODE-123', auth.uid());
```

### Get employee payslips for current month
```sql
SELECT * FROM employee_payslips 
WHERE user_id = auth.uid()
AND month = EXTRACT(MONTH FROM CURRENT_DATE)
AND year = EXTRACT(YEAR FROM CURRENT_DATE);
```

## Troubleshooting

### If migrations fail
1. Check that `00-base-schema.sql` was run first
2. Ensure `auth.users` table exists (created by Supabase Auth)
3. Run migrations in the exact order specified above
4. Check for existing conflicting table names
5. Ensure you have proper database permissions

### If sync fails
1. Verify user is authenticated (`auth.uid()` returns value)
2. Check RLS policies are enabled
3. Ensure `user_id` is set on all records
4. Check network connectivity for web-mobile sync

### If gold calculation fails
1. Ensure `gold_rates` table has an active rate for the user
2. Check that purity value is valid ('24K', '22K', '18K', '14K')
3. Verify weight is a positive number

## Support

For issues or questions:
1. Check this README first
2. Review individual migration files for table-specific documentation
3. Check the code comments in migration files
4. Verify migration execution order

## License

Proprietary - Gold POS System

