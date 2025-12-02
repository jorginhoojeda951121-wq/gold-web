import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { JewelryCard, JewelryItem } from "@/components/JewelryCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Receipt, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard,
  DollarSign,
  Printer,
  RefreshCw,
  Search,
  Users,
  UserCheck,
  Wallet,
  Smartphone,
  CheckCircle,
  Eye,
  X,
  Scan
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserStorage } from "@/hooks/useUserStorage";
import { getUserData, setUserData } from "@/lib/userStorage";
import { generateReceiptPDF, ReceiptData } from "@/lib/pdfGenerator";
import ItemDetailsDialog from "@/components/ItemDetailsDialog";
// Removed idbGet, idbSet - now using getUserData, setUserData from userStorage
import { enqueueChange } from "@/lib/sync";
import { BarcodeInput } from "@/components/BarcodeScanner";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: string;
  taxRate?: number;        // Custom tax rate for this item (percentage)
  taxIncluded?: boolean;   // Whether price includes tax
  taxCategory?: string;    // Tax category for reporting
}

interface Invoice {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  date: string;
  customerName?: string;
  paymentMethod: string;
}

interface Customer {
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
}

interface CustomerTransaction {
  id: string;
  customerId: string;
  type: 'purchase' | 'payment' | 'credit_adjustment';
  amount: number;
  description: string;
  date: string;
  invoiceId?: string;
  paymentMethod?: string;
}

