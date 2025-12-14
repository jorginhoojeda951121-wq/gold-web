# Data Context Usage Guide

The `DataContext` centralizes all data management for the application. All data is fetched from Supabase and stored in context, making it available throughout the app.

## Setup

The `DataProvider` is already set up in `App.tsx`. All components within the app can access the data.

## Usage

### Basic Usage

```typescript
import { useData } from '@/contexts/DataContext';

function MyComponent() {
  const { vendors, loading, refreshVendors } = useData();
  
  if (loading.vendors) {
    return <div>Loading vendors...</div>;
  }
  
  return (
    <div>
      {vendors.map(vendor => (
        <div key={vendor.id}>{vendor.name}</div>
      ))}
      <button onClick={refreshVendors}>Refresh</button>
    </div>
  );
}
```

### Available Data

All data is available through the `useData()` hook:

```typescript
const {
  // Inventory
  inventoryItems,
  goldItems,
  jewelryItems,
  stoneItems,
  artificialItems,
  
  // Business
  vendors,
  reservations,
  customers,
  customerTransactions,
  craftsmen,
  
  // Staff
  staff,
  attendance,
  salaryRules,
  salarySlips,
  
  // Settings
  businessSettings,
  paymentSettings,
  notificationSettings,
  goldRateSettings,
  
  // POS
  posCart,
  posCustomerName,
  posRecentInvoices,
  
  // Subscription
  subscriptionStatus,
  
  // Loading states
  loading,
  
  // Update functions
  updateVendors,
  updateReservations,
  // ... etc
  
  // Refresh functions
  refreshVendors,
  refreshReservations,
  refreshAll,
} = useData();
```

### Updating Data

When you update data (e.g., after creating/editing a record), update the context:

```typescript
import { useData } from '@/contexts/DataContext';
import { upsertToSupabase } from '@/lib/supabaseDirect';

function AddVendorDialog() {
  const { vendors, updateVendors } = useData();
  
  const handleSave = async (vendorData: Vendor) => {
    // Save to Supabase
    await upsertToSupabase('vendors', vendorData);
    
    // Update context
    updateVendors([...vendors, vendorData]);
  };
}
```

### Refreshing Data

To refresh data from Supabase:

```typescript
const { refreshVendors, refreshAll } = useData();

// Refresh specific data
await refreshVendors();

// Refresh all data
await refreshAll();
```

### Loading States

Check loading states before rendering:

```typescript
const { vendors, loading } = useData();

if (loading.vendors) {
  return <Spinner />;
}

return <VendorList vendors={vendors} />;
```

## Migration from useUserStorage

### Before (useUserStorage):
```typescript
const { data: vendors, updateData: setVendors, loaded } = useUserStorage<Vendor[]>('vendors', []);
```

### After (useData):
```typescript
const { vendors, updateVendors, loading } = useData();
// Note: 'loaded' is now 'loading.vendors' (inverted)
```

## Benefits

1. **Centralized Data**: All data in one place
2. **No Duplicate Fetches**: Data is fetched once and shared
3. **Automatic Updates**: When one component updates data, all components see the update
4. **Type Safety**: Full TypeScript support
5. **Performance**: Data is fetched on app load, not per component

