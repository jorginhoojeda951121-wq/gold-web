import { useState, useEffect, useCallback } from "react";
import { Search, Grid, List, ArrowLeft, Plus, Edit, Trash2, ShoppingCart, AlertTriangle, Gem } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { enqueueChange } from "@/lib/sync";
import { getUserData, setUserData } from "@/lib/userStorage";
import { MultiImageUpload } from "@/components/MultiImageUpload";
import { ItemDetailsDialog } from "@/components/ItemDetailsDialog";
import { JewelryCard, JewelryItem } from "@/components/JewelryCard";

interface JewelryItemLocal {
  id: string;
  name: string;
  type: string;
  gemstone: string;
  carat: string;
  metal: string;
  price: number;
  stock: number;
  image: string;
  image_1?: string;
  image_2?: string;
  image_3?: string;
  image_4?: string;
  inStock?: number;
}

const JewelryCollection = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: searchQuery, updateData: setSearchQuery } = useOfflineStorage<string>("jewelry_search", "");
  const { data: viewMode, updateData: setViewMode } = useOfflineStorage<'grid' | 'list'>("jewelry_viewMode", 'grid');
  const [jewelryItems, setJewelryItems] = useState<JewelryItemLocal[]>([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const { data: posCart, updateData: setPosCart } = useOfflineStorage<any[]>("pos_cart", []);

  // Dropdown options
  const jewelryTypes = ['Ring', 'Necklace', 'Earrings', 'Bracelet', 'Brooch', 'Pendant', 'Chain', 'Anklet'];
  const gemstoneOptions = ['None', 'Diamond', 'Emerald', 'Sapphire', 'Ruby', 'Pearl', 'Amethyst', 'Topaz', 'Garnet', 'Opal', 'Turquoise', 'Crystal'];
  const metalOptions = ['Gold 24K', 'Gold 18K', 'Gold 14K', 'Gold 10K', 'White Gold', 'Rose Gold', 'Platinum', 'Silver', 'Stainless Steel', 'Brass', 'Copper'];

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<JewelryItemLocal | null>(null);
  const [selectedItem, setSelectedItem] = useState<JewelryItemLocal | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "Ring",
    gemstone: "None",
    carat: "",
    metal: "Gold 18K",
    price: "",
    stock: "",
    image: ""
  });
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null]);

  // Load all inventory from all sources (jewelry, gold, stones, and inventory_items from sync)
  // Filter to only show jewelry items (not gold bars or gemstones)
  const loadAllInventory = useCallback(async () => {
    try {
      
      // Load all inventory types directly from IndexedDB
      const [jewelryData, goldData, stonesData, inventoryData] = await Promise.all([
        getUserData<any[]>("jewelry_items") || Promise.resolve([]),
        getUserData<any[]>("gold_items") || Promise.resolve([]),
        getUserData<any[]>("stones_items") || Promise.resolve([]),
        getUserData<any[]>("inventory_items") || Promise.resolve([]),
      ]);

      const allItems: JewelryItem[] = [];
      const processedIds = new Set<string>();

      // Transform jewelry_items (only jewelry, not gold/stones)
      if (jewelryData && Array.isArray(jewelryData)) {
        jewelryData.forEach((item: any) => {
          if (!item || !item.id || processedIds.has(item.id)) return;
          
          // CRITICAL: Filter by category to ensure only jewelry items are shown
          // Skip if item is gold or stones (check both category and item_type for consistency)
          if (item.category === 'gold' || item.item_type === 'gold' || 
              item.category === 'stones' || item.item_type === 'stones' || 
              item.category === 'stone' || item.item_type === 'stone') {
            return;
          }
          
          processedIds.add(item.id);

          // Clean and validate image URL (same logic as GoldCollection)
          let imageUrl = item.image || item.image_url || '';
          
          // Fix corrupted image data (single characters, invalid strings)
          if (imageUrl && (imageUrl.length < 10 || imageUrl === '[' || imageUrl === '{' || imageUrl === 'undefined')) {
            // Silently clean up corrupted image data
            imageUrl = '';
          }

          // Check if it's a full JewelryItem format or legacy format
          if (item.type && item.type !== 'Gold Bar' && item.type !== 'Gemstone') {
            // Full format with all fields
            allItems.push({
              id: item.id,
              name: item.name || 'Unknown Item',
              type: item.type || 'Ring',
              gemstone: item.gemstone || 'None',
              carat: item.carat || '',
              metal: item.metal || 'Gold 18K',
              price: item.price || 0,
              stock: item.stock ?? item.inStock ?? 10,
              image: imageUrl,
              image_1: item.image_1 || imageUrl || '',
              image_2: item.image_2 || '',
              image_3: item.image_3 || '',
              image_4: item.image_4 || '',
            });
          } else if (!item.type || item.type === 'Ring' || item.type === 'Necklace' || item.type === 'Earrings' || item.type === 'Bracelet') {
            // Legacy format or simple jewelry format
            allItems.push({
              id: item.id,
              name: item.name || 'Unknown Item',
              type: item.type || 'Ring',
              gemstone: item.gemstone || 'None',
              carat: item.carat || '',
              metal: item.metal || 'Gold 18K',
              price: item.price || 0,
              stock: item.stock ?? item.inStock ?? 10,
              image: imageUrl,
              image_1: item.image_1 || imageUrl || '',
              image_2: item.image_2 || '',
              image_3: item.image_3 || '',
              image_4: item.image_4 || '',
            });
          }
        });
      }

      // Transform inventory_items from sync (only jewelry type, not gold/stones)
      if (inventoryData && Array.isArray(inventoryData)) {
        inventoryData.forEach((item: any) => {
          if (!item || !item.id) return;
          
          // CRITICAL: Consistent category filtering - only include jewelry items, skip gold and stones
          // Check both category and item_type for backward compatibility
          const isGold = item.category === 'gold' || item.item_type === 'gold';
          const isStone = item.category === 'stones' || item.item_type === 'stones' || 
                          item.category === 'stone' || item.item_type === 'stone';
          
          // Only include jewelry items (or items without type that aren't gold/stones)
          if (item.item_type === 'jewelry' || item.category === 'jewelry' || 
              (!isGold && !isStone && (!item.item_type || item.item_type === '') && item.type && item.type !== 'Gold Bar' && item.type !== 'Gemstone')) {
            // Clean and validate image URL
            let imageUrl = item.image || item.image_url || '';
            
            // Fix corrupted image data (single characters, invalid strings)
            if (imageUrl && (imageUrl.length < 10 || imageUrl === '[' || imageUrl === '{' || imageUrl === 'undefined')) {
              // Silently clean up corrupted image data
              imageUrl = '';
            }

            const existingIndex = allItems.findIndex(i => i.id === item.id);
            const transformedItem: JewelryItem = {
              id: item.id,
              name: item.name || 'Unknown Item',
              type: item.type || item.attributes?.type || 'Ring',
              gemstone: item.gemstone || item.attributes?.gemstone || 'None',
              carat: item.carat || item.attributes?.carat || '',
              metal: item.metal || item.attributes?.metal || 'Gold 18K',
              price: item.price || 0,
              stock: item.stock ?? item.inStock ?? 10,
              image: imageUrl,
              image_1: item.image_1 || imageUrl || '',
              image_2: item.image_2 || '',
              image_3: item.image_3 || '',
              image_4: item.image_4 || '',
            };

            if (existingIndex >= 0) {
              // Update existing item (sync data takes precedence)
              allItems[existingIndex] = transformedItem;
            } else {
              allItems.push(transformedItem);
            }
          }
        });
      }

      setJewelryItems(allItems);
      setItemsLoaded(true);
    } catch (error) {
      console.error('❌ Error loading jewelry inventory:', error);
      setJewelryItems([]);
      setItemsLoaded(true);
    }
  }, []);

  // Load inventory on mount and when sync completes
  useEffect(() => {
    loadAllInventory();
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

  const filteredItems = jewelryItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.gemstone.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.metal.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItem = async () => {
    if (!formData.name || !formData.price || !formData.stock) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

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
      
      const newItem: JewelryItem & { image_1?: string; image_2?: string; image_3?: string; image_4?: string } = {
        id: Date.now().toString(),
        name: formData.name,
        type: formData.type,
        gemstone: formData.gemstone,
        carat: formData.carat,
        metal: formData.metal,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock) || 0,
        image: images[0] || "https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzNzg4OTl8MHwxfHNlYXJjaHwxfHxqZXdlbHJ5fGVufDF8MHx8fDE3NTM3NTkzMjh8MA&ixlib=rb-4.1.0&q=80&w=1080",
        image_1: images[0] || undefined,
        image_2: images[1] || undefined,
        image_3: images[2] || undefined,
        image_4: images[3] || undefined,
      };

      // Save to IndexedDB with user_id
      const jewelryData = (await getUserData<any[]>('jewelry_items')) || [];
      jewelryData.push({
        ...newItem,
        user_id: userId, // CRITICAL: Include user_id for data isolation
      });
      await setUserData('jewelry_items', jewelryData);
      
      // Also save to inventory_items for sync (with both image and image_url for compatibility)
      const inventoryItems = (await getUserData<any[]>('inventory_items')) || [];
      inventoryItems.push({
        id: newItem.id,
        user_id: userId, // CRITICAL: Include user_id for data isolation
        item_type: 'jewelry',
        name: newItem.name,
        type: newItem.type,
        gemstone: newItem.gemstone,
        carat: newItem.carat,
        metal: newItem.metal,
        attributes: { type: newItem.type, gemstone: newItem.gemstone, carat: newItem.carat, metal: newItem.metal },
        price: newItem.price,
        inStock: newItem.stock,
        stock: newItem.stock,
        image: newItem.image,
        image_1: newItem.image_1,
        image_2: newItem.image_2,
        image_3: newItem.image_3,
        image_4: newItem.image_4,
        image_url: newItem.image, // Add for compatibility
        updated_at: new Date().toISOString(),
      });
      await setUserData('inventory_items', inventoryItems);
      
      // Queue for sync
      enqueueChange('inventory_items', 'upsert', {
        id: newItem.id,
        item_type: 'jewelry',
        name: newItem.name,
        type: newItem.type,
        gemstone: newItem.gemstone,
        carat: newItem.carat,
        metal: newItem.metal,
        attributes: { type: newItem.type, gemstone: newItem.gemstone, carat: newItem.carat, metal: newItem.metal },
        price: newItem.price,
        inStock: newItem.stock,
        stock: newItem.stock,
        image: newItem.image,
        image_1: newItem.image_1,
        image_2: newItem.image_2,
        image_3: newItem.image_3,
        image_4: newItem.image_4,
        image_url: newItem.image, // Add for compatibility
        updated_at: new Date().toISOString(),
      });
      
      // Reload inventory
      await loadAllInventory();
      
      setFormData({ name: "", type: "Ring", gemstone: "None", carat: "", metal: "Gold 18K", price: "", stock: "", image: "" });
      setImages([null, null, null, null]);
      setShowAddDialog(false);
      toast({
        title: "Item Added",
        description: `${newItem.name} has been added to the collection.`
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

  const handleViewItem = (item: JewelryItemLocal) => {
    setSelectedItem(item);
    setShowDetailsDialog(true);
  };

  const handleEditItem = (item: JewelryItemLocal) => {
    // Close details dialog if open
    if (showDetailsDialog) {
      setShowDetailsDialog(false);
    }
    setSelectedItem(item);
    setFormData({
      name: item.name,
      type: item.type,
      gemstone: item.gemstone,
      carat: item.carat,
      metal: item.metal,
      price: item.price.toString(),
      stock: item.stock.toString(),
      image: item.image
    });
    // Load existing images into the images state
    setImages([
      item.image_1 || item.image || null,
      item.image_2 || null,
      item.image_3 || null,
      item.image_4 || null,
    ]);
    setShowEditDialog(true);
  };

  const handleUpdateItem = async () => {
    if (!selectedItem || !formData.name || !formData.price || !formData.stock) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      const updatedItem: JewelryItem & { image_1?: string; image_2?: string; image_3?: string; image_4?: string } = {
        ...selectedItem,
        name: formData.name,
        type: formData.type,
        gemstone: formData.gemstone,
        carat: formData.carat,
        metal: formData.metal,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock) || 0,
        image: images[0] || selectedItem.image || "",
        image_1: images[0] || selectedItem.image_1,
        image_2: images[1] || selectedItem.image_2,
        image_3: images[2] || selectedItem.image_3,
        image_4: images[3] || selectedItem.image_4,
      };

      // Save to IndexedDB
      const jewelryData = (await getUserData<any[]>('jewelry_items')) || [];
      const jewelryIndex = jewelryData.findIndex((item: any) => item.id === updatedItem.id);
      if (jewelryIndex >= 0) {
        jewelryData[jewelryIndex] = updatedItem;
      } else {
        jewelryData.push(updatedItem);
      }
      await setUserData('jewelry_items', jewelryData);
      
      // Also update inventory_items for sync (with both image and image_url for compatibility)
      const inventoryItems = (await getUserData<any[]>('inventory_items')) || [];
      const inventoryIndex = inventoryItems.findIndex((item: any) => item.id === updatedItem.id);
      const inventoryUpdate = {
        id: updatedItem.id,
        item_type: 'jewelry',
        name: updatedItem.name,
        type: updatedItem.type,
        gemstone: updatedItem.gemstone,
        carat: updatedItem.carat,
        metal: updatedItem.metal,
        attributes: { type: updatedItem.type, gemstone: updatedItem.gemstone, carat: updatedItem.carat, metal: updatedItem.metal },
        price: updatedItem.price,
        inStock: updatedItem.stock,
        stock: updatedItem.stock,
        image: updatedItem.image,
        image_1: updatedItem.image_1,
        image_2: updatedItem.image_2,
        image_3: updatedItem.image_3,
        image_4: updatedItem.image_4,
        image_url: updatedItem.image, // Add for compatibility
        updated_at: new Date().toISOString(),
      };
      if (inventoryIndex >= 0) {
        inventoryItems[inventoryIndex] = inventoryUpdate;
      } else {
        inventoryItems.push(inventoryUpdate);
      }
      await setUserData('inventory_items', inventoryItems);
      
      // Queue for sync
      enqueueChange('inventory_items', 'upsert', inventoryUpdate);
      
      // Reload inventory
      await loadAllInventory();
      
      setFormData({ name: "", type: "Ring", gemstone: "None", carat: "", metal: "Gold 18K", price: "", stock: "", image: "" });
      setImages([null, null, null, null]);
      setSelectedItem(null);
      setShowEditDialog(false);
      toast({
        title: "Item Updated",
        description: `${updatedItem.name} has been updated.`
      });
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: "Error",
        description: "Failed to update item. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteClick = (item: JewelryItemLocal) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      try {
        const id = itemToDelete.id;
        const item = jewelryItems.find(i => i.id === id);
        
        // Remove from IndexedDB
        const jewelryData = (await getUserData<any[]>('jewelry_items')) || [];
        await setUserData('jewelry_items', jewelryData.filter((item: any) => item.id !== id));
        
        const inventoryItems = (await getUserData<any[]>('inventory_items')) || [];
        await setUserData('inventory_items', inventoryItems.filter((item: any) => item.id !== id));
        
        // Queue for sync
        enqueueChange('inventory_items', 'delete', { id });
        
        // Reload inventory
        await loadAllInventory();
        
        toast({
          title: "Item Removed",
          description: item ? `${item.name} has been removed from the collection.` : "Item has been removed.",
          variant: "destructive"
        });
        setShowDeleteConfirm(false);
        setItemToDelete(null);
      } catch (error) {
        console.error('Error deleting item:', error);
        toast({
          title: "Error",
          description: "Failed to delete item. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleOrderNow = (item: JewelryItemLocal) => {
    // Convert JewelryItem to cart item format
    const cartItem = {
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      type: 'jewelry'
    };

    // Check if item already exists in cart
    const existingItem = posCart.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
      // Update quantity if item exists
      setPosCart(prev => prev.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      // Add new item to cart
      setPosCart(prev => [...prev, cartItem]);
    }

    toast({
      title: "Added to Cart",
      description: `${item.name} has been added to your cart.`
    });

    // Navigate to POS page
    navigate('/pos');
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center justify-between w-full">
              <div>
                <h1 className="text-2xl font-bold text-green-600 mb-2">Jewelry Collection</h1>
                <p className="text-green-500">Our Jewelry</p>
              </div>
              <Button 
                onClick={() => setShowAddDialog(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
            <Link to="/dashboard" className="ml-4">
              <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>

          {/* Search and View Controls */}
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search Products"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500"
              />
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Jewelry Items */}
        <div className={`grid gap-8 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
          {filteredItems.map(item => (
            <JewelryCard
              key={item.id}
              item={item}
              onEdit={handleEditItem}
              onDelete={handleDeleteClick}
              onOrder={handleOrderNow}
              onView={handleViewItem}
            />
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No items found</h3>
            <p className="text-gray-600">Try adjusting your search criteria</p>
          </div>
        )}
      </main>

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Jewelry Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Item Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Diamond"
                />
              </div>
              <div>
                <Label htmlFor="type">Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {jewelryTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gemstone">Gemstone</Label>
                <Select value={formData.gemstone} onValueChange={(value) => setFormData(prev => ({ ...prev, gemstone: value }))}>
                  <SelectTrigger id="gemstone">
                    <SelectValue placeholder="Select gemstone" />
                  </SelectTrigger>
                  <SelectContent>
                    {gemstoneOptions.map((gem) => (
                      <SelectItem key={gem} value={gem}>{gem}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="carat">Carat Weight</Label>
                <Input
                  id="carat"
                  value={formData.carat}
                  onChange={(e) => setFormData(prev => ({ ...prev, carat: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="metal">Metal *</Label>
              <Select value={formData.metal} onValueChange={(value) => setFormData(prev => ({ ...prev, metal: value }))}>
                <SelectTrigger id="metal">
                  <SelectValue placeholder="Select metal" />
                </SelectTrigger>
                <SelectContent>
                  {metalOptions.map((metal) => (
                    <SelectItem key={metal} value={metal}>{metal}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="250000"
                />
              </div>
              <div>
                <Label htmlFor="stock">Stock Quantity *</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            <MultiImageUpload 
              images={images}
              onImagesChange={setImages}
              maxImages={4}
              label="Item Images"
            />
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddItem} className="bg-green-600 hover:bg-green-700">
                Add Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Jewelry Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Item Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Diamond"
                />
              </div>
              <div>
                <Label htmlFor="edit-type">Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger id="edit-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {jewelryTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-gemstone">Gemstone</Label>
                <Select value={formData.gemstone} onValueChange={(value) => setFormData(prev => ({ ...prev, gemstone: value }))}>
                  <SelectTrigger id="edit-gemstone">
                    <SelectValue placeholder="Select gemstone" />
                  </SelectTrigger>
                  <SelectContent>
                    {gemstoneOptions.map((gem) => (
                      <SelectItem key={gem} value={gem}>{gem}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-carat">Carat Weight</Label>
                <Input
                  id="edit-carat"
                  value={formData.carat}
                  onChange={(e) => setFormData(prev => ({ ...prev, carat: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-metal">Metal *</Label>
              <Select value={formData.metal} onValueChange={(value) => setFormData(prev => ({ ...prev, metal: value }))}>
                <SelectTrigger id="edit-metal">
                  <SelectValue placeholder="Select metal" />
                </SelectTrigger>
                <SelectContent>
                  {metalOptions.map((metal) => (
                    <SelectItem key={metal} value={metal}>{metal}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-price">Price (₹) *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="250000"
                />
              </div>
              <div>
                <Label htmlFor="edit-stock">Stock Quantity *</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            
            {/* Multi-Image Upload */}
            <MultiImageUpload
              images={images}
              onImagesChange={setImages}
              label="Item Images"
              maxImages={4}
            />
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateItem} className="bg-green-600 hover:bg-green-700">
                Update Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Delete
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{itemToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setItemToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Item Details Dialog */}
      <ItemDetailsDialog 
        item={selectedItem}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        onEdit={handleEditItem}
        onOrder={(item) => {
          setShowDetailsDialog(false);
          handleOrderNow(item);
        }}
      />
    </div>
  );
};

export default JewelryCollection;
