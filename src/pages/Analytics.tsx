import { useState, useEffect, useCallback } from "react";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Package,
  Users,
  Calendar,
  Target,
  Award,
  Filter,
  Sparkles,
  Brain,
  AlertTriangle,
  Lightbulb,
  TrendingDown,
  PieChart
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { getUserData } from "@/lib/userStorage";
import { AIChatAssistant } from "@/components/AIChatAssistant";
import { Button } from "@/components/ui/button";

interface AnalyticsData {
  monthlyRevenue: number;
  monthlyProfit: number;
  itemsSold: number;
  activeCustomers: number;
  averageOrder: number;
  monthlyData: Array<{ month: string; sales: number; items: number }>;
  topItems: Array<{ name: string; sales: number; revenue: number }>;
  weeklyData: Array<{ day: string; sales: number }>;
  totalItems: number;
  totalValue: number;
  lowStock: number;
  outOfStock: number;
  categoryPerformance: Array<{ category: string; revenue: number; itemsSold: number; growth: number; avgPrice: number }>;
  aiSuggestions: Array<{ type: string; priority: 'high' | 'medium' | 'low'; message: string; impact: string }>;
}

interface AnalyticsProps {
  standalone?: boolean;
}

import { LocationSelector } from "@/components/LocationSelector";

