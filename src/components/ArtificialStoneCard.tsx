import React, { useState, useEffect, useMemo } from "react";
import { Edit, Trash2, ShoppingCart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ArtificialStoneItem {
  id: string;
  name: string;
  color: string;
  size: string;
  cut: string;
  clarity: string;
  price: number;
  stock: number;
  image?: string;
  image_1?: string;
  image_2?: string;
  image_3?: string;
  image_4?: string;
}

interface ArtificialStoneCardProps {
  item: ArtificialStoneItem;
  onEdit: (item: ArtificialStoneItem) => void;
  onDelete: (item: ArtificialStoneItem) => void;
  onOrder: (item: ArtificialStoneItem) => void;
  onView: (item: ArtificialStoneItem) => void;
}

export const ArtificialStoneCard = ({ item, onEdit, onDelete, onOrder, onView }: ArtificialStoneCardProps) => {
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
      className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-pink-300 cursor-pointer"
      onClick={() => onView(item)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Premium Image Section - Fixed Height */}
      <div className="relative w-full overflow-hidden bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 flex-shrink-0" style={{ height: '160px', minHeight: '160px', maxHeight: '160px' }}>
        {currentImage ? (
          <>
            <img 
              key={`artificial-img-${item.id}-${currentImageIndex}-${currentImage.substring(0, 30)}`}
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
                e.currentTarget.style.display = 'none';
              }}
            />
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            
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
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-pink-400 via-rose-400 to-purple-400 flex items-center justify-center shadow-xl">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <p className="text-xs text-gray-600 font-medium">Artificial Stone</p>
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 bg-gradient-to-b from-white to-gray-50/50 flex flex-col min-h-[200px]">
        {/* Product Header */}
        <div className="mb-3">
          <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-pink-600 transition-colors duration-300 line-clamp-1">
            {item.name}
          </h3>
          <p className="text-xs font-medium text-pink-600 uppercase tracking-wide">
            Artificial Stone
          </p>
        </div>

        {/* Premium Details Grid - Compact */}
        <div className="grid grid-cols-2 gap-2 mb-3 flex-grow">
          <div className="col-span-2 py-1 px-2 rounded-lg bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-100 min-h-[32px] flex items-center">
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-semibold text-pink-700 uppercase tracking-wide">Color</span>
              <span className="text-xs font-bold text-gray-900 truncate ml-2">{item.color}</span>
            </div>
          </div>
          
          <div className="py-1 px-2 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 min-h-[32px] flex items-center">
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Size</span>
              <span className="text-xs font-bold text-gray-900 truncate ml-2">{item.size}</span>
            </div>
          </div>
          
          <div className="py-1 px-2 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 min-h-[32px] flex items-center">
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Cut</span>
              <span className="text-xs font-bold text-gray-900 truncate ml-2">{item.cut}</span>
            </div>
          </div>
          
          <div className="py-1 px-2 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 min-h-[32px] flex items-center">
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Clarity</span>
              <span className="text-xs font-bold text-gray-900 truncate ml-2">{item.clarity}</span>
            </div>
          </div>
        </div>

        {/* Price Section */}
        <div className="mb-3 pb-3 border-b border-gray-200">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rate</span>
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

