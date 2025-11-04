import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gem } from "lucide-react";
import { JewelryItem } from "./JewelryCard";

interface ItemDetailsDialogProps {
  item: JewelryItem | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (item: JewelryItem) => void;
}

export const ItemDetailsDialog = ({ item, open, onClose, onEdit }: ItemDetailsDialogProps) => {
  if (!item) return null;

  const stockStatus = item.inStock === 0 ? { label: "Out of Stock", variant: "destructive" as const } : (item.inStock < 3 ? { label: "Low Stock", variant: "secondary" as const } : { label: "In Stock", variant: "default" as const });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Jewelry Item Details
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="aspect-square rounded-md bg-gradient-gold overflow-hidden relative">
              {item.image ? (
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                  <Gem className="h-16 w-16 text-primary/50" />
                </div>
              )}
            </div>
          </div>
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-foreground">{item.name}</h2>
              <Badge>{item.type}</Badge>
              <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
            </div>
            <div className="text-3xl font-extrabold">₹{item.price.toLocaleString()}</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <h3 className="font-semibold mb-2">Item Specifications</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between"><span className="text-muted-foreground">Gemstone:</span><span className="font-medium">{item.gemstone}</span></li>
                  {item.carat > 0 && (
                    <li className="flex justify-between"><span className="text-muted-foreground">Carat Weight:</span><span className="font-medium">{item.carat}ct</span></li>
                  )}
                  <li className="flex justify-between"><span className="text-muted-foreground">Metal:</span><span className="font-medium">{item.metal}</span></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Inventory Information</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between"><span className="text-muted-foreground">Stock Quantity:</span><span className="font-medium">{item.inStock} units</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Unit Price:</span><span className="font-medium">₹{item.price.toLocaleString()}</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Total Value:</span><span className="font-medium">₹{(item.price * (item.inStock ?? 0)).toLocaleString()}</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {onEdit ? (
            <Button onClick={() => onEdit(item)}>Edit Item</Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ItemDetailsDialog;


