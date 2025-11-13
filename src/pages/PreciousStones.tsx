import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Grid, List, ArrowLeft, Plus, Edit, Trash2, Upload, X, ShoppingCart, AlertTriangle, Gem } from "lucide-react";
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

interface StoneItem {
  id: string;
  name: string;
  carat: string;
  clarity: string;
  cut: string;
  price: number;
  stock: number;
  image: string;
}

const PreciousStones = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: searchQuery, updateData: setSearchQuery } = useOfflineStorage<string>("stones_search", "");
  const { data: viewMode, updateData: setViewMode } = useOfflineStorage<'grid' | 'list'>("stones_viewMode", 'grid');
  // Use stones_items key - data will be auto-populated by seedWebData
  // CRITICAL: Use useUserStorage for user-scoped data isolation
  const { data: stones, updateData: setStones } = useUserStorage<StoneItem[]>("stones_items", []);
  const { data: posCart, updateData: setPosCart } = useOfflineStorage<any[]>("pos_cart", []);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<StoneItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<StoneItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    carat: "",
    clarity: "",
    cut: "",
    price: "",
    stock: "",
    image: ""
  });

  // Dropdown options
  const clarityOptions = ['IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2', 'I3'];
  const cutOptions = ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor', 'Round Brilliant', 'Princess', 'Cushion', 'Emerald', 'Oval', 'Pear', 'Marquise'];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Load stones from both stones_items and inventory_items (for items added from Home page)
  const loadStoneItems = useCallback(async () => {
    try {
      const [stonesData, inventoryData] = await Promise.all([
        getUserData<any[]>('stones_items') || [],
        getUserData<any[]>('inventory_items') || [],
      ]);

      const allStoneItems: StoneItem[] = [];
      const processedIds = new Set<string>();

      // Add items from stones_items
      if (stonesData && Array.isArray(stonesData)) {
        stonesData.forEach((item: any) => {
          if (!item || !item.id || processedIds.has(item.id)) return;
          processedIds.add(item.id);
          const stoneItem = {
            id: item.id,
            name: item.name || 'Unknown Stone',
            carat: item.carat || '',
            clarity: item.clarity || '',
            cut: item.cut || '',
            price: item.price || 0,
            stock: item.stock ?? item.inStock ?? 10,
            image: item.image || item.image_url || '',
          };
          allStoneItems.push(stoneItem);
        });
      }

      // Add items from inventory_items that are stone type
      if (inventoryData && Array.isArray(inventoryData)) {
        inventoryData.forEach((item: any) => {
          if (!item || !item.id || processedIds.has(item.id)) return;
          if (item.item_type === 'stone' || item.category === 'stone' || item.type === 'Gemstone') {
            processedIds.add(item.id);
            const stoneItem = {
              id: item.id,
              name: item.name || 'Unknown Stone',
              carat: item.attributes?.carat || item.carat || '',
              clarity: item.attributes?.clarity || item.clarity || '',
              cut: item.attributes?.cut || item.cut || '',
              price: item.price || 0,
              stock: item.stock ?? item.inStock ?? 10,
              image: item.image || item.image_url || '',
            };
            allStoneItems.push(stoneItem);
          }
        });
      }

      // Always update state to ensure latest data is shown
      setStones(allStoneItems);
    } catch (error) {
      console.error('Error loading stone items:', error);
    }
  }, [setStones]);

  // Load stones on mount only
  useEffect(() => {
    loadStoneItems();
  }, []); // Empty dependency array - run only once on mount

  const filteredItems = stones.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItem = async () => {
    try {
      if (!formData.name || !formData.carat || !formData.clarity || !formData.cut || !formData.price || !formData.stock) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields.",
          variant: "destructive"
        });
        return;
      }

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

      const newItem: StoneItem & { user_id?: string } = {
        id: Date.now().toString(),
        name: formData.name,
        carat: formData.carat,
        clarity: formData.clarity,
        cut: formData.cut,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock) || 0,
        image: formData.image || "https://images.unsplash.com/photo-1631832724508-ea8df04ad455?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzNzg4OTl8MHwxfHNlYXJjaHwxfHxwcmVjaW91cy1zdG9uZXN8ZW58MXwwfHx8MTc1Mzc2NjkyMHww&ixlib=rb-4.1.0&q=80&w=1080",
        user_id: userId, // CRITICAL: Include user_id for data isolation
      };

      setStones(prev => [...prev, newItem]);
      enqueueChange('inventory_items', 'upsert', {
        id: newItem.id,
        user_id: userId, // CRITICAL: Include user_id for data isolation
        item_type: 'stone',
        name: newItem.name,
        attributes: { carat: newItem.carat, clarity: newItem.clarity, cut: newItem.cut },
        price: newItem.price,
        inStock: newItem.stock,
        stock: newItem.stock,
        image: newItem.image,
        updated_at: new Date().toISOString(),
      });
      
      // Reload stones to show the new item
      await loadStoneItems();
      
      setFormData({ name: "", carat: "", clarity: "", cut: "", price: "", stock: "", image: "" });
      setShowAddDialog(false);
      toast({
        title: "Item Added",
        description: `${newItem.name} has been added to the collection.`
      });
    } catch (error) {
      console.error('Error adding stone item:', error);
      toast({
        title: "Error",
        description: "Failed to add item. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEditItem = (item: StoneItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      carat: item.carat,
      clarity: item.clarity,
      cut: item.cut,
      price: item.price.toString(),
      stock: item.stock.toString(),
      image: item.image
    });
    setShowEditDialog(true);
  };

  const handleUpdateItem = async () => {
    try {
      if (!selectedItem || !formData.name || !formData.carat || !formData.clarity || !formData.cut || !formData.price || !formData.stock) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields.",
          variant: "destructive"
        });
        return;
      }

      const updatedItem: StoneItem = {
        ...selectedItem,
        name: formData.name,
        carat: formData.carat,
        clarity: formData.clarity,
        cut: formData.cut,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock) || 0,
        image: formData.image
      };

      setStones(prev => prev.map(item => item.id === selectedItem.id ? updatedItem : item));
      enqueueChange('inventory_items', 'upsert', {
        id: updatedItem.id,
        item_type: 'stone',
        name: updatedItem.name,
        attributes: { carat: updatedItem.carat, clarity: updatedItem.clarity, cut: updatedItem.cut },
        price: updatedItem.price,
        inStock: updatedItem.stock,
        stock: updatedItem.stock,
        image: updatedItem.image,
        updated_at: new Date().toISOString(),
      });
      
      // Reload stones to show the updated item
      await loadStoneItems();
      
      setFormData({ name: "", carat: "", clarity: "", cut: "", price: "", stock: "", image: "" });
      setSelectedItem(null);
      setShowEditDialog(false);
      toast({
        title: "Item Updated",
        description: `${updatedItem.name} has been updated.`
      });
    } catch (error) {
      console.error('Error updating stone item:', error);
      toast({
        title: "Error",
        description: "Failed to update item. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteClick = (item: StoneItem) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      const id = itemToDelete.id;
      const item = stones.find(i => i.id === id);
      setStones(prev => prev.filter(item => item.id !== id));
      enqueueChange('inventory_items', 'delete', { id });
      toast({
        title: "Item Removed",
        description: item ? `${item.name} has been removed from the collection.` : "Item has been removed.",
        variant: "destructive"
      });
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    }
  };

  const handleOrderNow = (item: StoneItem) => {
    // Convert StoneItem to cart item format
    const cartItem = {
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      type: 'stone'
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
                <h1 className="text-2xl font-bold text-green-600 mb-2">Precious Stones</h1>
                <p className="text-green-500">Discover our rare and beautiful stones.</p>
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

        {/* Precious Stones */}
        <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
          {filteredItems.map(item => (
            <div 
              key={`${item.id}-${item.image || 'no-image'}-${item.name}`}
              className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-purple-300"
            >
              {/* Premium Image Section - Fixed Height */}
              <div className="relative w-full overflow-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex-shrink-0" style={{ height: '160px', minHeight: '160px', maxHeight: '160px' }}>
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
                        minHeight: '160px',
                        maxHeight: '160px',
                        height: '160px'
                      }}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </>
                ) : (
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 flex items-center justify-center shadow-xl">
                        <Gem className="h-6 w-6 text-white" />
                      </div>
                      <p className="text-xs text-gray-600 font-medium">Precious Stone</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Content Section */}
              <div className="p-4 bg-gradient-to-b from-white to-gray-50/50 flex flex-col min-h-[200px]">
                {/* Product Header */}
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors duration-300 line-clamp-1">
                    {item.name}
                  </h3>
                  <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">
                    Precious Stone
                  </p>
                </div>

                {/* Premium Details Grid - Compact */}
                <div className="grid grid-cols-2 gap-2 mb-3 flex-grow">
                  <div className="col-span-2 py-1 px-2 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 min-h-[32px] flex items-center">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Carat</span>
                      <span className="text-xs font-bold text-gray-900 truncate ml-2">{item.carat}</span>
                    </div>
                  </div>
                  
                  <div className="py-1 px-2 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 min-h-[32px] flex items-center">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Clarity</span>
                      <span className="text-xs font-bold text-gray-900 truncate ml-2">{item.clarity}</span>
                    </div>
                  </div>
                  
                  <div className="py-1 px-2 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 min-h-[32px] flex items-center">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Cut</span>
                      <span className="text-xs font-bold text-gray-900 truncate ml-2">{item.cut}</span>
                    </div>
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
            <DialogTitle>Add New Precious Stone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Natural Diamond"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="carat">Carat *</Label>
                <Input
                  id="carat"
                  value={formData.carat}
                  onChange={(e) => setFormData(prev => ({ ...prev, carat: e.target.value }))}
                  placeholder="e.g., 2.5ct"
                />
              </div>
              <div>
                <Label htmlFor="clarity">Clarity *</Label>
                <Select value={formData.clarity} onValueChange={(value) => setFormData(prev => ({ ...prev, clarity: value }))}>
                  <SelectTrigger id="clarity">
                    <SelectValue placeholder="e.g., VVS1" />
                  </SelectTrigger>
                  <SelectContent>
                    {clarityOptions.map((clarity) => (
                      <SelectItem key={clarity} value={clarity}>{clarity}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="cut">Cut *</Label>
              <Select value={formData.cut} onValueChange={(value) => setFormData(prev => ({ ...prev, cut: value }))}>
                <SelectTrigger id="cut">
                  <SelectValue placeholder="e.g., Round Brilliant" />
                </SelectTrigger>
                <SelectContent>
                  {cutOptions.map((cut) => (
                    <SelectItem key={cut} value={cut}>{cut}</SelectItem>
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
            <DialogTitle>Edit Precious Stone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Natural Diamond"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-carat">Carat *</Label>
                <Input
                  id="edit-carat"
                  value={formData.carat}
                  onChange={(e) => setFormData(prev => ({ ...prev, carat: e.target.value }))}
                  placeholder="e.g., 2.5ct"
                />
              </div>
              <div>
                <Label htmlFor="edit-clarity">Clarity *</Label>
                <Select value={formData.clarity} onValueChange={(value) => setFormData(prev => ({ ...prev, clarity: value }))}>
                  <SelectTrigger id="edit-clarity">
                    <SelectValue placeholder="e.g., VVS1" />
                  </SelectTrigger>
                  <SelectContent>
                    {clarityOptions.map((clarity) => (
                      <SelectItem key={clarity} value={clarity}>{clarity}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-cut">Cut *</Label>
              <Select value={formData.cut} onValueChange={(value) => setFormData(prev => ({ ...prev, cut: value }))}>
                <SelectTrigger id="edit-cut">
                  <SelectValue placeholder="e.g., Round Brilliant" />
                </SelectTrigger>
                <SelectContent>
                  {cutOptions.map((cut) => (
                    <SelectItem key={cut} value={cut}>{cut}</SelectItem>
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

export default PreciousStones;
