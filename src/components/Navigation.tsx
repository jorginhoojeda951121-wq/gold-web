import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Gem, 
  Package, 
  Users, 
  Receipt, 
  Phone, 
  Menu, 
  X,
  BarChart3,
  Hammer,
  ShoppingCart,
  Home,
  Settings,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { syncAll, pushLocalChanges, backfillAllFromIdb } from "@/lib/sync";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useBusinessName } from "@/hooks/useBusinessName";

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
    icon: Package,
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
  }
];

const moreItems = [
  { 
    name: "Support", 
    href: "/support", 
    icon: Phone,
    description: "Contact support team"
  },
  { 
    name: "Inventory Management", 
    href: "/inventory", 
    icon: Package,
    description: "Manage inventory"
  }
];

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const businessName = useBusinessName();
  const location = useLocation();
  const { toast } = useToast();

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2">
        <div className="flex justify-between items-center py-2 min-h-[60px] gap-2">
          {/* Brand/Logo - Responsive */}
          <div className="flex items-center gap-1.5 sm:gap-2 pr-2 sm:pr-4 flex-shrink-0 min-w-0">
            <Package className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-600 flex-shrink-0" />
            <span className="whitespace-nowrap text-sm sm:text-base md:text-lg font-bold tracking-tight text-gray-900 truncate max-w-[100px] sm:max-w-[150px] md:max-w-[200px] lg:max-w-none">
              {businessName}
            </span>
          </div>

          {/* Desktop Navigation - Shows above 1480px */}
          <div className="hidden nav:flex items-center space-x-1 flex-1 justify-center min-w-0 overflow-x-auto scrollbar-none">
            <div className="flex items-center space-x-1 flex-nowrap">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                    className={`group flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors min-h-[40px] flex-shrink-0 whitespace-nowrap ${
                    isActive
                      ? 'text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-200'
                      : 'text-gray-600 hover:text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'}`} />
                  <span className="whitespace-nowrap">{item.name}</span>
                </Link>
              );
            })}
            
            {/* More dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-700 hover:bg-blue-50 min-h-[40px] flex-shrink-0 whitespace-nowrap">
                    <span>More</span>
                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <DropdownMenuItem key={item.name} asChild>
                      <Link
                        to={item.href}
                        className={`flex items-center gap-2 px-3 py-2 text-sm ${
                          isActive ? 'text-blue-700 bg-blue-50' : 'text-gray-700'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>

          {/* Sync Actions - Shows above 1480px */}
          <div className="hidden nav:flex items-center space-x-2 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center justify-center gap-1.5 min-h-[40px] px-3 text-sm whitespace-nowrap">
                  <Settings className="h-4 w-4 flex-shrink-0" />
                  <span>Sync</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={async () => {
                    toast({ title: 'Syncing...', description: 'Refreshing data from server' });
                    try {
                      // Check user authentication first
                      const { getCurrentUserId } = await import('@/lib/userStorage');
                      const userId = await getCurrentUserId();
                      
                      if (!userId) {
                        console.error('❌ Nav: No user ID found');
                        toast({ 
                          title: 'Authentication Required', 
                          description: 'Please log out and log back in to sync data.',
                          variant: 'destructive' 
                        });
                        return;
                      }
                      
                      await syncAll();
                      toast({ title: 'Sync complete', description: 'Local data updated' });
                    } catch (e: any) {
                      console.error('❌ Nav: Sync failed:', e);
                      const msg = e?.message || 'Unknown error';
                      toast({ title: 'Sync failed', description: msg, variant: 'destructive' });
                    }
                  }}
                >
                  Pull Server Data
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    toast({ title: 'Pushing...', description: 'Pushing local data to server' });
                    try {
                      // Check user authentication first
                      const { getCurrentUserId } = await import('@/lib/userStorage');
                      const userId = await getCurrentUserId();
                      
                      if (!userId) {
                        console.error('❌ Nav: No user ID found');
                        toast({ 
                          title: 'Authentication Required', 
                          description: 'Please log out and log back in to sync data.',
                          variant: 'destructive' 
                        });
                        return;
                      }
                      
                      await pushLocalChanges();
                      toast({ title: 'Push complete', description: 'Changed data uploaded (fast sync)' });
                    } catch (e: any) {
                      console.error('❌ Nav: Push failed:', e);
                      const msg = e?.message || 'Unknown error';
                      toast({ title: 'Push failed', description: msg, variant: 'destructive' });
                    }
                  }}
                >
                  Push Local Data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Hamburger menu button - Shows at 1480px and below */}
          <div className="nav:hidden flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="h-10 w-10 p-0 bg-yellow-400 hover:bg-yellow-500 text-gray-900 border border-yellow-500 rounded"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation - Shows at 1480px and below */}
        {isOpen && (
          <div className="nav:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-200 bg-white/95 backdrop-blur">
              {[...navigationItems, ...moreItems].map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-base font-medium ${
                      isActive
                        ? 'text-blue-700 bg-blue-50 ring-1 ring-blue-100'
                        : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              <div className="pt-2 border-t border-gray-200">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={async () => {
                    setIsOpen(false);
                    toast({ title: 'Syncing...', description: 'Refreshing data from server' });
                    try {
                      // Check user authentication first
                      const { getCurrentUserId } = await import('@/lib/userStorage');
                      const userId = await getCurrentUserId();
                      
                      if (!userId) {
                        console.error('❌ Mobile Nav: No user ID found');
                        toast({ 
                          title: 'Authentication Required', 
                          description: 'Please log out and log back in to sync data.',
                          variant: 'destructive' 
                        });
                        return;
                      }
                      
                      await syncAll();
                      toast({ title: 'Sync complete', description: 'Local data updated' });
                    } catch (e: any) {
                      console.error('❌ Mobile Nav: Sync failed:', e);
                      const msg = e?.message || 'Unknown error';
                      toast({ title: 'Sync failed', description: msg, variant: 'destructive' });
                    }
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Pull Server Data
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start mt-2"
                  onClick={async () => {
                    setIsOpen(false);
                    toast({ title: 'Pushing...', description: 'Pushing local data to server' });
                    try {
                      // Check user authentication first
                      const { getCurrentUserId } = await import('@/lib/userStorage');
                      const userId = await getCurrentUserId();
                      
                      if (!userId) {
                        console.error('❌ Mobile Nav: No user ID found');
                        toast({ 
                          title: 'Authentication Required', 
                          description: 'Please log out and log back in to sync data.',
                          variant: 'destructive' 
                        });
                        return;
                      }
                      
                      await pushLocalChanges();
                      toast({ title: 'Push complete', description: 'Changed data uploaded (fast sync)' });
                    } catch (e: any) {
                      console.error('❌ Mobile Nav: Push failed:', e);
                      const msg = e?.message || 'Unknown error';
                      toast({ title: 'Push failed', description: msg, variant: 'destructive' });
                    }
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Push Local Data
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
