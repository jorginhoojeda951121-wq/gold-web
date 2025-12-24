import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Grid, List, ArrowLeft, Plus, Edit, Trash2, Upload, X, ShoppingCart, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { upsertToSupabase, deleteFromSupabase, getFromSupabase } from "@/lib/supabaseDirect";
import { MultiImageUpload } from "@/components/MultiImageUpload";
import { GoldItemCard, GoldItem } from "@/components/GoldItemCard";
import { GoldItemDetailsDialog } from "@/components/GoldItemDetailsDialog";

const GoldCollection = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: searchQuery, updateData: setSearchQuery } = useOfflineStorage<string>("gold_search", "");
  const { data: viewMode, updateData: setViewMode } = useOfflineStorage<'grid' | 'list'>("gold_viewMode", 'grid');
  // Use local state instead of useUserStorage since data is transformed and read-only
  // The transformed data contains UI-specific fields (image, image_1, etc.) that don't exist in Supabase schema
  const [goldItems, setGoldItems] = useState<GoldItem[]>([]);
  const { data: posCart, updateData: setPosCart } = useOfflineStorage<any[]>("pos_cart", []);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
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
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null]);

  // Dropdown options
  const purityOptions = ['Gold 24K', 'Gold 22K', 'Gold 18K', 'Gold 14K', 'Gold 10K'];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Load gold items from Supabase
  const loadGoldItems = useCallback(async () => {
    try {
      const { getFromSupabase } = await import('@/lib/supabaseDirect');
      const inventoryData = await getFromSupabase<any[]>('inventory', {});

      // Filter only gold items
      const goldItems = inventoryData
        .filter((item: any) => {
          // Check category
          return item.category === 'gold';
        })
        .map((item: any) => {
          // Clean and validate image URL
          let imageUrl = item.image_url || '';
          if (imageUrl && (imageUrl.length < 10 || imageUrl === '[' || imageUrl === '{')) {
            imageUrl = '';
          }

          // Extract purity from description
          let purity = 'Gold 18K';
          if (item.description) {
            if (item.description.includes('Gold 24K')) purity = 'Gold 24K';
            else if (item.description.includes('Gold 22K')) purity = 'Gold 22K';
            else if (item.description.includes('Gold 18K')) purity = 'Gold 18K';
            else if (item.description.includes('Gold 14K')) purity = 'Gold 14K';
            else if (item.description.includes('Gold 10K')) purity = 'Gold 10K';
          }

          return {
            id: item.id,
            name: item.name || 'Unknown Gold',
            weight: item.weight ? item.weight.toString() : '',
            purity: purity,
            price: item.price || 0,
            stock: item.stock ?? 0,
            image: imageUrl,
            image_1: imageUrl,
            image_2: '',
            image_3: '',
            image_4: '',
          };
        });

      setGoldItems(goldItems);
    } catch (error) {
      console.error('Error loading gold items from Supabase:', error);
    }
  }, [setGoldItems]);

  // Load gold items on mount
  useEffect(() => {
    loadGoldItems();
  }, [loadGoldItems]);

  // Listen for sync completion events to reload data after sync
  useEffect(() => {
    const handleDataSynced = () => {
      // Reload items after sync to show newly synced data
      loadGoldItems();
    };

    // Removed data-synced listener - no longer using sync queue
  }, [loadGoldItems]);

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

      const newItem: GoldItem & { user_id?: string; image_1?: string; image_2?: string; image_3?: string; image_4?: string } = {
        id: Date.now().toString(),
        name: formData.name,
        weight: formData.weight,
        purity: formData.purity,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock) || 10,
        image: images[0] || "https://images.unsplash.com/photo-1545873509-33e944ca7655?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzNzg4OTl8MHwxfHNlYXJjaHwxfHxnb2xkfGVufDF8MHx8fDE3NTM3NjY5MjB8MA&ixlib=rb-4.1.0&q=80&w=1080",
        image_1: images[0] || undefined,
        image_2: images[1] || undefined,
        image_3: images[2] || undefined,
        image_4: images[3] || undefined,
        user_id: userId, // CRITICAL: Include user_id for data isolation
      };

      // Prepare data for Supabase inventory table
      const newInventoryItem = {
        id: newItem.id,
        name: newItem.name,
        category: 'gold',
        subcategory: 'Gold Bar',
        price: newItem.price,
        stock: newItem.stock,
        weight: newItem.weight ? parseFloat(newItem.weight.toString()) : null,
        description: `Gold Bar - ${newItem.purity}`,
        image_url: newItem.image_1 || newItem.image || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Save to Supabase only
      await upsertToSupabase('inventory', newInventoryItem);

      // Reload gold items to show the new item
      await loadGoldItems();

      // Reset form with default values
      setFormData({ name: "", weight: "", purity: "Gold 18K", price: "", stock: "", image: "" });
      setImages([null, null, null, null]);
      setShowAddDialog(false);
      toast({
        title: "Item Added",
        description: `${newItem.name} has been added to the collection.`
      });
    } catch (error: any) {
      console.error('Error adding gold item:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to add item. Please check the console for details and try again.",
        variant: "destructive"
      });
    }
  };

  const handleViewItem = (item: GoldItem) => {
    setSelectedItem(item);
    setShowDetailsDialog(true);
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

      const updatedItem: GoldItem & { image_1?: string; image_2?: string; image_3?: string; image_4?: string } = {
        ...selectedItem,
        name: formData.name,
        weight: formData.weight,
        purity: formData.purity,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock) || 10,
        image: images[0] || selectedItem.image || "", // Use images array
        image_1: images[0] || selectedItem.image_1,
        image_2: images[1] || selectedItem.image_2,
        image_3: images[2] || selectedItem.image_3,
        image_4: images[3] || selectedItem.image_4,
      };


      // Update local state immediately for instant UI update
      setGoldItems(prev => prev.map(item =>
        item.id === selectedItem.id ? updatedItem : item
      ));

      // Prepare data for Supabase inventory table
      const updatedInventoryItem = {
        id: selectedItem.id,
        name: updatedItem.name,
        category: 'gold',
        subcategory: 'Gold Bar',
        price: updatedItem.price,
        stock: updatedItem.stock,
        weight: updatedItem.weight ? parseFloat(updatedItem.weight.toString()) : null,
        description: `Gold Bar - ${updatedItem.purity}`,
        image_url: updatedItem.image_1 || updatedItem.image || null,
        updated_at: new Date().toISOString(),
      };

      // Update Supabase only
      await upsertToSupabase('inventory', updatedInventoryItem);

      // Reload gold items to ensure data consistency
      await loadGoldItems();

      setFormData({ name: "", weight: "", purity: "", price: "", stock: "", image: "" });
      setImages([null, null, null, null]);
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

        // Delete from Supabase
        await deleteFromSupabase('inventory', id);

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



  return (
    <div className="min-h-screen bg-gray-50">
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
            <GoldItemCard
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
        <DialogContent className="sm:max-w-[500px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Add New Gold Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pr-2">
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
        <DialogContent className="sm:max-w-[500px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Gold Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pr-2">
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
      <GoldItemDetailsDialog
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

export default GoldCollection;

