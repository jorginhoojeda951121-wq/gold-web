import { useState } from "react";
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

const Analytics = () => {
  const { data: selectedLocation, updateData: setSelectedLocation } = useOfflineStorage<string>("analytics_location", "all");
  const { data: dateRange, updateData: setDateRange } = useOfflineStorage<string>("analytics_dateRange", "month");
  const { data: searchQuery, updateData: setSearchQuery } = useOfflineStorage<string>("analytics_search", "");
  
  const locations = [
    { id: "all", name: "All Locations" },
    { id: "mumbai", name: "Mumbai Store" },
    { id: "delhi", name: "Delhi Store" },
    { id: "bangalore", name: "Bangalore Store" },
    { id: "kolkata", name: "Kolkata Store" }
  ];
  
  // Mock data for analytics
  const monthlyData = [
    { month: "Jan", sales: 45000, items: 89 },
    { month: "Feb", sales: 52000, items: 102 },
    { month: "Mar", sales: 61000, items: 118 },
    { month: "Apr", sales: 58000, items: 114 },
    { month: "May", sales: 67000, items: 131 },
    { month: "Jun", sales: 72000, items: 142 },
  ];

  const topItems = [
    { name: "Diamond Engagement Rings", sales: 25, revenue: 87500 },
    { name: "Gold Necklaces", sales: 18, revenue: 32400 },
    { name: "Pearl Earrings", sales: 15, revenue: 11250 },
    { name: "Silver Bracelets", sales: 12, revenue: 7200 },
    { name: "Ruby Pendants", sales: 8, revenue: 14400 },
  ];

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
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-48 bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(location => (
                    <SelectItem key={location.id} value={location.id}>{location.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            value="₹7,20,000"
            icon={DollarSign}
            trend="+12% from last month"
          />
          <StatsCard
            title="Items Sold"
            value="142"
            icon={Package}
            trend="+8% from last month"
          />
          <StatsCard
            title="Active Customers"
            value="89"
            icon={Users}
            trend="+15% new customers"
          />
          <StatsCard
            title="Average Order"
            value="₹50,700"
            icon={Target}
            trend="+5% increase"
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
                {monthlyData.map((data, index) => (
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
                ))}
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
                {topItems.map((item, index) => (
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
                ))}
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
                <div className="text-2xl font-bold text-foreground mb-1">24%</div>
                <div className="text-sm text-muted-foreground">Revenue Growth (YoY)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground mb-1">156</div>
                <div className="text-sm text-muted-foreground">New Customers This Month</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground mb-1">94%</div>
                <div className="text-sm text-muted-foreground">Customer Satisfaction</div>
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monday</span>
                <span className="font-medium text-foreground">₹24,500</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tuesday</span>
                <span className="font-medium text-foreground">₹31,200</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Wednesday</span>
                <span className="font-medium text-foreground">₹28,900</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Thursday</span>
                <span className="font-medium text-foreground">₹42,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Friday</span>
                <span className="font-medium text-foreground">₹56,700</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saturday</span>
                <span className="font-medium text-foreground">₹61,200</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">₹2,44,500</span>
              </div>
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
                <span className="font-medium text-foreground">1,247</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Low Stock</span>
                <span className="font-medium text-amber-600">23</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Out of Stock</span>
                <span className="font-medium text-red-600">5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New This Month</span>
                <span className="font-medium text-green-600">47</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-foreground">Total Value</span>
                <span className="text-foreground">₹28M</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Analytics;