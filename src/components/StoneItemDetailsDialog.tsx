import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gem, ChevronLeft, ChevronRight } from "lucide-react";
import { StoneItem } from "./StoneItemCard";
import { useState, useMemo } from "react";

interface StoneItemDetailsDialogProps {
  item: StoneItem | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (item: StoneItem) => void;
}

export const StoneItemDetailsDialog = ({ item, open, onClose, onEdit }: StoneItemDetailsDialogProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  // Collect all available images - must be called before any conditional returns
  const images = useMemo(() => {
    if (!item) return [];
    const allImages = [item.image_1, item.image_2, item.image_3, item.image_4, item.image]
      .filter((img): img is string => !!img && img.trim() !== '' && img !== 'undefined');
    // Remove duplicates by using Set
    return Array.from(new Set(allImages));
  }, [item?.image, item?.image_1, item?.image_2, item?.image_3, item?.image_4]);

  const stockStatus = item?.stock === 0 ? { label: "Out of Stock", variant: "destructive" as const } : ((item?.stock ?? 0) < 3 ? { label: "Low Stock", variant: "secondary" as const } : { label: "In Stock", variant: "default" as const });
  
  if (!item) return null;
  
  const handlePrevImage = () => {
    setSelectedImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };
  
  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gem className="h-5 w-5" />
            Precious Stone Details
          </DialogTitle>
          <DialogDescription>
            View and manage precious stone information
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-3">
            {/* Main Image Display */}
            <div className="aspect-square rounded-lg bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 overflow-hidden relative group">
              {images.length > 0 ? (
                <>
                  <img 
                    src={images[selectedImageIndex]} 
                    alt={`${item.name} - Image ${selectedImageIndex + 1}`} 
                    className="w-full h-full object-cover transition-all duration-500 ease-in-out animate-in fade-in"
                    key={`main-${selectedImageIndex}`}
                  />
                  
                  {/* Navigation Arrows - Only show if multiple images */}
                  {images.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        onClick={handlePrevImage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        onClick={handleNextImage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      
                      {/* Image Counter */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                        {selectedImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 flex items-center justify-center shadow-xl">
                      <Gem className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-xs text-gray-600 font-medium">Precious Stone</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Thumbnail Gallery - Only show if multiple images */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`aspect-square rounded-md overflow-hidden border-2 transition-all ${
                      idx === selectedImageIndex 
                        ? 'border-purple-500 ring-2 ring-purple-200' 
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <img 
                      src={img} 
                      alt={`Thumbnail ${idx + 1}`} 
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-foreground">{item.name}</h2>
              <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
            </div>
            <div className="text-3xl font-extrabold text-green-600">₹{item.price.toLocaleString()}</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <h3 className="font-semibold mb-2">Stone Specifications</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between"><span className="text-muted-foreground">Carat:</span><span className="font-medium">{item.carat}</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Clarity:</span><span className="font-medium">{item.clarity}</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Cut:</span><span className="font-medium">{item.cut}</span></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Inventory Information</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between"><span className="text-muted-foreground">Stock Quantity:</span><span className="font-medium">{item.stock} units</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Unit Price:</span><span className="font-medium">₹{item.price.toLocaleString()}</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Total Value:</span><span className="font-medium">₹{(item.price * (item.stock ?? 0)).toLocaleString()}</span></li>
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

export default StoneItemDetailsDialog;

