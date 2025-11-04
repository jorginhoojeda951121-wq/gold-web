import { MoreVertical, Edit, Trash2, Eye, Gem, ShoppingCart, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

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
  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (stock < 3) return { label: "Low Stock", variant: "secondary" as const };
    return { label: "In Stock", variant: "default" as const };
  };

  const stockStatus = getStockStatus(item.inStock);

  return (
    <Card 
      className="group relative bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-purple-300 cursor-pointer h-full flex flex-col"
      onClick={() => onView(item)}
    >
      <CardContent className="p-0 flex flex-col h-full">
        {/* Premium Image Section - Fixed Height */}
        <div className="relative w-full overflow-hidden bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex-shrink-0" style={{ height: '256px', minHeight: '256px', maxHeight: '256px' }}>
          {item.image && item.image.trim() !== '' ? (
            <>
              <img 
                src={item.image} 
                alt={item.name}
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
                style={{ 
                  objectFit: 'cover', 
                  objectPosition: 'center',
                  minHeight: '256px',
                  maxHeight: '256px',
                  height: '256px'
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </>
          ) : (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 flex items-center justify-center shadow-xl">
                  <Gem className="h-10 w-10 text-white" />
                </div>
                <p className="text-xs text-gray-600 font-medium">Premium Jewelry</p>
              </div>
            </div>
          )}

          {/* Premium Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {item.isArtificial && (
              <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold shadow-lg border border-white/30 px-2.5 py-1">
                <Sparkles className="h-3 w-3 mr-1" />
                Artificial
              </Badge>
            )}
          </div>

          {/* Stock Status Badge */}
          <Badge 
            variant={stockStatus.variant}
            className={`absolute top-4 right-4 shadow-lg backdrop-blur-sm border ${
              stockStatus.variant === 'destructive' 
                ? 'bg-red-500/90 text-white border-white/30' 
                : stockStatus.variant === 'secondary'
                ? 'bg-yellow-500/90 text-white border-white/30'
                : 'bg-green-500/90 text-white border-white/30'
            } font-bold px-3 py-1`}
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
                <DropdownMenuContent align="end" className="w-48">
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
        <div className="p-6 bg-gradient-to-b from-white to-gray-50/50 flex flex-col min-h-[280px]">
          {/* Product Header */}
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-900 mb-1.5 group-hover:text-purple-600 transition-colors duration-300">
              {item.name}
            </h3>
            <p className="text-sm font-medium text-purple-600 uppercase tracking-wide">
              {item.type}
            </p>
          </div>

          {/* Premium Details Grid - Fixed Height Container */}
          <div className="grid grid-cols-2 gap-2.5 mb-5 flex-grow">
            <div className="col-span-2 py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 min-h-[48px] flex items-center">
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Gemstone</span>
                <span className="text-sm font-bold text-gray-900">{item.gemstone || 'None'}</span>
              </div>
            </div>
            
            {item.carat > 0 ? (
              <div className="py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 min-h-[72px] flex flex-col justify-center">
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Carat</span>
                <span className="text-sm font-bold text-gray-900">{item.carat}ct</span>
              </div>
            ) : (
              <div className="py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 min-h-[72px] flex flex-col justify-center opacity-0 pointer-events-none">
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Carat</span>
                <span className="text-sm font-bold text-gray-900">-</span>
              </div>
            )}
            
            <div className="py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 min-h-[72px] flex flex-col justify-center">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Metal</span>
              <span className="text-sm font-bold text-gray-900">{item.metal}</span>
            </div>
            
            <div className="col-span-2 py-2.5 px-3.5 rounded-xl bg-gray-50 border border-gray-200 min-h-[48px] flex items-center">
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Stock</span>
                <span className="text-sm font-bold text-gray-900">{item.inStock} units</span>
              </div>
            </div>
          </div>

          {/* Price and Action Section - Always at Bottom */}
          <div className="pt-4 border-t border-gray-200 mt-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Price</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  ₹{item.price.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Action Button - Fixed at Bottom */}
            {showAddToCart && onAddToCart ? (
              <Button
                size="default"
                disabled={item.inStock === 0}
                onClick={(e) => { e.stopPropagation(); onAddToCart(item); }}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-2.5 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {item.inStock === 0 ? "Out of Stock" : "Add to Cart"}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="default"
                onClick={(e) => { e.stopPropagation(); onView(item); }}
                className="w-full border-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300 font-semibold py-2.5 transition-all duration-200 rounded-xl"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};