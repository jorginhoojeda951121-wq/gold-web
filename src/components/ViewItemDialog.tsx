import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { JewelryItem } from "./JewelryCard";
import { Gem, Package, DollarSign, Tag, Star, Edit } from "lucide-react";

interface ViewItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (item: JewelryItem) => void;
  item: JewelryItem | null;
}

export const ViewItemDialog = ({ open, onOpenChange, onEdit, item }: ViewItemDialogProps) => {
  if (!item) return null;

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: "Out of Stock", variant: "destructive" as const, color: "text-red-600" };
    if (stock < 3) return { label: "Low Stock", variant: "secondary" as const, color: "text-amber-600" };
    return { label: "In Stock", variant: "default" as const, color: "text-green-600" };
  };

  const stockStatus = getStockStatus(item.inStock);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Gem className="h-5 w-5" />
            Jewelry Item Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Image Section */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              {item.image ? (
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-full md:w-48 h-48 object-cover rounded-lg border shadow-elegant"
                />
              ) : (
                <div className="w-full md:w-48 h-48 bg-gradient-gold rounded-lg border flex items-center justify-center">
                  <Gem className="h-16 w-16 text-primary/50" />
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">{item.name}</h2>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-sm">
                    {item.type}
                  </Badge>
                  {item.isArtificial && (
                    <Badge className="bg-accent text-accent-foreground">
                      Artificial
                    </Badge>
                  )}
                  <Badge variant={stockStatus.variant}>
                    {stockStatus.label}
                  </Badge>
                </div>
              </div>
              
              <div className="text-3xl font-bold text-foreground">
                ₹{item.price.toLocaleString()}
              </div>
            </div>
          </div>

          <Separator />

          {/* Details Section */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground mb-3">Item Specifications</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm text-muted-foreground">Gemstone:</span>
                    <span className="ml-2 font-medium text-foreground">{item.gemstone}</span>
                  </div>
                </div>
                
                {item.carat > 0 && (
                  <div className="flex items-center gap-3">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm text-muted-foreground">Carat Weight:</span>
                      <span className="ml-2 font-medium text-foreground">{item.carat}ct</span>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <Gem className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm text-muted-foreground">Metal:</span>
                    <span className="ml-2 font-medium text-foreground">{item.metal}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground mb-3">Inventory Information</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm text-muted-foreground">Stock Quantity:</span>
                    <span className={`ml-2 font-medium ${stockStatus.color}`}>
                      {item.inStock} units
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm text-muted-foreground">Unit Price:</span>
                    <span className="ml-2 font-medium text-foreground">₹{item.price.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm text-muted-foreground">Total Value:</span>
                    <span className="ml-2 font-medium text-foreground">
                      ₹{(item.price * item.inStock).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                onEdit(item);
                onOpenChange(false);
              }}
              className="bg-gradient-gold hover:bg-gold-dark text-primary transition-smooth"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Item
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};