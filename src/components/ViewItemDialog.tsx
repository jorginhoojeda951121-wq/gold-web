import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JewelryItem } from "./JewelryCard";
import { Gem, Package, DollarSign, Tag, Edit, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { InventoryShare, InventoryItem } from "./InventoryShare";

interface ViewItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (item: JewelryItem) => void;
  item: JewelryItem | null;
}

export const ViewItemDialog = ({ open, onOpenChange, onEdit, item }: ViewItemDialogProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Collect all available images - remove duplicates
  const images = useMemo(() => {
    if (!item) return [];
    const allImages = [item.image_1, item.image_2, item.image_3, item.image_4, item.image]
      .filter((img): img is string => !!img && img.trim() !== '' && img !== 'undefined');
    // Remove duplicates by using Set
    return Array.from(new Set(allImages));
  }, [item?.image, item?.image_1, item?.image_2, item?.image_3, item?.image_4]);

  if (!item) return null;

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (stock < 3) return { label: "Low Stock", variant: "secondary" as const };
    return { label: "In Stock", variant: "default" as const };
  };

  const stockStatus = getStockStatus(item.inStock);

  const handlePrevImage = () => {
    setSelectedImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Gem className="h-5 w-5" />
            Jewelry Item Details
          </DialogTitle>
          <DialogDescription>
            View and manage jewelry item information
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          {/* Main Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Image Section */}
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
                    <p className="text-xs text-gray-600 font-medium">Jewelry Item</p>
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

          {/* Right: Product Info */}
          <div className="md:col-span-2 space-y-2">
                <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-foreground">{item.name}</h2>
              <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                </div>
                
            <div className="text-3xl font-extrabold text-green-600">₹{item.price.toLocaleString()}</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {/* Item Specifications */}
              <div>
                <h3 className="font-semibold mb-2">Item Specifications</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Gem className="h-4 w-4 text-purple-500 mt-0.5" />
                    <div>
                      <span className="text-muted-foreground">Gemstone:</span>
                      <span className="ml-2 font-medium">{item.gemstone}</span>
                    </div>
                  </li>
                  {item.carat > 0 && (
                    <li className="flex items-start gap-2">
                      <Tag className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div>
                        <span className="text-muted-foreground">Carat:</span>
                        <span className="ml-2 font-medium">{item.carat}ct</span>
                  </div>
                    </li>
                )}
                  <li className="flex items-start gap-2">
                    <Gem className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div>
                      <span className="text-muted-foreground">Metal:</span>
                      <span className="ml-2 font-medium">{item.metal}</span>
                  </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <Tag className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <span className="ml-2 font-medium">{item.type}</span>
                </div>
                  </li>
                </ul>
            </div>
            
              {/* Inventory Information */}
              <div>
                <h3 className="font-semibold mb-2">Inventory Information</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Package className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div>
                      <span className="text-muted-foreground">Stock Quantity:</span>
                      <span className="ml-2 font-medium">{item.inStock} units</span>
                  </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                      <span className="text-muted-foreground">Unit Price:</span>
                      <span className="ml-2 font-medium">₹{item.price.toLocaleString()}</span>
                  </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <Tag className="h-4 w-4 text-purple-500 mt-0.5" />
                  <div>
                      <span className="text-muted-foreground">Total Value:</span>
                      <span className="ml-2 font-medium">₹{(item.price * item.inStock).toLocaleString()}</span>
                  </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 flex justify-end gap-3 mt-4">
          <Button
            variant="outline"
            onClick={() => setShowShareDialog(true)}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
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
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Item
          </Button>
        </div>
      </DialogContent>
      
      {/* Share Dialog */}
      {item && (
        <InventoryShare
          items={[{
            id: item.id,
            name: item.name,
            price: item.price,
            stock: item.inStock,
            inStock: item.inStock,
            image: item.image,
            image_1: item.image_1,
            image_2: item.image_2,
            image_3: item.image_3,
            image_4: item.image_4,
            type: item.type,
            metal: item.metal,
            gemstone: item.gemstone,
            carat: item.carat,
            item_type: 'jewelry',
          } as InventoryItem]}
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          shareType="single"
        />
      )}
    </Dialog>
  );
};
