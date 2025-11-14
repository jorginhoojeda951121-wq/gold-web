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
import { MultiImageUpload } from "@/components/MultiImageUpload";
import { StoneItemCard, StoneItem } from "@/components/StoneItemCard";
import { StoneItemDetailsDialog } from "@/components/StoneItemDetailsDialog";

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
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<StoneItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<StoneItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    carat: "",
    clarity: "",
    cut: "",
    price: "",
    stock: ""
  });
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null]);

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
            image_1: item.image_1 || item.image || item.image_url || '',
            image_2: item.image_2 || '',
            image_3: item.image_3 || '',
            image_4: item.image_4 || '',
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
              image_1: item.image_1 || item.image || item.image_url || '',
              image_2: item.image_2 || '',
              image_3: item.image_3 || '',
              image_4: item.image_4 || '',
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
        image: images[0] || "https://images.unsplash.com/photo-1631832724508-ea8df04ad455?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzNzg4OTl8MHwxfHNlYXJjaHwxfHxwcmVjaW91cy1zdG9uZXN8ZW58MXwwfHx8MTc1Mzc2NjkyMHww&ixlib=rb-4.1.0&q=80&w=1080",
        image_1: images[0] || undefined,
        image_2: images[1] || undefined,
        image_3: images[2] || undefined,
        image_4: images[3] || undefined,
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
        image_1: newItem.image_1,
        image_2: newItem.image_2,
        image_3: newItem.image_3,
        image_4: newItem.image_4,
        updated_at: new Date().toISOString(),
      });
      
      // Reload stones to show the new item
      await loadStoneItems();
      
      setFormData({ name: "", carat: "", clarity: "", cut: "", price: "", stock: "" });
      setImages([null, null, null, null]);
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

  const handleViewItem = (item: StoneItem) => {
    setSelectedItem(item);
    setShowDetailsDialog(true);
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
    // Load existing images into the images state
    setImages([
      item.image_1 || item.image || null,
      item.image_2 || null,
      item.image_3 || null,
      item.image_4 || null,
    ]);
    setShowDetailsDialog(false); // Close details if open
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

      const updatedItem: StoneItem & { image_1?: string; image_2?: string; image_3?: string; image_4?: string } = {
        ...selectedItem,
        name: formData.name,
        carat: formData.carat,
        clarity: formData.clarity,
        cut: formData.cut,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock) || 0,
        image: images[0] || selectedItem.image || "", // Use images array
        image_1: images[0] || selectedItem.image_1,
        image_2: images[1] || selectedItem.image_2,
        image_3: images[2] || selectedItem.image_3,
        image_4: images[3] || selectedItem.image_4,
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
        image_1: updatedItem.image_1,
        image_2: updatedItem.image_2,
        image_3: updatedItem.image_3,
        image_4: updatedItem.image_4,
        updated_at: new Date().toISOString(),
      });
      
      // Reload stones to show the updated item
      await loadStoneItems();
      
      setFormData({ name: "", carat: "", clarity: "", cut: "", price: "", stock: "" });
      setImages([null, null, null, null]);
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
            <StoneItemCard
              key={`${item.id}-${item.image || 'no-image'}-${item.name}`}
              item={item}
              onView={handleViewItem}
              onEdit={handleEditItem}
              onDelete={handleDeleteClick}
              onOrder={handleOrderNow}
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
            <MultiImageUpload 
              images={images}
              onImagesChange={setImages}
              maxImages={4}
              label="Item Images"
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

      {/* View Details Dialog */}
      <StoneItemDetailsDialog
        item={selectedItem}
        open={showDetailsDialog}
        onClose={() => {
          setShowDetailsDialog(false);
          setSelectedItem(null);
        }}
        onEdit={(item) => {
          handleEditItem(item);
        }}
      />

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
