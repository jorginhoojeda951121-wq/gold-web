import { useState, useEffect, useCallback } from "react";
import { Gem, Package, TrendingUp, DollarSign, Search, Plus } from "lucide-react";
import { TabNavigation } from "@/components/TabNavigation";
import { StatsCard } from "@/components/StatsCard";
import { JewelryCard, JewelryItem } from "@/components/JewelryCard";
import { AddItemDialog } from "@/components/AddItemDialog";
import { EditItemDialog } from "@/components/EditItemDialog";
import { ViewItemDialog } from "@/components/ViewItemDialog";
import { CraftsmenManagement, Craftsman } from "@/components/CraftsmenManagement";
import { TransactionDialog } from "@/components/TransactionDialog";
import { BusinessSettings } from "@/components/BusinessSettings";
import { EmployeeManagement } from "@/components/EmployeeManagement";
import { AIAnalyticsDashboard } from "@/components/AIAnalyticsDashboard";
import { ReportingDashboard } from "@/components/ReportingDashboard";
import { CustomerLedger } from "@/components/CustomerLedger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { enqueueChange } from "@/lib/sync";
import { useBusinessName } from "@/hooks/useBusinessName";
import { getUserData, setUserData } from "@/lib/userStorage";
import { getSupabase } from "@/lib/supabase";
import heroImage from "@/assets/hero-jewelry.jpg";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: string;
  metal: string;
  gemstone: string;
}

interface Transaction {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  timestamp: string;
  customerName?: string;
  customerPhone?: string;
}

