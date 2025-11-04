import { useState, useRef } from "react";
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

interface StoneItem {
  id: string;
  name: string;
  carat: string;
  clarity: string;
  cut: string;
  price: number;
  image: string;
}

const PreciousStones = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: searchQuery, updateData: setSearchQuery } = useOfflineStorage<string>("stones_search", "");
  const { data: viewMode, updateData: setViewMode } = useOfflineStorage<'grid' | 'list'>("stones_viewMode", 'grid');
  // Use stones_items key - data will be auto-populated by seedWebData
  const { data: stones, updateData: setStones } = useOfflineStorage<StoneItem[]>("stones_items", []);
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
    image: ""
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = stones.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItem = () => {
    if (!formData.name || !formData.carat || !formData.clarity || !formData.cut || !formData.price) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const newItem: StoneItem = {
      id: Date.now().toString(),
      ...formData,
      price: parseFloat(formData.price) || 0,
      image: formData.image || "https://images.unsplash.com/photo-1631832724508-ea8df04ad455?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzNzg4OTl8MHwxfHNlYXJjaHwxfHxwcmVjaW91cy1zdG9uZXN8ZW58MXwwfHx8MTc1Mzc2NjkyMHww&ixlib=rb-4.1.0&q=80&w=1080"
    };

    setStones(prev => [...prev, newItem]);
    enqueueChange('inventory_items', 'upsert', {
      id: newItem.id,
      item_type: 'stone',
      name: newItem.name,
      attributes: { carat: newItem.carat, clarity: newItem.clarity, cut: newItem.cut },
      price: newItem.price,
      image: newItem.image,
      updated_at: new Date().toISOString(),
    });
    setFormData({ name: "", carat: "", clarity: "", cut: "", price: "", image: "" });
    setShowAddDialog(false);
    toast({
      title: "Item Added",
      description: `${newItem.name} has been added to the collection.`
    });
  };

  const handleEditItem = (item: StoneItem) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      carat: item.carat,
      clarity: item.clarity,
      cut: item.cut,
      price: item.price.toString(),
      image: item.image
    });
    setShowEditDialog(true);
  };

  const handleUpdateItem = () => {
    if (!selectedItem || !formData.name || !formData.carat || !formData.clarity || !formData.cut || !formData.price) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const updatedItem: StoneItem = {
      ...selectedItem,
      ...formData,
      price: parseFloat(formData.price) || 0
    };

    setStones(prev => prev.map(item => item.id === selectedItem.id ? updatedItem : item));
    enqueueChange('inventory_items', 'upsert', {
      id: updatedItem.id,
      item_type: 'stone',
      name: updatedItem.name,
      attributes: { carat: updatedItem.carat, clarity: updatedItem.clarity, cut: updatedItem.cut },
      price: updatedItem.price,
      image: updatedItem.image,
      updated_at: new Date().toISOString(),
    });
    setFormData({ name: "", carat: "", clarity: "", cut: "", price: "", image: "" });
    setSelectedItem(null);
    setShowEditDialog(false);
    toast({
      title: "Item Updated",
      description: `${updatedItem.name} has been updated.`
    });
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
                        e.currentTarget.style.display = 'none';
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
                      <p className="text-xs text-gray-600 font-medium">Precious Stone</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Content Section */}
              <div className="p-6 bg-gradient-to-b from-white to-gray-50/50 flex flex-col min-h-[280px]">
                {/* Product Header */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-1.5 group-hover:text-purple-600 transition-colors duration-300">
                    {item.name}
                  </h3>
                  <p className="text-sm font-medium text-purple-600 uppercase tracking-wide">
                    Precious Stone
                  </p>
                </div>

                {/* Premium Details Grid */}
                <div className="grid grid-cols-2 gap-2.5 mb-5 flex-grow">
                  <div className="col-span-2 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 min-h-[48px] flex items-center">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Carat</span>
                      <span className="text-sm font-bold text-gray-900">{item.carat}</span>
                    </div>
                  </div>
                  
                  <div className="py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 min-h-[72px] flex flex-col justify-center">
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Clarity</span>
                    <span className="text-sm font-bold text-gray-900">{item.clarity}</span>
                  </div>
                  
                  <div className="py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 min-h-[72px] flex flex-col justify-center">
                    <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Cut</span>
                    <span className="text-sm font-bold text-gray-900">{item.cut}</span>
                  </div>
                </div>

                {/* Price Section */}
                <div className="mb-5 pb-5 border-b border-gray-200">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-gray-500">Price</span>
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
                <Input
                  id="clarity"
                  value={formData.clarity}
                  onChange={(e) => setFormData(prev => ({ ...prev, clarity: e.target.value }))}
                  placeholder="e.g., VVS1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="cut">Cut *</Label>
              <Input
                id="cut"
                value={formData.cut}
                onChange={(e) => setFormData(prev => ({ ...prev, cut: e.target.value }))}
                placeholder="e.g., Round Brilliant"
              />
            </div>
            <div>
              <Label htmlFor="price">Price (₹) *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="e.g., 850000"
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
                <Input
                  id="edit-clarity"
                  value={formData.clarity}
                  onChange={(e) => setFormData(prev => ({ ...prev, clarity: e.target.value }))}
                  placeholder="e.g., VVS1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-cut">Cut *</Label>
              <Input
                id="edit-cut"
                value={formData.cut}
                onChange={(e) => setFormData(prev => ({ ...prev, cut: e.target.value }))}
                placeholder="e.g., Round Brilliant"
              />
            </div>
            <div>
              <Label htmlFor="edit-price">Price (₹) *</Label>
              <Input
                id="edit-price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="e.g., 850000"
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

export default PreciousStones;