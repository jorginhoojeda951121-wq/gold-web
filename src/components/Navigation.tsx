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
import { syncAll, backfillAllFromIdb } from "@/lib/sync";
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
    name: "Contact", 
    href: "/contact", 
    icon: Phone,
    description: "Get in touch"
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
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex justify-between items-center py-2 min-h-[60px]">
          <div className="flex items-center gap-2 pr-4 flex-shrink-0">
            <Package className="h-8 w-8 text-blue-600 flex-shrink-0" />
            <span className="whitespace-nowrap text-lg font-bold tracking-tight text-gray-900">
              {businessName}
            </span>
          </div>

          {/* Desktop Navigation - Horizontal Tabs */}
          <div className="hidden lg:flex items-center space-x-1 flex-1 justify-center">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors min-h-[40px] ${
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
                <Button variant="ghost" size="sm" className="flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-700 hover:bg-blue-50 min-h-[40px]">
                  More
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

          {/* Sync Actions */}
          <div className="hidden lg:flex items-center space-x-2 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center justify-center gap-1 min-h-[40px]">
                  <Settings className="h-4 w-4 flex-shrink-0" />
                  Sync
                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={async () => {
                    const t = toast({ title: 'Syncing...', description: 'Refreshing data from server' });
                    try {
                      await syncAll();
                      toast({ title: 'Sync complete', description: 'Local data updated' });
                    } catch (e: any) {
                      console.error('Sync failed:', e);
                      const msg = e?.message || 'Unknown error';
                      toast({ title: 'Sync failed', description: msg, variant: 'destructive' });
                    }
                  }}
                >
                  Pull Server Data
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    const t = toast({ title: 'Backfilling...', description: 'Pushing local data to server' });
                    try {
                      await backfillAllFromIdb();
                      toast({ title: 'Backfill complete', description: 'Supabase now has local data' });
                    } catch (e: any) {
                      console.error('Backfill failed:', e);
                      const msg = e?.message || 'Unknown error';
                      toast({ title: 'Backfill failed', description: msg, variant: 'destructive' });
                    }
                  }}
                >
                  Push Local Data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden">
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
                    const t = toast({ title: 'Syncing...', description: 'Refreshing data from server' });
                    try {
                      await syncAll();
                      toast({ title: 'Sync complete', description: 'Local data updated' });
                    } catch (e: any) {
                      console.error('Sync failed:', e);
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
                    const t = toast({ title: 'Backfilling...', description: 'Pushing local data to server' });
                    try {
                      await backfillAllFromIdb();
                      toast({ title: 'Backfill complete', description: 'Supabase now has local data' });
                    } catch (e: any) {
                      console.error('Backfill failed:', e);
                      const msg = e?.message || 'Unknown error';
                      toast({ title: 'Backfill failed', description: msg, variant: 'destructive' });
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