import { 
  Package, 
  Users, 
  Receipt, 
  BarChart3,
  Hammer,
  ShoppingCart,
  Settings,
  FileText,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useBusinessName } from "@/hooks/useBusinessName";

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  cartCount: number;
}

const navigationTabs = [
  { 
    id: "inventory", 
    name: "Inventory", 
    icon: Package,
    description: "Manage stock"
  },
  { 
    id: "pos", 
    name: "Point of Sale", 
    icon: Receipt,
    description: "Process transactions"
  },
  { 
    id: "reports", 
    name: "Reports", 
    icon: FileText,
    description: "Business reports"
  },
  { 
    id: "ledger", 
    name: "Customer Ledger", 
    icon: CreditCard,
    description: "Customer credit management"
  },
  { 
    id: "settings", 
    name: "Settings", 
    icon: Settings,
    description: "Business settings"
  }
];

export const TabNavigation = ({ activeTab, onTabChange, cartCount }: TabNavigationProps) => {
  const businessName = useBusinessName();
  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4 min-h-[50px]">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-8 w-8 text-green-600 flex-shrink-0" />
            <span className="text-xl font-bold text-gray-900">{businessName}</span>
          </div>
          
          {cartCount > 0 && (
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-green-600" />
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {cartCount} items in cart
              </Badge>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 overflow-x-auto">
          {navigationTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium whitespace-nowrap min-h-[44px]",
                  isActive 
                    ? "bg-green-600 text-white hover:bg-green-700" 
                    : "text-gray-600 hover:text-green-600 hover:bg-green-50"
                )}
                onClick={() => onTabChange(tab.id)}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span>{tab.name}</span>
                {tab.id === "pos" && cartCount > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-white text-green-600">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
