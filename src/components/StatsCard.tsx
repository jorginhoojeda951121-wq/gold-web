import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend: string;
  variant?: "default" | "blue" | "purple" | "green" | "gold";
}

export const StatsCard = ({ title, value, icon: Icon, trend, variant = "default" }: StatsCardProps) => {
  const variantStyles = {
    default: "bg-gradient-to-br from-white to-gray-50 border-gray-200/60",
    blue: "bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100/50 border-blue-200/60",
    purple: "bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100/50 border-purple-200/60",
    green: "bg-gradient-to-br from-green-50 via-emerald-50 to-green-100/50 border-green-200/60",
    gold: "bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/50 border-amber-200/60",
  };

  const iconStyles = {
    default: "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700",
    blue: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30",
    purple: "bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30",
    green: "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30",
    gold: "bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-lg shadow-amber-500/30",
  };

  return (
    <Card className={cn(
      "group relative overflow-hidden border transition-all duration-300 ease-out",
      "hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]",
      variantStyles[variant]
    )}>
      {/* Decorative gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "flex items-center justify-center w-14 h-14 rounded-xl transition-all duration-300",
            "group-hover:scale-110 group-hover:rotate-3",
            iconStyles[variant]
          )}>
            <Icon className="h-7 w-7" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground tracking-wide uppercase">{title}</h3>
          <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground font-medium">{trend}</p>
        </div>
      </CardContent>
    </Card>
  );
};
