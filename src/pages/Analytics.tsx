import { useState, useEffect, useCallback } from "react";
import { Navigation } from "@/components/Navigation";
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
  Filter
} from "lucide-react";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { getUserData } from "@/lib/userStorage";

interface AnalyticsData {
  monthlyRevenue: number;
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
}

const Analytics = () => {
  const { data: dateRange, updateData: setDateRange} = useOfflineStorage<string>("analytics_dateRange", "month");
  const { data: searchQuery, updateData: setSearchQuery } = useOfflineStorage<string>("analytics_search", "");
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    monthlyRevenue: 0,
    itemsSold: 0,
    activeCustomers: 0,
    averageOrder: 0,
    monthlyData: [],
    topItems: [],
    weeklyData: [],
    totalItems: 0,
    totalValue: 0,
    lowStock: 0,
    outOfStock: 0
  });
  const [loading, setLoading] = useState(true);
  
  // Load real user-scoped data for analytics
  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load all user-scoped data with proper defaults
      const [invoicesData, inventoryData, customersData] = await Promise.all([
        getUserData<any[]>('pos_recentInvoices'),
        getUserData<any[]>('inventory_items'),
        getUserData<any[]>('customers'),
      ]);

      // Ensure arrays are defined
      const invoices = Array.isArray(invoicesData) ? invoicesData : [];
      const inventoryItems = Array.isArray(inventoryData) ? inventoryData : [];
      const customers = Array.isArray(customersData) ? customersData : [];

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

      // Calculate monthly revenue
      const monthlyRevenue = currentMonthInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
      
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

      setAnalyticsData({
        monthlyRevenue,
        itemsSold,
        activeCustomers,
        averageOrder,
        monthlyData,
        topItems,
        weeklyData,
        totalItems,
        totalValue,
        lowStock,
        outOfStock
      });
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Listen for sync completion events to reload data in background
  useEffect(() => {
    const handleDataSynced = () => {
      loadAnalyticsData();
    };

    window.addEventListener('data-synced', handleDataSynced);
    
    return () => {
      window.removeEventListener('data-synced', handleDataSynced);
    };
  }, [loadAnalyticsData]);

  return (
    <div className="min-h-screen bg-gradient-elegant">
      <Navigation />
      
      <header className="bg-gradient-primary shadow-elegant border-b border-border/50">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground">Business Analytics</h1>
              <p className="text-primary-foreground/70 text-sm">Track your jewelry business performance</p>
            </div>
            <div className="flex items-center gap-4">
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

      <main className="container mx-auto px-6 py-8">
        {/* Overview Stats */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Monthly Revenue"
            value={loading ? "Loading..." : `₹${analyticsData.monthlyRevenue.toLocaleString()}`}
            icon={DollarSign}
            trend={analyticsData.monthlyRevenue > 0 ? "Current month" : "No sales this month"}
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
    </div>
  );
};

export default Analytics;
