import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { JewelryItem } from "./JewelryCard";
import { MultiImageUpload } from "./MultiImageUpload";

interface EditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (item: JewelryItem) => void;
  item: JewelryItem | null;
}

const jewelryTypes = [
  "Ring", "Necklace", "Earrings", "Bracelet", "Brooch", "Pendant", "Chain", "Anklet"
];

const gemstones = [
  "Diamond", "Emerald", "Sapphire", "Ruby", "Pearl", "Amethyst", "Topaz", "Garnet", "Opal", "Turquoise", "Crystal", "None"
];

const metals = [
  "Gold 24K", "Gold 18K", "Gold 14K", "Gold 10K", "White Gold", "Rose Gold", "Platinum", "Silver", "Stainless Steel", "Brass", "Copper"
];

export const EditItemDialog = ({ open, onOpenChange, onSave, item }: EditItemDialogProps) => {
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null]);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    gemstone: "",
    carat: "",
    metal: "",
    price: "",
    inStock: "",
    isArtificial: false,
    image: "",
  });

  useEffect(() => {
    if (item && open) {
      // Initialize form with item data, with proper defaults
      setFormData({
        name: item.name || "",
        type: item.type || jewelryTypes[0] || "Ring", // Default to first available type
        gemstone: item.gemstone || "None",
        carat: (item.carat !== undefined && item.carat !== null) ? item.carat.toString() : "",
        metal: item.metal || metals[0] || "Gold 18K", // Default to first available metal
        price: item.price !== undefined ? item.price.toString() : "",
        inStock: (item.inStock !== undefined && item.inStock !== null) ? item.inStock.toString() : "",
        isArtificial: item.isArtificial || false,
        image: item.image || "",
      });
      // Load existing images into the images state
      setImages([
        item.image_1 || item.image || null,
        item.image_2 || null,
        item.image_3 || null,
        item.image_4 || null,
      ]);
    } else if (!open && !item) {
      // Only reset form when dialog closes AND there's no item
      setFormData({
        name: "",
        type: "",
        gemstone: "",
        carat: "",
        metal: "",
        price: "",
        inStock: "",
        isArtificial: false,
        image: "",
      });
      setImages([null, null, null, null]);
    }
  }, [item, open]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!item) {
      console.error("No item to save");
      return;
    }
    
    // Validate required fields
    if (!formData.name.trim()) {
      console.error("Item name is required");
      return;
    }
    
    if (!formData.type) {
      console.error("Item type is required");
      return;
    }
    
    if (!formData.metal) {
      console.error("Metal is required");
      return;
    }
    
    if (!formData.price || formData.price.trim() === "") {
      console.error("Price is required");
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      console.error("Invalid price");
      return;
    }
    
    const stock = formData.inStock ? parseInt(formData.inStock) : 0;
    if (isNaN(stock) || stock < 0) {
      console.error("Invalid stock quantity");
      return;
    }

    const carat = formData.carat && formData.carat.trim() ? parseFloat(formData.carat) : 0;

    const updatedItem: JewelryItem = {
      ...item,
      name: formData.name.trim(),
      type: formData.type,
      gemstone: formData.gemstone || "None",
      carat: carat,
      metal: formData.metal,
      price: price,
      inStock: stock,
      isArtificial: formData.isArtificial,
      image: images[0] || formData.image || "",
      image_1: images[0] || "",
      image_2: images[1] || "",
      image_3: images[2] || "",
      image_4: images[3] || "",
    };
    
    onSave(updatedItem);
    onOpenChange(false);
  };

  // Don't render dialog if no item, but don't return null before Dialog to avoid white screen
  // Instead, control the open state via the Dialog's open prop
  if (!item && open) {
    // If dialog is trying to open without an item, close it gracefully
    return null;
  }

  return (
    <Dialog open={open && !!item} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Jewelry Item</DialogTitle>
          <DialogDescription>
            Update item details, pricing, and images
          </DialogDescription>
        </DialogHeader>
        
        {!item ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>No item selected for editing.</p>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Multi-Image Upload Section */}
          <MultiImageUpload
            images={images}
            onImagesChange={setImages}
            label="Item Images"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Item Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                placeholder="e.g., Diamond Solitaire Ring"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-type">Type *</Label>
              <Select 
                value={formData.type || ""} 
                onValueChange={(value) => setFormData(prev => ({...prev, type: value}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type">
                    {formData.type || "Select type"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {jewelryTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-gemstone">Gemstone</Label>
              <Select 
                value={formData.gemstone} 
                onValueChange={(value) => setFormData(prev => ({...prev, gemstone: value}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gemstone" />
                </SelectTrigger>
                <SelectContent>
                  {gemstones.map(stone => (
                    <SelectItem key={stone} value={stone}>{stone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-carat">Carat Weight</Label>
              <Input
                id="edit-carat"
                type="number"
                step="0.1"
                value={formData.carat}
                onChange={(e) => setFormData(prev => ({...prev, carat: e.target.value}))}
                placeholder="e.g., 2.5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-metal">Metal *</Label>
            <Select 
              value={formData.metal || ""} 
              onValueChange={(value) => setFormData(prev => ({...prev, metal: value}))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select metal">
                  {formData.metal || "Select metal"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {metals.map(metal => (
                  <SelectItem key={metal} value={metal}>{metal}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-price">Price (₹) *</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({...prev, price: e.target.value}))}
                placeholder="e.g., 1500.00"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-stock">Stock Quantity *</Label>
              <Input
                id="edit-stock"
                type="number"
                min="0"
                value={formData.inStock}
                onChange={(e) => setFormData(prev => ({...prev, inStock: e.target.value}))}
                placeholder="e.g., 5"
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="edit-artificial"
              checked={formData.isArtificial}
              onCheckedChange={(checked) => setFormData(prev => ({...prev, isArtificial: checked}))}
            />
            <Label htmlFor="edit-artificial">Artificial Jewelry</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-gold hover:bg-gold-dark text-primary transition-smooth"
            >
              Save Changes
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
