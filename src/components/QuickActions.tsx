import { 
  ShoppingCart, 
  Recycle, 
  Hammer, 
  Wallet, 
  ArrowRight,
  PlusCircle,
  TrendingUp,
  Scale
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: "New Sale (POS)",
      description: "Fast weight-based billing",
      icon: ShoppingCart,
      color: "blue",
      onClick: () => navigate("/pos"),
    },
    {
      title: "Old Gold Entry",
      description: "Buy back or exchange",
      icon: Recycle,
      color: "amber",
      onClick: () => navigate("/pos?action=old-gold"),
    },
    {
      title: "Metal Ledger",
      description: "Karigar work tracking",
      icon: Hammer,
      color: "emerald",
      onClick: () => navigate("/craftsmen"),
    },
    {
      title: "GST Reporting",
      description: "HSN summaries & returns",
      icon: TrendingUp,
      color: "purple",
      onClick: () => navigate("/gst-reports"),
    },
    {
      title: "Business Ledger",
      description: "Real-time P&L & Cash",
      icon: Wallet,
      color: "rose",
      onClick: () => navigate("/accounting"),
    },
  ];

  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100",
  };

  const iconColors: Record<string, string> = {
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    purple: "bg-purple-500",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {actions.map((action) => (
        <Card 
          key={action.title} 
          className={`cursor-pointer border-2 transition-all duration-300 hover:shadow-lg group ${colors[action.color]}`}
          onClick={action.onClick}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`p-3 rounded-xl text-white shadow-md group-hover:scale-110 transition-transform ${iconColors[action.color]}`}>
              <action.icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 leading-tight">{action.title}</h3>
              <p className="text-xs text-gray-500 font-medium">{action.description}</p>
            </div>
            <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