const POS = () => {
  const { toast } = useToast();
  const { data: cart, updateData: setCart } = useUserStorage<CartItem[]>("pos_cart", []);
  const { data: customerName, updateData: setCustomerName } = useUserStorage<string>("pos_customerName", "");
  const { data: recentInvoices, updateData: setRecentInvoices } = useUserStorage<Invoice[]>("pos_recentInvoices", []);
  
  // Load customers for credit/repayment functionality
  const { data: customers, updateData: setCustomers } = useUserStorage<Customer[]>('customers', []);
  const { data: customerTransactions, updateData: setCustomerTransactions } = useUserStorage<CustomerTransaction[]>('customer_transactions', []);
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showRepaymentDialog, setShowRepaymentDialog] = useState(false);
  const [repaymentData, setRepaymentData] = useState({
    amount: "",
    description: "",
    paymentMethod: "Cash"
  });
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [showCashPaymentDialog, setShowCashPaymentDialog] = useState(false);
  const [showCardPaymentDialog, setShowCardPaymentDialog] = useState(false);
  const [cashPaymentData, setCashPaymentData] = useState({
    amountReceived: "",
  });
  const [cardPaymentData, setCardPaymentData] = useState({
    cardNumber: "",
  });
  const { data: businessSettings } = useUserStorage('businessSettings', {
    businessName: "Golden Treasures",
    address: "123 Jewelry Street, Mumbai",
    phone: "+91 8910921128",
    email: "info@goldentreasures.com",
    gstNumber: "27XXXXX1234X1Z5",
    currency: "INR",
    timezone: "Asia/Kolkata"
  });
  const { data: paymentSettings } = useUserStorage('paymentSettings', {
    upiId: "goldentreasures@paytm",
    businessName: "Golden Treasures Pvt Ltd",
    gstNumber: "27XXXXX1234X1Z5",
    bankAccount: "1234567890123456",
    ifscCode: "HDFC0001234"
  });
  
  // Load inventory directly from IndexedDB (bypass cache issues)
  const [availableItems, setAvailableItems] = useState<JewelryItem[]>([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isLoadingRef = useRef(false);

  // Function to load all inventory from IndexedDB directly
  const loadAllInventory = useCallback(async (forceReload = false) => {
    // Prevent multiple simultaneous loads (unless forced)
    if (isLoadingRef.current && !forceReload) return;
    isLoadingRef.current = true;
    
    try {
      setIsRefreshing(true);
      
      // Load all inventory from unified inventory_items table (Single Source of Truth)
      const inventoryData = await getUserData<any[]>("inventory_items") || [];

      const items: JewelryItem[] = inventoryData.map((item: any) => {
        // Determine item type - check item_type first, then category, then type field
        const itemType = item.item_type || 
          (item.category === 'gold' ? 'gold' :
           item.category === 'stones' ? 'stone' :
           item.category === 'stone' ? 'stone' :
           item.type === 'Gold Bar' ? 'gold' : 
           item.type === 'Gemstone' ? 'stone' : 'jewelry');

        // Transform to JewelryItem format
        const stockValue = item.inStock ?? item.stock ?? item.in_stock ?? 10;
        
        return {
          id: item.id,
          name: item.name || 'Unknown Item',
          type: itemType === 'gold' ? 'Gold Bar' 
                : itemType === 'stone' ? 'Gemstone'
                : (item.type || 'Ring'),
          gemstone: itemType === 'stone' 
            ? (item.name || 'Stone')
            : (item.gemstone || item.attributes?.gemstone || 'None'),
          carat: itemType === 'stone' 
            ? (parseFloat(item.attributes?.carat || item.carat) || 0)
            : (parseFloat(item.carat) || 0),
          metal: itemType === 'gold'
            ? (item.attributes?.purity || item.purity || item.metal || 'Gold 18K')
            : itemType === 'stone'
            ? 'Platinum'
            : (item.metal || 'Gold 18K'),
          price: item.price || 0,
          inStock: stockValue,
          isArtificial: item.isArtificial || false,
          image: item.image || item.image_1 || '',
          image_1: item.image_1 || item.image || '',
          image_2: item.image_2 || '',
          image_3: item.image_3 || '',
          image_4: item.image_4 || '',
        };
      });


      setAvailableItems(items);
      setItemsLoaded(true);
    } catch (error) {
      console.error('❌ Error loading inventory:', error);
      setAvailableItems([]);
      setItemsLoaded(true);
    } finally {
      setIsRefreshing(false);
      isLoadingRef.current = false;
    }
  }, []);

  // Load inventory on mount only
  useEffect(() => {
    if (!itemsLoaded) {
      loadAllInventory();
    }
  }, []);

  // Listen for sync completion events to reload data in background
  useEffect(() => {
    const handleDataSynced = () => {
      // Force reload without blocking UI
      loadAllInventory(true);
    };

    window.addEventListener('data-synced', handleDataSynced);
    
    return () => {
      window.removeEventListener('data-synced', handleDataSynced);
    };
  }, [loadAllInventory]);
  
  // Update function for POS inventory updates - CRITICAL: Must update inventory_items (Single Source of Truth)
  const updateInventoryStock = useCallback(async (updatedItems: JewelryItem[]) => {
    try {
      // Load current data from unified inventory_items table
      const inventoryData = await getUserData<any[]>("inventory_items") || [];
      const updatedInventory = [...inventoryData];

      updatedItems.forEach(item => {
        const now = new Date().toISOString();
        
        // Determine item type for inventory_items
        const itemType = item.type === 'Gold Bar' ? 'gold' 
                       : item.type === 'Gemstone' ? 'stone'
                       : 'jewelry';

        // Update inventory_items table (CRITICAL for sync)
        const inventoryIndex = updatedInventory.findIndex((inv: any) => inv.id === item.id);
        const inventoryItem = inventoryIndex >= 0 ? updatedInventory[inventoryIndex] : {};
        
        const inventoryUpdate = {
          id: item.id,
          item_type: itemType,
          name: item.name || inventoryItem.name || '',
          type: item.type || inventoryItem.type || '',
          price: item.price || inventoryItem.price || 0,
          inStock: item.inStock, // CRITICAL: Update stock quantity
          image: item.image || inventoryItem.image || '',
          attributes: {
            ...inventoryItem.attributes,
            description: item.type || inventoryItem.attributes?.description || '',
            carat: item.carat || inventoryItem.attributes?.carat || 0,
            purity: item.type === 'Gold Bar' ? item.metal : inventoryItem.attributes?.purity,
            weight: inventoryItem.attributes?.weight,
            clarity: inventoryItem.attributes?.clarity,
            cut: inventoryItem.attributes?.cut,
          },
          isArtificial: item.isArtificial || inventoryItem.isArtificial || false,
          updated_at: now, // Timestamp for conflict resolution
        };

        if (inventoryIndex >= 0) {
          updatedInventory[inventoryIndex] = inventoryUpdate;
        } else {
          updatedInventory.push(inventoryUpdate);
        }

        // Enqueue change for sync (CRITICAL: This ensures server gets updated stock)
        enqueueChange('inventory_items', 'upsert', inventoryUpdate);
      });

      // Save back to IndexedDB (Single Source of Truth)
      await setUserData("inventory_items", updatedInventory);


      // Reload inventory
      await loadAllInventory();
    } catch (error) {
      console.error('❌ Error updating inventory:', error);
    }
  }, [loadAllInventory]);
  const [selected, setSelected] = useState<JewelryItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showUpi, setShowUpi] = useState(false);
  const [upiUrl, setUpiUrl] = useState("");
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  // Handle invoice deletion
  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    
    try {
      await setRecentInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete.id));
      
      // Also enqueue deletion for sync (use pos_recentInvoices, not pos_invoices)
      enqueueChange('pos_recentInvoices', 'delete', { id: invoiceToDelete.id });
      
      toast({
        title: "Invoice Deleted",
        description: `Invoice ${invoiceToDelete.id} has been removed from history.`,
        variant: "destructive"
      });
      
      setInvoiceToDelete(null);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: "Error",
        description: "Failed to delete invoice.",
        variant: "destructive"
      });
    }
  };

  const addToCart = (item: JewelryItem) => {
    setCart(prev => {
      const existing = prev.find(cartItem => cartItem.id === item.id);
      if (existing) {
        return prev.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prev, { 
        id: item.id, 
        name: item.name, 
        price: item.price, 
        quantity: 1, 
        type: item.type,
        taxRate: item.taxRate ?? 3,
        taxIncluded: item.taxIncluded ?? false,
        taxCategory: item.taxCategory ?? 'jewelry'
      }];
    });
  };

  const handleBarcodeScan = (barcode: string) => {
    const barcodeUpper = barcode.toUpperCase();
    
    // Search in available items by barcode or SKU
    const foundItem = availableItems.find(
      item => 
        (item.barcode && item.barcode.toUpperCase() === barcodeUpper) ||
        (item.sku && item.sku.toUpperCase() === barcodeUpper) ||
        item.id.toUpperCase() === barcodeUpper
    );

    if (foundItem) {
      addToCart(foundItem);
      toast({
        title: "Item Added",
        description: `${foundItem.name} added to cart`,
      });
    } else {
      toast({
        title: "Item Not Found",
        description: `No item found with barcode: ${barcode}`,
        variant: "destructive",
      });
    }
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity === 0) {
      setCart(prev => prev.filter(item => item.id !== id));
    } else {
      setCart(prev => prev.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // Memoize cart calculations to avoid re-computing on every render with per-item tax rates
  const { subtotal, tax, total, taxBreakdown } = useMemo(() => {
    let subTotal = 0;
    let totalTax = 0;
    const taxBreakdownMap = new Map<number, { amount: number; count: number }>();

    cart.forEach(item => {
      const itemTaxRate = (item.taxRate ?? 3) / 100; // Default 3% if not specified
      const itemTotal = item.price * item.quantity;

      if (item.taxIncluded) {
        // If tax is included, extract the base price and tax
        const basePrice = itemTotal / (1 + itemTaxRate);
        const taxAmount = itemTotal - basePrice;
        subTotal += basePrice;
        totalTax += taxAmount;
        
        const rateKey = item.taxRate ?? 3;
        const existing = taxBreakdownMap.get(rateKey) || { amount: 0, count: 0 };
        taxBreakdownMap.set(rateKey, { amount: existing.amount + taxAmount, count: existing.count + 1 });
      } else {
        // If tax is not included, calculate tax on top
        const taxAmount = itemTotal * itemTaxRate;
        subTotal += itemTotal;
        totalTax += taxAmount;
        
        const rateKey = item.taxRate ?? 3;
        const existing = taxBreakdownMap.get(rateKey) || { amount: 0, count: 0 };
        taxBreakdownMap.set(rateKey, { amount: existing.amount + taxAmount, count: existing.count + 1 });
      }
    });

    return {
      subtotal: subTotal,
      tax: totalTax,
      total: subTotal + totalTax,
      taxBreakdown: Array.from(taxBreakdownMap.entries()).map(([rate, data]) => ({
        rate,
        amount: data.amount,
        count: data.count
      }))
    };
  }, [cart]);

  // Filter customers by search query
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery) return customers;
    const query = customerSearchQuery.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      c.email.toLowerCase().includes(query)
    );
  }, [customers, customerSearchQuery]);

  // Handle customer repayment
  const handleRepayment = async () => {
    if (!selectedCustomer || !repaymentData.amount) {
      toast({
        title: "Missing Information",
        description: "Please enter repayment amount.",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(repaymentData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid repayment amount.",
        variant: "destructive"
      });
      return;
    }

    // Create transaction
    const newTransaction: CustomerTransaction = {
      id: Date.now().toString(),
      customerId: selectedCustomer.id,
      type: 'payment',
      amount: -amount, // Negative for payment
      description: repaymentData.description || `Repayment for ${selectedCustomer.name}`,
      date: new Date().toISOString(),
      paymentMethod: repaymentData.paymentMethod,
      invoiceId: undefined
    };

    // Update transactions
    await setCustomerTransactions(prev => [...prev, newTransaction]);

    // Update customer balance
    await setCustomers(prev => prev.map(customer => 
      customer.id === selectedCustomer.id
        ? {
            ...customer,
            currentBalance: (customer.currentBalance || 0) - amount,
          }
        : customer
    ));

    // Reload customers
    const updatedCustomers = await getUserData<Customer[]>('customers') || [];
    setSelectedCustomer(updatedCustomers.find(c => c.id === selectedCustomer.id) || null);

    toast({
      title: "Repayment Recorded",
      description: `₹${amount.toLocaleString()} repayment has been recorded for ${selectedCustomer.name}.`
    });

    setRepaymentData({ amount: "", description: "", paymentMethod: "Cash" });
    setShowRepaymentDialog(false);
  };

  const processPayment = async (paymentMethod: string) => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to the cart before processing payment.",
        variant: "destructive"
      });
      return;
    }

    const invoice: Invoice = {
      id: `INV-${Date.now()}`,
      items: [...cart],
      subtotal,
      tax,
      total,
      date: new Date().toISOString(),
      customerName: customerName || selectedCustomer?.name || "Walk-in Customer",
      paymentMethod
    };

    setRecentInvoices(prev => [invoice, ...prev.slice(0, 4)]);

    // If payment is Credit/Loan and customer is selected, update customer ledger
    if (paymentMethod === 'Credit' && selectedCustomer) {
      try {
        // Create purchase transaction for customer
        const newTransaction: CustomerTransaction = {
          id: Date.now().toString(),
          customerId: selectedCustomer.id,
          type: 'purchase',
          amount: total, // Positive for purchase
          description: `Purchase: ${cart.map(i => i.name).join(', ')}`,
          date: new Date().toISOString(),
          invoiceId: invoice.id,
          paymentMethod: 'Credit'
        };

        await setCustomerTransactions(prev => [...prev, newTransaction]);

        // Update customer balance
        await setCustomers(prev => prev.map(customer => 
          customer.id === selectedCustomer.id
            ? {
                ...customer,
                currentBalance: (customer.currentBalance || 0) + total,
                totalPurchases: (customer.totalPurchases || 0) + total,
                lastPurchaseDate: new Date().toISOString().split('T')[0],
              }
            : customer
        ));

        toast({
          title: "Credit Sale Recorded",
          description: `Credit sale of ₹${total.toLocaleString()} has been added to ${selectedCustomer.name}'s account.`
        });
      } catch (error) {
        console.error("Failed to update customer ledger:", error);
      }
    }

    // Decrement stock in shared inventory
    try {
      const updated = availableItems.map(it => {
        const sold = cart.find(c => c.id === it.id);
        if (!sold) return it;
        const newQty = Math.max(0, (it.inStock ?? 0) - sold.quantity);
        return { ...it, inStock: newQty } as JewelryItem;
      });
      await updateInventoryStock(updated);
      setAvailableItems(updated); // Update local state immediately
    } catch (e) {
      console.error("Failed to update inventory stock after sale", e);
    }

    setCart([]);
    setCustomerName("");

    // Generate and download PDF receipt
    try {
      const receiptData: ReceiptData = {
        invoiceId: invoice.id,
        businessName: businessSettings.businessName,
        businessAddress: businessSettings.address,
        businessPhone: businessSettings.phone,
        businessEmail: businessSettings.email,
        gstNumber: businessSettings.gstNumber,
        customerName: invoice.customerName,
        items: invoice.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })),
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        total: invoice.total,
        paymentMethod: invoice.paymentMethod,
        date: invoice.date,
        upiId: paymentSettings.upiId
      };

      await generateReceiptPDF(receiptData);
      
      toast({
        title: "Payment Processed",
        description: `Invoice ${invoice.id} has been generated and receipt downloaded.`
      });
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast({
        title: "Payment Processed",
        description: `Invoice ${invoice.id} has been generated successfully.`,
        variant: "destructive"
      });
    }
  };

  const openUpiModal = () => {
    if (cart.length === 0) {
      toast({ title: "Empty Cart", description: "Please add items to the cart before processing payment.", variant: "destructive" });
      return;
    }
    
    if (!paymentSettings.upiId) {
      toast({ 
        title: "UPI ID Not Configured", 
        description: "Please configure UPI ID in Settings before processing UPI payments.", 
        variant: "destructive" 
      });
      return;
    }
    
    const pa = paymentSettings.upiId || "";
    const pn = businessSettings.businessName || "";
    const am = total.toFixed(2);
    const tn = `POS payment ${new Date().toLocaleDateString()}`;
    
    // Generate UPI payment string in proper format for QR code scanning
    // Format: UPI://pay?pa=<UPI_ID>&pn=<PayeeName>&am=<Amount>&cu=<Currency>&tn=<TransactionNote>
    const upiPaymentString = `UPI://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${am}&cu=INR&tn=${encodeURIComponent(tn)}`;
    setUpiUrl(upiPaymentString);
    setShowUpi(true);
  };

  const handleOpenUpiApp = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    if (!upiUrl || !paymentSettings.upiId) {
      toast({
        title: "Error",
        description: "UPI payment URL is not available. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    // Convert UPI:// to upi:// for deep linking
    const upiDeepLink = upiUrl.replace('UPI://', 'upi://');
    
    // Try to open UPI app using window.location for better compatibility
    try {
      // Create a temporary anchor element to trigger the deep link
      const link = document.createElement('a');
      link.href = upiDeepLink;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Fallback: if above doesn't work, use window.location
      setTimeout(() => {
        window.location.href = upiDeepLink;
      }, 100);
    } catch (error) {
      console.error('Error opening UPI app:', error);
      toast({
        title: "Error",
        description: "Could not open UPI app. Please scan the QR code instead or use the UPI ID manually.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-elegant">
      
      <header className="bg-gradient-primary shadow-elegant border-b border-border/50">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground">Point of Sale</h1>
              <p className="text-primary-foreground/70 text-sm">Process sales and generate invoices</p>
            </div>
            
            {/* Barcode Scanner Input */}
            <div className="flex-1 max-w-md">
              <BarcodeInput 
                onScan={handleBarcodeScan}
                placeholder="Scan barcode to add item..."
                className="w-full"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <Badge className="bg-accent text-accent-foreground">
                Terminal: POS-001
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-8 max-w-full overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8 w-full">
          
          {/* Product Selection */}
          <div className="lg:col-span-2 space-y-6 w-full overflow-x-hidden">
            <Card className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 shadow-xl border-2 border-blue-100/50 w-full overflow-hidden relative">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full blur-3xl -z-0"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-200/20 to-pink-200/20 rounded-full blur-3xl -z-0"></div>
              
              <CardHeader className="relative z-10 bg-gradient-to-r from-blue-50/50 via-white to-purple-50/50 border-b-2 border-blue-100/50 pb-4">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
                      <ShoppingCart className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
                        Quick Add Items
                      </h2>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        Select products to add to cart
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadAllInventory()}
                    disabled={isRefreshing}
                    className="bg-white/80 backdrop-blur-sm border-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="w-full overflow-x-hidden relative z-10 pt-6">
                {!itemsLoaded ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 mb-4">
                      <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                    </div>
                    <p className="text-gray-600 font-medium">Loading inventory...</p>
                  </div>
                ) : availableItems.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 mb-4">
                      <ShoppingCart className="h-10 w-10 text-gray-400" />
                    </div>
                    <p className="text-gray-700 font-semibold mb-2 text-lg">No inventory items available</p>
                    <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
                      No items found in IndexedDB. Make sure you have added inventory items.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadAllInventory()}
                      disabled={isRefreshing}
                      className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 hover:from-blue-100 hover:to-purple-100"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Reload
                    </Button>
                    <p className="text-xs text-gray-400 mt-3">
                      Check console for detailed logs
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[900px] overflow-y-auto overflow-x-hidden w-full min-w-0 scrollbar-thin pr-2">
                    {availableItems.map((item, index) => (
                      <div 
                        key={item.id} 
                        className="min-w-0 w-full animate-in fade-in slide-in-from-bottom-4"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <JewelryCard
                          item={item}
                          onEdit={() => {}}
                          onDelete={() => {}}
                          onView={(it) => { setSelected(it); setShowDetails(true); }}
                          onAddToCart={addToCart}
                          showAddToCart={true}
                          showActions={false}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Invoices */}
            <Card className="bg-card shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Recent Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentInvoices.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No recent invoices</p>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-thin pr-2">
                    {recentInvoices.map(invoice => (
                      <div key={invoice.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{invoice.id}</p>
                          <p className="text-sm text-muted-foreground truncate">{invoice.customerName || "Walk-in Customer"}</p>
                        </div>
                        <div className="text-right mr-4 flex-shrink-0">
                          <p className="font-bold text-foreground">₹{invoice.total.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{invoice.paymentMethod}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setViewingInvoice(invoice)}
                            title="View Invoice"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const receiptData: ReceiptData = {
                                invoiceId: invoice.id,
                                businessName: businessSettings.businessName,
                                businessAddress: businessSettings.address,
                                businessPhone: businessSettings.phone,
                                businessEmail: businessSettings.email,
                                gstNumber: businessSettings.gstNumber,
                                customerName: invoice.customerName || "Walk-in Customer",
                                items: invoice.items.map(item => ({
                                  name: item.name,
                                  quantity: item.quantity,
                                  price: item.price,
                                  total: item.price * item.quantity
                                })),
                                subtotal: invoice.subtotal,
                                tax: invoice.tax,
                                total: invoice.total,
                                paymentMethod: invoice.paymentMethod,
                                date: invoice.date,
                                upiId: paymentSettings.upiId
                              };
                              generateReceiptPDF(receiptData);
                            }}
                            title="Print Invoice"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setInvoiceToDelete(invoice)}
                            title="Delete Invoice"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cart and Checkout */}
          <div className="space-y-6">
            {/* Customer Info */}
            <Card className="bg-card shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Customer Information</span>
                  {selectedCustomer && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustomerName("");
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search customer by name or phone..."
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setShowCustomerSearch(true);
                    }}
                    onFocus={() => {
                      if (customerSearchQuery) setShowCustomerSearch(true);
                    }}
                    onBlur={() => {
                      // Delay to allow click event to fire
                      setTimeout(() => setShowCustomerSearch(false), 200);
                    }}
                    className="pl-10"
                  />
                </div>
                
                {showCustomerSearch && customerSearchQuery && (
                  <div className="border rounded-lg max-h-48 overflow-y-auto bg-white shadow-lg z-10">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map(customer => (
                        <div
                          key={customer.id}
                          className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setCustomerName(customer.name);
                            setShowCustomerSearch(false);
                            setCustomerSearchQuery("");
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{customer.name}</p>
                              <p className="text-xs text-gray-500">{customer.phone}</p>
                            </div>
                            {customer.currentBalance > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                ₹{customer.currentBalance.toLocaleString()} due
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No customers found
                      </div>
                    )}
                  </div>
                )}

                {selectedCustomer && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-900">{selectedCustomer.name}</span>
                      </div>
                    </div>
                    <div className="text-xs space-y-1 text-blue-700">
                      <p>Phone: {selectedCustomer.phone}</p>
                      {selectedCustomer.currentBalance > 0 && (
                        <p className="font-medium text-red-600">
                          Outstanding: ₹{selectedCustomer.currentBalance.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {selectedCustomer && selectedCustomer.currentBalance > 0 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowRepaymentDialog(true)}
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    Record Repayment
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Cart */}
            <Card className="bg-card shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Cart ({cart.length} items)</span>
                  {cart.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCart([])}
                    >
                      Clear All
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Cart is empty</p>
                ) : (
                  <ScrollArea className="h-64">
                    <div className="space-y-4 pr-4">
                      {cart.map(item => (
                        <div key={item.id} className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground">{item.name}</h4>
                            <p className="text-sm text-muted-foreground">₹{item.price.toLocaleString()} each</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeFromCart(item.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Checkout */}
            {cart.length > 0 && (
              <Card className="bg-card shadow-card border-border/50">
                <CardHeader>
                  <CardTitle>Checkout</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                    </div>
                    
                    {/* Tax Breakdown */}
                    {taxBreakdown && taxBreakdown.length > 0 && (
                      <div className="space-y-1 bg-amber-50 p-2 rounded border border-amber-200">
                        <div className="text-xs font-semibold text-amber-900 mb-1">GST Breakdown:</div>
                        {taxBreakdown.map((tax, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-amber-800">
                            <span>GST @ {tax.rate}% ({tax.count} item{tax.count > 1 ? 's' : ''}):</span>
                            <span className="font-medium">₹{tax.amount.toFixed(2)}</span>
                          </div>
                        ))}
                        <Separator className="my-1" />
                        <div className="flex justify-between text-sm font-semibold text-amber-900">
                          <span>Total GST:</span>
                          <span>₹{tax.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                    
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>₹{total.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Button
                      className="w-full bg-gradient-gold hover:bg-gold-dark text-primary transition-smooth"
                      onClick={() => {
                        if (cart.length === 0) {
                          toast({
                            title: "Empty Cart",
                            description: "Please add items to the cart before processing payment.",
                            variant: "destructive"
                          });
                          return;
                        }
                        setCashPaymentData({ amountReceived: "" });
                        setShowCashPaymentDialog(true);
                      }}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Cash Payment
                    </Button>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={openUpiModal}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      UPI Payment
                    </Button>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => {
                        if (cart.length === 0) {
                          toast({
                            title: "Empty Cart",
                            description: "Please add items to the cart before processing payment.",
                            variant: "destructive"
                          });
                          return;
                        }
                        setCardPaymentData({ cardNumber: "" });
                        setShowCardPaymentDialog(true);
                      }}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Card Payment
                    </Button>
                    {selectedCustomer && (
                      <Button
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                        onClick={() => processPayment("Credit")}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Credit / Loan
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Cash Payment Confirmation Dialog */}
      <Dialog open={showCashPaymentDialog} onOpenChange={setShowCashPaymentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Cash Payment Confirmation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Order Summary */}
            <div className="p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-semibold mb-2">Order Summary</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">₹{tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span className="text-green-600">₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Amount Received */}
            <div>
              <Label htmlFor="cash-amount-received">
                Amount Received (₹) *
              </Label>
              <Input
                id="cash-amount-received"
                type="number"
                step="0.01"
                value={cashPaymentData.amountReceived}
                onChange={(e) => setCashPaymentData(prev => ({ ...prev, amountReceived: e.target.value }))}
                placeholder="Enter amount received"
                className="text-lg font-semibold"
                autoFocus
              />
            </div>

            {/* Refund/Change Calculation */}
            {cashPaymentData.amountReceived && parseFloat(cashPaymentData.amountReceived) > 0 && (
              <div className="p-4 rounded-lg border-2" style={{
                backgroundColor: parseFloat(cashPaymentData.amountReceived) >= total 
                  ? '#f0fdf4' 
                  : '#fef2f2',
                borderColor: parseFloat(cashPaymentData.amountReceived) >= total 
                  ? '#86efac' 
                  : '#fca5a5'
              }}>
                {parseFloat(cashPaymentData.amountReceived) >= total ? (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Refund Amount:</span>
                      <span className="text-2xl font-bold text-green-600">
                        ₹{(parseFloat(cashPaymentData.amountReceived) - total).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Amount received is sufficient. Refund to customer.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Amount Short:</span>
                      <span className="text-2xl font-bold text-red-600">
                        ₹{(total - parseFloat(cashPaymentData.amountReceived)).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-red-600">
                      Insufficient amount. Please collect more cash.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCashPaymentDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const amountReceived = parseFloat(cashPaymentData.amountReceived);
                if (!amountReceived || amountReceived <= 0) {
                  toast({
                    title: "Invalid Amount",
                    description: "Please enter a valid amount received.",
                    variant: "destructive"
                  });
                  return;
                }
                if (amountReceived < total) {
                  toast({
                    title: "Insufficient Amount",
                    description: `Amount received (₹${amountReceived.toFixed(2)}) is less than total (₹${total.toFixed(2)}).`,
                    variant: "destructive"
                  });
                  return;
                }
                setShowCashPaymentDialog(false);
                processPayment("Cash");
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={!cashPaymentData.amountReceived || parseFloat(cashPaymentData.amountReceived) < total}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Cash Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card Payment Confirmation Dialog */}
      <Dialog open={showCardPaymentDialog} onOpenChange={setShowCardPaymentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Card Payment Confirmation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Order Summary */}
            <div className="p-4 bg-gray-50 rounded-lg border">
              <h3 className="font-semibold mb-2">Order Summary</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-medium">₹{tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span className="text-blue-600">₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Card Number */}
            <div>
              <Label htmlFor="card-number">
                Card Number *
              </Label>
              <Input
                id="card-number"
                type="text"
                value={cardPaymentData.cardNumber}
                onChange={(e) => {
                  // Format card number with spaces (XXXX XXXX XXXX XXXX)
                  const value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                  const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                  setCardPaymentData(prev => ({ ...prev, cardNumber: formatted }));
                }}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                className="text-lg font-mono"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the last 4 digits or full card number
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCardPaymentDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!cardPaymentData.cardNumber || cardPaymentData.cardNumber.trim().replace(/\s/g, '').length < 4) {
                  toast({
                    title: "Invalid Card Number",
                    description: "Please enter at least the last 4 digits of the card.",
                    variant: "destructive"
                  });
                  return;
                }
                setShowCardPaymentDialog(false);
                processPayment("Card");
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!cardPaymentData.cardNumber || cardPaymentData.cardNumber.trim().replace(/\s/g, '').length < 4}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Card Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Repayment Dialog */}
      <Dialog open={showRepaymentDialog} onOpenChange={setShowRepaymentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Repayment - {selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedCustomer && selectedCustomer.currentBalance > 0 && (
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  Outstanding Balance: <span className="font-bold">₹{selectedCustomer.currentBalance.toLocaleString()}</span>
                </p>
              </div>
            )}
            
            <div>
              <Label htmlFor="repayment-amount">Repayment Amount (₹) *</Label>
              <Input
                id="repayment-amount"
                type="number"
                value={repaymentData.amount}
                onChange={(e) => setRepaymentData(prev => ({...prev, amount: e.target.value}))}
                placeholder="Enter amount"
                required
              />
            </div>

            <div>
              <Label htmlFor="repayment-description">Description</Label>
              <Textarea
                id="repayment-description"
                value={repaymentData.description}
                onChange={(e) => setRepaymentData(prev => ({...prev, description: e.target.value}))}
                placeholder="Repayment description (optional)"
              />
            </div>

            <div>
              <Label htmlFor="repayment-method">Payment Method</Label>
              <Select 
                value={repaymentData.paymentMethod}
                onValueChange={(value) => setRepaymentData(prev => ({...prev, paymentMethod: value}))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRepaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRepayment} className="bg-green-600 hover:bg-green-700">
              Record Repayment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <ItemDetailsDialog
        item={selected}
        open={showDetails}
        onClose={() => setShowDetails(false)}
      />

      {/* View Invoice Dialog */}
      <Dialog open={!!viewingInvoice} onOpenChange={(open) => !open && setViewingInvoice(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Invoice Details</span>
              {viewingInvoice && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const receiptData: ReceiptData = {
                      invoiceId: viewingInvoice.id,
                      businessName: businessSettings.businessName,
                      businessAddress: businessSettings.address,
                      businessPhone: businessSettings.phone,
                      businessEmail: businessSettings.email,
                      gstNumber: businessSettings.gstNumber,
                      customerName: viewingInvoice.customerName || "Walk-in Customer",
                      items: viewingInvoice.items.map(item => ({
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        total: item.price * item.quantity
                      })),
                      subtotal: viewingInvoice.subtotal,
                      tax: viewingInvoice.tax,
                      total: viewingInvoice.total,
                      paymentMethod: viewingInvoice.paymentMethod,
                      date: viewingInvoice.date,
                      upiId: paymentSettings.upiId
                    };
                    generateReceiptPDF(receiptData);
                  }}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewingInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Invoice ID</Label>
                  <p className="font-semibold">{viewingInvoice.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-semibold">{new Date(viewingInvoice.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p className="font-semibold">{viewingInvoice.customerName || "Walk-in Customer"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Payment Method</Label>
                  <p className="font-semibold">{viewingInvoice.paymentMethod}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label className="text-muted-foreground mb-2 block">Items</Label>
                <div className="space-y-2">
                  {viewingInvoice.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-secondary rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity} × ₹{item.price.toLocaleString('en-IN')}</p>
                      </div>
                      <p className="font-bold">₹{(item.price * item.quantity).toLocaleString('en-IN')}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-muted-foreground">Subtotal</Label>
                  <p className="font-semibold">₹{viewingInvoice.subtotal.toLocaleString('en-IN')}</p>
                </div>
                <div className="flex justify-between">
                  <Label className="text-muted-foreground">Total GST</Label>
                  <p className="font-semibold">₹{viewingInvoice.tax.toLocaleString('en-IN')}</p>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <Label className="text-lg font-bold">Total</Label>
                  <p className="text-lg font-bold text-primary">₹{viewingInvoice.total.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingInvoice(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Invoice Confirmation Dialog */}
      <Dialog open={!!invoiceToDelete} onOpenChange={(open) => !open && setInvoiceToDelete(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete invoice <span className="font-semibold text-foreground">{invoiceToDelete?.id}</span>?
            </p>
            {invoiceToDelete && (
              <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-sm font-medium">Invoice Details:</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Customer: {invoiceToDelete.customerName || "Walk-in Customer"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Amount: ₹{invoiceToDelete.total.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-muted-foreground">
                  Payment: {invoiceToDelete.paymentMethod}
                </p>
              </div>
            )}
            <p className="text-xs text-destructive font-medium">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceToDelete(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteInvoice}
            >
              Delete Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UPI Modal */}
      <Dialog open={showUpi} onOpenChange={setShowUpi}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Scan & Pay (UPI)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="w-full flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-white rounded-lg border-2 border-gray-200 shadow-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&margin=2&data=${encodeURIComponent(upiUrl)}`}
                  alt="UPI QR Code"
                  className="w-full max-w-[300px] h-auto"
                  onError={(e) => {
                    console.error("QR code generation failed");
                    toast({
                      title: "QR Code Error",
                      description: "Failed to generate QR code. Please try again or use manual UPI ID.",
                      variant: "destructive"
                    });
                  }}
                />
              </div>
              
              {/* UPI ID Display - Prominent like second image */}
              <div className="text-center w-full pt-2">
                <p className="text-base font-normal text-gray-800">
                  UPI ID: {paymentSettings.upiId || "No UPI ID configured"}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleOpenUpiApp}
              disabled={!upiUrl || !paymentSettings.upiId}
              className="flex-1"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Open UPI App
            </Button>
            <Button 
              onClick={() => { 
                setShowUpi(false); 
                processPayment("UPI"); 
              }}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Payment Received
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POS;
