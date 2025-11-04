import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Upload, X } from "lucide-react";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: Omit<JewelryItem, 'id'>) => void;
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

export const AddItemDialog = ({ open, onOpenChange, onAdd }: AddItemDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData(prev => ({ ...prev, image: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.type || !formData.metal || !formData.price || !formData.inStock) {
      return;
    }

    onAdd({
      name: formData.name,
      type: formData.type,
      gemstone: formData.gemstone || "None",
      carat: formData.carat ? parseFloat(formData.carat) : 0,
      metal: formData.metal,
      price: parseFloat(formData.price),
      inStock: parseInt(formData.inStock),
      isArtificial: formData.isArtificial,
      image: formData.image,
    });

    // Reset form
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add New Jewelry Item</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload Section */}
          <div className="space-y-2">
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
                    onClick={removeImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="w-20 h-20 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground/50" />
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
                  Choose Image
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG, GIF up to 10MB
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                placeholder="e.g., Diamond Solitaire Ring"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData(prev => ({...prev, type: value}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
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
              <Label htmlFor="gemstone">Gemstone</Label>
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
              <Label htmlFor="carat">Carat Weight</Label>
              <Input
                id="carat"
                type="number"
                step="0.1"
                value={formData.carat}
                onChange={(e) => setFormData(prev => ({...prev, carat: e.target.value}))}
                placeholder="e.g., 2.5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metal">Metal *</Label>
            <Select 
              value={formData.metal} 
              onValueChange={(value) => setFormData(prev => ({...prev, metal: value}))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select metal" />
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
              <Label htmlFor="price">Price (₹) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({...prev, price: e.target.value}))}
                placeholder="e.g., 1500.00"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stock">Stock Quantity *</Label>
              <Input
                id="stock"
                type="number"
                value={formData.inStock}
                onChange={(e) => setFormData(prev => ({...prev, inStock: e.target.value}))}
                placeholder="e.g., 5"
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="artificial"
              checked={formData.isArtificial}
              onCheckedChange={(checked) => setFormData(prev => ({...prev, isArtificial: checked}))}
            />
            <Label htmlFor="artificial">Artificial Jewelry</Label>
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
              Add Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};