const Analytics = ({ standalone = true }: AnalyticsProps) => {
  const { data: dateRange, updateData: setDateRange} = useOfflineStorage<string>("analytics_dateRange", "month");
  const { data: searchQuery, updateData: setSearchQuery } = useOfflineStorage<string>("analytics_search", "");
  const [selectedLocation, setSelectedLocation] = useState<string | 'all'>('all');
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    monthlyRevenue: 0,
    monthlyProfit: 0,
    itemsSold: 0,
    activeCustomers: 0,
    averageOrder: 0,
    monthlyData: [],
    topItems: [],
    weeklyData: [],
    totalItems: 0,
    totalValue: 0,
    lowStock: 0,
    outOfStock: 0,
    categoryPerformance: [],
    aiSuggestions: []
  });
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  
  // Load real user-scoped data for analytics
  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load all user-scoped data with proper defaults
      const [invoicesData, inventoryData, customersData, expensesData] = await Promise.all([
        getUserData<any[]>('pos_recentInvoices'),
        getUserData<any[]>('inventory_items'),
        getUserData<any[]>('customers'),
        getUserData<any[]>('expenses') || [],
      ]);

      // Ensure arrays are defined
      let invoices = Array.isArray(invoicesData) ? invoicesData : [];
      let inventoryItems = Array.isArray(inventoryData) ? inventoryData : [];
      let customers = Array.isArray(customersData) ? customersData : [];
      let expenses = Array.isArray(expensesData) ? expensesData : [];

      // Filter by location if not 'all'
      if (selectedLocation !== 'all') {
        invoices = invoices.filter((inv: any) => inv.location_id === selectedLocation);
        inventoryItems = inventoryItems.filter((item: any) => item.location_id === selectedLocation);
        customers = customers.filter((cust: any) => cust.location_id === selectedLocation);
      }

      // Calculate monthly revenue and items sold from invoices
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Filter invoices for current month
      const currentMonthInvoices = invoices.filter((inv: any) => {
        if (!inv.date) return false;
        const invDate = new Date(inv.date);
        return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
      });

      // Calculate monthly revenue and profit
      const monthlyRevenue = currentMonthInvoices.reduce((sum: number, inv: any) => sum + (inv.total || inv.total_amount || 0), 0);
      const grossMonthlyProfit = currentMonthInvoices.reduce((sum: number, inv: any) => sum + (inv.profit || (inv.total || inv.total_amount || 0) * 0.15), 0);
      
      const currentMonthExpenses = expenses.filter((exp: any) => {
        if (!exp.date) return false;
        const expDate = new Date(exp.date);
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
      });
      const monthlyExpensesTotal = currentMonthExpenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
      const monthlyProfit = grossMonthlyProfit - monthlyExpensesTotal;
      
      // Calculate items sold
      const itemsSold = currentMonthInvoices.reduce((sum: number, inv: any) => {
        return sum + (inv.items?.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0) || 0);
      }, 0);

      // Calculate average order value
      const averageOrder = currentMonthInvoices.length > 0 ? monthlyRevenue / currentMonthInvoices.length : 0;

      // Calculate monthly data for last 6 months
      const monthlyDataMap = new Map<string, { sales: number; items: number }>();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentYear, currentMonth - i, 1);
        const monthKey = monthNames[date.getMonth()];
        monthlyDataMap.set(monthKey, { sales: 0, items: 0 });
      }

      invoices.forEach((inv: any) => {
        if (!inv.date) return;
        const invDate = new Date(inv.date);
        const monthKey = monthNames[invDate.getMonth()];
        const existing = monthlyDataMap.get(monthKey);
        if (existing) {
          existing.sales += inv.total || 0;
          existing.items += inv.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
        }
      });

      const monthlyData = Array.from(monthlyDataMap.entries()).map(([month, data]) => ({
        month,
        sales: data.sales,
        items: data.items
      }));

      // Calculate top selling items
      const itemSalesMap = new Map<string, { sales: number; revenue: number }>();
      
      invoices.forEach((inv: any) => {
        if (inv.items) {
          inv.items.forEach((item: any) => {
            const itemName = item.name || 'Unknown Item';
            const existing = itemSalesMap.get(itemName);
            const quantity = item.quantity || 0;
            const revenue = (item.price || 0) * quantity;
            
            if (existing) {
              existing.sales += quantity;
              existing.revenue += revenue;
            } else {
              itemSalesMap.set(itemName, { sales: quantity, revenue });
            }
          });
        }
      });

      const topItems = Array.from(itemSalesMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Count active customers (customers with transactions in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const activeCustomerIds = new Set(
        invoices
          .filter((inv: any) => inv.date && new Date(inv.date) >= thirtyDaysAgo)
          .map((inv: any) => inv.customerId)
          .filter(Boolean)
      );
      const activeCustomers = activeCustomerIds.size || customers.length;

      // Calculate weekly data (last 7 days)
      const weeklyDataMap = new Map<string, number>();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayKey = dayNames[date.getDay()];
        weeklyDataMap.set(dayKey, 0);
      }

      invoices.forEach((inv: any) => {
        if (!inv.date) return;
        const invDate = new Date(inv.date);
        const daysDiff = Math.floor((today.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff >= 0 && daysDiff < 7) {
          const dayKey = dayNames[invDate.getDay()];
          const existing = weeklyDataMap.get(dayKey);
          if (existing !== undefined) {
            weeklyDataMap.set(dayKey, existing + (inv.total || 0));
          }
        }
      });

      const weeklyData = Array.from(weeklyDataMap.entries()).map(([day, sales]) => ({
        day,
        sales
      }));

      // Calculate inventory stats
      const totalItems = inventoryItems.length;
      const totalValue = inventoryItems.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.inStock || item.stock || 0)), 0);
      const lowStock = inventoryItems.filter((item: any) => (item.inStock || item.stock || 0) > 0 && (item.inStock || item.stock || 0) < 10).length;
      const outOfStock = inventoryItems.filter((item: any) => (item.inStock || item.stock || 0) === 0).length;

      // Calculate category performance
      const categoryMap = new Map<string, { revenue: number; itemsSold: number; count: number; totalPrice: number }>();
      
      invoices.forEach((inv: any) => {
        if (inv.items) {
          inv.items.forEach((item: any) => {
            // Determine category from item type or name
            let category = 'Other';
            const itemName = (item.name || '').toLowerCase();
            const itemType = (item.type || '').toLowerCase();
            
            if (itemName.includes('gold') || itemType.includes('gold') || itemName.includes('22k') || itemName.includes('24k') || itemName.includes('18k')) {
              category = 'Gold';
            } else if (itemName.includes('diamond') || itemName.includes('ruby') || itemName.includes('emerald') || itemName.includes('sapphire') || itemName.includes('stone') || itemType.includes('stone')) {
              category = 'Precious Stones';
            } else if (itemName.includes('artificial') || itemName.includes('synthetic') || itemType.includes('artificial')) {
              category = 'Artificial Stones';
            } else if (itemName.includes('jewelry') || itemName.includes('ring') || itemName.includes('necklace') || itemName.includes('bracelet') || itemName.includes('earring')) {
              category = 'Jewelry';
            }
            
            const quantity = item.quantity || 0;
            const revenue = (item.price || 0) * quantity;
            const existing = categoryMap.get(category);
            
            if (existing) {
              existing.revenue += revenue;
              existing.itemsSold += quantity;
              existing.count += 1;
              existing.totalPrice += (item.price || 0);
            } else {
              categoryMap.set(category, { revenue, itemsSold: quantity, count: 1, totalPrice: item.price || 0 });
            }
          });
        }
      });

      // Get previous month data for growth calculation
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const previousMonthInvoices = invoices.filter((inv: any) => {
        if (!inv.date) return false;
        const invDate = new Date(inv.date);
        return invDate.getMonth() === previousMonth && invDate.getFullYear() === previousYear;
      });

      const previousMonthCategoryMap = new Map<string, number>();
      previousMonthInvoices.forEach((inv: any) => {
        if (inv.items) {
          inv.items.forEach((item: any) => {
            let category = 'Other';
            const itemName = (item.name || '').toLowerCase();
            const itemType = (item.type || '').toLowerCase();
            
            if (itemName.includes('gold') || itemType.includes('gold') || itemName.includes('22k') || itemName.includes('24k') || itemName.includes('18k')) {
              category = 'Gold';
            } else if (itemName.includes('diamond') || itemName.includes('ruby') || itemName.includes('emerald') || itemName.includes('sapphire') || itemName.includes('stone') || itemType.includes('stone')) {
              category = 'Precious Stones';
            } else if (itemName.includes('artificial') || itemName.includes('synthetic') || itemType.includes('artificial')) {
              category = 'Artificial Stones';
            } else if (itemName.includes('jewelry') || itemName.includes('ring') || itemName.includes('necklace') || itemName.includes('bracelet') || itemName.includes('earring')) {
              category = 'Jewelry';
            }
            
            const revenue = (item.price || 0) * (item.quantity || 0);
            previousMonthCategoryMap.set(category, (previousMonthCategoryMap.get(category) || 0) + revenue);
          });
        }
      });

      const categoryPerformance = Array.from(categoryMap.entries()).map(([category, data]) => {
        const previousRevenue = previousMonthCategoryMap.get(category) || 0;
        const growth = previousRevenue > 0 ? ((data.revenue - previousRevenue) / previousRevenue) * 100 : 0;
        const avgPrice = data.count > 0 ? data.totalPrice / data.count : 0;
        
        return {
          category,
          revenue: data.revenue,
          itemsSold: data.itemsSold,
          growth,
          avgPrice
        };
      }).sort((a, b) => b.revenue - a.revenue);

      // Generate AI Suggestions based on data analysis
      const aiSuggestions: Array<{ type: string; priority: 'high' | 'medium' | 'low'; message: string; impact: string }> = [];
      
      // Low stock suggestion
      if (lowStock > 0) {
        const lowStockItems = inventoryItems.filter((item: any) => (item.inStock || item.stock || 0) > 0 && (item.inStock || item.stock || 0) < 10);
        const lowStockValue = lowStockItems.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.inStock || item.stock || 0)), 0);
        aiSuggestions.push({
          type: 'inventory',
          priority: 'high',
          message: `${lowStock} items are running low on stock. Consider restocking to avoid stockouts.`,
          impact: `₹${Math.round(lowStockValue * 0.3).toLocaleString()} potential revenue at risk`
        });
      }

      // Out of stock suggestion
      if (outOfStock > 0) {
        aiSuggestions.push({
          type: 'inventory',
          priority: 'high',
          message: `${outOfStock} items are out of stock. Restock immediately to capture lost sales.`,
          impact: 'Potential revenue loss'
        });
      }

      // Category performance suggestions
      if (categoryPerformance.length > 0) {
        const topCategory = categoryPerformance[0];
        const bottomCategory = categoryPerformance[categoryPerformance.length - 1];
        
        if (topCategory.growth > 20) {
          aiSuggestions.push({
            type: 'marketing',
            priority: 'medium',
            message: `${topCategory.category} category is showing strong growth (${topCategory.growth.toFixed(1)}%). Consider increasing inventory.`,
            impact: `₹${Math.round(topCategory.revenue * 0.15).toLocaleString()} additional revenue potential`
          });
        }
        
        if (bottomCategory.growth < -10 && bottomCategory.revenue > 0) {
          aiSuggestions.push({
            type: 'pricing',
            priority: 'medium',
            message: `${bottomCategory.category} category sales are declining (${bottomCategory.growth.toFixed(1)}%). Review pricing or marketing strategy.`,
            impact: 'Prevent further decline'
          });
        }
      }

      // Average order value suggestion
      if (averageOrder > 0 && averageOrder < 5000) {
        aiSuggestions.push({
          type: 'sales',
          priority: 'low',
          message: `Average order value is ₹${Math.round(averageOrder).toLocaleString()}. Consider upselling or bundling strategies.`,
          impact: `₹${Math.round(averageOrder * 0.2).toLocaleString()} potential increase per order`
        });
      }

      // Top selling items suggestion
      if (topItems.length > 0 && topItems[0].revenue > 0) {
        aiSuggestions.push({
          type: 'inventory',
          priority: 'medium',
          message: `${topItems[0].name} is your top seller. Ensure adequate stock levels.`,
          impact: `₹${Math.round(topItems[0].revenue * 0.1).toLocaleString()} monthly revenue`
        });
      }

      setAnalyticsData({
        monthlyRevenue,
        monthlyProfit,
        itemsSold,
        activeCustomers,
        averageOrder,
        monthlyData,
        topItems,
        weeklyData,
        totalItems,
        totalValue,
        lowStock,
        outOfStock,
        categoryPerformance,
        aiSuggestions
      });
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedLocation]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Removed data-synced listener - no longer using sync queue

  return (
    <div className={standalone ? "min-h-screen bg-gradient-elegant" : ""}>
      {standalone && (
        <header className="bg-gradient-primary shadow-elegant border-b border-border/50">
          <div className="container mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-primary-foreground">Business Analytics</h1>
                <p className="text-primary-foreground/70 text-sm">Track your jewelry business performance</p>
              </div>
              <div className="flex items-center gap-4">
                <LocationSelector 
                  onLocationChange={setSelectedLocation}
                  className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20"
                />
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-40 bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className={standalone ? "container mx-auto px-6 py-8" : "py-4"}>
        {/* Overview Stats */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Monthly Revenue"
            value={loading ? "Loading..." : `₹${analyticsData.monthlyRevenue.toLocaleString()}`}
            icon={DollarSign}
            trend={analyticsData.monthlyRevenue > 0 ? "Current month" : "No sales this month"}
          />
          <StatsCard
            title="Monthly Profit"
            value={loading ? "Loading..." : `₹${analyticsData.monthlyProfit.toLocaleString()}`}
            icon={TrendingUp}
            trend={analyticsData.monthlyProfit > 0 ? "Actual (SP - CP)" : "Cumulative profit"}
            variant="purple"
          />
          <StatsCard
            title="Items Sold"
            value={loading ? "Loading..." : analyticsData.itemsSold.toString()}
            icon={Package}
            trend={analyticsData.itemsSold > 0 ? "This month" : "No items sold"}
          />
          <StatsCard
            title="Active Customers"
            value={loading ? "Loading..." : analyticsData.activeCustomers.toString()}
            icon={Users}
            trend={analyticsData.activeCustomers > 0 ? "Active in last 30 days" : "No active customers"}
          />
          <StatsCard
            title="Average Order"
            value={loading ? "Loading..." : `₹${Math.round(analyticsData.averageOrder).toLocaleString()}`}
            icon={Target}
            trend={analyticsData.averageOrder > 0 ? "Per order" : "No orders yet"}
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Sales Trends */}
          <Card className="bg-card shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Sales Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-4 text-muted-foreground">Loading sales data...</div>
                ) : analyticsData.monthlyData.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">No sales data available</div>
                ) : (
                  analyticsData.monthlyData.map((data, index) => (
                  <div key={data.month} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 text-sm font-medium text-muted-foreground">
                        {data.month}
                      </div>
                      <div className="flex-1">
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-gold rounded-full transition-all duration-500"
                            style={{ width: `${(data.sales / 80000) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-foreground">
                        ₹{data.sales.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {data.items} items
                      </div>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Selling Items */}
          <Card className="bg-card shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Top Selling Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-4 text-muted-foreground">Loading top items...</div>
                ) : analyticsData.topItems.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">No sales data available</div>
                ) : (
                  analyticsData.topItems.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-gradient-gold rounded-lg text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">{item.sales} units sold</p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-foreground">
                        ₹{item.revenue.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Suggestions Section */}
        <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Brain className="h-6 w-6 text-purple-600" />
              AI-Powered Suggestions
              <Badge variant="secondary" className="ml-2">
                <Sparkles className="h-3 w-3 mr-1" />
                Smart Insights
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">Analyzing data...</div>
            ) : analyticsData.aiSuggestions.length === 0 ? (
              <div className="text-center py-8">
                <Lightbulb className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No suggestions at this time. Keep up the great work!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {analyticsData.aiSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 ${
                      suggestion.priority === 'high'
                        ? 'bg-red-50 border-red-200'
                        : suggestion.priority === 'medium'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        suggestion.priority === 'high'
                          ? 'bg-red-100'
                          : suggestion.priority === 'medium'
                          ? 'bg-yellow-100'
                          : 'bg-blue-100'
                      }`}>
                        {suggestion.priority === 'high' ? (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        ) : (
                          <Lightbulb className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant={
                              suggestion.priority === 'high'
                                ? 'destructive'
                                : suggestion.priority === 'medium'
                                ? 'secondary'
                                : 'outline'
                            }
                            className="text-xs"
                          >
                            {suggestion.priority.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {suggestion.type}
                          </Badge>
                        </div>
                        <p className="font-medium text-foreground mb-1">{suggestion.message}</p>
                        <p className="text-sm text-muted-foreground">{suggestion.impact}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Performance Section */}
        <Card className="bg-card shadow-card border-border/50 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <PieChart className="h-6 w-6" />
              Category Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">Loading category data...</div>
            ) : analyticsData.categoryPerformance.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No category data available</div>
            ) : (
              <div className="space-y-4">
                {analyticsData.categoryPerformance.map((category, index) => {
                  const maxRevenue = Math.max(...analyticsData.categoryPerformance.map(c => c.revenue));
                  const revenuePercentage = maxRevenue > 0 ? (category.revenue / maxRevenue) * 100 : 0;
                  
                  return (
                    <div key={category.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 bg-gradient-gold rounded-lg text-primary font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{category.category}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              {category.growth > 0 ? (
                                <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  +{category.growth.toFixed(1)}%
                                </Badge>
                              ) : category.growth < 0 ? (
                                <Badge variant="destructive" className="text-xs">
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                  {category.growth.toFixed(1)}%
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">No change</Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {category.itemsSold} items sold
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-foreground">
                            ₹{category.revenue.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Avg: ₹{Math.round(category.avgPrice).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-gold rounded-full transition-all duration-500"
                          style={{ width: `${revenuePercentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Quick Insights */}
          <Card className="bg-card shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Growth Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground mb-1">
                  {loading ? "..." : analyticsData.monthlyRevenue > 0 ? "Active" : "0%"}
                </div>
                <div className="text-sm text-muted-foreground">Revenue Status</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground mb-1">
                  {loading ? "..." : analyticsData.activeCustomers}
                </div>
                <div className="text-sm text-muted-foreground">Active Customers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground mb-1">
                  {loading ? "..." : analyticsData.itemsSold}
                </div>
                <div className="text-sm text-muted-foreground">Items Sold This Month</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center py-4 text-muted-foreground">Loading weekly data...</div>
              ) : analyticsData.weeklyData.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No sales this week</div>
              ) : (
                <>
                  {analyticsData.weeklyData.map((dayData) => (
                    <div key={dayData.day} className="flex justify-between">
                      <span className="text-muted-foreground">{dayData.day}</span>
                      <span className="font-medium text-foreground">₹{dayData.sales.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span className="text-foreground">Total</span>
                    <span className="text-foreground">
                      ₹{analyticsData.weeklyData.reduce((sum, d) => sum + d.sales, 0).toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5" />
                Inventory Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Items</span>
                <span className="font-medium text-foreground">
                  {loading ? "..." : analyticsData.totalItems.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Low Stock</span>
                <span className="font-medium text-amber-600">
                  {loading ? "..." : analyticsData.lowStock}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Out of Stock</span>
                <span className="font-medium text-red-600">
                  {loading ? "..." : analyticsData.outOfStock}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">This Month Sales</span>
                <span className="font-medium text-green-600">
                  {loading ? "..." : analyticsData.itemsSold}
                </span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-foreground">Total Value</span>
                <span className="text-foreground">
                  {loading ? "..." : `₹${(analyticsData.totalValue / 1000000).toFixed(1)}M`}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* AI Assistant Floating Button */}
      <div className="fixed bottom-6 right-6 z-40">
        {!showChat && (
          <Button 
            onClick={() => setShowChat(true)}
            className="rounded-full shadow-lg hover:shadow-xl transition-all p-4 h-14 w-40 flex gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0"
          >
            <Sparkles className="h-5 w-5" />
            <span className="font-semibold">Ask AI</span>
          </Button>
        )}
      </div>

      {/* AI Assistant Chat Modal */}
      <AIChatAssistant visible={showChat} onClose={() => setShowChat(false)} />
    </div>
  );
};

export default Analytics;
