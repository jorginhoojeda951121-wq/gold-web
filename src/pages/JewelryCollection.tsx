import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Grid, List, ArrowLeft, Plus, Edit, Trash2, Upload, X, ShoppingCart, AlertTriangle, Gem } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { enqueueChange } from "@/lib/sync";
import { idbGet, idbSet } from "@/lib/indexedDb";

interface JewelryItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

const JewelryCollection = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: searchQuery, updateData: setSearchQuery } = useOfflineStorage<string>("jewelry_search", "");
  const { data: viewMode, updateData: setViewMode } = useOfflineStorage<'grid' | 'list'>("jewelry_viewMode", 'grid');
  const [jewelryItems, setJewelryItems] = useState<JewelryItem[]>([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const { data: posCart, updateData: setPosCart } = useOfflineStorage<any[]>("pos_cart", []);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<JewelryItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<JewelryItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    image: ""
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Load all inventory from all sources (jewelry, gold, stones, and inventory_items from sync)
  // Filter to only show jewelry items (not gold bars or gemstones)
  const loadAllInventory = useCallback(async () => {
    try {
      console.log('🔄 Loading jewelry inventory from IndexedDB...');
      
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

      const allItems: JewelryItem[] = [];
      const processedIds = new Set<string>();

      // Transform jewelry_items (only jewelry, not gold/stones)
      if (jewelryData && Array.isArray(jewelryData)) {
        jewelryData.forEach((item: any) => {
          if (!item || !item.id || processedIds.has(item.id)) return;
          processedIds.add(item.id);

          // Check if it's a full JewelryItem format or legacy format
          if (item.type && item.type !== 'Gold Bar' && item.type !== 'Gemstone') {
            // Full format with all fields
            allItems.push({
              id: item.id,
              name: item.name || 'Unknown Item',
              description: item.description || item.gemstone || item.type || 'Elegant jewelry piece',
              price: item.price || 0,
              image: item.image || '',
            });
          } else if (!item.type || item.type === 'Ring' || item.type === 'Necklace' || item.type === 'Earrings' || item.type === 'Bracelet') {
            // Legacy format or simple jewelry format
            allItems.push({
              id: item.id,
              name: item.name || 'Unknown Item',
              description: item.description || 'Elegant jewelry piece',
              price: item.price || 0,
              image: item.image || '',
            });
          }
        });
      }

      // Transform inventory_items from sync (only jewelry type, not gold/stones)
      if (inventoryData && Array.isArray(inventoryData)) {
        inventoryData.forEach((item: any) => {
          if (!item || !item.id) return;
          
          // Only include jewelry items, skip gold and stones
          if (item.item_type === 'jewelry' || (!item.item_type && item.type && item.type !== 'Gold Bar' && item.type !== 'Gemstone')) {
            const existingIndex = allItems.findIndex(i => i.id === item.id);
            const transformedItem: JewelryItem = {
              id: item.id,
              name: item.name || 'Unknown Item',
              description: item.attributes?.description || item.description || item.type || item.gemstone || 'Elegant jewelry piece',
              price: item.price || 0,
              image: item.image || '',
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

      console.log('✅ Jewelry inventory loaded successfully:', {
        totalJewelryItems: allItems.length,
      });

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
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItem = async () => {
    if (!formData.name || !formData.description || !formData.price) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      const newItem: JewelryItem = {
        id: Date.now().toString(),
        ...formData,
        price: parseFloat(formData.price) || 0,
        image: formData.image || "https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzNzg4OTl8MHwxfHNlYXJjaHwxfHxqZXdlbHJ5fGVufDF8MHx8fDE3NTM3NTkzMjh8MA&ixlib=rb-4.1.0&q=80&w=1080"
      };

      // Save to IndexedDB
      const jewelryData = (await idbGet<any[]>('jewelry_items')) || [];
      jewelryData.push(newItem);
      await idbSet('jewelry_items', jewelryData);
      
      // Also save to inventory_items for sync
      const inventoryItems = (await idbGet<any[]>('inventory_items')) || [];
      inventoryItems.push({
        id: newItem.id,
        item_type: 'jewelry',
        name: newItem.name,
        type: 'Ring', // Default type
        attributes: { description: newItem.description },
        price: newItem.price,
        image: newItem.image,
        updated_at: new Date().toISOString(),
      });
      await idbSet('inventory_items', inventoryItems);
      
      // Queue for sync
      enqueueChange('inventory_items', 'upsert', {
        id: newItem.id,
        item_type: 'jewelry',
        name: newItem.name,
        type: 'Ring',
        attributes: { description: newItem.description },
        price: newItem.price,
        image: newItem.image,
        updated_at: new Date().toISOString(),
      });
      
      // Reload inventory
      await loadAllInventory();
      
      setFormData({ name: "", description: "", price: "", image: "" });
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

  const handleEditItem = (item: JewelryItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      image: item.image
    });
    setShowEditDialog(true);
  };

  const handleUpdateItem = async () => {
    if (!selectedItem || !formData.name || !formData.description || !formData.price) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      const updatedItem: JewelryItem = {
        ...selectedItem,
        ...formData,
        price: parseFloat(formData.price) || 0
      };

      // Save to IndexedDB
      const jewelryData = (await idbGet<any[]>('jewelry_items')) || [];
      const jewelryIndex = jewelryData.findIndex((item: any) => item.id === updatedItem.id);
      if (jewelryIndex >= 0) {
        jewelryData[jewelryIndex] = updatedItem;
      } else {
        jewelryData.push(updatedItem);
      }
      await idbSet('jewelry_items', jewelryData);
      
      // Also update inventory_items for sync
      const inventoryItems = (await idbGet<any[]>('inventory_items')) || [];
      const inventoryIndex = inventoryItems.findIndex((item: any) => item.id === updatedItem.id);
      const inventoryUpdate = {
        id: updatedItem.id,
        item_type: 'jewelry',
        name: updatedItem.name,
        type: 'Ring',
        attributes: { description: updatedItem.description },
        price: updatedItem.price,
        image: updatedItem.image,
        updated_at: new Date().toISOString(),
      };
      if (inventoryIndex >= 0) {
        inventoryItems[inventoryIndex] = inventoryUpdate;
      } else {
        inventoryItems.push(inventoryUpdate);
      }
      await idbSet('inventory_items', inventoryItems);
      
      // Queue for sync
      enqueueChange('inventory_items', 'upsert', inventoryUpdate);
      
      // Reload inventory
      await loadAllInventory();
      
      setFormData({ name: "", description: "", price: "", image: "" });
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

  const handleDeleteClick = (item: JewelryItem) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      try {
        const id = itemToDelete.id;
        const item = jewelryItems.find(i => i.id === id);
        
        // Remove from IndexedDB
        const jewelryData = (await idbGet<any[]>('jewelry_items')) || [];
        await idbSet('jewelry_items', jewelryData.filter((item: any) => item.id !== id));
        
        const inventoryItems = (await idbGet<any[]>('inventory_items')) || [];
        await idbSet('inventory_items', inventoryItems.filter((item: any) => item.id !== id));
        
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

  const handleOrderNow = (item: JewelryItem) => {
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image must be less than 10MB",
          variant: "destructive"
        });
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive"
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData(prev => ({ ...prev, image: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (isEdit: boolean = false) => {
    setFormData(prev => ({ ...prev, image: "" }));
    if (isEdit && editFileInputRef.current) {
      editFileInputRef.current.value = "";
    } else if (!isEdit && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
            <div 
              key={`${item.id}-${item.image || 'no-image'}-${item.name}`}
              className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-purple-300"
            >
              {/* Premium Image Section - Fixed Height */}
              <div className="relative w-full overflow-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex-shrink-0" style={{ height: '256px', minHeight: '256px', maxHeight: '256px' }}>
                {item.image && item.image.trim() !== '' ? (
                  <>
                    <img 
                      key={`img-${item.id}-${item.image ? item.image.substring(0, 50) : 'no-image'}`}
                      src={item.image || ''}
                      alt={item.name}
                      className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
                      style={{ 
                        objectFit: 'cover', 
                        objectPosition: 'center',
                        minHeight: '256px',
                        maxHeight: '256px',
                        height: '256px'
                      }}
                      loading="lazy"
                      onError={(e) => {
                        // Hide broken image and show placeholder
                        const img = e.currentTarget;
                        img.style.display = 'none';
                        const parent = img.parentElement;
                        if (parent) {
                          const placeholder = parent.querySelector('.image-placeholder');
                          if (!placeholder) {
                            const placeholderDiv = document.createElement('div');
                            placeholderDiv.className = 'image-placeholder absolute inset-0 w-full h-full flex items-center justify-center';
                            placeholderDiv.innerHTML = `
                              <div class="text-center">
                                <div class="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 flex items-center justify-center shadow-xl">
                                  <svg class="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <p class="text-xs text-gray-600 font-medium">Premium Jewelry</p>
                              </div>
                            `;
                            parent.appendChild(placeholderDiv);
                          }
                        }
                      }}
                      onLoad={(e) => {
                        // Remove placeholder when image loads successfully
                        const img = e.currentTarget;
                        const parent = img.parentElement;
                        if (parent) {
                          const placeholder = parent.querySelector('.image-placeholder');
                          if (placeholder) {
                            placeholder.remove();
                          }
                        }
                      }}
                    />
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </>
                ) : (
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 flex items-center justify-center shadow-xl">
                        <Gem className="h-10 w-10 text-white" />
                      </div>
                      <p className="text-xs text-gray-600 font-medium">Premium Jewelry</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Content Section */}
              <div className="p-6 bg-gradient-to-b from-white to-gray-50/50 flex flex-col min-h-[280px]">
                {/* Product Header */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors duration-300">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                    {item.description || 'Elegant jewelry piece'}
                  </p>
                </div>

                {/* Spacer to push price/buttons to bottom */}
                <div className="flex-grow"></div>

                {/* Price Section */}
                <div className="mb-5 pb-5 border-b border-gray-200">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Price</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      ₹{item.price.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 mt-auto">
                  {/* Primary Action - Order Now */}
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOrderNow(item);
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Order Now
                  </Button>

                  {/* Secondary Actions */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditItem(item);
                      }}
                      size="sm"
                      variant="outline"
                      className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 font-medium rounded-lg transition-all duration-200"
                    >
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(item);
                      }}
                      size="sm"
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-medium rounded-lg transition-all duration-200"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
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
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Diamond Earrings"
              />
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Beautiful diamond stud earrings"
              />
            </div>
            <div>
              <Label htmlFor="price">Price (₹) *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="e.g., 250000"
              />
            </div>
            <div>
              <Label>Item Image</Label>
              <div className="flex items-center gap-4">
                {formData.image ? (
                  <div className="relative">
                    <img 
                      src={formData.image} 
                      alt="Preview" 
                      className="w-20 h-20 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                      onClick={() => removeImage(false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <Upload className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {formData.image ? "Change Image" : "Choose Image"}
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    JPG, PNG, GIF up to 10MB
                  </p>
                </div>
              </div>
            </div>
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
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Diamond Earrings"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description *</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Beautiful diamond stud earrings"
              />
            </div>
            <div>
              <Label htmlFor="edit-price">Price (₹) *</Label>
              <Input
                id="edit-price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="e.g., 250000"
              />
            </div>
            <div>
              <Label>Item Image</Label>
              <div className="flex items-center gap-4">
                {formData.image ? (
                  <div className="relative">
                    <img 
                      src={formData.image} 
                      alt="Preview" 
                      className="w-20 h-20 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                      onClick={() => removeImage(true)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <Upload className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <div>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => editFileInputRef.current?.click()}
                  >
                    {formData.image ? "Change Image" : "Choose Image"}
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    JPG, PNG, GIF up to 10MB
                  </p>
                </div>
              </div>
            </div>
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
    </div>
  );
};

export default JewelryCollection;