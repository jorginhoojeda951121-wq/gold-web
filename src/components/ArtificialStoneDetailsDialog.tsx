import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { ArtificialStoneItem } from "./ArtificialStoneCard";
import { useState, useMemo } from "react";
import { InventoryShare, InventoryItem } from "./InventoryShare";

interface ArtificialStoneDetailsDialogProps {
  item: ArtificialStoneItem | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (item: ArtificialStoneItem) => void;
}

export const ArtificialStoneDetailsDialog = ({ item, open, onClose, onEdit }: ArtificialStoneDetailsDialogProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
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
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Artificial Stone Details
          </DialogTitle>
          <DialogDescription>
            View and manage artificial stone information
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-3">
            {/* Main Image Display */}
            <div className="aspect-square rounded-lg bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 overflow-hidden relative group">
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
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-pink-400 via-rose-400 to-purple-400 flex items-center justify-center shadow-xl">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-xs text-gray-600 font-medium">Artificial Stone</p>
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
                        ? 'border-pink-500 ring-2 ring-pink-200' 
                        : 'border-gray-200 hover:border-pink-300'
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
                  <li className="flex justify-between"><span className="text-muted-foreground">Color:</span><span className="font-medium">{item.color}</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Size:</span><span className="font-medium">{item.size}</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Cutting Type:</span><span className="font-medium">{item.cut}</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Clarity:</span><span className="font-medium">{item.clarity}</span></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Inventory Information</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between"><span className="text-muted-foreground">Quantity:</span><span className="font-medium">{item.stock} units</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Rate:</span><span className="font-medium">₹{item.price.toLocaleString()}</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Total Value:</span><span className="font-medium">₹{(item.price * (item.stock ?? 0)).toLocaleString()}</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        </div>

        <DialogFooter className="flex-shrink-0 mt-6 gap-2">
          <Button variant="outline" onClick={() => setShowShareDialog(true)} className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {onEdit ? (
            <Button onClick={() => onEdit(item)}>Edit Item</Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
      
      {/* Share Dialog */}
      {item && (
        <InventoryShare
          items={[{
            id: item.id,
            name: item.name,
            price: item.price,
            stock: item.stock,
            inStock: item.stock,
            image: item.image,
            image_1: item.image_1,
            image_2: item.image_2,
            image_3: item.image_3,
            image_4: item.image_4,
            color: item.color,
            size: item.size,
            cut: item.cut,
            clarity: item.clarity,
            item_type: 'artificial',
          } as InventoryItem]}
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          shareType="single"
        />
      )}
    </Dialog>
  );
};

export default ArtificialStoneDetailsDialog;