const Index = () => {
  const { toast } = useToast();
  const businessName = useBusinessName();
  const [activeTab, setActiveTab] = useState("inventory");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<JewelryItem | null>(null);
  const [viewingItem, setViewingItem] = useState<JewelryItem | null>(null);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [items, setItems] = useState<JewelryItem[]>([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);

  // Use standardized key for craftsmen - data will be auto-populated by seedWebData
  const { data: craftsmen, updateData: setCraftsmen } = useOfflineStorage<Craftsman[]>('craftsmen', []);

  // Load all inventory from all sources (jewelry, gold, stones, and inventory_items from sync)
  const loadAllInventory = useCallback(async () => {
    try {
      console.log('🔄 Loading all inventory from IndexedDB...');
      
      // Load all inventory types directly from user-scoped IndexedDB
      const [jewelryData, goldData, stonesData, inventoryData] = await Promise.all([
        getUserData<any[]>("jewelry_items") || Promise.resolve([]),
        getUserData<any[]>("gold_items") || Promise.resolve([]),
        getUserData<any[]>("stones_items") || Promise.resolve([]),
        getUserData<any[]>("inventory_items") || Promise.resolve([]),
      ]);

      console.log('📦 Raw data loaded:', {
        jewelry: jewelryData?.length || 0,
        gold: goldData?.length || 0,
        stones: stonesData?.length || 0,
        inventory: inventoryData?.length || 0,
      });

      const allItems: JewelryItem[] = [];
      const processedIds = new Set<string>();

      // Transform jewelry_items
      if (jewelryData && Array.isArray(jewelryData)) {
        jewelryData.forEach((item: any) => {
          if (!item || !item.id || processedIds.has(item.id)) return;
          processedIds.add(item.id);

          // Check if already in correct format
          if (item.type && item.metal && (item.inStock !== undefined || item.stock !== undefined)) {
            allItems.push({
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
            // Transform legacy format (from sync)
            allItems.push({
              id: item.id,
              name: item.name || 'Unknown Item',
              type: item.type || 'Ring',
              gemstone: item.gemstone || item.description || 'None',
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

          allItems.push({
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

          allItems.push({
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

          const existingIndex = allItems.findIndex(i => i.id === item.id);
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
              ? (parseFloat(item.attributes?.carat) || 0)
              : (item.carat || parseFloat(item.attributes?.carat) || 0),
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
            allItems[existingIndex] = transformedItem;
          } else {
            allItems.push(transformedItem);
          }
        });
      }

      console.log('✅ Inventory loaded successfully:', {
        totalItems: allItems.length,
        jewelry: allItems.filter(i => i.type !== 'Gold Bar' && i.type !== 'Gemstone').length,
        gold: allItems.filter(i => i.type === 'Gold Bar').length,
        stones: allItems.filter(i => i.type === 'Gemstone').length,
      });

      setItems(allItems);
      setItemsLoaded(true);
    } catch (error) {
      console.error('❌ Error loading inventory:', error);
      setItems([]);
      setItemsLoaded(true);
    }
  }, []);

  // Load inventory on mount and when user changes
  useEffect(() => {
    loadAllInventory();
    
    // Listen for auth state changes to reload data when user changes
    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Reload inventory when user changes (login/logout)
      if (session?.user?.id) {
        console.log('🔄 User changed, reloading inventory...');
        loadAllInventory();
      } else {
        // User logged out, clear items
        setItems([]);
        setItemsLoaded(false);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [loadAllInventory]);

  // Reload inventory when window gains focus or becomes visible (in case sync happened)
  useEffect(() => {
    const handleFocus = () => {
      loadAllInventory();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadAllInventory();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadAllInventory]);

  const filteredItems = items.filter(item => {
    const name = (item?.name || '').toLowerCase();
    const type = (item?.type || '').toLowerCase();
    const gemstone = (item?.gemstone || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || type.includes(query) || gemstone.includes(query);
  });

  const totalValue = items.reduce((sum, item) => {
    const price = typeof item.price === 'number' && !isNaN(item.price) ? item.price : 0;
    const inStock = typeof item.inStock === 'number' && !isNaN(item.inStock) ? item.inStock : 0;
    return sum + (price * inStock);
  }, 0);
  const totalItems = items.reduce((sum, item) => {
    const inStock = typeof item.inStock === 'number' && !isNaN(item.inStock) ? item.inStock : 0;
    return sum + inStock;
  }, 0);
  const lowStockItems = items.filter(item => {
    const inStock = typeof item.inStock === 'number' && !isNaN(item.inStock) ? item.inStock : 0;
    return inStock < 5;
  }).length;
  const todayRevenue = transactions
    .filter(t => new Date(t.timestamp).toDateString() === new Date().toDateString())
    .reduce((sum, t) => {
      const total = typeof t.total === 'number' && !isNaN(t.total) ? t.total : 0;
      return sum + total;
    }, 0);
  const cartCount = cartItems.reduce((sum, item) => {
    const quantity = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 0;
    return sum + quantity;
  }, 0);

  const handleAddItem = async (newItem: Omit<JewelryItem, 'id'>) => {
    try {
      // Get current user ID
      const { getCurrentUserId } = await import('@/lib/userStorage');
      const userId = await getCurrentUserId();
      
      if (!userId) {
        toast({ 
          title: "Error", 
          description: "User not logged in. Please log in again.", 
          variant: "destructive" 
        });
        return;
      }
      
      const item: JewelryItem = {
        ...newItem,
        id: Date.now().toString()
      };
      
      // Save to appropriate user-scoped IndexedDB key based on item type
      if (item.type === 'Gold Bar') {
        const goldItems = (await getUserData<any[]>('gold_items')) || [];
        goldItems.push({
          id: item.id,
          user_id: userId, // CRITICAL: Include user_id for data isolation
          name: item.name,
          weight: '',
          purity: item.metal,
          price: item.price,
          inStock: item.inStock,
          stock: item.inStock,
          image: item.image || '',
        });
        await setUserData('gold_items', goldItems);
      } else if (item.type === 'Gemstone') {
        const stonesItems = (await getUserData<any[]>('stones_items')) || [];
        stonesItems.push({
          id: item.id,
          user_id: userId, // CRITICAL: Include user_id for data isolation
          name: item.name,
          carat: item.carat.toString(),
          clarity: '',
          cut: '',
          price: item.price,
          inStock: item.inStock,
          stock: item.inStock,
          image: item.image || '',
        });
        await setUserData('stones_items', stonesItems);
      } else {
        const jewelryItems = (await getUserData<any[]>('jewelry_items')) || [];
        jewelryItems.push({
          ...item,
          user_id: userId, // CRITICAL: Include user_id for data isolation
        });
        await setUserData('jewelry_items', jewelryItems);
      }
      
      // Also save to inventory_items for sync
      const inventoryItems = (await getUserData<any[]>('inventory_items')) || [];
      const itemType = item.type === 'Gold Bar' ? 'gold' 
                     : item.type === 'Gemstone' ? 'stone'
                     : 'jewelry';
      inventoryItems.push({
        id: item.id,
        user_id: userId, // CRITICAL: Include user_id for data isolation
        item_type: itemType,
        name: item.name,
        type: item.type,
        gemstone: item.gemstone,
        carat: item.carat,
        metal: item.metal,
        attributes: {
          description: item.type,
          carat: item.carat,
          purity: item.type === 'Gold Bar' ? item.metal : undefined,
          clarity: item.type === 'Gemstone' ? undefined : undefined,
          cut: item.type === 'Gemstone' ? undefined : undefined,
        },
        price: item.price,
        inStock: item.inStock,
        image: item.image || '',
        isArtificial: item.isArtificial || false,
        updated_at: new Date().toISOString(),
      });
      await setUserData('inventory_items', inventoryItems);
      
      // Queue for sync
      enqueueChange('inventory_items', 'upsert', {
        id: item.id,
        user_id: userId, // CRITICAL: Include user_id for data isolation
        item_type: itemType,
        name: item.name,
        type: item.type,
        gemstone: item.gemstone,
        carat: item.carat,
        metal: item.metal,
        attributes: {
          description: item.type,
          carat: item.carat,
          purity: item.type === 'Gold Bar' ? item.metal : undefined,
          clarity: item.type === 'Gemstone' ? undefined : undefined,
          cut: item.type === 'Gemstone' ? undefined : undefined,
        },
        price: item.price,
        inStock: item.inStock,
        image: item.image || '',
        isArtificial: item.isArtificial || false,
        updated_at: new Date().toISOString(),
      });
      
      // Reload inventory to get latest from IndexedDB
      await loadAllInventory();
      
      toast({
        title: "Item Added",
        description: `${item.name} has been added to your inventory.`
      });
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Error",
        description: "Failed to add item. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEditItem = (item: JewelryItem) => {
    // Ensure item is valid before opening dialog
    if (item) {
      setEditingItem(item);
      setShowEditDialog(true);
    }
  };

  const handleSaveEditedItem = (updatedItem: JewelryItem) => {
    setItems(prev => prev.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    ));
    
    // Sync changes to IndexedDB and queue for Supabase sync
    enqueueChange('inventory_items', 'upsert', {
      id: updatedItem.id,
      item_type: updatedItem.type === 'Gold Bar' ? 'gold' 
               : updatedItem.type === 'Gemstone' ? 'stone'
               : 'jewelry',
      name: updatedItem.name,
      type: updatedItem.type,
      gemstone: updatedItem.gemstone,
      carat: updatedItem.carat,
      metal: updatedItem.metal,
      attributes: {
        description: updatedItem.type, // Use type as description fallback
        carat: updatedItem.carat,
        purity: updatedItem.type === 'Gold Bar' ? updatedItem.metal : undefined,
        weight: updatedItem.type === 'Gold Bar' ? undefined : undefined,
        clarity: updatedItem.type === 'Gemstone' ? undefined : undefined,
        cut: updatedItem.type === 'Gemstone' ? undefined : undefined,
      },
      price: updatedItem.price,
      inStock: updatedItem.inStock,
      image: updatedItem.image || "",
      isArtificial: updatedItem.isArtificial || false,
      updated_at: new Date().toISOString(),
    });
    
    // Reload inventory to get latest from IndexedDB
    loadAllInventory();
    
    toast({
      title: "Item Updated",
      description: `${updatedItem.name} has been updated successfully.`
    });
    setShowEditDialog(false);
    setEditingItem(null);
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    
    // Reload inventory to get latest from IndexedDB
    loadAllInventory();
    
    toast({
      title: "Item Deleted",
      description: "Item has been removed from inventory.",
      variant: "destructive"
    });
  };

  const handleViewItem = (item: JewelryItem) => {
    setViewingItem(item);
    setShowViewDialog(true);
  };

  const handleAddToCart = (item: JewelryItem) => {
    const existingItem = cartItems.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
      setCartItems(prev => 
        prev.map(cartItem => 
          cartItem.id === item.id 
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      );
    } else {
      const cartItem: CartItem = {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        type: item.type,
        metal: item.metal,
        gemstone: item.gemstone
      };
      setCartItems(prev => [...prev, cartItem]);
    }
    
    toast({
      title: "Added to Cart",
      description: `${item.name} added to cart`
    });
  };

  const handleUpdateCartQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(id);
      return;
    }
    setCartItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleTransactionComplete = (transaction: Transaction) => {
    setTransactions(prev => [transaction, ...prev]);
    toast({
      title: "Transaction Completed",
      description: `Payment of ₹${transaction.total.toLocaleString()} processed successfully`
    });
  };

  const handleAddCraftsman = (newCraftsman: Omit<Craftsman, 'id'>) => {
    const craftsman: Craftsman = {
      ...newCraftsman,
      id: Date.now().toString()
    };
    setCraftsmen([...craftsmen, craftsman]);
    // Queue for sync to Supabase - use local structure, sync will transform
    enqueueChange('craftsmen', 'upsert', {
      id: craftsman.id,
      name: craftsman.name,
      specialty: craftsman.specialty,
      experience: craftsman.experience, // Keep as-is (can be string or number), sync will parse
      phone: craftsman.contact || '', // Local uses 'contact', sync will map to 'phone'
      contact: craftsman.contact || '', // Keep both for compatibility
      email: craftsman.email || '',
      address: craftsman.address || '',
      status: craftsman.status || 'available', // Sync will map to Supabase status values
      rating: craftsman.rating || 0.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  const handleUpdateCraftsman = (id: string, updates: Partial<Craftsman>) => {
    const updatedCraftsmen = craftsmen.map(c => c.id === id ? { ...c, ...updates } : c);
    setCraftsmen(updatedCraftsmen);
    // Queue for sync to Supabase - use local structure, sync will transform
    const updatedCraftsman = updatedCraftsmen.find(c => c.id === id);
    if (updatedCraftsman) {
      enqueueChange('craftsmen', 'upsert', {
        id: updatedCraftsman.id,
        name: updatedCraftsman.name,
        specialty: updatedCraftsman.specialty,
        experience: updatedCraftsman.experience, // Keep as-is, sync will parse
        phone: updatedCraftsman.contact || '', // Local uses 'contact'
        contact: updatedCraftsman.contact || '', // Keep both for compatibility
        email: updatedCraftsman.email || '',
        address: updatedCraftsman.address || '',
        status: updatedCraftsman.status || 'available', // Sync will map to Supabase status
        rating: updatedCraftsman.rating || 0.0,
        updated_at: new Date().toISOString(),
      });
    }
  };

  const handleDeleteCraftsman = (id: string) => {
    setCraftsmen(craftsmen.filter(c => c.id !== id));
    // Queue for sync to Supabase
    enqueueChange('craftsmen', 'delete', { id });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TabNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        cartCount={cartCount}
      />
      
      {/* Header Section */}
      <header className="bg-gradient-to-r from-green-100 to-yellow-50 border-b border-gray-200">
        <div className="container mx-auto px-6 py-12 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{businessName}</h1>
          <p className="text-gray-600 text-lg">Track your Craftsmen, Inventory, Employees and More</p>
        </div>
      </header>

      <main>
        {/* Inventory Tab */}
        {activeTab === "inventory" && (
          <div className="space-y-8">
            {/* Welcome Section - Main Card */}
            <section className="bg-white rounded-lg shadow-lg p-8 mb-8 border border-gray-200">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-green-600 mb-2">Welcome to Golden Treasures</h2>
                <p className="text-gray-600">Your one-stop shop for gold, stones, and jewelry.</p>
              </div>
              
              {/* Collection Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Gold Collection */}
                <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg p-6 text-white flex flex-col items-center text-center">
                  <div 
                    className="h-32 w-full bg-cover bg-center rounded-lg mb-4"
                    style={{ backgroundImage: `url(${heroImage})` }}
                  />
                  <h3 className="text-xl font-bold text-green-600 mb-2">Gold Collection</h3>
                  <p className="text-green-500 text-sm">Explore our exquisite gold items.</p>
                </div>

                {/* Precious Stones */}
                <div className="bg-white border-2 border-green-200 rounded-lg p-6 flex flex-col items-center text-center">
                  <div 
                    className="h-32 w-full bg-gray-800 rounded-lg mb-4 bg-cover bg-center"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1631832724508-ea8df04ad455?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzNzg4OTl8MHwxfHNlYXJjaHwxfHxwcmVjaW91cy1zdG9uZXN8ZW58MXwwfHx8MTc1Mzc2NjkyMHww&ixlib=rb-4.0.3&q=80&w=1080')" }}
                  />
                  <h3 className="text-xl font-bold text-green-600 mb-2">Precious Stones</h3>
                  <p className="text-green-500 text-sm">Discover our rare and beautiful stones.</p>
                </div>

                {/* Jewelry */}
                <div className="bg-white border-2 border-green-200 rounded-lg p-6 flex flex-col items-center text-center">
                  <div 
                    className="h-32 w-full bg-cover bg-center rounded-lg mb-4"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzNzg4OTl8MHwxfHNlYXJjaHwxfHxqZXdlbHJ5fGVufDF8MHx8fDE3NTM3NTkzMjh8MA&ixlib=rb-4.0.3&q=80&w=1080')" }}
                  />
                  <h3 className="text-xl font-bold text-green-600 mb-2">Jewelry</h3>
                  <p className="text-green-500 text-sm">Elegant and timeless pieces.</p>
                </div>
              </div>
            </section>

            {/* Search Section */}
            <section className="bg-white rounded-lg shadow-lg p-6 mb-8 border border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search jewelry and gems..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500"
                  />
                </div>
                <Button 
                  onClick={() => setShowAddDialog(true)}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </section>

            {/* Stats Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatsCard
                title="Total Items"
                value={totalItems.toString()}
                icon={Package}
                trend="+12% this month"
              />
              <StatsCard
                title="Total Value"
                value={`₹${totalValue.toLocaleString()}`}
                icon={DollarSign}
                trend="+8% this month" 
              />
              <StatsCard
                title="Unique Pieces"
                value={items.length.toString()}
                icon={Gem}
                trend="+3 new items"
              />
              <StatsCard
                title="Low Stock Alert"
                value={lowStockItems.toString()}
                icon={TrendingUp}
                trend={lowStockItems > 0 ? "Needs attention" : "All good"}
              />
            </section>

            {/* Inventory Grid */}
            <section>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Inventory</h2>
                <p className="text-gray-600">
                  {filteredItems.length} of {items.length} items
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map(item => (
                  <JewelryCard
                    key={`${item.id}-${item.image || 'no-image'}-${item.name}`}
                    item={item}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    onView={handleViewItem}
                    onAddToCart={handleAddToCart}
                    showAddToCart={false}
                  />
                ))}
              </div>

              {filteredItems.length === 0 && (
                <div className="text-center py-12">
                  <Gem className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No items found</h3>
                  <p className="text-gray-600">
                    Try adjusting your search or add new jewelry items
                  </p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Craftsmen Tab */}
        {activeTab === "craftsmen" && (
          <CraftsmenManagement
            craftsmen={craftsmen}
            onAddCraftsman={handleAddCraftsman}
            onUpdateCraftsman={handleUpdateCraftsman}
            onDeleteCraftsman={handleDeleteCraftsman}
          />
        )}

        {/* Point of Sale Tab */}
        {activeTab === "pos" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Point of Sale</h2>
                <p className="text-gray-600">Select items and process transactions</p>
              </div>
              {cartItems.length > 0 && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleClearCart}
                    className="border-gray-300 text-gray-700 hover:border-gray-400"
                  >
                    Clear Cart
                  </Button>
                  <Button 
                    onClick={() => setShowTransactionDialog(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Checkout ({cartCount})
                  </Button>
                </div>
              )}
            </div>

            {/* Search */}
            <Card className="p-6 bg-white shadow-lg border border-gray-200">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search items to add to cart..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </Card>

            {/* Cart Summary */}
            {cartItems.length > 0 && (
              <Card className="p-6 bg-green-50 border-green-200">
                <h3 className="font-semibold mb-4 text-green-800">Cart Summary</h3>
                <div className="space-y-2">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <div className="flex gap-2 mt-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUpdateCartQuantity(item.id, item.quantity - 1)}
                            className="border-gray-300"
                          >
                            -
                          </Button>
                          <Badge variant="secondary">{item.quantity}</Badge>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUpdateCartQuantity(item.id, item.quantity + 1)}
                            className="border-gray-300"
                          >
                            +
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemoveFromCart(item.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                      <span className="font-bold">₹{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-green-200">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-green-600">
                        ₹{cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Items Grid for POS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map(item => (
                <JewelryCard
                  key={item.id}
                  item={item}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                  onView={handleViewItem}
                  onAddToCart={handleAddToCart}
                  showAddToCart={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && <AIAnalyticsDashboard />}

        {/* Employees Tab */}
        {activeTab === "employees" && <EmployeeManagement />}

        {/* Settings Tab */}
        {activeTab === "settings" && <BusinessSettings />}

        {/* Reports Tab */}
        {activeTab === "reports" && <ReportingDashboard />}

        {/* Customer Ledger Tab */}
        {activeTab === "ledger" && <CustomerLedger />}
      </main>

      {/* Dialogs */}
      <AddItemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddItem}
      />

        <EditItemDialog
          open={showEditDialog}
          onOpenChange={(open) => {
            setShowEditDialog(open);
            if (!open) {
              // Clean up when dialog closes
              setEditingItem(null);
            }
          }}
          onSave={handleSaveEditedItem}
          item={editingItem}
        />

        <ViewItemDialog
          open={showViewDialog}
          onOpenChange={setShowViewDialog}
          onEdit={handleEditItem}
          item={viewingItem}
        />

        <TransactionDialog
        open={showTransactionDialog}
        onOpenChange={setShowTransactionDialog}
        items={cartItems}
        onComplete={handleTransactionComplete}
        onClearCart={handleClearCart}
      />
    </div>
  );
};

export default Index;
