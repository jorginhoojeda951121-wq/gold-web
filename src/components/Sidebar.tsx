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
  DollarSign,
  BarChart3,
  FileText,
  CreditCard,
  Settings,
  Phone,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Crown,
  Download,
  Upload,
  Calendar,
  Building2,
  Sparkles,
  ArrowLeftRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useBusinessName } from "@/hooks/useBusinessName";
// Sync removed - all operations go directly to Supabase
import { useToast } from "@/hooks/use-toast";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const navigationItems = [
  { 
    name: "Dashboard", 
    href: "/dashboard", 
    icon: Home,
    description: "Main business overview"
  },
  { 
    name: "Sales (POS)", 
    href: "/pos", 
    icon: Receipt,
    description: "Billing & GST Invoices"
  },
  { 
    name: "Purchase", 
    href: "/vendors", 
    icon: ShoppingCart,
    description: "Metal & Jewelry Purchase"
  },
  { 
    name: "Inventory", 
    href: "/inventory", 
    icon: Package,
    description: "Stock & Metal Balance"
  },
  { 
    name: "Stock Transfer", 
    href: "/stock-transfer", 
    icon: ArrowLeftRight,
    description: "Move items between branches"
  },
  { 
    name: "Gold Rate Tracker", 
    href: "/gold-rates", 
    icon: TrendingUp,
    description: "Live & manual rate management"
  },
  { 
    name: "Karigar / Artisans", 
    href: "/craftsmen", 
    icon: Hammer,
    description: "Job work & Gold issuance"
  },
  { 
    name: "Accounts", 
    href: "/ledger", 
    icon: DollarSign,
    description: "Ledger & Double-entry"
  },
  { 
    name: "GST Reports", 
    href: "/gst-reports", 
    icon: FileText,
    description: "GSTR-1, 3B & HSN summaries"
  },
  { 
    name: "Analytics & Reports", 
    href: "/insights", 
    icon: BarChart3,
    description: "Business Health & Reports"
  },
  { 
    name: "Masters", 
    href: "/masters", 
    icon: Building2,
    description: "ERP Setup & Catalogs"
  },
  { 
    name: "Users & Staff", 
    href: "/staff", 
    icon: Users,
    description: "Roles, Payroll & Attendance"
  },
  { 
    name: "Settings", 
    href: "/settings", 
    icon: Settings,
    description: "App & GST configuration"
  },
  { 
    name: "Backup", 
    href: "/backup", 
    icon: Download,
    description: "Cloud & Local Data Sync"
  }
];

export const Sidebar = ({ isCollapsed, onToggle }: SidebarProps) => {
  const location = useLocation();
  const businessName = useBusinessName();
  const { toast } = useToast();

  return (
    <div className={cn(
      "fixed left-0 top-0 z-50 h-full bg-gradient-to-b from-white to-gray-50 border-r border-gray-200/60 shadow-xl transition-all duration-300 ease-in-out backdrop-blur-sm flex flex-col",
      isCollapsed ? "w-16" : "w-64"
    )}>
       {/* Header */}
       <div className="flex items-center justify-between p-3 border-b border-gray-200/60 bg-white/80 backdrop-blur-sm flex-shrink-0">
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
      <nav className="flex-1 py-4 overflow-hidden">
        <div className="space-y-2 px-4 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "group relative flex items-center rounded-xl transition-all duration-300 ease-out",
                  isCollapsed 
                    ? "justify-center p-3 h-12" 
                    : "gap-3 px-4 py-3 h-12",
                  isActive
                    ? "bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/40 transform scale-[1.03] border-l-4 border-blue-300"
                    : "text-gray-600 hover:text-blue-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-lg hover:transform hover:scale-[1.02] hover:border-l-2 hover:border-blue-200"
                )}
              >
                {/* Active indicator glow effect */}
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/20 to-indigo-400/20 blur-sm -z-10 animate-pulse"></div>
                )}
                
                {/* Left accent bar for active item */}
                {isActive && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-300 via-white to-blue-300 rounded-r-full shadow-lg"></div>
                )}
                
                <div className={cn(
                  "rounded-xl transition-all duration-300 flex items-center justify-center flex-shrink-0 relative",
                  isCollapsed 
                    ? "w-8 h-8" 
                    : "w-8 h-8",
                  isActive 
                    ? "bg-white/25 shadow-inner ring-2 ring-white/30" 
                    : "bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-blue-100 group-hover:to-indigo-100 group-hover:shadow-md"
                )}>
                  <Icon className={cn(
                    "transition-all duration-300 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
                    isCollapsed ? "h-5 w-5" : "h-[18px] w-[18px]",
                    isActive 
                      ? "text-white drop-shadow-lg" 
                      : "text-gray-500 group-hover:text-blue-600 group-hover:scale-110"
                  )} />
                </div>
                
                {!isCollapsed && (
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className={cn(
                      "truncate font-semibold transition-all duration-300",
                      isActive 
                        ? "text-white text-sm drop-shadow-sm" 
                        : "text-sm text-gray-700 group-hover:text-blue-700"
                    )}>
                      {item.name}
                    </span>
                    <span className={cn(
                      "text-xs truncate transition-all duration-300",
                      isActive 
                        ? "text-blue-100" 
                        : "text-gray-400 group-hover:text-blue-500"
                    )}>
                      {item.description}
                    </span>
                  </div>
                )}
                
                {isCollapsed && (
                  <div className="absolute left-full ml-4 px-4 py-3 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-[9999] shadow-2xl border border-gray-700/50 transform translate-y-[-50%] top-1/2 min-w-[200px] backdrop-blur-sm">
                    <div className="font-semibold text-base mb-1 text-white drop-shadow-sm">{item.name}</div>
                    <div className="text-xs text-gray-300 leading-relaxed">{item.description}</div>
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-2 w-3 h-3 bg-gradient-to-br from-gray-800 to-gray-900 rotate-45 border-l border-t border-gray-700/50 shadow-lg"></div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200/60 p-4 bg-white/50 backdrop-blur-sm flex-shrink-0">
        <div className="space-y-3">
          {/* System Status */}
          <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-green-700">System Online</span>
            </div>
            <p className="text-xs text-gray-500">Direct Supabase Connection</p>
          </div>
          <div className="text-xs text-gray-400 text-center">
            © 2024 {businessName}
          </div>
        </div>
      </div>
    </div>
  );
};

// Mobile Sidebar Component
export const MobileSidebar = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const location = useLocation();
  const businessName = useBusinessName();

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
