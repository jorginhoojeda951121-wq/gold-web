import React, { useState, useEffect, useMemo } from "react";
import { Edit, Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface GoldItem {
  id: string;
  name: string;
  weight?: string;
  purity: string;
  price: number;
  stock: number;
  image?: string;
  image_1?: string;
  image_2?: string;
  image_3?: string;
  image_4?: string;
}

interface GoldItemCardProps {
  item: GoldItem;
  onEdit: (item: GoldItem) => void;
  onDelete: (item: GoldItem) => void;
  onOrder: (item: GoldItem) => void;
  onView: (item: GoldItem) => void;
}

export const GoldItemCard = ({ item, onEdit, onDelete, onOrder, onView }: GoldItemCardProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  
  // Collect all available images - remove duplicates
  const images = useMemo(() => {
    const allImages = [item.image_1, item.image_2, item.image_3, item.image_4, item.image]
      .filter((img): img is string => !!img && img.trim() !== '' && img !== 'undefined');
    // Remove duplicates by using Set
    const uniqueImages = Array.from(new Set(allImages));
    return uniqueImages.length > 0 ? uniqueImages : [];
  }, [item.image, item.image_1, item.image_2, item.image_3, item.image_4]);

  // Continuous image cycling on hover
  useEffect(() => {
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
  
  const currentImage = images[currentImageIndex];

  return (
    <div 
      className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-amber-300 cursor-pointer"
      onClick={() => onView(item)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Image Section with Gradient Overlay */}
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50">
        {currentImage ? (
          <>
            <img 
              key={`gold-img-${item.id}-${currentImageIndex}-${currentImage.substring(0, 30)}`}
              src={currentImage}
              alt={`${item.name} - Image ${currentImageIndex + 1}`}
              className="absolute inset-0 w-full h-full object-cover object-center transition-all duration-700 ease-in-out group-hover:scale-110 animate-in fade-in z-10"
              style={{ 
                objectFit: 'cover', 
                objectPosition: 'center',
                minHeight: '160px',
                maxHeight: '160px',
                height: '160px'
              }}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              onLoad={(e) => {
                e.currentTarget.style.display = 'block';
              }}
            />
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20"></div>
            
            {/* Image Counter Indicator - Only show if multiple images */}
            {images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-30">
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
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg">
                <span className="text-2xl">✨</span>
              </div>
              <p className="text-xs text-gray-500 font-medium">Premium Gold</p>
            </div>
          </div>
        )}
        
        {/* Gold Purity Badge */}
        <div className="absolute top-2 left-2 z-30">
          <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg backdrop-blur-sm border border-white/30">
            {item.purity}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 bg-gradient-to-b from-white to-gray-50/50 flex flex-col min-h-[200px]">
        {/* Product Name */}
        <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-amber-600 transition-colors duration-300 line-clamp-1">
          {item.name}
        </h3>

        {/* Details Section */}
        <div className="space-y-2 mb-3 flex-grow">
          {item.weight && (
            <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-gray-50 border border-gray-100 min-h-[32px]">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Weight</span>
              <span className="text-xs font-semibold text-gray-800 truncate ml-2">{item.weight}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 min-h-[32px]">
            <span className="text-xs font-medium text-yellow-700 uppercase tracking-wide">Purity</span>
            <span className="text-xs font-bold text-yellow-800 truncate ml-2">{item.purity}</span>
          </div>
          <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 min-h-[32px]">
            <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Stock</span>
            <span className="text-xs font-bold text-blue-800 truncate ml-2">{item.stock} units</span>
          </div>
        </div>

        {/* Price Section */}
        <div className="mb-3 pb-3 border-b border-gray-200">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Price</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
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
              onOrder(item);
            }}
            size="sm"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 shadow-md hover:shadow-lg transition-all duration-300 rounded-lg text-xs"
          >
            <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
            Order Now
          </Button>

          {/* Secondary Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
              size="sm"
              variant="outline"
              className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 font-medium rounded-lg transition-all duration-200 text-xs"
            >
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
              }}
              size="sm"
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-medium rounded-lg transition-all duration-200 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

