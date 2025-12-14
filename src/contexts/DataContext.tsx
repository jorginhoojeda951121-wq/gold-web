import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { fetchAll } from '@/lib/supabaseDirect';
import { getSupabase } from '@/lib/supabase';
export interface InventoryItem {
  id: string;
  name: string;
  price: number;
  stock?: number;
  inStock?: number;
  image?: string;
  image_1?: string;
  image_2?: string;
  image_3?: string;
  image_4?: string;
  category?: string;
  subcategory?: string;
  item_type?: string;
  type?: string;
  metal?: string;
  gemstone?: string;
  carat?: number | string;
  purity?: string;
  weight?: string;
  color?: string;
  size?: string;
  cut?: string;
  clarity?: string;
  isArtificial?: boolean;
  [key: string]: any;
}

export interface Vendor {
  id: string;
  name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  vendor_type: string;
  gst_number?: string;
  status: string;
  total_purchases: number;
  outstanding_balance: number;
  specialization?: string[] | string;
  [key: string]: any;
}

export interface Reservation {
  id: string;
  customer_name: string;
  customer_phone: string;
  event_date: string;
  status: string;
  category_preferences?: string[] | string;
  color_preferences?: string[] | string;
  is_overdue?: boolean;
  [key: string]: any;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  creditLimit: number;
  currentBalance: number;
  totalPurchases: number;
  lastPurchaseDate: string;
  status: 'active' | 'suspended' | 'blacklisted';
  [key: string]: any;
}

export interface CustomerTransaction {
  id: string;
  customerId: string;
  type: 'purchase' | 'payment' | 'credit_adjustment';
  amount: number;
  description: string;
  date: string;
  invoiceId?: string;
  paymentMethod?: string;
  [key: string]: any;
}

export interface Craftsman {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  specialization?: string[];
  [key: string]: any;
}

export interface Employee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  status?: string;
  [key: string]: any;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  [key: string]: any;
}

export interface SalaryRule {
  id: string;
  employeeId: string;
  baseSalary: number;
  [key: string]: any;
}

export interface SalarySlip {
  id: string;
  employeeId: string;
  month: string;
  year: string;
  [key: string]: any;
}

export interface BusinessSettings {
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  gstNumber?: string;
  currency?: string;
  timezone?: string;
  [key: string]: any;
}

export interface PaymentSettings {
  upiId?: string;
  businessName?: string;
  gstNumber?: string;
  bankAccount?: string;
  ifscCode?: string;
  [key: string]: any;
}

export interface NotificationSettings {
  [key: string]: any;
}

export interface GoldRateSettings {
  [key: string]: any;
}

export interface SubscriptionStatus {
  isActive: boolean;
  isExpired: boolean;
  requiresPayment: boolean;
  renewalAmount: number;
  [key: string]: any;
}

export interface Invoice {
  id: string;
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  date: string;
  customerName?: string;
  paymentMethod: string;
  [key: string]: any;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: string;
  metal?: string;
  gemstone?: string;
  [key: string]: any;
}

interface DataContextType {
  inventoryItems: InventoryItem[];
  goldItems: InventoryItem[];
  jewelryItems: InventoryItem[];
  stoneItems: InventoryItem[];
  artificialItems: InventoryItem[];
  
  vendors: Vendor[];
  reservations: Reservation[];
  customers: Customer[];
  customerTransactions: CustomerTransaction[];
  craftsmen: Craftsman[];
  
  staff: Employee[];
  attendance: AttendanceRecord[];
  salaryRules: SalaryRule[];
  salarySlips: SalarySlip[];
  
  businessSettings: BusinessSettings;
  paymentSettings: PaymentSettings;
  notificationSettings: NotificationSettings;
  goldRateSettings: GoldRateSettings;
  
  posCart: CartItem[];
  posCustomerName: string;
  posRecentInvoices: Invoice[];
  
  subscriptionStatus: SubscriptionStatus | null;
  
  loading: Record<string, boolean> & {
    inventory: boolean;
    vendors: boolean;
    reservations: boolean;
    customers: boolean;
    craftsmen: boolean;
    staff: boolean;
    settings: boolean;
  };
  
