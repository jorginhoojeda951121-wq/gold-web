import React from "react";
import { MoreVertical, Edit, Trash2, Eye, Gem, ShoppingCart, Sparkles, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { WhatsAppShare } from "./WhatsAppShare";

export interface JewelryItem {
  id: string;
  name: string;
  type: string;
  gemstone: string;
  carat: number;
  metal: string;
  price: number;
  inStock: number;
  isArtificial?: boolean;
  image?: string;
  // Multiple Images (up to 4)
  image_1?: string;
  image_2?: string;
  image_3?: string;
  image_4?: string;
  // Custom Tax Rate Fields
  taxRate?: number;           // Custom GST rate for this item (e.g., 3 for 3%, 18 for 18%)
  taxIncluded?: boolean;      // Whether price includes tax or not (default: false)
  taxCategory?: 'jewelry' | 'artificial' | 'gemstones' | 'other'; // Tax category for reporting
  // Barcode/SKU
  barcode?: string;           // Barcode or SKU for quick lookup
  sku?: string;               // Stock Keeping Unit (alternative to barcode)
}

interface JewelryCardProps {
  item: JewelryItem;
  onEdit: (item: JewelryItem) => void;
  onDelete: (id: string) => void;
  onView: (item: JewelryItem) => void;
  onAddToCart?: (item: JewelryItem) => void;
  showAddToCart?: boolean;
  showActions?: boolean;
}

export const JewelryCard = ({ item, onEdit, onDelete, onView, onAddToCart, showAddToCart = false, showActions = true }: JewelryCardProps) => {
  const [showWhatsAppShare, setShowWhatsAppShare] = React.useState(false);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [isHovering, setIsHovering] = React.useState(false);
  
  // Collect all available images - remove duplicates
  const images = React.useMemo(() => {
    const allImages = [item.image_1, item.image_2, item.image_3, item.image_4, item.image]
      .filter((img): img is string => !!img && img.trim() !== '' && img !== 'undefined');
    // Remove duplicates by using Set
    const uniqueImages = Array.from(new Set(allImages));
    return uniqueImages.length > 0 ? uniqueImages : [];
  }, [item.image, item.image_1, item.image_2, item.image_3, item.image_4]);

  // Continuous image cycling on hover
  React.useEffect(() => {
    if (!isHovering || images.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 1000); // Change image every 1 second while hovering
    
    return () => clearInterval(interval);
  }, [isHovering, images.length]);

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setCurrentImageIndex(0);
  };
  
  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (stock < 3) return { label: "Low Stock", variant: "secondary" as const };
    return { label: "In Stock", variant: "default" as const };
  };

  const stockStatus = getStockStatus(item.inStock);
  const currentImage = images[currentImageIndex];

  return (
    <>
    <Card 
      className="group relative bg-white rounded-2xl shadow-lg border border-gray-100/80 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:border-purple-300/60 hover:scale-[1.02] cursor-pointer h-full flex flex-col backdrop-blur-sm"
      onClick={() => onView(item)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <CardContent className="p-0 flex flex-col h-full">
        {/* Premium Image Section - Fixed Height with Auto-Rotation */}
        <div className="relative w-full overflow-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex-shrink-0 shadow-inner" style={{ height: '160px', minHeight: '160px', maxHeight: '160px' }}>
          {currentImage ? (
            <>
              <img 
                key={`img-${item.id}-${currentImageIndex}-${currentImage.substring(0, 30)}`}
                src={currentImage}
                alt={`${item.name} - Image ${currentImageIndex + 1}`}
                className="absolute inset-0 w-full h-full object-cover object-center transition-all duration-700 ease-in-out group-hover:scale-110 animate-in fade-in"
                style={{ 
                  objectFit: 'cover', 
                  objectPosition: 'center',
                  minHeight: '160px',
                  maxHeight: '160px',
                  height: '160px'
                }}
                loading="lazy"
                onError={(e) => {
                  const img = e.currentTarget;
                  img.style.display = 'none';
                  // Show placeholder if image fails
                  const parent = img.parentElement;
                  if (parent) {
                    const placeholder = parent.querySelector('.image-placeholder');
                    if (!placeholder) {
                      const placeholderDiv = document.createElement('div');
                      placeholderDiv.className = 'image-placeholder absolute inset-0 w-full h-full flex items-center justify-center';
                      placeholderDiv.innerHTML = `
                        <div class="text-center">
                          <div class="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 flex items-center justify-center shadow-xl">
                            <svg class="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                          </div>
                          <p class="text-xs text-gray-600 font-medium">Premium Jewelry</p>
                        </div>
                      `;
                      parent.appendChild(placeholderDiv);
                    }
                  }
                }}
                onLoad={(e) => {
                  // Remove placeholder when image loads successfully
                  const img = e.currentTarget;
                  const parent = img.parentElement;
                  if (parent) {
                    const placeholder = parent.querySelector('.image-placeholder');
                    if (placeholder) {
                      placeholder.remove();
                    }
                  }
                }}
              />
              {/* Enhanced gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              {/* Shine effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none"></div>
              
              {/* Image Counter Indicator - Only show if multiple images */}
              {images.length > 1 && (
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-10">
                  {images.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentImageIndex 
                          ? 'w-6 bg-white shadow-lg' 
                          : 'w-1.5 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 flex items-center justify-center shadow-xl">
                  <Gem className="h-6 w-6 text-white" />
                </div>
                <p className="text-xs text-gray-600 font-medium">Premium Jewelry</p>
              </div>
            </div>
          )}

          {/* Premium Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1.5">
            {item.isArtificial && (
              <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold shadow-lg border border-white/30 px-2 py-0.5">
                <Sparkles className="h-2.5 w-2.5 mr-1" />
                Artificial
              </Badge>
            )}
          </div>

          {/* Stock Status Badge */}
          <Badge 
            variant={stockStatus.variant}
            className={`absolute top-2 right-2 shadow-lg backdrop-blur-sm border text-xs ${
              stockStatus.variant === 'destructive' 
                ? 'bg-red-500/90 text-white border-white/30' 
                : stockStatus.variant === 'secondary'
                ? 'bg-yellow-500/90 text-white border-white/30'
                : 'bg-green-500/90 text-white border-white/30'
            } font-bold px-2 py-0.5`}
          >
            {stockStatus.label}
          </Badge>
          
          {/* Actions dropdown (hidden when showActions=false) */}
          {showActions && (
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="h-9 w-9 p-0 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white border border-gray-200" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4 text-gray-700" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(item);
                    }}
                    className="cursor-pointer"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(item);
                    }}
                    className="cursor-pointer"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Item
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowWhatsAppShare(true);
                    }}
                    className="cursor-pointer text-green-600 focus:text-green-700"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Share on WhatsApp
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                    className="text-destructive cursor-pointer focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Item
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Premium Content Section */}
        <div className="p-4 bg-gradient-to-b from-white via-white to-gray-50/30 flex flex-col min-h-[200px] relative">
          {/* Decorative corner accent */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-100/20 via-pink-100/20 to-blue-100/20 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
          {/* Product Header */}
          <div className="mb-2.5">
            <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors duration-300 line-clamp-1">
              {item.name}
            </h3>
            <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">
              {item.type}
            </p>
          </div>

          {/* Premium Details Grid - Fixed Height Container */}
          <div className="grid grid-cols-2 gap-2 mb-2 flex-grow">
            <div className="col-span-2 py-1 px-2 rounded-lg bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 border border-purple-100/80 min-h-[32px] flex items-center shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Gemstone</span>
                <span className="text-xs font-bold text-gray-900 truncate ml-2">{item.gemstone || 'None'}</span>
              </div>
            </div>
            
            {item.carat > 0 && (
              <div className="col-span-2 py-1 px-2 rounded-lg bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 border border-blue-100/80 min-h-[32px] flex items-center shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Carat</span>
                  <span className="text-xs font-bold text-gray-900">{item.carat}ct</span>
                </div>
              </div>
            )}
            
            <div className="col-span-2 py-1 px-2 rounded-lg bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border border-amber-100/80 min-h-[32px] flex items-center shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">PURITY</span>
                <span className="text-xs font-bold text-gray-900 truncate ml-2">{item.metal}</span>
              </div>
            </div>
            
            <div className="col-span-2 py-1 px-2 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100/50 border border-gray-200/80 min-h-[32px] flex items-center shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Stock</span>
                <span className="text-xs font-bold text-gray-900">{item.inStock} units</span>
              </div>
            </div>
          </div>

          {/* Price and Action Section - Always at Bottom */}
          <div className="pt-2 border-t border-gray-200/80 mt-auto relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-0.5">Price</span>
                <span className="text-xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 bg-clip-text text-transparent drop-shadow-sm">
                  ₹{item.price.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Action Button - Fixed at Bottom */}
            {showAddToCart && onAddToCart ? (
              <Button
                size="sm"
                disabled={item.inStock === 0}
                onClick={(e) => { e.stopPropagation(); onAddToCart(item); }}
                className="w-full bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 hover:from-green-700 hover:via-emerald-700 hover:to-green-700 text-white font-semibold py-2 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group/btn text-xs"
              >
                <span className="relative z-10 flex items-center justify-center">
                  <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                  {item.inStock === 0 ? "Out of Stock" : "Add to Cart"}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onView(item); }}
                className="w-full border-2 border-purple-200/80 text-purple-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:border-purple-300 font-semibold py-2 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 rounded-lg shadow-sm hover:shadow-md text-xs"
              >
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                View Details
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
      
    {/* WhatsApp Share Dialog - Outside Card to prevent event propagation */}
    <WhatsAppShare
      item={item}
      open={showWhatsAppShare}
      onOpenChange={setShowWhatsAppShare}
    />
    </>
  );
};
