import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Home,
  Package,
  Gem,
  ShoppingCart,
  Receipt,
  Hammer,
  Users,
  BarChart3,
  FileText,
  CreditCard,
  Settings,
  Phone,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useBusinessName } from "@/hooks/useBusinessName";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const navigationItems = [
  { 
    name: "Home", 
    href: "/dashboard", 
    icon: Home,
    description: "Main dashboard"
  },
  { 
    name: "Gold Collection", 
    href: "/gold-collection", 
    icon: Gem,
    description: "Gold items"
  },
  { 
    name: "Precious Stones", 
    href: "/precious-stones", 
    icon: Gem,
    description: "Rare stones"
  },
  { 
    name: "Jewelry Collection", 
    href: "/jewelry-collection", 
    icon: ShoppingCart,
    description: "Jewelry items"
  },
  { 
    name: "Point of Sale", 
    href: "/pos", 
    icon: Receipt,
    description: "Process sales & invoices"
  },
  { 
    name: "Craftsmen", 
    href: "/craftsmen", 
    icon: Hammer,
    description: "Track craftsmen"
  },
  { 
    name: "Staff", 
    href: "/staff", 
    icon: Users,
    description: "Employee management"
  },
  { 
    name: "Analytics", 
    href: "/analytics", 
    icon: BarChart3,
    description: "AI insights"
  },
  { 
    name: "Reports", 
    href: "/reports", 
    icon: FileText,
    description: "Business reports"
  },
  { 
    name: "Customer Ledger", 
    href: "/ledger", 
    icon: CreditCard,
    description: "Customer credit management"
  },
  { 
    name: "Contact", 
    href: "/contact", 
    icon: Phone,
    description: "Get in touch"
  },
  { 
    name: "Settings", 
    href: "/settings", 
    icon: Settings,
    description: "Business settings"
  }
];

export const Sidebar = ({ isCollapsed, onToggle }: SidebarProps) => {
  const location = useLocation();
  const businessName = useBusinessName();

  return (
    <div className={cn(
      "fixed left-0 top-0 z-50 h-full bg-gradient-to-b from-white to-gray-50 border-r border-gray-200/60 shadow-xl transition-all duration-300 ease-in-out backdrop-blur-sm",
      isCollapsed ? "w-16" : "w-64"
    )}>
       {/* Header */}
       <div className="flex items-center justify-between p-3 border-b border-gray-200/60 bg-white/80 backdrop-blur-sm">
         <Button
           variant="ghost"
           size="sm"
           onClick={onToggle}
           className="flex items-center gap-2 h-auto p-1 hover:bg-blue-50 hover:text-blue-600 transition-colors w-full justify-start"
         >
           <div className="p-1.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg flex-shrink-0">
             <Package className="h-6 w-6 text-white" />
           </div>
           {!isCollapsed && (
             <div className="text-left min-w-0 flex-1">
               <span className="text-base font-bold text-gray-900 block truncate">
                 {businessName}
               </span>
               <p className="text-xs text-gray-500 truncate">Admin Dashboard</p>
             </div>
           )}
         </Button>
       </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 overflow-hidden">
        <div className="space-y-2 px-4 h-full overflow-y-auto scrollbar-none">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "group relative flex items-center rounded-xl transition-all duration-200",
                  isCollapsed 
                    ? "justify-center p-3 h-12" 
                    : "gap-3 px-4 py-3 h-12",
                  isActive
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 transform scale-[1.02]"
                    : "text-gray-600 hover:text-blue-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:shadow-md hover:transform hover:scale-[1.01]"
                )}
              >
                <div className={cn(
                  "rounded-lg transition-all duration-200 flex items-center justify-center flex-shrink-0 relative",
                  isCollapsed 
                    ? "w-8 h-8" 
                    : "w-7 h-7",
                  isActive 
                    ? "bg-white/20" 
                    : "bg-gray-100 group-hover:bg-blue-100"
                )}>
                  <Icon className={cn(
                    "transition-colors absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
                    isCollapsed ? "h-5 w-5" : "h-4 w-4",
                    isActive ? "text-white" : "text-gray-500 group-hover:text-blue-600"
                  )} />
                </div>
                
                {!isCollapsed && (
                  <div className="flex flex-col">
                    <span className="truncate font-medium text-sm">{item.name}</span>
                    <span className="text-xs text-gray-400 group-hover:text-blue-500">
                      {item.description}
                    </span>
                  </div>
                )}
                
                {isCollapsed && (
                  <div className="absolute left-full ml-4 px-4 py-3 bg-gray-900 text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-[9999] shadow-2xl border border-gray-700 transform translate-y-[-50%] top-1/2 min-w-[200px]">
                    <div className="font-semibold text-base mb-1">{item.name}</div>
                    <div className="text-xs text-gray-300 leading-relaxed">{item.description}</div>
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-2 w-3 h-3 bg-gray-900 rotate-45 border-l border-t border-gray-700"></div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200/60 p-4 bg-white/50 backdrop-blur-sm flex-shrink-0">
        {!isCollapsed ? (
          <div className="text-center space-y-3">
            <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-700">System Online</span>
              </div>
              <p className="text-xs text-gray-500">Version 1.0.0</p>
            </div>
            <div className="text-xs text-gray-400">
              © 2024 Golden Treasures
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            <div className="p-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 flex items-center justify-center">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="System Online"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Mobile Sidebar Component
export const MobileSidebar = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const location = useLocation();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed left-0 top-0 z-50 h-full w-64 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200/60 shadow-xl lg:hidden">
         {/* Header */}
         <div className="flex items-center justify-between p-3 border-b border-gray-200/60 bg-white/80 backdrop-blur-sm">
           <div className="flex items-center gap-2 flex-1 min-w-0">
             <div className="p-1.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg flex-shrink-0">
               <Package className="h-6 w-6 text-white" />
             </div>
             <div className="min-w-0 flex-1">
               <span className="text-base font-bold text-gray-900 block truncate">
                 {businessName}
               </span>
               <p className="text-xs text-gray-500 truncate">Admin Dashboard</p>
             </div>
           </div>
           
           <Button
             variant="ghost"
             size="sm"
             onClick={onClose}
             className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 transition-colors flex-shrink-0"
           >
             <X className="h-4 w-4" />
           </Button>
         </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 overflow-hidden">
          <div className="space-y-2 px-4 h-full overflow-y-auto scrollbar-none">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 h-12",
                    isActive
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 transform scale-[1.02]"
                      : "text-gray-600 hover:text-blue-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:shadow-md hover:transform hover:scale-[1.01]"
                  )}
                  onClick={onClose}
                >
                  <div className={cn(
                    "rounded-lg transition-all duration-200 flex items-center justify-center flex-shrink-0 w-7 h-7 relative",
                    isActive 
                      ? "bg-white/20" 
                      : "bg-gray-100 group-hover:bg-blue-100"
                  )}>
                    <Icon className={cn(
                      "h-4 w-4 transition-colors absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
                      isActive ? "text-white" : "text-gray-500 group-hover:text-blue-600"
                    )} />
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="text-xs text-gray-400 group-hover:text-blue-500">
                      {item.description}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200/60 p-4 bg-white/50 backdrop-blur-sm flex-shrink-0">
          <div className="text-center space-y-3">
            <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-700">System Online</span>
              </div>
              <p className="text-xs text-gray-500">Version 1.0.0</p>
            </div>
            <div className="text-xs text-gray-400">
              © 2024 Golden Treasures
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
