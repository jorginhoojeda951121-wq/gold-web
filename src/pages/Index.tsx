import { useState, useEffect, useCallback, useMemo } from "react";
import { Gem, Package, TrendingUp, DollarSign, Search, Plus, Share2 } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { JewelryCard, JewelryItem } from "@/components/JewelryCard";
import { AddItemDialog } from "@/components/AddItemDialog";
import { EditItemDialog } from "@/components/EditItemDialog";
import { ViewItemDialog } from "@/components/ViewItemDialog";
import { InventoryShare, InventoryItem } from "@/components/InventoryShare";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CraftsmenManagement, Craftsman } from "@/components/CraftsmenManagement";
import { TransactionDialog } from "@/components/TransactionDialog";
import { BusinessSettings } from "@/components/BusinessSettings";
import { EmployeeManagement } from "@/components/EmployeeManagement";
import { AIAnalyticsDashboard } from "@/components/AIAnalyticsDashboard";
import { ReportingDashboard } from "@/components/ReportingDashboard";
import { CustomerLedger } from "@/components/CustomerLedger";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("inventory");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showBulkShareDialog, setShowBulkShareDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<JewelryItem | null>(null);
  const [viewingItem, setViewingItem] = useState<JewelryItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [items, setItems] = useState<JewelryItem[]>([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);

  // Use standardized key for craftsmen - data will be auto-populated by seedWebData
  const { data: craftsmen, updateData: setCraftsmen } = useOfflineStorage<Craftsman[]>('craftsmen', []);

  // Load all inventory from unified inventory_items table (Single Source of Truth)
  const loadAllInventory = useCallback(async (forceReload = false) => {
    // Prevent multiple simultaneous loads (unless forced)
    if (itemsLoaded && !forceReload) return;
    
    try {
      // Load from unified inventory_items table
      const inventoryData = await getUserData<any[]>("inventory_items") || [];

      const allItems: JewelryItem[] = inventoryData.map((item: any) => {
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

      setItems(allItems);
      setItemsLoaded(true);
    } catch (error) {
      console.error('❌ Error loading inventory:', error);
      setItems([]);
      setItemsLoaded(true);
    }
  }, [itemsLoaded]);

  // Load inventory on mount only - prevent excessive reloads
  useEffect(() => {
    if (!itemsLoaded) {
      loadAllInventory();
    }
  }, []);

  // Listen for auth state changes to handle logout
  useEffect(() => {
    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Only clear items on logout
      if (!session?.user?.id && itemsLoaded) {
        setItems([]);
        setItemsLoaded(false);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [itemsLoaded]);

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

  // Removed: Reload inventory when window gains focus - too aggressive, causes slow loading
  // Users can manually refresh if needed using sync buttons

  // Memoize filtered items to avoid re-filtering on every render
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => {
      const name = (item?.name || '').toLowerCase();
      const type = (item?.type || '').toLowerCase();
      const gemstone = (item?.gemstone || '').toLowerCase();
      return name.includes(query) || type.includes(query) || gemstone.includes(query);
    });
  }, [items, searchQuery]);

  // Memoize calculations to avoid re-calculating on every render
  const { totalValue, totalItems } = useMemo(() => {
    return items.reduce((acc, item) => {
      const price = typeof item.price === 'number' && !isNaN(item.price) ? item.price : 0;
      const inStock = typeof item.inStock === 'number' && !isNaN(item.inStock) ? item.inStock : 0;
      return {
        totalValue: acc.totalValue + (price * inStock),
        totalItems: acc.totalItems + inStock
      };
    }, { totalValue: 0, totalItems: 0 });
  }, [items]);

  // Memoize low stock count
  const lowStockItems = useMemo(() => {
    return items.filter(item => {
      const inStock = typeof item.inStock === 'number' && !isNaN(item.inStock) ? item.inStock : 0;
      return inStock < 5;
    }).length;
  }, [items]);

  // Memoize today's revenue
  const todayRevenue = useMemo(() => {
    const today = new Date().toDateString();
    return transactions
      .filter(t => new Date(t.timestamp).toDateString() === today)
      .reduce((sum, t) => {
        const total = typeof t.total === 'number' && !isNaN(t.total) ? t.total : 0;
        return sum + total;
      }, 0);
  }, [transactions]);

  // Memoize cart count
  const cartCount = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const quantity = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 0;
      return sum + quantity;
    }, 0);
  }, [cartItems]);

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
      // Save to unified inventory_items table (Single Source of Truth)
      const inventoryItems = (await getUserData<any[]>('inventory_items')) || [];
      const itemType = item.type === 'Gold Bar' ? 'gold' 
                     : item.type === 'Gemstone' ? 'stone'
                     : 'jewelry';
      
      const newInventoryItem = {
        id: item.id,
        user_id: userId,
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
        stock: item.inStock,
        image: item.image || item.image_1 || '',
        image_1: item.image_1 || item.image || '',
        image_2: item.image_2 || '',
        image_3: item.image_3 || '',
        image_4: item.image_4 || '',
        isArtificial: item.isArtificial || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      inventoryItems.push(newInventoryItem);
      await setUserData('inventory_items', inventoryItems);
      
      // Queue for sync
      enqueueChange('inventory_items', 'upsert', newInventoryItem);
      
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

  const handleSaveEditedItem = async (updatedItem: JewelryItem) => {
    try {
      // Determine item type
      const itemType = updatedItem.type === 'Gold Bar' ? 'gold' 
                     : updatedItem.type === 'Gemstone' ? 'stone' 
                     : 'jewelry';
    
      // Update inventory_items directly (Single Source of Truth)
      const inventoryItems = await getUserData<any[]>('inventory_items') || [];
      const itemIndex = inventoryItems.findIndex((item: any) => item.id === updatedItem.id);

      const updatedInventoryItem = {
      id: updatedItem.id,
        item_type: itemType,
      name: updatedItem.name,
      type: updatedItem.type,
      gemstone: updatedItem.gemstone,
      carat: updatedItem.carat,
      metal: updatedItem.metal,
      attributes: {
          description: updatedItem.type,
        carat: updatedItem.carat,
        purity: updatedItem.type === 'Gold Bar' ? updatedItem.metal : undefined,
        clarity: updatedItem.type === 'Gemstone' ? undefined : undefined,
        cut: updatedItem.type === 'Gemstone' ? undefined : undefined,
      },
      price: updatedItem.price,
      inStock: updatedItem.inStock,
        stock: updatedItem.inStock,
        image: updatedItem.image || updatedItem.image_1 || "",
        image_1: updatedItem.image_1 || updatedItem.image || "",
        image_2: updatedItem.image_2 || "",
        image_3: updatedItem.image_3 || "",
        image_4: updatedItem.image_4 || "",
      isArtificial: updatedItem.isArtificial || false,
      updated_at: new Date().toISOString(),
        created_at: inventoryItems[itemIndex]?.created_at || new Date().toISOString(),
        user_id: inventoryItems[itemIndex]?.user_id,
      };

      if (itemIndex >= 0) {
        inventoryItems[itemIndex] = updatedInventoryItem;
      } else {
        inventoryItems.push(updatedInventoryItem);
      }

      await setUserData('inventory_items', inventoryItems);

      // Queue for Supabase sync
      enqueueChange('inventory_items', 'upsert', updatedInventoryItem);

      // Update UI state
      setItems(prev => prev.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      ));
      
      // Reload inventory to ensure consistency
      await loadAllInventory(true);
    
    toast({
      title: "Item Updated",
      description: `${updatedItem.name} has been updated successfully.`
    });
    setShowEditDialog(false);
    setEditingItem(null);
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: "Error",
        description: "Failed to update item. Please try again.",
        variant: "destructive"
      });
    }
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Gold Collection */}
                <div 
                  onClick={() => navigate('/gold-collection')}
                  className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg p-6 text-white flex flex-col items-center text-center cursor-pointer hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <div 
                    className="h-32 w-full bg-cover bg-center rounded-lg mb-4"
                    style={{ backgroundImage: `url(${heroImage})` }}
                  />
                  <h3 className="text-xl font-bold text-white mb-2">Gold Collection</h3>
                  <p className="text-yellow-100 text-sm">Explore our exquisite gold items.</p>
                </div>

                {/* Precious Stones */}
                <div 
                  onClick={() => navigate('/precious-stones')}
                  className="bg-white border-2 border-green-200 rounded-lg p-6 flex flex-col items-center text-center cursor-pointer hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl hover:border-green-400"
                >
                  <div 
                    className="h-32 w-full bg-gray-800 rounded-lg mb-4 bg-cover bg-center"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1631832724508-ea8df04ad455?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzNzg4OTl8MHwxfHNlYXJjaHwxfHxwcmVjaW91cy1zdG9uZXN8ZW58MXwwfHx8MTc1Mzc2NjkyMHww&ixlib=rb-4.0.3&q=80&w=1080')" }}
                  />
                  <h3 className="text-xl font-bold text-green-600 mb-2">Precious Stones</h3>
                  <p className="text-green-500 text-sm">Discover our rare and beautiful stones.</p>
                </div>

                {/* Artificial Stones */}
                <div 
                  onClick={() => navigate('/artificial-stones')}
                  className="bg-white border-2 border-blue-200 rounded-lg p-6 flex flex-col items-center text-center cursor-pointer hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl hover:border-blue-400"
                >
                  <div 
                    className="h-32 w-full bg-blue-800 rounded-lg mb-4 bg-cover bg-center"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1605100804763-247f67b3557e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080')" }}
                  />
                  <h3 className="text-xl font-bold text-blue-600 mb-2">Artificial Stones</h3>
                  <p className="text-blue-500 text-sm">Synthetic and lab-created stones.</p>
                </div>

                {/* Jewelry Collection */}
                <div 
                  onClick={() => navigate('/jewelry-collection')}
                  className="bg-white border-2 border-purple-200 rounded-lg p-6 flex flex-col items-center text-center cursor-pointer hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl hover:border-purple-400"
                >
                  <div 
                    className="h-32 w-full bg-cover bg-center rounded-lg mb-4"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzNzg4OTl8MHwxfHNlYXJjaHwxfHxqZXdlbHJ5fGVufDF8MHx8fDE3NTM3NTkzMjh8MA&ixlib=rb-4.0.3&q=80&w=1080')" }}
                  />
                  <h3 className="text-xl font-bold text-purple-600 mb-2">Jewelry Collection</h3>
                  <p className="text-purple-500 text-sm">Elegant and timeless pieces.</p>
                </div>
              </div>
              
              {/* Inventory Management Card */}
              <div className="mt-6">
                <div 
                  onClick={() => setActiveTab('inventory')}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white cursor-pointer hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold mb-2">Inventory Management</h3>
                      <p className="text-indigo-100 text-sm">Unified inventory management for all collections</p>
                    </div>
                    <Package className="h-12 w-12 text-white/80" />
                  </div>
                </div>
              </div>
            </section>

            {/* Search Section */}
            <section className="bg-gradient-to-r from-white via-gray-50/50 to-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200/80 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                  <Input
                    placeholder="Search jewelry and gems..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 text-base border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm"
                  />
                </div>
                <Button 
                  onClick={() => setShowAddDialog(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl h-12 px-6 font-semibold"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Item
                </Button>
              </div>
            </section>

            {/* Stats Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
              <StatsCard
                title="Total Items"
                value={totalItems.toString()}
                icon={Package}
                trend="+12% this month"
                variant="blue"
              />
              <StatsCard
                title="Total Value"
                value={`₹${totalValue.toLocaleString()}`}
                icon={DollarSign}
                trend="+8% this month"
                variant="gold"
              />
              <StatsCard
                title="Unique Pieces"
                value={items.length.toString()}
                icon={Gem}
                trend="+3 new items"
                variant="purple"
              />
              <StatsCard
                title="Low Stock Alert"
                value={lowStockItems.toString()}
                icon={TrendingUp}
                trend={lowStockItems > 0 ? "Needs attention" : "All good"}
                variant={lowStockItems > 0 ? "green" : "default"}
              />
            </section>

            {/* Inventory Grid */}
            <section>
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200/80">
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-1">
                    Inventory
                  </h2>
                  <p className="text-sm text-gray-500">Manage your jewelry collection</p>
                </div>
                <div className="flex items-center gap-3">
                  {selectedItems.size > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setShowBulkShareDialog(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    >
                      <Share2 className="h-4 w-4" />
                      Share Selected ({selectedItems.size})
                    </Button>
                  )}
                  {!itemsLoaded ? (
                    <span className="text-sm text-muted-foreground font-medium">Loading...</span>
                  ) : (
                    <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg">
                      {filteredItems.length} of {items.length} items
                    </span>
                  )}
                </div>
              </div>
              
              {/* Bulk Selection Controls */}
              {filteredItems.length > 0 && itemsLoaded && (
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200/80">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all-home"
                        checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedItems(new Set(filteredItems.map(item => item.id)));
                          } else {
                            setSelectedItems(new Set());
                          }
                        }}
                      />
                      <Label htmlFor="select-all-home" className="cursor-pointer">
                        Select All ({selectedItems.size} selected)
                      </Label>
                    </div>
                    {selectedItems.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedItems(new Set())}
                        className="text-red-600 hover:text-red-700"
                      >
                        Clear Selection
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {!itemsLoaded ? (
                // Subtle loading state - shows page structure while loading
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="bg-white rounded-lg shadow-md border border-gray-200 p-6 animate-pulse">
                      <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredItems.map(item => (
                      <div key={`${item.id}-${item.image || 'no-image'}-${item.name}`} className="relative">
                        <div className="absolute top-2 left-2 z-10">
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedItems);
                              if (checked) {
                                newSelected.add(item.id);
                              } else {
                                newSelected.delete(item.id);
                              }
                              setSelectedItems(newSelected);
                            }}
                            className="bg-white border-2 border-gray-300 shadow-md"
                          />
                        </div>
                        <JewelryCard
                          item={item}
                          onEdit={handleEditItem}
                          onDelete={handleDeleteItem}
                          onView={handleViewItem}
                          onAddToCart={handleAddToCart}
                          showAddToCart={false}
                        />
                      </div>
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
                </>
              )}
            </section>
          </div>
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


        {/* Employees Tab - Redirect to dedicated Staff page */}
        {activeTab === "employees" && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Employee Management has been moved to a dedicated page</p>
            <p className="text-sm text-muted-foreground">Please use the "Staff" link in the sidebar to access employee management</p>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && <BusinessSettings />}

        {/* Analytics Tab - Combined with Reports */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <AIAnalyticsDashboard />
            <ReportingDashboard />
          </div>
        )}

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
      
      {/* Bulk Share Dialog */}
      {selectedItems.size > 0 && (
        <InventoryShare
          items={filteredItems
            .filter(item => selectedItems.has(item.id))
            .map(item => ({
              id: item.id,
              name: item.name,
              price: item.price,
              stock: item.inStock,
              inStock: item.inStock,
              image: item.image,
              image_1: item.image_1,
              image_2: item.image_2,
              image_3: item.image_3,
              image_4: item.image_4,
              type: item.type,
              metal: item.metal,
              gemstone: item.gemstone,
              carat: item.carat,
              item_type: 'jewelry',
            } as InventoryItem))}
          open={showBulkShareDialog}
          onOpenChange={(open) => {
            setShowBulkShareDialog(open);
          }}
          shareType="bulk"
        />
      )}
    </div>
  );
};

export default Index;
