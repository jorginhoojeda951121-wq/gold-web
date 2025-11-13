import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Grid, List, ArrowLeft, Plus, Edit, Trash2, Upload, X, ShoppingCart, AlertTriangle } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { useUserStorage } from "@/hooks/useUserStorage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { enqueueChange } from "@/lib/sync";
import { getUserData } from "@/lib/userStorage";

interface GoldItem {
  id: string;
  name: string;
  weight: string;
  purity: string;
  price: number;
  stock: number;
  image: string;
}

const GoldCollection = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: searchQuery, updateData: setSearchQuery } = useOfflineStorage<string>("gold_search", "");
  const { data: viewMode, updateData: setViewMode } = useOfflineStorage<'grid' | 'list'>("gold_viewMode", 'grid');
  // Use gold_items key - data will be auto-populated by seedWebData
  // CRITICAL: Use useUserStorage for user-scoped data isolation
  const { data: goldItems, updateData: setGoldItems } = useUserStorage<GoldItem[]>("gold_items", []);
  const { data: posCart, updateData: setPosCart } = useOfflineStorage<any[]>("pos_cart", []);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<GoldItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<GoldItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    weight: "",
    purity: "Gold 18K",
    price: "",
    stock: "",
    image: ""
  });

  // Dropdown options
  const purityOptions = ['Gold 24K', 'Gold 22K', 'Gold 18K', 'Gold 14K', 'Gold 10K'];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Load gold items from both gold_items and inventory_items (for items added from Home page)
  const loadGoldItems = useCallback(async () => {
    try {
      const [goldData, inventoryData] = await Promise.all([
        getUserData<any[]>('gold_items') || [],
        getUserData<any[]>('inventory_items') || [],
      ]);

      const allGoldItems: GoldItem[] = [];
      const processedIds = new Set<string>();

      // Add items from gold_items
      if (goldData && Array.isArray(goldData)) {
        goldData.forEach((item: any) => {
          if (!item || !item.id || processedIds.has(item.id)) return;
          processedIds.add(item.id);
          // Clean and validate image URL
          let imageUrl = item.image || item.image_url || '';
          
          // Fix corrupted image data (single characters, invalid strings)
          if (imageUrl && (imageUrl.length < 10 || imageUrl === '[' || imageUrl === '{')) {
            console.warn(`⚠️ Corrupted image data detected for ${item.name}, clearing...`);
            imageUrl = '';
          }
          
          const goldItem = {
            id: item.id,
            name: item.name || 'Unknown Gold',
            weight: item.weight || '',
            purity: item.purity || item.metal || 'Gold 18K',
            price: item.price || item.totalPrice || 0,
            stock: item.stock ?? item.inStock ?? 10,
            image: imageUrl,
          };
          allGoldItems.push(goldItem);
        });
      }

      // Add items from inventory_items that are gold type
      if (inventoryData && Array.isArray(inventoryData)) {
        inventoryData.forEach((item: any) => {
          if (!item || !item.id || processedIds.has(item.id)) return;
          if (item.item_type === 'gold' || item.category === 'gold' || item.type === 'Gold Bar') {
            processedIds.add(item.id);
            
            // Clean and validate image URL
            let imageUrl = item.image || item.image_url || '';
            
            // Fix corrupted image data (single characters, invalid strings)
            if (imageUrl && (imageUrl.length < 10 || imageUrl === '[' || imageUrl === '{')) {
              console.warn(`⚠️ Corrupted image data detected for ${item.name}, clearing...`);
              imageUrl = '';
            }
            
            const goldItem = {
              id: item.id,
              name: item.name || 'Unknown Gold',
              weight: item.attributes?.weight || item.weight || '',
              purity: item.attributes?.purity || item.purity || item.metal || 'Gold 18K',
              price: item.price || 0,
              stock: item.inStock ?? item.stock ?? 10,
              image: imageUrl,
            };
            allGoldItems.push(goldItem);
          }
        });
      }

      // Always update state to ensure latest data is shown
      setGoldItems(allGoldItems);
    } catch (error) {
      console.error('Error loading gold items:', error);
    }
  }, [setGoldItems]);

  // Load gold items on mount only
  useEffect(() => {
    loadGoldItems();
  }, []); // Empty dependency array - run only once on mount

  const filteredItems = goldItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItem = async () => {
    if (!formData.name || !formData.weight || !formData.purity || !formData.price || !formData.stock) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get current user ID
      const { getCurrentUserId, getUserData, setUserData } = await import('@/lib/userStorage');
      const userId = await getCurrentUserId();
      
      if (!userId) {
        toast({
          title: "Error",
          description: "User not logged in. Please log in again.",
          variant: "destructive"
        });
        return;
      }

      const newItem: GoldItem & { user_id?: string } = {
        id: Date.now().toString(),
        name: formData.name,
        weight: formData.weight,
        purity: formData.purity,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock) || 10,
        image: formData.image || "https://images.unsplash.com/photo-1545873509-33e944ca7655?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzNzg4OTl8MHwxfHNlYXJjaHwxfHxnb2xkfGVufDF8MHx8fDE3NTM3NjY5MjB8MA&ixlib=rb-4.1.0&q=80&w=1080",
        user_id: userId, // CRITICAL: Include user_id for data isolation
      };

      // Save to gold_items with user_id
      const goldData = (await getUserData<any[]>('gold_items')) || [];
      goldData.push(newItem);
      await setUserData('gold_items', goldData);
      
      // Also save to inventory_items for sync
      const inventoryItems = (await getUserData<any[]>('inventory_items')) || [];
      inventoryItems.push({
        id: newItem.id,
        user_id: userId, // CRITICAL: Include user_id for data isolation
        item_type: 'gold',
        category: 'gold',
        name: newItem.name,
        attributes: { weight: newItem.weight, purity: newItem.purity },
        price: newItem.price,
        inStock: newItem.stock,
        stock: newItem.stock,
        image: newItem.image,
        updated_at: new Date().toISOString(),
      });
      await setUserData('inventory_items', inventoryItems);
      
      // Queue for sync
      enqueueChange('inventory_items', 'upsert', {
        id: newItem.id,
        user_id: userId, // CRITICAL: Include user_id for data isolation
        item_type: 'gold',
        name: newItem.name,
        attributes: { weight: newItem.weight, purity: newItem.purity },
        price: newItem.price,
        inStock: newItem.stock,
        stock: newItem.stock,
        image: newItem.image,
        updated_at: new Date().toISOString(),
      });
      
      // Reload gold items to show the new item
      await loadGoldItems();
      
      setFormData({ name: "", weight: "", purity: "", price: "", stock: "", image: "" });
      setShowAddDialog(false);
      toast({
        title: "Item Added",
        description: `${newItem.name} has been added to the collection.`
      });
    } catch (error) {
      console.error('Error adding gold item:', error);
      toast({
        title: "Error",
        description: "Failed to add item. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEditItem = (item: GoldItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      weight: item.weight,
      purity: item.purity,
      price: item.price.toString(),
      stock: item.stock.toString(),
      image: item.image || '' // Ensure image is set
    });
    setShowEditDialog(true);
  };

  const handleUpdateItem = async () => {
    if (!selectedItem || !formData.name || !formData.weight || !formData.purity || !formData.price || !formData.stock) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get current user ID
      const { getCurrentUserId, getUserData, setUserData } = await import('@/lib/userStorage');
      const userId = await getCurrentUserId();
      
      if (!userId) {
        toast({
          title: "Error",
          description: "User not logged in. Please log in again.",
          variant: "destructive"
        });
        return;
      }

      const updatedItem: GoldItem = {
        ...selectedItem,
        name: formData.name,
        weight: formData.weight,
        purity: formData.purity,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock) || 10,
        image: formData.image || selectedItem.image // Ensure image is preserved
      };


      // Update local state immediately for instant UI update
      setGoldItems(prev => prev.map(item => 
        item.id === selectedItem.id ? updatedItem : item
      ));

      // Update gold_items
      const goldData = (await getUserData<any[]>('gold_items')) || [];
      const goldIndex = goldData.findIndex((item: any) => item.id === selectedItem.id);
      if (goldIndex >= 0) {
        goldData[goldIndex] = { ...updatedItem, user_id: userId };
        await setUserData('gold_items', goldData);
      }
      
      // Update inventory_items
      const inventoryItems = (await getUserData<any[]>('inventory_items')) || [];
      const invIndex = inventoryItems.findIndex((item: any) => item.id === selectedItem.id);
      if (invIndex >= 0) {
        inventoryItems[invIndex] = {
          ...inventoryItems[invIndex],
          user_id: userId,
          item_type: 'gold',
          category: 'gold',
          name: updatedItem.name,
          attributes: { weight: updatedItem.weight, purity: updatedItem.purity },
          price: updatedItem.price,
          inStock: updatedItem.stock,
          stock: updatedItem.stock,
          image: updatedItem.image,
          image_url: updatedItem.image, // Also save as image_url for compatibility
          updated_at: new Date().toISOString(),
        };
        await setUserData('inventory_items', inventoryItems);
      }
      
      // Queue for sync
      enqueueChange('inventory_items', 'upsert', {
        id: updatedItem.id,
        user_id: userId,
        item_type: 'gold',
        name: updatedItem.name,
        attributes: { weight: updatedItem.weight, purity: updatedItem.purity },
        price: updatedItem.price,
        inStock: updatedItem.stock,
        stock: updatedItem.stock,
        image: updatedItem.image,
        image_url: updatedItem.image, // Also sync image_url for compatibility
        updated_at: new Date().toISOString(),
      });
      
      // Reload gold items to ensure data consistency
      await loadGoldItems();
      
      setFormData({ name: "", weight: "", purity: "", price: "", stock: "", image: "" });
      setSelectedItem(null);
      setShowEditDialog(false);
      toast({
        title: "Item Updated",
        description: `${updatedItem.name} has been updated.`
      });
    } catch (error) {
      console.error('Error updating gold item:', error);
      toast({
        title: "Error",
        description: "Failed to update item. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteClick = (item: GoldItem) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      try {
        const id = itemToDelete.id;
        const item = goldItems.find(i => i.id === id);
        
        // Get current user ID
        const { getCurrentUserId, getUserData, setUserData } = await import('@/lib/userStorage');
        const userId = await getCurrentUserId();
        
        if (!userId) {
          toast({
            title: "Error",
            description: "User not logged in. Please log in again.",
            variant: "destructive"
          });
          return;
        }
        
        // Remove from gold_items
        const goldData = (await getUserData<any[]>('gold_items')) || [];
        const updatedGold = goldData.filter((item: any) => item.id !== id);
        await setUserData('gold_items', updatedGold);
        
        // Remove from inventory_items
        const inventoryItems = (await getUserData<any[]>('inventory_items')) || [];
        const updatedInventory = inventoryItems.filter((item: any) => item.id !== id);
        await setUserData('inventory_items', updatedInventory);
        
        // Queue for sync
        enqueueChange('inventory_items', 'delete', { id });
        
        // Reload gold items to reflect the deletion
        await loadGoldItems();
        
        toast({
          title: "Item Removed",
          description: item ? `${item.name} has been removed from the collection.` : "Item has been removed.",
          variant: "destructive"
        });
        setShowDeleteConfirm(false);
        setItemToDelete(null);
      } catch (error) {
        console.error('Error deleting gold item:', error);
        toast({
          title: "Error",
          description: "Failed to delete item. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleOrderNow = (item: GoldItem) => {
    // Convert GoldItem to cart item format
    const cartItem = {
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      type: 'gold'
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
                <h1 className="text-2xl font-bold text-green-600 mb-2">Gold Collection</h1>
                <p className="text-green-500">Explore our exquisite gold items.</p>
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

        {/* Gold Items */}
        <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
          {filteredItems.map(item => (
            <div 
              key={`${item.id}-${item.image || 'no-image'}-${item.name}`}
              className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-amber-300"
            >
              {/* Image Section with Gradient Overlay */}
              <div className="relative h-40 overflow-hidden bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50">
                {item.image && item.image.trim() !== '' && item.image !== 'undefined' ? (
                  <>
                    <img 
                      key={`gold-img-${item.id}-${Date.now()}`}
                      src={item.image}
                      alt={item.name}
                      className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110 z-10"
                      style={{ 
                        objectFit: 'cover', 
                        objectPosition: 'center',
                        minHeight: '160px',
                        maxHeight: '160px',
                        height: '160px'
                      }}
                      loading="lazy"
                      onError={(e) => {
                        // Hide image if it fails to load, placeholder will show
                        e.currentTarget.style.display = 'none';
                      }}
                      onLoad={(e) => {
                        e.currentTarget.style.display = 'block';
                      }}
                    />
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20"></div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg">
                        <span className="text-2xl">✨</span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium">Premium Gold</p>
                    </div>
                  </div>
                )}
                
                {/* Gold Purity Badge */}
                <div className="absolute top-2 left-2 z-30">
                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg backdrop-blur-sm border border-white/30">
                    {item.purity}
                  </span>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-4 bg-gradient-to-b from-white to-gray-50/50 flex flex-col min-h-[200px]">
                {/* Product Name */}
                <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-amber-600 transition-colors duration-300 line-clamp-1">
                  {item.name}
                </h3>

                {/* Details Section */}
                <div className="space-y-2 mb-3 flex-grow">
                  <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-gray-50 border border-gray-100 min-h-[32px]">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Weight</span>
                    <span className="text-xs font-semibold text-gray-800 truncate ml-2">{item.weight || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 min-h-[32px]">
                    <span className="text-xs font-medium text-yellow-700 uppercase tracking-wide">Purity</span>
                    <span className="text-xs font-bold text-yellow-800 truncate ml-2">{item.purity}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 min-h-[32px]">
                    <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Stock</span>
                    <span className="text-xs font-bold text-blue-800 truncate ml-2">{item.stock} units</span>
                  </div>
                </div>

                {/* Price Section */}
                <div className="mb-3 pb-3 border-b border-gray-200">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Price</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
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
                    size="sm"
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 shadow-md hover:shadow-lg transition-all duration-300 rounded-lg text-xs"
                  >
                    <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
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
                      className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 font-medium rounded-lg transition-all duration-200 text-xs"
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
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-medium rounded-lg transition-all duration-200 text-xs"
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
            <DialogTitle>Add New Gold Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., 24K Gold Chain"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weight">Weight *</Label>
                <Input
                  id="weight"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                  placeholder="30"
                />
              </div>
              <div>
                <Label htmlFor="purity">Purity *</Label>
                <Select value={formData.purity} onValueChange={(value) => setFormData(prev => ({ ...prev, purity: value }))}>
                  <SelectTrigger id="purity">
                    <SelectValue placeholder="Select purity" />
                  </SelectTrigger>
                  <SelectContent>
                    {purityOptions.map((purity) => (
                      <SelectItem key={purity} value={purity}>{purity}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="price">Price (₹) *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="e.g., 350000"
              />
            </div>
            <div>
              <Label htmlFor="stock">Stock (units) *</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                placeholder="e.g., 10"
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
            <DialogTitle>Edit Gold Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., 24K Gold Chain"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-weight">Weight *</Label>
                <Input
                  id="edit-weight"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                  placeholder="30"
                />
              </div>
              <div>
                <Label htmlFor="edit-purity">Purity *</Label>
                <Select value={formData.purity} onValueChange={(value) => setFormData(prev => ({ ...prev, purity: value }))}>
                  <SelectTrigger id="edit-purity">
                    <SelectValue placeholder="Select purity" />
                  </SelectTrigger>
                  <SelectContent>
                    {purityOptions.map((purity) => (
                      <SelectItem key={purity} value={purity}>{purity}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-price">Price (₹) *</Label>
              <Input
                id="edit-price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="e.g., 350000"
              />
            </div>
            <div>
              <Label htmlFor="edit-stock">Stock (units) *</Label>
              <Input
                id="edit-stock"
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                placeholder="e.g., 10"
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

export default GoldCollection;
