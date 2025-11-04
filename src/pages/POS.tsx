import { useState, useEffect, useMemo, useCallback } from "react";
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
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { generateReceiptPDF, ReceiptData } from "@/lib/pdfGenerator";
import ItemDetailsDialog from "@/components/ItemDetailsDialog";
import { idbGet, idbSet } from "@/lib/indexedDb";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: string;
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
  const { data: cart, updateData: setCart } = useOfflineStorage<CartItem[]>("pos_cart", []);
  const { data: customerName, updateData: setCustomerName } = useOfflineStorage<string>("pos_customerName", "");
  const { data: recentInvoices, updateData: setRecentInvoices } = useOfflineStorage<Invoice[]>("pos_recentInvoices", []);
  
  // Load customers for credit/repayment functionality
  const { data: customers, updateData: setCustomers } = useOfflineStorage<Customer[]>('customers', []);
  const { data: customerTransactions, updateData: setCustomerTransactions } = useOfflineStorage<CustomerTransaction[]>('customer_transactions', []);
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showRepaymentDialog, setShowRepaymentDialog] = useState(false);
  const [repaymentData, setRepaymentData] = useState({
    amount: "",
    description: "",
    paymentMethod: "Cash"
  });
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const { data: businessSettings } = useOfflineStorage('businessSettings', {
    businessName: "Golden Treasures",
    address: "123 Jewelry Street, Mumbai",
    phone: "+91 98765 43210",
    email: "info@goldentreasures.com",
    gstNumber: "27XXXXX1234X1Z5",
    currency: "INR",
    timezone: "Asia/Kolkata"
  });
  const { data: paymentSettings } = useOfflineStorage('paymentSettings', {
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

  // Function to load all inventory from IndexedDB directly
  const loadAllInventory = useCallback(async () => {
    try {
      setIsRefreshing(true);
      console.log('🔄 Loading all inventory from IndexedDB...');
      
      // Load all inventory types directly from IndexedDB
      const [jewelryData, goldData, stonesData, inventoryData] = await Promise.all([
        idbGet<any[]>("jewelry_items") || Promise.resolve([]),
        idbGet<any[]>("gold_items") || Promise.resolve([]),
        idbGet<any[]>("stones_items") || Promise.resolve([]),
        idbGet<any[]>("inventory_items") || Promise.resolve([]),
      ]);

      console.log('📦 Raw data loaded:', {
        jewelry: jewelryData?.length || 0,
        gold: goldData?.length || 0,
        stones: stonesData?.length || 0,
        inventory: inventoryData?.length || 0,
      });

      const items: JewelryItem[] = [];
      const processedIds = new Set<string>();

      // Transform jewelry_items
      if (jewelryData && Array.isArray(jewelryData)) {
        jewelryData.forEach((item: any) => {
          if (!item || !item.id || processedIds.has(item.id)) return;
          processedIds.add(item.id);

          // Check if already in correct format
          if (item.type && item.metal && (item.inStock !== undefined || item.stock !== undefined)) {
            items.push({
              id: item.id,
              name: item.name || 'Unknown Item',
              type: item.type,
              gemstone: item.gemstone || 'None',
              carat: item.carat || 0,
              metal: item.metal,
              price: item.price || 0,
              inStock: item.inStock ?? item.stock ?? 10,
              isArtificial: item.isArtificial || false,
              image: item.image || '',
            });
          } else {
            // Transform legacy format
            items.push({
              id: item.id,
              name: item.name || 'Unknown Item',
              type: item.type || 'Ring',
              gemstone: item.gemstone || 'None',
              carat: item.carat || 0,
              metal: item.metal || 'Gold 18K',
              price: item.price || 0,
              inStock: item.inStock ?? item.stock ?? 10,
              isArtificial: item.isArtificial || false,
              image: item.image || '',
            });
          }
        });
      }

      // Transform gold_items
      if (goldData && Array.isArray(goldData)) {
        goldData.forEach((item: any) => {
          if (!item || !item.id || processedIds.has(item.id)) return;
          processedIds.add(item.id);

          items.push({
            id: item.id,
            name: item.name || 'Unknown Gold',
            type: 'Gold Bar',
            gemstone: 'None',
            carat: 0,
            metal: item.purity || item.metal || 'Gold 18K',
            price: item.price || item.totalPrice || 0,
            inStock: item.inStock ?? item.stock ?? 10,
            isArtificial: false,
            image: item.image || '',
          });
        });
      }

      // Transform stones_items (precious stones)
      if (stonesData && Array.isArray(stonesData)) {
        stonesData.forEach((item: any) => {
          if (!item || !item.id || processedIds.has(item.id)) return;
          processedIds.add(item.id);

          const caratValue = typeof item.carat === 'string' 
            ? parseFloat(item.carat) || 0 
            : (item.carat || 0);

          items.push({
            id: item.id,
            name: item.name || 'Unknown Stone',
            type: 'Gemstone',
            gemstone: item.name || 'Stone',
            carat: caratValue,
            metal: 'Platinum',
            price: item.price || 0,
            inStock: item.inStock ?? item.stock ?? 10,
            isArtificial: false,
            image: item.image || '',
          });
        });
      }

      // Transform inventory_items from sync (overwrites duplicates)
      if (inventoryData && Array.isArray(inventoryData)) {
        inventoryData.forEach((item: any) => {
          if (!item || !item.id) return;

          const existingIndex = items.findIndex(i => i.id === item.id);
          const transformedItem: JewelryItem = {
            id: item.id,
            name: item.name || 'Unknown Item',
            type: item.item_type === 'gold' ? 'Gold Bar' 
                  : item.item_type === 'stone' ? 'Gemstone'
                  : (item.type || 'Ring'),
            gemstone: item.item_type === 'stone' 
              ? (item.name || 'Stone')
              : (item.gemstone || item.attributes?.description || 'None'),
            carat: item.item_type === 'stone' 
              ? (item.attributes?.carat || 0)
              : (item.carat || item.attributes?.carat || 0),
            metal: item.item_type === 'gold'
              ? (item.attributes?.purity || item.metal || 'Gold 18K')
              : item.item_type === 'stone'
              ? 'Platinum'
              : (item.metal || 'Gold 18K'),
            price: item.price || 0,
            inStock: item.inStock ?? item.in_stock ?? 10,
            isArtificial: item.isArtificial || false,
            image: item.image || '',
          };

          if (existingIndex >= 0) {
            // Update existing item (sync data takes precedence)
            items[existingIndex] = transformedItem;
          } else {
            items.push(transformedItem);
          }
        });
      }

      console.log('✅ Inventory loaded successfully:', {
        totalItems: items.length,
        jewelry: items.filter(i => i.type !== 'Gold Bar' && i.type !== 'Gemstone').length,
        gold: items.filter(i => i.type === 'Gold Bar').length,
        stones: items.filter(i => i.type === 'Gemstone').length,
      });

      setAvailableItems(items);
      setItemsLoaded(true);
    } catch (error) {
      console.error('❌ Error loading inventory:', error);
      setAvailableItems([]);
      setItemsLoaded(true);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Load inventory on mount and when dependencies change
  useEffect(() => {
    loadAllInventory();
  }, [loadAllInventory]);
  
  // Debug logging
  useEffect(() => {
    console.log('POS Debug - availableItems:', availableItems);
    console.log('POS Debug - itemsLoaded:', itemsLoaded);
    console.log('POS Debug - total items:', availableItems.length);
  }, [availableItems, itemsLoaded]);
  
  // Update function for POS inventory updates
  const updateInventoryStock = useCallback(async (updatedItems: JewelryItem[]) => {
    try {
      // Load current data
      const [jewelryData, goldData, stonesData] = await Promise.all([
        idbGet<any[]>("jewelry_items") || [],
        idbGet<any[]>("gold_items") || [],
        idbGet<any[]>("stones_items") || [],
      ]);

      const updatedJewelry = [...(jewelryData || [])];
      const updatedGold = [...(goldData || [])];
      const updatedStones = [...(stonesData || [])];

      updatedItems.forEach(item => {
        if (item.type === 'Gold Bar') {
          const index = updatedGold.findIndex((g: any) => g.id === item.id);
          if (index >= 0) {
            updatedGold[index] = {
              ...updatedGold[index],
              price: item.price,
              stock: item.inStock,
              inStock: item.inStock,
            };
          }
        } else if (item.type === 'Gemstone') {
          const index = updatedStones.findIndex((s: any) => s.id === item.id);
          if (index >= 0) {
            updatedStones[index] = {
              ...updatedStones[index],
              price: item.price,
              stock: item.inStock,
              inStock: item.inStock,
            };
          }
        } else {
          // Jewelry item
          const index = updatedJewelry.findIndex((j: any) => j.id === item.id);
          if (index >= 0) {
            updatedJewelry[index] = {
              ...updatedJewelry[index],
              ...item,
            };
          } else {
            updatedJewelry.push(item);
          }
        }
      });

      // Save back to IndexedDB
      await Promise.all([
        idbSet("jewelry_items", updatedJewelry),
        idbSet("gold_items", updatedGold),
        idbSet("stones_items", updatedStones),
      ]);

      // Reload inventory
      await loadAllInventory();
    } catch (error) {
      console.error('Error updating inventory:', error);
    }
  }, [loadAllInventory]);
  const [selected, setSelected] = useState<JewelryItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showUpi, setShowUpi] = useState(false);
  const [upiUrl, setUpiUrl] = useState("");

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
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1, type: item.type }];
    });
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

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxRate = 0.08; // 8% tax
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

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
    const updatedCustomers = await idbGet<Customer[]>('customers') || [];
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground">Point of Sale</h1>
              <p className="text-primary-foreground/70 text-sm">Process sales and generate invoices</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
          
          {/* Product Selection */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Quick Add Items
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAllInventory}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!itemsLoaded ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading inventory...</p>
                  </div>
                ) : availableItems.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No inventory items available</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      No items found in IndexedDB. Make sure you have added inventory items.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadAllInventory}
                      disabled={isRefreshing}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                      Reload
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Check console for detailed logs
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                    {availableItems.map(item => (
                      <JewelryCard
                        key={item.id}
                        item={item}
                        onEdit={() => {}}
                        onDelete={() => {}}
                        onView={(it) => { setSelected(it); setShowDetails(true); }}
                        onAddToCart={addToCart}
                        showAddToCart={true}
                        showActions={false}
                      />
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
                  <div className="space-y-3">
                    {recentInvoices.map(invoice => (
                      <div key={invoice.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                        <div>
                          <p className="font-medium text-foreground">{invoice.id}</p>
                          <p className="text-sm text-muted-foreground">{invoice.customerName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">₹{invoice.total.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{invoice.paymentMethod}</p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Printer className="h-4 w-4" />
                        </Button>
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
                      <span className="font-medium">₹{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax (8%):</span>
                      <span className="font-medium">₹{tax.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>₹{total.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Button
                      className="w-full bg-gradient-gold hover:bg-gold-dark text-primary transition-smooth"
                      onClick={() => processPayment("Cash")}
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
                      onClick={() => processPayment("Card")}
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