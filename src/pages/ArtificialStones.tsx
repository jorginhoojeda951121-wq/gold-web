import { useState, useEffect, useCallback } from "react";
import { Search, Grid, List, ArrowLeft, Plus, Edit, Trash2, ShoppingCart, Sparkles } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { useUserStorage } from "@/hooks/useUserStorage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComboboxInput } from "@/components/ui/combobox";
import { useToast } from "@/hooks/use-toast";
import { enqueueChange } from "@/lib/sync";
import { getUserData, setUserData } from "@/lib/userStorage";
import { MultiImageUpload } from "@/components/MultiImageUpload";
import { ArtificialStoneCard, ArtificialStoneItem } from "@/components/ArtificialStoneCard";
import { ArtificialStoneDetailsDialog } from "@/components/ArtificialStoneDetailsDialog";

const ArtificialStones = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: searchQuery, updateData: setSearchQuery } = useOfflineStorage<string>("artificial_stones_search", "");
  const { data: viewMode, updateData: setViewMode } = useOfflineStorage<'grid' | 'list'>("artificial_stones_viewMode", 'grid');
  const { data: artificialStones, updateData: setArtificialStones } = useUserStorage<ArtificialStoneItem[]>("artificial_stones_items", []);
  const { data: posCart, updateData: setPosCart } = useOfflineStorage<any[]>("pos_cart", []);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ArtificialStoneItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<ArtificialStoneItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "",
    size: "",
    cut: "",
    clarity: "",
    price: "",
    stock: ""
  });
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null]);

  // Dropdown options
  const colorOptions = ['Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple', 'White', 'Black', 'Orange', 'Clear', 'Multi-color'];
  const sizeOptions = ['1mm', '2mm', '3mm', '4mm', '5mm', '6mm', '8mm', '10mm', '12mm', '15mm', '20mm', 'Custom'];
  const cutOptions = ['Round Brilliant', 'Princess', 'Cushion', 'Emerald', 'Oval', 'Pear', 'Marquise', 'Heart', 'Radiant', 'Asscher', 'Trillion', 'Baguette'];
  const clarityOptions = ['IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2', 'I3', 'AAA', 'AA', 'A', 'B', 'C'];

  // Load artificial stones from unified inventory_items table (Single Source of Truth)
  const loadArtificialStones = useCallback(async () => {
    try {
      const inventoryData = await getUserData<any[]>('inventory_items') || [];

      // Filter only artificial stone items
      const artificialStoneItems = inventoryData
        .filter((item: any) => {
          // Check item_type first, then category
          const itemType = item.item_type || 
            (item.category === 'artificial' ? 'artificial' :
             item.category === 'stones' ? 'stone' :
             item.category === 'stone' ? 'stone' :
             item.category === 'gold' ? 'gold' : 'jewelry');
          return itemType === 'artificial';
        })
        .map((item: any) => ({
          id: item.id,
          name: item.name || 'Unknown Stone',
          color: item.attributes?.color || item.color || '',
          size: item.attributes?.size || item.size || '',
          cut: item.attributes?.cut || item.cut || '',
          clarity: item.attributes?.clarity || item.clarity || '',
          price: item.price || 0,
          stock: item.stock ?? item.inStock ?? item.in_stock ?? 0,
          image: item.image || item.image_1 || item.image_url || '',
          image_1: item.image_1 || item.image || item.image_url || '',
          image_2: item.image_2 || '',
          image_3: item.image_3 || '',
          image_4: item.image_4 || '',
        }));

      setArtificialStones(artificialStoneItems);
    } catch (error) {
      console.error('Error loading artificial stones:', error);
    }
  }, [setArtificialStones]);

  // Load artificial stones on mount
  useEffect(() => {
    loadArtificialStones();
  }, [loadArtificialStones]);

  // Listen for sync completion events to reload data after sync
  useEffect(() => {
    const handleDataSynced = () => {
      // Reload items after sync to show newly synced data
      loadArtificialStones();
    };

    window.addEventListener('data-synced', handleDataSynced);
    
    return () => {
      window.removeEventListener('data-synced', handleDataSynced);
    };
  }, [loadArtificialStones]);

  const filteredItems = artificialStones.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.color.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItem = async () => {
    try {
      if (!formData.name || !formData.color || !formData.size || !formData.cut || !formData.clarity || !formData.price || !formData.stock) {
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

      const newItem: ArtificialStoneItem & { user_id?: string } = {
        id: Date.now().toString(),
        name: formData.name,
        color: formData.color,
        size: formData.size,
        cut: formData.cut,
        clarity: formData.clarity,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock) || 0,
        image: images[0] || "",
        image_1: images[0] || undefined,
        image_2: images[1] || undefined,
        image_3: images[2] || undefined,
        image_4: images[3] || undefined,
        user_id: userId,
      };

      // Save to unified inventory_items table (Single Source of Truth)
      const inventoryItems = (await getUserData<any[]>('inventory_items')) || [];
      const newInventoryItem = {
        id: newItem.id,
        user_id: userId,
        item_type: 'artificial',
        category: 'artificial',
        name: newItem.name,
        type: 'Artificial Stone',
        attributes: { 
          color: newItem.color, 
          size: newItem.size, 
          cut: newItem.cut, 
          clarity: newItem.clarity 
        },
        color: newItem.color,
        size: newItem.size,
        cut: newItem.cut,
        clarity: newItem.clarity,
        price: newItem.price,
        inStock: newItem.stock,
        stock: newItem.stock,
        image: newItem.image || newItem.image_1 || '',
        image_1: newItem.image_1 || newItem.image || '',
        image_2: newItem.image_2 || '',
        image_3: newItem.image_3 || '',
        image_4: newItem.image_4 || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      inventoryItems.push(newInventoryItem);
      await setUserData('inventory_items', inventoryItems);
      
      // Queue for sync
      enqueueChange('inventory_items', 'upsert', newInventoryItem);
      
      // Update UI state
      setArtificialStones(prev => [...prev, newItem]);
      
      // Reload to show the new item
      await loadArtificialStones();
      
      setFormData({ name: "", color: "", size: "", cut: "", clarity: "", price: "", stock: "" });
      setImages([null, null, null, null]);
      setShowAddDialog(false);
      toast({
        title: "Item Added",
        description: `${newItem.name} has been added to the collection.`
      });
    } catch (error) {
      console.error('Error adding artificial stone item:', error);
      toast({
        title: "Error",
        description: "Failed to add item. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleViewItem = (item: ArtificialStoneItem) => {
    setSelectedItem(item);
    setShowDetailsDialog(true);
  };

  const handleEditItem = (item: ArtificialStoneItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      color: item.color,
      size: item.size,
      cut: item.cut,
      clarity: item.clarity,
      price: item.price.toString(),
      stock: item.stock.toString(),
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
      if (!selectedItem || !formData.name || !formData.color || !formData.size || !formData.cut || !formData.clarity || !formData.price || !formData.stock) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields.",
          variant: "destructive"
        });
        return;
      }

      const updatedItem: ArtificialStoneItem & { image_1?: string; image_2?: string; image_3?: string; image_4?: string } = {
        ...selectedItem,
        name: formData.name,
        color: formData.color,
        size: formData.size,
        cut: formData.cut,
        clarity: formData.clarity,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock) || 0,
        image: images[0] || selectedItem.image || "",
        image_1: images[0] || selectedItem.image_1,
        image_2: images[1] || selectedItem.image_2,
        image_3: images[2] || selectedItem.image_3,
        image_4: images[3] || selectedItem.image_4,
      };

      // Update unified inventory_items table (Single Source of Truth)
      const inventoryItems = (await getUserData<any[]>('inventory_items')) || [];
      const invIndex = inventoryItems.findIndex((item: any) => item.id === selectedItem.id);
      
      const inventoryUpdate = {
        id: updatedItem.id,
        item_type: 'artificial',
        category: 'artificial',
        name: updatedItem.name,
        type: 'Artificial Stone',
        attributes: { 
          color: updatedItem.color, 
          size: updatedItem.size, 
          cut: updatedItem.cut, 
          clarity: updatedItem.clarity 
        },
        color: updatedItem.color,
        size: updatedItem.size,
        cut: updatedItem.cut,
        clarity: updatedItem.clarity,
        price: updatedItem.price,
        inStock: updatedItem.stock,
        stock: updatedItem.stock,
        image: updatedItem.image || updatedItem.image_1 || '',
        image_1: updatedItem.image_1 || updatedItem.image || '',
        image_2: updatedItem.image_2 || '',
        image_3: updatedItem.image_3 || '',
        image_4: updatedItem.image_4 || '',
        updated_at: new Date().toISOString(),
        created_at: inventoryItems[invIndex]?.created_at || new Date().toISOString(),
        user_id: inventoryItems[invIndex]?.user_id,
      };
      
      if (invIndex >= 0) {
        inventoryItems[invIndex] = inventoryUpdate;
      } else {
        inventoryItems.push(inventoryUpdate);
      }
      await setUserData('inventory_items', inventoryItems);
      
      // Queue for sync
      enqueueChange('inventory_items', 'upsert', inventoryUpdate);
      
      // Update UI state
      setArtificialStones(prev => prev.map(item => item.id === selectedItem.id ? updatedItem : item));
      
      // Reload to show the updated item
      await loadArtificialStones();
      
      setFormData({ name: "", color: "", size: "", cut: "", clarity: "", price: "", stock: "" });
      setImages([null, null, null, null]);
      setSelectedItem(null);
      setShowEditDialog(false);
      toast({
        title: "Item Updated",
        description: `${updatedItem.name} has been updated.`
      });
    } catch (error) {
      console.error('Error updating artificial stone item:', error);
      toast({
        title: "Error",
        description: "Failed to update item. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteClick = (item: ArtificialStoneItem) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      try {
        const id = itemToDelete.id;
        const item = artificialStones.find(i => i.id === id);
        
        // Remove from unified inventory_items table (Single Source of Truth)
        const inventoryItems = (await getUserData<any[]>('inventory_items')) || [];
        await setUserData('inventory_items', inventoryItems.filter((item: any) => item.id !== id));
        
        // Queue for sync
        enqueueChange('inventory_items', 'delete', { id });
        
        // Update UI state
        setArtificialStones(prev => prev.filter(item => item.id !== id));
        
        // Reload to ensure consistency
        await loadArtificialStones();
        
        toast({
          title: "Item Removed",
          description: item ? `${item.name} has been removed from the collection.` : "Item has been removed.",
          variant: "destructive"
        });
        setShowDeleteConfirm(false);
        setItemToDelete(null);
      } catch (error) {
        console.error('Error deleting artificial stone item:', error);
        toast({
          title: "Error",
          description: "Failed to delete item. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleOrderNow = (item: ArtificialStoneItem) => {
    // Convert ArtificialStoneItem to cart item format
    const cartItem = {
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      type: 'artificial'
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
                <h1 className="text-2xl font-bold text-pink-600 mb-2">Artificial Stones</h1>
                <p className="text-pink-500">Manage synthetic and artificial stones inventory.</p>
              </div>
              <Button 
                onClick={() => setShowAddDialog(true)}
                className="bg-pink-600 hover:bg-pink-700 text-white"
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
                placeholder="Search by name or color..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-gray-300 focus:border-pink-500 focus:ring-pink-500"
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

        {/* Artificial Stones Grid */}
        <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
          {filteredItems.map(item => (
            <ArtificialStoneCard
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
            <Sparkles className="h-16 w-16 mx-auto text-pink-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No artificial stones found</h3>
            <p className="text-gray-600">Try adjusting your search criteria or add a new item</p>
          </div>
        )}
      </main>

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Artificial Stone</DialogTitle>
            <DialogDescription>
              Add a new artificial stone to your inventory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Synthetic Ruby"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="color">Color *</Label>
                <ComboboxInput
                  id="color"
                  options={colorOptions}
                  value={formData.color}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
                  placeholder="Select or type color"
                />
              </div>
              <div>
                <Label htmlFor="size">Size *</Label>
                <ComboboxInput
                  id="size"
                  options={sizeOptions}
                  value={formData.size}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, size: value }))}
                  placeholder="Select or type size"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cut">Cutting Type *</Label>
                <ComboboxInput
                  id="cut"
                  options={cutOptions}
                  value={formData.cut}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, cut: value }))}
                  placeholder="Select or type cut"
                />
              </div>
              <div>
                <Label htmlFor="clarity">Clarity *</Label>
                <ComboboxInput
                  id="clarity"
                  options={clarityOptions}
                  value={formData.clarity}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, clarity: value }))}
                  placeholder="Select or type clarity"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Rate (Price) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="e.g., 5000"
                />
              </div>
              <div>
                <Label htmlFor="stock">Quantity *</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                  placeholder="e.g., 100"
                />
              </div>
            </div>

            <MultiImageUpload
              images={images}
              onImagesChange={setImages}
              maxImages={4}
              label="Product Images"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddItem}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Artificial Stone</DialogTitle>
            <DialogDescription>
              Update artificial stone information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Synthetic Ruby"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-color">Color *</Label>
                <ComboboxInput
                  id="edit-color"
                  options={colorOptions}
                  value={formData.color}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
                  placeholder="Select or type color"
                />
              </div>
              <div>
                <Label htmlFor="edit-size">Size *</Label>
                <ComboboxInput
                  id="edit-size"
                  options={sizeOptions}
                  value={formData.size}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, size: value }))}
                  placeholder="Select or type size"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-cut">Cutting Type *</Label>
                <ComboboxInput
                  id="edit-cut"
                  options={cutOptions}
                  value={formData.cut}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, cut: value }))}
                  placeholder="Select or type cut"
                />
              </div>
              <div>
                <Label htmlFor="edit-clarity">Clarity *</Label>
                <ComboboxInput
                  id="edit-clarity"
                  options={clarityOptions}
                  value={formData.clarity}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, clarity: value }))}
                  placeholder="Select or type clarity"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-price">Rate (Price) *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="e.g., 5000"
                />
              </div>
              <div>
                <Label htmlFor="edit-stock">Quantity *</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                  placeholder="e.g., 100"
                />
              </div>
            </div>

            <MultiImageUpload
              images={images}
              onImagesChange={setImages}
              maxImages={4}
              label="Product Images"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateItem}>Update Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <ArtificialStoneDetailsDialog
        item={selectedItem}
        open={showDetailsDialog}
        onClose={() => {
          setShowDetailsDialog(false);
          setSelectedItem(null);
        }}
        onEdit={handleEditItem}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArtificialStones;