  updateInventoryItems: (items: InventoryItem[]) => void;
  updateVendors: (vendors: Vendor[]) => void;
  updateReservations: (reservations: Reservation[]) => void;
  updateCustomers: (customers: Customer[]) => void;
  updateCustomerTransactions: (transactions: CustomerTransaction[]) => void;
  updateCraftsmen: (craftsmen: Craftsman[]) => void;
  updateStaff: (staff: Employee[]) => void;
  updateAttendance: (attendance: AttendanceRecord[]) => void;
  updateSalaryRules: (rules: SalaryRule[]) => void;
  updateSalarySlips: (slips: SalarySlip[]) => void;
  updateBusinessSettings: (settings: BusinessSettings) => void;
  updatePaymentSettings: (settings: PaymentSettings) => void;
  updateNotificationSettings: (settings: NotificationSettings) => void;
  updateGoldRateSettings: (settings: GoldRateSettings) => void;
  updatePosCart: (cart: CartItem[]) => void;
  updatePosCustomerName: (name: string) => void;
  updatePosRecentInvoices: (invoices: Invoice[]) => void;
  updateSubscriptionStatus: (status: SubscriptionStatus | null) => void;
  
  refreshInventory: () => Promise<void>;
  refreshVendors: () => Promise<void>;
  refreshReservations: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  refreshCustomers: () => Promise<void>;
  refreshCraftsmen: () => Promise<void>;
  refreshStaff: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const fetchingPromises: Record<string, Promise<any>> = {};

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [goldItems, setGoldItems] = useState<InventoryItem[]>([]);
  const [jewelryItems, setJewelryItems] = useState<InventoryItem[]>([]);
  const [stoneItems, setStoneItems] = useState<InventoryItem[]>([]);
  const [artificialItems, setArtificialItems] = useState<InventoryItem[]>([]);
  
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerTransactions, setCustomerTransactions] = useState<CustomerTransaction[]>([]);
  const [craftsmen, setCraftsmen] = useState<Craftsman[]>([]);
  
  const [staff, setStaff] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [salaryRules, setSalaryRules] = useState<SalaryRule[]>([]);
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
  
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({});
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({});
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({});
  const [goldRateSettings, setGoldRateSettings] = useState<GoldRateSettings>({});
  
  const [posCart, setPosCart] = useState<CartItem[]>([]);
  const [posCustomerName, setPosCustomerName] = useState<string>('');
  const [posRecentInvoices, setPosRecentInvoices] = useState<Invoice[]>([]);
  
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  
  const [loading, setLoading] = useState<DataContextType['loading']>({
    inventory: false,
    vendors: false,
    reservations: false,
    customers: false,
    craftsmen: false,
    staff: false,
    settings: false,
  });

  const parseVendorData = useCallback((vendors: Vendor[]): Vendor[] => {
    return vendors.map((vendor: any) => {
      const parsedVendor = { ...vendor };
      if (parsedVendor.specialization && typeof parsedVendor.specialization === 'string') {
        try {
          parsedVendor.specialization = JSON.parse(parsedVendor.specialization);
        } catch {
          parsedVendor.specialization = parsedVendor.specialization.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }
      return parsedVendor;
    });
  }, []);

  const parseReservationData = useCallback((reservations: Reservation[]): Reservation[] => {
    return reservations.map((reservation: any) => {
      let categoryPrefs = reservation.category_preferences;
      let colorPrefs = reservation.color_preferences;

      if (categoryPrefs && typeof categoryPrefs === 'string') {
        try {
          categoryPrefs = JSON.parse(categoryPrefs);
        } catch {
          categoryPrefs = categoryPrefs.split(',').map((c: string) => c.trim()).filter(Boolean);
        }
      }

      if (colorPrefs && typeof colorPrefs === 'string') {
        try {
          colorPrefs = JSON.parse(colorPrefs);
        } catch {
          colorPrefs = colorPrefs.split(',').map((c: string) => c.trim()).filter(Boolean);
        }
      }

      return {
        ...reservation,
        category_preferences: categoryPrefs,
        color_preferences: colorPrefs,
        is_overdue: reservation.status !== 'cancelled' &&
          reservation.status !== 'returned' &&
          new Date(reservation.event_date) < new Date()
      };
    });
  }, []);

  const fetchData = useCallback(async <T,>(
    key: string,
    setData: (data: T) => void,
    setLoadingState: (loading: boolean) => void,
    transform?: (data: any) => T
  ): Promise<void> => {
    try {
      if (fetchingPromises[key]) {
        const data = await fetchingPromises[key];
        setData(transform ? transform(data) : (data as T));
        return;
      }

      setLoadingState(true);
      const fetchPromise = fetchAll<T>(key);
      fetchingPromises[key] = fetchPromise;
      
      const data = await fetchPromise;
      setData(transform ? transform(data) : data);
      
      delete fetchingPromises[key];
    } catch (error) {
      console.error(`Error fetching ${key}:`, error);
    } finally {
      setLoadingState(false);
      delete fetchingPromises[key];
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setInventoryItems([]);
        setGoldItems([]);
        setJewelryItems([]);
        setStoneItems([]);
        setArtificialItems([]);
        setVendors([]);
        setReservations([]);
        setCustomers([]);
        setCustomerTransactions([]);
        setCraftsmen([]);
        setStaff([]);
        setAttendance([]);
        setSalaryRules([]);
        setSalarySlips([]);
        setBusinessSettings({});
        setPaymentSettings({});
        setNotificationSettings({});
        setGoldRateSettings({});
        setPosCart([]);
        setPosCustomerName('');
        setPosRecentInvoices([]);
        setSubscriptionStatus(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadAllData = async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setTimeout(loadAllData, 500);
        return;
      }

      console.log('📋 Loading settings data first...');
      await Promise.all([
        fetchData('businessSettings', setBusinessSettings, (loading) => 
          setLoading(prev => ({ ...prev, settings: loading }))),
        fetchData('paymentSettings', setPaymentSettings, () => {}),
        fetchData('notificationSettings', setNotificationSettings, () => {}),
        fetchData('gold_rate_settings', setGoldRateSettings, () => {}),
      ]);
      console.log('✅ Settings loaded');

      console.log('📦 Loading other data...');
      await Promise.all([
        fetchData('inventory_items', (data: InventoryItem[]) => {
          setInventoryItems(data);
          setGoldItems(data.filter(item => 
            item.category === 'gold' || item.item_type === 'gold'
          ));
          setJewelryItems(data.filter(item => 
            item.category === 'jewelry' || item.item_type === 'jewelry'
          ));
          setStoneItems(data.filter(item => 
            item.category === 'stones' || item.category === 'stone' || item.item_type === 'stone'
          ));
          setArtificialItems(data.filter(item => 
            item.category === 'artificial' || item.item_type === 'artificial' || item.isArtificial
          ));
        }, (loading) => setLoading(prev => ({ ...prev, inventory: loading }))),
        
        fetchData('vendors', setVendors, (loading) => 
          setLoading(prev => ({ ...prev, vendors: loading })), parseVendorData),
        
        fetchData('reservations', setReservations, (loading) => 
          setLoading(prev => ({ ...prev, reservations: loading })), parseReservationData),
        
        fetchData('customers', setCustomers, (loading) => 
          setLoading(prev => ({ ...prev, customers: loading }))),
        
        fetchData('customer_transactions', setCustomerTransactions, () => {}),
        
        fetchData('craftsmen', setCraftsmen, (loading) => 
          setLoading(prev => ({ ...prev, craftsmen: loading }))),
        
        fetchData('staff', setStaff, (loading) => 
          setLoading(prev => ({ ...prev, staff: loading }))),
        
        fetchData('attendance', setAttendance, () => {}),
        fetchData('salary_rules', setSalaryRules, () => {}),
        fetchData('salary_rules', setSalarySlips, () => {}),
        
        fetchData('pos_recentInvoices', setPosRecentInvoices, () => {}),
        fetchData('user_subscriptions', setSubscriptionStatus, () => {}),
      ]);
      console.log('✅ All data loaded');
    };

    loadAllData();
  }, [fetchData, parseVendorData, parseReservationData]);

  const refreshSettings = useCallback(async () => {
    console.log('🔄 Refreshing settings...');
    await Promise.all([
      fetchData('businessSettings', setBusinessSettings, (loading) => 
        setLoading(prev => ({ ...prev, settings: loading }))),
      fetchData('paymentSettings', setPaymentSettings, () => {}),
      fetchData('notificationSettings', setNotificationSettings, () => {}),
      fetchData('gold_rate_settings', setGoldRateSettings, () => {}),
    ]);
    console.log('✅ Settings refreshed');
  }, [fetchData]);

  const refreshInventory = useCallback(async () => {
    await fetchData('inventory_items', (data: InventoryItem[]) => {
      setInventoryItems(data);
      setGoldItems(data.filter(item => 
        item.category === 'gold' || item.item_type === 'gold'
      ));
      setJewelryItems(data.filter(item => 
        item.category === 'jewelry' || item.item_type === 'jewelry'
      ));
      setStoneItems(data.filter(item => 
        item.category === 'stones' || item.category === 'stone' || item.item_type === 'stone'
      ));
      setArtificialItems(data.filter(item => 
        item.category === 'artificial' || item.item_type === 'artificial' || item.isArtificial
      ));
    }, (loading) => setLoading(prev => ({ ...prev, inventory: loading })));
  }, [fetchData]);

  const refreshVendors = useCallback(async () => {
    await fetchData('vendors', setVendors, (loading) => 
      setLoading(prev => ({ ...prev, vendors: loading })), parseVendorData);
  }, [fetchData, parseVendorData]);

  const refreshReservations = useCallback(async () => {
    await fetchData('reservations', setReservations, (loading) => 
      setLoading(prev => ({ ...prev, reservations: loading })), parseReservationData);
  }, [fetchData, parseReservationData]);

  const refreshCustomers = useCallback(async () => {
    await fetchData('customers', setCustomers, (loading) => 
      setLoading(prev => ({ ...prev, customers: loading })));
  }, [fetchData]);

  const refreshCraftsmen = useCallback(async () => {
    await fetchData('craftsmen', setCraftsmen, (loading) => 
      setLoading(prev => ({ ...prev, craftsmen: loading })));
  }, [fetchData]);

  const refreshStaff = useCallback(async () => {
    await fetchData('staff', setStaff, (loading) => 
      setLoading(prev => ({ ...prev, staff: loading })));
  }, [fetchData]);

  const refreshAll = useCallback(async () => {
    await refreshSettings();
    await Promise.all([
      refreshInventory(),
      refreshVendors(),
      refreshReservations(),
      refreshCustomers(),
      refreshCraftsmen(),
      refreshStaff(),
    ]);
  }, [refreshSettings, refreshInventory, refreshVendors, refreshReservations, refreshCustomers, refreshCraftsmen, refreshStaff]);

  const value: DataContextType = {
    inventoryItems,
    goldItems,
    jewelryItems,
    stoneItems,
    artificialItems,
    vendors,
    reservations,
    customers,
    customerTransactions,
    craftsmen,
    staff,
    attendance,
    salaryRules,
    salarySlips,
    businessSettings,
    paymentSettings,
    notificationSettings,
    goldRateSettings,
    posCart,
    posCustomerName,
    posRecentInvoices,
    subscriptionStatus,
    
    loading,
    
    updateInventoryItems: setInventoryItems,
    updateVendors: setVendors,
    updateReservations: setReservations,
    updateCustomers: setCustomers,
    updateCustomerTransactions: setCustomerTransactions,
    updateCraftsmen: setCraftsmen,
    updateStaff: setStaff,
    updateAttendance: setAttendance,
    updateSalaryRules: setSalaryRules,
    updateSalarySlips: setSalarySlips,
    updateBusinessSettings: setBusinessSettings,
    updatePaymentSettings: setPaymentSettings,
    updateNotificationSettings: setNotificationSettings,
    updateGoldRateSettings: setGoldRateSettings,
    updatePosCart: setPosCart,
    updatePosCustomerName: setPosCustomerName,
    updatePosRecentInvoices: setPosRecentInvoices,
    updateSubscriptionStatus: setSubscriptionStatus,
    
    refreshSettings,
    refreshInventory,
    refreshVendors,
    refreshReservations,
    refreshCustomers,
    refreshCraftsmen,
    refreshStaff,
    refreshAll,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

