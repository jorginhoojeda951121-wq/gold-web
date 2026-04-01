import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
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
  CreditCard,
  DollarSign,
  Printer,
  RefreshCw,
  Search,
  UserCheck,
  Wallet,
  CheckCircle,
  Eye,
  Pencil,
  Recycle,
  Scale,
  Trash2,
  Grid,
  Clock
} from "lucide-react";
import { OldGoldExchange } from "@/jeweler/OldGoldExchange";
import { useToast } from "@/hooks/use-toast";
import { useUserStorage } from "@/hooks/useUserStorage";
import { generateReceiptPDF, ReceiptData } from "@/lib/pdfGenerator";
import { getFromSupabase } from "@/lib/supabaseDirect";
import ItemDetailsDialog from "@/components/ItemDetailsDialog";
import { upsertToSupabase, deleteFromSupabase } from "@/lib/supabaseDirect";
import { 
  roundToNearestRupee, 
  roundToTwoDecimals, 
  calculateGstAmount, 
  extractBaseAmount,
  calculateJewelleryBill,
  formatInr
} from "@/lib/calculations";
import { useGoldRates } from "@/components/GoldRateSettings";

const POS = () => {
  const goldRates = useGoldRates();
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
  const [showOldGoldDialog, setShowOldGoldDialog] = useState(false);
  const [oldGoldCredit, setOldGoldCredit] = useState(0);
  const [isFastBilling, setIsFastBilling] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("action") === "old-gold") {
      setShowOldGoldDialog(true);
    }
    if (searchParams.get("mode") === "fast") {
      setIsFastBilling(true);
    }
  }, [searchParams]);

  // Helper to transform raw inventory to JewelryItem format
  const transformInventoryData = (inventoryData: any[]): JewelryItem[] => {
    return inventoryData.map((item: any) => {
      // Determine item type from category/subcategory
      const itemType = item.category === 'gold' ? 'gold'
        : item.category === 'stones' ? 'stone'
        : item.category === 'stone' ? 'stone'
        : item.subcategory === 'Gold Bar' ? 'gold'
        : item.subcategory === 'Gemstone' ? 'stone'
        : 'jewelry';

      // Transform to JewelryItem format
      const stockValue = item.stock ?? 0;

      // Extract metal/purity from description
      let metal = 'Gold 18K';
      if (item.description) {
        if (item.description.includes('Gold 24K')) metal = 'Gold 24K';
        else if (item.description.includes('Gold 22K')) metal = 'Gold 22K';
        else if (item.description.includes('Gold 18K')) metal = 'Gold 18K';
        else if (item.description.includes('Gold 14K')) metal = 'Gold 14K';
        else if (item.description.includes('Gold 10K')) metal = 'Gold 10K';
        else if (itemType === 'stone') metal = ''; // Empty for stones
      }

      return {
        id: item.id,
        name: item.name || 'Unknown Item',
        type: itemType === 'gold' ? 'Gold Bar'
          : itemType === 'stone' ? 'Gemstone'
            : (item.subcategory || 'Ring'),
        gemstone: itemType === 'stone' ? (item.name || 'Stone') : 'None',
        carat: item.weight ? parseFloat(item.weight.toString()) : 0,
        metal: metal,
        price: item.price || 0,
        inStock: stockValue,
        isArtificial: item.category === 'artificial',
        image: item.image_url || '',
        image_1: item.image_url || '',
        image_2: '',
        image_3: '',
        image_4: '',
        // New ERP fields
        grossWeight: item.gross_weight || (item.weight ? parseFloat(item.weight.toString()) : 0),
        stoneWeight: item.stone_weight || 0,
        netWeight: item.net_weight || (item.gross_weight ? (item.gross_weight - (item.stone_weight || 0)) : (item.weight ? parseFloat(item.weight.toString()) : 0)),
        makingCharges: item.making_charges || 0,
        wastagePercent: item.wastage_percent || 0,
        barcode: item.barcode || undefined,
        hsnCode: item.hsn_code || "7113",
      };
    });
  };

  const loadAllInventory = useCallback(async (forceReload = false) => {
    // Prevent multiple simultaneous loads (unless forced)
    if (isLoadingRef.current && !forceReload) return;
    isLoadingRef.current = true;

    try {
      setIsRefreshing(true);

      // Try to load from IndexedDB first for instant UI response
      if (!forceReload) {
        const { getUserData } = await import('@/lib/userStorage');
        const cachedData = await getUserData<any[]>("inventory_items");
        if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
          const items = transformInventoryData(cachedData);
          setAvailableItems(items);
          setItemsLoaded(true);
          
          const lastUpdated = localStorage.getItem('inventory_last_updated');
          if (lastUpdated && (Date.now() - parseInt(lastUpdated) < 30000)) {
            setIsRefreshing(false);
            isLoadingRef.current = false;
            return;
          }
        }
      }

      // Fetch directly from Supabase
      const inventoryData = await getFromSupabase<any[]>('inventory', {});

      const items: JewelryItem[] = inventoryData.map((item: any) => {
        // Determine item type from category/subcategory
        const itemType = item.category === 'gold' ? 'gold'
          : item.category === 'stones' ? 'stone'
          : item.category === 'stone' ? 'stone'
          : item.subcategory === 'Gold Bar' ? 'gold'
          : item.subcategory === 'Gemstone' ? 'stone'
          : 'jewelry';

        // Transform to JewelryItem format
        const stockValue = item.stock ?? 0;

        // Extract metal/purity from description
        let metal = 'Gold 18K';
        if (item.description) {
          if (item.description.includes('Gold 24K')) metal = 'Gold 24K';
          else if (item.description.includes('Gold 22K')) metal = 'Gold 22K';
          else if (item.description.includes('Gold 18K')) metal = 'Gold 18K';
          else if (item.description.includes('Gold 14K')) metal = 'Gold 14K';
          else if (item.description.includes('Gold 10K')) metal = 'Gold 10K';
          else if (itemType === 'stone') metal = ''; // Empty for stones
        }

        return {
          id: item.id,
          name: item.name || 'Unknown Item',
          type: itemType === 'gold' ? 'Gold Bar'
            : itemType === 'stone' ? 'Gemstone'
              : (item.subcategory || 'Ring'),
          gemstone: itemType === 'stone' ? (item.name || 'Stone') : 'None',
          carat: item.weight ? parseFloat(item.weight.toString()) : 0,
          metal: metal,
          price: item.price || 0,
          inStock: stockValue,
          isArtificial: item.category === 'artificial',
          image: item.image_url || '',
          image_1: item.image_url || '',
          image_2: '',
          image_3: '',
          image_4: '',
          // New ERP fields
          grossWeight: item.gross_weight || (item.weight ? parseFloat(item.weight.toString()) : 0),
          stoneWeight: item.stone_weight || 0,
          netWeight: item.net_weight || (item.gross_weight ? (item.gross_weight - (item.stone_weight || 0)) : (item.weight ? parseFloat(item.weight.toString()) : 0)),
          makingCharges: item.making_charges || 0,
          wastagePercent: item.wastage_percent || 0,
          barcode: item.barcode || undefined,
          hsnCode: item.hsn_code || "7113",
        };
      });

      setAvailableItems(items);
      setItemsLoaded(true);

      // Update IndexedDB cache
      const { setUserData } = await import('@/lib/userStorage');
      await setUserData('inventory_items', inventoryData);
      localStorage.setItem('inventory_last_updated', Date.now().toString());
    } catch (error) {
      console.error('❌ Error loading inventory from Supabase:', error);
      if (!itemsLoaded) {
        setAvailableItems([]);
        setItemsLoaded(true);
      }
    } finally {
      setIsRefreshing(false);
      isLoadingRef.current = false;
    }
  }, [itemsLoaded]);



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

  // Update function for POS inventory updates - Updates Supabase directly
  const updateInventoryStock = useCallback(async (updatedItems: JewelryItem[]) => {
    try {
      // Process items sequentially to avoid race conditions
      for (const item of updatedItems) {
        const now = new Date().toISOString();

        // Determine item type
        const itemType = item.type === 'Gold Bar' ? 'gold'
          : item.type === 'Gemstone' ? 'stone'
            : 'jewelry';

        // Prepare data for Supabase inventory table
        const inventoryUpdate = {
          id: item.id,
          name: item.name || '',
          category: itemType,
          subcategory: item.type || '',
          price: item.price || 0,
          stock: item.inStock, // CRITICAL: Update stock quantity
          image_url: item.image || item.image_1 || '',
          description: `${item.type || ''}${item.metal ? ` - ${item.metal}` : ''}`,
          updated_at: now,
        };

        // Update Supabase directly
        await upsertToSupabase('inventory', inventoryUpdate);
      }

      // Reload inventory from Supabase
      await loadAllInventory(true);
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
  const [showItemDetailsDialog, setShowItemDetailsDialog] = useState(false);
  const [itemToAdd, setItemToAdd] = useState<JewelryItem | null>(null);
  const [editingCartId, setEditingCartId] = useState<string | null>(null);
  const [itemDetails, setItemDetails] = useState({
    grossWeight: "",
    stoneWeight: "0",
    netWeight: "0",
    ratePerGram: "",
    wastagePercentage: "0",
    makingChargeValue: "0",
    isMakingPercentage: false,
    purity: "",
    details: ""
  });

  // Handle invoice deletion
  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;

    try {
      await setRecentInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete.id));

      // Delete from Supabase directly (sales table)
      await deleteFromSupabase('sales', invoiceToDelete.id);

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

  const handleAddToCartClick = async (item: JewelryItem) => {
    try {
      const inventoryData = await getFromSupabase<any[]>('inventory', {});
      const fullItem: any = inventoryData.find((inv: any) => inv.id === item.id) || null;

      setItemToAdd(item);
      const grossWeight = fullItem?.weight ? fullItem.weight.toString() : "";
      
      setItemDetails({
        grossWeight,
        stoneWeight: "0",
        netWeight: grossWeight,
        ratePerGram: item.price.toString() || "",
        wastagePercentage: "0",
        makingChargeValue: "0",
        isMakingPercentage: false,
        purity: item.metal || (fullItem?.description ? (fullItem.description.match(/Gold \d+K/)?.[0] || "") : "") || "",
        details: ""
      });
      setEditingCartId(null);
      setShowItemDetailsDialog(true);
    } catch (error) {
      console.error('Error loading item details:', error);
      setItemToAdd(item);
      setItemDetails({
        grossWeight: "",
        stoneWeight: "0",
        netWeight: "0",
        ratePerGram: item.price.toString() || "",
        wastagePercentage: "0",
        makingChargeValue: "0",
        isMakingPercentage: false,
        purity: item.metal || "",
        details: ""
      });
      setEditingCartId(null);
      setShowItemDetailsDialog(true);
    }
  };

  const handleEditCartItem = (cartItem: CartItem) => {
    const baseItem = availableItems.find(it => it.id === cartItem.id) || {
      id: cartItem.id,
      name: cartItem.name,
      type: cartItem.type,
      price: cartItem.ratePerGram ?? cartItem.price,
      metal: cartItem.purity,
      gemstone: "None",
      carat: 0,
      inStock: cartItem.quantity,
    } as JewelryItem;

    setItemToAdd(baseItem);
    setItemDetails({
      grossWeight: cartItem.grossWeight?.toString() || "",
      stoneWeight: cartItem.stoneWeight?.toString() || "0",
      netWeight: cartItem.netWeight?.toString() || "0",
      ratePerGram: cartItem.ratePerGram?.toString() || baseItem.price.toString(),
      wastagePercentage: cartItem.wastagePercentage?.toString() || "0",
      makingChargeValue: cartItem.makingChargeValue?.toString() || "0",
      isMakingPercentage: cartItem.isMakingPercentage || false,
      purity: cartItem.purity || "",
      details: cartItem.details || "",
    });
    setEditingCartId(cartItem.id);
    setShowItemDetailsDialog(true);
  };

  const confirmAddToCart = () => {
    if (!itemToAdd) return;

    const existingCartItem = cart.find(c => c.id === (editingCartId || itemToAdd.id));
    const quantity = editingCartId ? (existingCartItem?.quantity ?? 1) : 1;

    // Use jewelry specific calculation
    const calc = calculateJewelleryBill(
      parseFloat(itemDetails.grossWeight) || 0,
      parseFloat(itemDetails.stoneWeight) || 0,
      parseFloat(itemDetails.ratePerGram) || itemToAdd.price,
      parseFloat(itemDetails.wastagePercentage) || 0,
      parseFloat(itemDetails.makingChargeValue) || 0,
      itemDetails.isMakingPercentage
    );

    const cartItem: CartItem = {
      id: itemToAdd.id,
      name: itemToAdd.name,
      price: calc.grandTotal / quantity, // Per unit price with tax approx
      quantity,
      type: itemToAdd.type,
      // Jewelry Specifics
      grossWeight: parseFloat(itemDetails.grossWeight) || 0,
      stoneWeight: parseFloat(itemDetails.stoneWeight) || 0,
      netWeight: calc.netWeight,
      ratePerGram: parseFloat(itemDetails.ratePerGram) || itemToAdd.price,
      wastagePercentage: parseFloat(itemDetails.wastagePercentage) || 0,
      wastageAmount: calc.wastageAmount,
      makingChargeValue: parseFloat(itemDetails.makingChargeValue) || 0,
      makingCharges: calc.makingCharges,
      isMakingPercentage: itemDetails.isMakingPercentage,
      gstOnGold: calc.gstOnGold,
      gstOnMaking: calc.gstOnMaking,
      totalGst: calc.totalGst,
      purity: itemDetails.purity || undefined,
      details: itemDetails.details || undefined,
      taxIncluded: false, // In jewelry, tax is usually on top 
      taxCategory: 'jewelry'
    };

    if (editingCartId) {
      setCart(prev => prev.map(c => c.id === editingCartId ? { ...cartItem } : c));
    } else {
      setCart(prev => {
        const existing = prev.find(item => item.id === itemToAdd.id);
        if (existing) {
          return prev.map(c =>
            c.id === itemToAdd.id
              ? { ...c, quantity: c.quantity + 1 }
              : c
          );
        }
        return [...prev, cartItem];
      });
    }

    // Reset and close dialog
    setShowItemDetailsDialog(false);
    setItemToAdd(null);
    setEditingCartId(null);
    setItemDetails({
      grossWeight: "",
      stoneWeight: "0",
      netWeight: "0",
      ratePerGram: "",
      wastagePercentage: "0",
      makingChargeValue: "0",
      isMakingPercentage: false,
      purity: "",
      details: ""
    });

    toast({
      title: editingCartId ? "Item Updated" : "Item Added",
      description: `${itemToAdd.name} has been processed.`
    });
  };

  const addToCart = (item: JewelryItem) => {
    // Legacy function - now opens dialog
    handleAddToCartClick(item);
  };

  // const handleBarcodeScan = (barcode: string) => {
  //   const barcodeUpper = barcode.toUpperCase();

  //   // Search in available items by barcode or SKU
  //   const foundItem = availableItems.find(
  //     item =>
  //       (item.barcode && item.barcode.toUpperCase() === barcodeUpper) ||
  //       (item.sku && item.sku.toUpperCase() === barcodeUpper) ||
  //       item.id.toUpperCase() === barcodeUpper
  //   );

  //   if (foundItem) {
  //     handleAddToCartClick(foundItem);
  //   } else {
  //     toast({
  //       title: "Item Not Found",
  //       description: `No item found with barcode: ${barcode}`,
  //       variant: "destructive",
  //     });
  //   }
  // };

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
      // If it has specialized jewelry fields, use them
      if (item.gstOnGold !== undefined || item.gstOnMaking !== undefined) {
        const itemGoldGst = item.gstOnGold || 0;
        const itemMakingGst = item.gstOnMaking || 0;
        const itemTotalTax = (item.totalGst || (itemGoldGst + itemMakingGst)) * item.quantity;
        
        // Base amount is total value - tax if we want to show it that way,
        // but usually in jewelry, base is taxableGoldValue + makingCharges.
        const itemBaseAmount = ((item.netWeight || 0) * (item.ratePerGram || 0) + (item.wastageAmount || 0) + (item.makingCharges || 0)) * item.quantity;

        subTotal += itemBaseAmount;
        totalTax += itemTotalTax;

        // Add to breakdown
        if (itemGoldGst > 0) {
          const goldRate = 3;
          const existing = taxBreakdownMap.get(goldRate) || { amount: 0, count: 0 };
          taxBreakdownMap.set(goldRate, { 
            amount: roundToTwoDecimals(existing.amount + itemGoldGst * item.quantity), 
            count: existing.count + 1 
          });
        }
        if (itemMakingGst > 0) {
          const makingRate = 5;
          const existing = taxBreakdownMap.get(makingRate) || { amount: 0, count: 0 };
          taxBreakdownMap.set(makingRate, { 
            amount: roundToTwoDecimals(existing.amount + itemMakingGst * item.quantity), 
            count: existing.count + 1 
          });
        }
      } else {
        // Legacy calculation
        const taxRate = item.taxRate ?? 3;
        const itemPriceTotal = item.price * item.quantity;
        
        let itemBaseAmount = 0;
        let itemTaxAmount = 0;

        if (item.taxIncluded) {
          itemBaseAmount = extractBaseAmount(itemPriceTotal, taxRate);
          itemTaxAmount = roundToTwoDecimals(itemPriceTotal - itemBaseAmount);
        } else {
          itemBaseAmount = roundToTwoDecimals(itemPriceTotal);
          itemTaxAmount = calculateGstAmount(itemBaseAmount, taxRate);
        }

        subTotal += itemBaseAmount;
        totalTax += itemTaxAmount;

        const existing = taxBreakdownMap.get(taxRate) || { amount: 0, count: 0 };
        taxBreakdownMap.set(taxRate, { 
          amount: roundToTwoDecimals(existing.amount + itemTaxAmount), 
          count: existing.count + 1 
        });
      }
    });

    const finalSubtotal = roundToTwoDecimals(subTotal);
    const finalTax = roundToTwoDecimals(totalTax);
    const finalTotal = roundToNearestRupee(Math.max(0, finalSubtotal + finalTax - oldGoldCredit));

    return {
      subtotal: finalSubtotal,
      tax: finalTax,
      total: finalTotal,
      taxBreakdown: Array.from(taxBreakdownMap.entries()).map(([rate, data]) => ({
        rate,
        amount: data.amount,
        count: data.count
      })),
      oldGoldCredit
    };
  }, [cart, oldGoldCredit]);

  // Filter inventory by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery) return availableItems;
    const query = searchQuery.toLowerCase();
    return availableItems.filter(item => 
      item.name.toLowerCase().includes(query) || 
      item.type.toLowerCase().includes(query) ||
      (item.barcode && item.barcode.toLowerCase().includes(query)) ||
      (item.metal && item.metal.toLowerCase().includes(query))
    );
  }, [availableItems, searchQuery]);

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
    if (selectedCustomer) {
      const updatedCustomers = await getFromSupabase<Customer>('customers', {});
      const foundCustomer = updatedCustomers.find(c => c.id === selectedCustomer.id);
      if (foundCustomer) {
        setSelectedCustomer(foundCustomer);
      }
    }

    toast({
      title: "Repayment Recorded",
      description: `₹${amount.toLocaleString()} repayment has been recorded for ${selectedCustomer.name}.`
    });

    setRepaymentData({ amount: "", description: "", paymentMethod: "Cash" });
    setShowRepaymentDialog(false);
  };

  const handleFastAdd = (purity: string) => {
    // Determine default rate for the selected purity
    let defaultRate = 0;
    const rates = goldRates.currentRates;
    if (purity.includes('24K')) defaultRate = rates.rate24K;
    else if (purity.includes('22K')) defaultRate = rates.rate22K;
    else if (purity.includes('18K')) defaultRate = rates.rate18K;
    else if (purity.includes('14K')) defaultRate = rates.rate14K;
    else if (purity.includes('Silver')) defaultRate = rates.rateSilver;

    setItemToAdd({
      id: `fast-${Date.now()}`,
      name: `${purity} (Quick Bill)`,
      category: purity.includes('Gold') ? 'gold' : 'silver',
      type: purity,
      metal: purity,
      price: 0,
      stock: 999,
      image: "",
      description: `Fast bill for ${purity}`
    } as any);
    
    setItemDetails({
      grossWeight: "",
      stoneWeight: "0",
      netWeight: "0",
      ratePerGram: defaultRate.toString(),
      wastagePercentage: "0",
      makingChargeValue: "0",
      isMakingPercentage: false,
      purity: purity,
      details: ""
    });
    
    setShowItemDetailsDialog(true);
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

    // Save invoice to Supabase database
    try {
      // Prepare sale record for database (matching actual schema)
      const saleRecord = {
        id: invoice.id,
        customer_id: selectedCustomer?.id || null,
        customer_name: invoice.customerName || null,
        customer_phone: selectedCustomer?.phone || null,
        customer_email: selectedCustomer?.email || null,
        total_amount: invoice.total,
        tax_amount: invoice.tax || 0,
        gst_gold: cart.reduce((sum, item) => sum + (item.gstOnGold || 0) * item.quantity, 0),
        gst_making: cart.reduce((sum, item) => sum + (item.gstOnMaking || 0) * item.quantity, 0),
        making_total: cart.reduce((sum, item) => sum + (item.makingCharges || 0) * item.quantity, 0),
        gold_total: cart.reduce((sum, item) => sum + (item.netWeight || 0) * (item.ratePerGram || 0) * item.quantity, 0),
        grand_total: invoice.total,
        discount_amount: 0,
        payment_method: invoice.paymentMethod,
        payment_status: invoice.paymentMethod === 'Credit' ? 'pending' : 'paid',
        transaction_id: null,
        notes: null,
        created_at: invoice.date,
      };

      // Save sale record to database
      await upsertToSupabase('sales', saleRecord);

      // Save sale items (line items) to database
      for (let i = 0; i < invoice.items.length; i++) {
        const item = invoice.items[i];
        const taxRate = item.taxRate ?? 3;
        const itemTotal = item.price * item.quantity;
        
        let subtotal = 0;
        let taxAmount = 0;

        if (item.taxIncluded) {
          subtotal = extractBaseAmount(itemTotal, taxRate);
          taxAmount = roundToTwoDecimals(itemTotal - subtotal);
        } else {
          subtotal = roundToTwoDecimals(itemTotal);
          taxAmount = calculateGstAmount(subtotal, taxRate);
        }
        
        const saleItem = {
          id: `${invoice.id}_item_${i}_${item.id}`,
          sale_id: invoice.id,
          item_id: item.id,
          item_name: item.name,
          item_type: item.type || 'jewelry',
          quantity: item.quantity,
          unit_price: item.price,
          total_price: roundToTwoDecimals(subtotal + taxAmount),
          gross_weight: item.grossWeight || 0,
          stone_weight: item.stoneWeight || 0,
          net_weight: item.netWeight || 0,
          rate: item.ratePerGram || 0,
          making_charges: item.makingCharges || 0,
          wastage: item.wastageAmount || 0,
          gst: (item.gstOnGold || 0) + (item.gstOnMaking || 0),
          total: item.item_total || (roundToTwoDecimals(subtotal + taxAmount)),
          discount_amount: 0,
        };
        await upsertToSupabase('sale_items', saleItem);
      }

      console.log('✅ Invoice saved to database:', invoice.id);
    } catch (error) {
      console.error('❌ Error saving invoice to database:', error);
      // Show error toast but don't block the UI flow
      toast({
        title: "Warning",
        description: "Invoice saved locally but failed to sync to database. Please check your connection.",
        variant: "destructive"
      });
    }

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

    // Explicitly clear cart from IndexedDB to ensure it's removed
    try {
      // Cart is managed by useUserStorage hook - no need to manually clear
      console.log('✅ Cart cleared from IndexedDB');
    } catch (error) {
      console.error('❌ Error clearing cart from IndexedDB:', error);
      // Non-blocking error - cart state is already cleared
    }

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
          total: item.price * item.quantity,
          weight: item.weight,
          purity: item.purity,
          customRate: item.customRate,
          taxRate: item.taxRate,
          details: item.details
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


  return (
    <div className="min-h-screen bg-gradient-elegant">

      <header className="bg-gradient-primary shadow-elegant border-b border-border/50">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground">Point of Sale</h1>
              <p className="text-primary-foreground/70 text-sm">Process sales and generate invoices</p>
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
                          onEdit={() => { }}
                          onDelete={() => { }}
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
                          <p className="font-bold text-foreground">{formatInr(invoice.total)}</p>
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

          {/* Unified Tool Header */}
          <div className="flex items-center justify-between mb-6 bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-sm">
            <div className="flex items-center gap-4">
              <Button 
                variant={!isFastBilling ? "default" : "outline"}
                onClick={() => setIsFastBilling(false)}
                className="rounded-xl h-11 px-6 font-bold gap-2"
              >
                <Grid className="h-4 w-4" />
                Catalog Mode
              </Button>
              <Button 
                variant={isFastBilling ? "default" : "outline"}
                onClick={() => setIsFastBilling(true)}
                className="rounded-xl h-11 px-6 font-bold gap-2"
              >
                <Scale className="h-4 w-4" />
                Fast Mode (Direct Weight)
              </Button>
            </div>
          </div>

          {!isFastBilling ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 mb-2">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Search by name, category, or barcode (Scan here)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-14 bg-white/80 border-white/40 shadow-xl rounded-2xl text-lg focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  />
                </div>
              </div>
              
              {filteredItems.map(item => (
                <div key={item.id} className="hover-lift smooth-fade">
                  <JewelryCard
                    item={item}
                    onEdit={handleEditCartItem as any}
                    onDelete={() => {}}
                    onView={(item) => handleAddToCartClick(item)}
                    onAddToCart={(item) => handleAddToCartClick(item)}
                    showAddToCart={true}
                    showActions={false}
                  />
                </div>
              ))}
            </div>
          ) : (
            // FAST BILLING MODE: Pure Weight Selection
            <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Gold 24K', value: '24K', type: 'gold' },
                  { label: 'Gold 22K', value: '22K', type: 'gold' },
                  { label: 'Gold 18K', value: '18K', type: 'gold' },
                  { label: 'Silver', value: 'Silver', type: 'silver' }
                ].map((purity) => (
                  <Card key={purity.label} className="hover:shadow-2xl transition-all border-2 border-transparent hover:border-gold cursor-pointer group bg-white/90 overflow-hidden" 
                    onClick={() => handleFastAdd(purity.label)}>
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center gap-4">
                        <div className={`p-4 rounded-2xl ${purity.type === 'gold' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'} group-hover:scale-110 transition-transform`}>
                          <Scale className="h-10 w-10" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{purity.label}</h3>
                          <p className="text-sm text-gray-500">Enter weight directly</p>
                        </div>
                         <Button className="w-full mt-4 bg-gradient-gold text-primary font-black rounded-xl">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Items
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <Card className="bg-blue-50/50 border-blue-100 shadow-inner">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 text-blue-800 font-bold">
                    <Clock className="h-5 w-5" />
                    Today's Rate: 24K @ ₹{goldRates.currentRates.rate24K.toLocaleString()} | 22K @ ₹{goldRates.currentRates.rate22K.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
                        <div key={item.id} className="flex items-start justify-between p-3 rounded-lg bg-secondary/30 border border-secondary hover:bg-secondary/50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-foreground truncate">{item.name}</h4>
                            <p className="text-sm font-semibold text-primary">₹{(item.price * item.quantity).toLocaleString()} ({item.quantity} units)</p>
                            
                            {(item.grossWeight !== undefined || item.purity || item.details) && (
                              <div className="mt-2 space-y-1 text-xs text-muted-foreground bg-white/50 p-2 rounded border border-secondary/50">
                                {item.grossWeight !== undefined && (
                                  <div className="flex justify-between">
                                    <span>Weight:</span>
                                    <span className="font-medium text-foreground">{item.grossWeight}g (Net: {item.netWeight}g)</span>
                                  </div>
                                )}
                                {item.ratePerGram && (
                                  <div className="flex justify-between">
                                    <span>Rate:</span>
                                    <span className="font-medium">₹{item.ratePerGram}/g</span>
                                  </div>
                                )}
                                {item.makingCharges !== undefined && item.makingCharges > 0 && (
                                  <div className="flex justify-between">
                                    <span>Making:</span>
                                    <span className="font-medium">₹{item.makingCharges}</span>
                                  </div>
                                )}
                                {(item.gstOnGold !== undefined || item.gstOnMaking !== undefined) && (
                                  <div className="flex justify-between border-t border-dashed border-secondary pt-1 mt-1">
                                    <span>GST:</span>
                                    <span className="font-medium text-blue-600">₹{(item.totalGst || 0).toFixed(2)} (Split 3/5)</span>
                                  </div>
                                )}
                                {item.purity && <p className="pt-1">Purity: <span className="text-foreground">{item.purity}</span></p>}
                                {item.details && <p className="italic pt-1">Note: {item.details}</p>}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditCartItem(item)}
                              className="h-8 px-2"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
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

                    {oldGoldCredit > 0 && (
                      <div className="flex justify-between text-emerald-600 font-medium">
                        <span className="flex items-center gap-1"><Recycle className="h-3 w-3" /> Old Gold Credit:</span>
                        <span>- ₹{oldGoldCredit.toLocaleString()}</span>
                      </div>
                    )}

                    <Separator />
                    <div className="flex justify-between text-xl font-bold">
                      <span>Total Payable:</span>
                      <span>₹{total.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="w-full border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-2 font-bold"
                      onClick={() => setShowOldGoldDialog(true)}
                    >
                      <Recycle className="h-4 w-4" />
                      Old Gold {oldGoldCredit > 0 && "✔"}
                    </Button>
                    {oldGoldCredit > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-red-500 hover:text-red-700 h-10"
                        onClick={() => setOldGoldCredit(0)}
                      >
                        Clear Credit
                      </Button>
                    )}
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
                onChange={(e) => setRepaymentData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Enter amount"
                required
              />
            </div>

            <div>
              <Label htmlFor="repayment-description">Description</Label>
              <Textarea
                id="repayment-description"
                value={repaymentData.description}
                onChange={(e) => setRepaymentData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Repayment description (optional)"
              />
            </div>

            <div>
              <Label htmlFor="repayment-method">Payment Method</Label>
              <Select
                value={repaymentData.paymentMethod}
                onValueChange={(value) => setRepaymentData(prev => ({ ...prev, paymentMethod: value }))}
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
                        total: item.price * item.quantity,
                        weight: item.weight,
                        purity: item.purity,
                        customRate: item.customRate,
                        taxRate: item.taxRate,
                        details: item.details
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
                    <div key={index} className="p-3 bg-secondary rounded-lg space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">Qty: {item.quantity} × {formatInr(item.price)}</p>
                          {(item.weight || item.purity || item.customRate || item.taxRate || item.details) && (
                            <div className="mt-2 space-y-1 text-xs">
                              {item.weight && (
                                <p className="text-muted-foreground">Weight: {item.weight} grams</p>
                              )}
                              {item.purity && (
                                <p className="text-muted-foreground">Purity: {item.purity}</p>
                              )}
                              {item.customRate && (
                                <p className="text-muted-foreground">Custom Rate: ₹{item.customRate.toLocaleString('en-IN')}</p>
                              )}
                              {item.taxRate && (
                                <p className="text-muted-foreground">Tax Rate: {item.taxRate}%</p>
                              )}
                              {item.details && (
                                <p className="text-muted-foreground italic">Details: {item.details}</p>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="font-bold ml-4">{formatInr(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-muted-foreground">Subtotal</Label>
                  <p className="font-semibold">{formatInr(viewingInvoice.subtotal)}</p>
                </div>
                <div className="flex justify-between">
                  <Label className="text-muted-foreground">Total GST</Label>
                  <p className="font-semibold">{formatInr(viewingInvoice.tax)}</p>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <Label className="text-lg font-bold">Total</Label>
                  <p className="text-lg font-bold text-primary">{formatInr(viewingInvoice.total)}</p>
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

      {/* Item Details Dialog for Adding to Cart */}
      <Dialog open={showItemDetailsDialog} onOpenChange={setShowItemDetailsDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{editingCartId ? "Edit Item" : "Add Jewelry Item"}</DialogTitle>
          </DialogHeader>
          {itemToAdd && (
            <div className="space-y-4">
              <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-100">
                <p className="font-bold text-lg text-amber-900">{itemToAdd.name}</p>
                <div className="flex gap-4 text-xs text-amber-700 font-medium">
                  {itemToAdd.type && <span>Type: {itemToAdd.type}</span>}
                  {itemToAdd.metal && <span>Metal: {itemToAdd.metal}</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="item-gross-weight">Gross Weight (g) *</Label>
                  <Input
                    id="item-gross-weight"
                    type="number"
                    value={itemDetails.grossWeight}
                    onChange={(e) => setItemDetails(prev => ({ ...prev, grossWeight: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="item-stone-weight">Stone Weight (g)</Label>
                  <Input
                    id="item-stone-weight"
                    type="number"
                    value={itemDetails.stoneWeight}
                    onChange={(e) => setItemDetails(prev => ({ ...prev, stoneWeight: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="item-rate">Gold Rate (₹/g) *</Label>
                  <Input
                    id="item-rate"
                    type="number"
                    value={itemDetails.ratePerGram}
                    onChange={(e) => setItemDetails(prev => ({ ...prev, ratePerGram: e.target.value }))}
                    placeholder="Current rate"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="item-wastage">Wastage (%)</Label>
                  <Input
                    id="item-wastage"
                    type="number"
                    value={itemDetails.wastagePercentage}
                    onChange={(e) => setItemDetails(prev => ({ ...prev, wastagePercentage: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="item-making-value">Making Charges</Label>
                  <div className="flex gap-2">
                    <Input
                      id="item-making-value"
                      type="number"
                      className="flex-1"
                      value={itemDetails.makingChargeValue}
                      onChange={(e) => setItemDetails(prev => ({ ...prev, makingChargeValue: e.target.value }))}
                      placeholder="Value"
                    />
                    <Button 
                      variant={itemDetails.isMakingPercentage ? "default" : "outline"} 
                      size="sm" 
                      className="px-2"
                      onClick={() => setItemDetails(prev => ({ ...prev, isMakingPercentage: true }))}
                    >%</Button>
                    <Button 
                      variant={!itemDetails.isMakingPercentage ? "default" : "outline"} 
                      size="sm" 
                      className="px-2"
                      onClick={() => setItemDetails(prev => ({ ...prev, isMakingPercentage: false }))}
                    >₹</Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="item-purity">Description/Purity</Label>
                  <Input
                    id="item-purity"
                    value={itemDetails.purity}
                    onChange={(e) => setItemDetails(prev => ({ ...prev, purity: e.target.value }))}
                    placeholder="e.g., 22K Hallmarked"
                  />
                </div>
              </div>

              {/* Live Calculation Summary */}
              {(parseFloat(itemDetails.grossWeight) > 0 && parseFloat(itemDetails.ratePerGram) > 0) && (
                <div className="p-4 bg-secondary/50 rounded-lg border border-border space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Calculation Summary</h4>
                  <div className="grid grid-cols-2 text-sm gap-x-8 gap-y-1">
                    <span className="text-muted-foreground">Net Weight:</span>
                    <span className="text-right font-medium">{(parseFloat(itemDetails.grossWeight) - parseFloat(itemDetails.stoneWeight || "0")).toFixed(3)} g</span>
                    
                    <span className="text-muted-foreground">GST split:</span>
                    <div className="text-right flex flex-col">
                      <span className="text-xs text-blue-600">3% Gold GST</span>
                      <span className="text-xs text-orange-600">5% Making GST</span>
                    </div>

                    <Separator className="col-span-2 my-1" />
                    
                    <span className="text-base font-bold">Estimated Total:</span>
                    <span className="text-right text-base font-bold text-primary">
                      {(() => {
                        const res = calculateJewelleryBill(
                          parseFloat(itemDetails.grossWeight) || 0,
                          parseFloat(itemDetails.stoneWeight) || 0,
                          parseFloat(itemDetails.ratePerGram) || 0,
                          parseFloat(itemDetails.wastagePercentage) || 0,
                          parseFloat(itemDetails.makingChargeValue) || 0,
                          itemDetails.isMakingPercentage
                        );
                        return formatInr(res.grandTotal);
                      })()}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="item-details">Notes</Label>
                <Textarea
                  id="item-details"
                  value={itemDetails.details}
                  onChange={(e) => setItemDetails(prev => ({ ...prev, details: e.target.value }))}
                  placeholder="Additional hallmarks or details..."
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setShowItemDetailsDialog(false);
                  setItemToAdd(null);
                  setEditingCartId(null);
                  setItemDetails({
                    grossWeight: "",
                    stoneWeight: "0",
                    netWeight: "0",
                    ratePerGram: "",
                    wastagePercentage: "0",
                    makingChargeValue: "0",
                    isMakingPercentage: false,
                    purity: "",
                    details: ""
                  });
                }}>
                  Cancel
                </Button>
                <Button onClick={confirmAddToCart} className="bg-gradient-gold text-primary font-bold hover:opacity-90">
                  {editingCartId ? "Update Item" : "Add to Cart"}
                </Button>
              </DialogFooter>
            </div>
          )}
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
          <DialogFooter>
            <Button
              onClick={() => {
                setShowUpi(false);
                processPayment("UPI");
              }}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Payment Received
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Old Gold Exchange Dialog */}
      <Dialog open={showOldGoldDialog} onOpenChange={setShowOldGoldDialog}>
        <DialogContent className="sm:max-w-[750px] bg-emerald-50/10 backdrop-blur-md border-2 border-emerald-200 shadow-2xl overflow-hidden p-0">
          <OldGoldExchange onApplyCredit={(credit) => {
            setOldGoldCredit(credit);
            setShowOldGoldDialog(false);
          }} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POS;
