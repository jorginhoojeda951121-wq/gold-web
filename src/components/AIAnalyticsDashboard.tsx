import { useState } from "react";
import { TrendingUp, BarChart3, PieChart, Users, ShoppingCart, DollarSign, Zap, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const AIAnalyticsDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("7days");
  const [selectedLocation, setSelectedLocation] = useState("all");

  // Mock AI analytics data
  const aiInsights = {
    salesTrend: {
      direction: "up",
      percentage: 12.5,
      prediction: "Sales likely to increase by 8% next week based on seasonal patterns"
    },
    topProducts: [
      { name: "Gold Chains", sales: 45, trend: "up", aiScore: 92 },
      { name: "Diamond Earrings", sales: 32, trend: "up", aiScore: 88 },
      { name: "Silver Bracelets", sales: 28, trend: "down", aiScore: 75 },
      { name: "Artificial Jewelry", sales: 67, trend: "up", aiScore: 95 }
    ],
    customerBehavior: {
      peakHours: "2 PM - 5 PM",
      averageVisitDuration: "12 minutes",
      conversionRate: 23.5,
      returnCustomerRate: 34.2
    },
    inventoryOptimization: {
      overstocked: ["Pearl Necklaces", "Vintage Brooches"],
      understocked: ["Gold Rings", "Diamond Studs"],
      reorderSuggestions: 8
    },
    financialMetrics: {
      revenue: 145000,
      profit: 58000,
      profitMargin: 40,
      cashFlow: "positive"
    },
    aiRecommendations: [
      {
        type: "inventory",
        priority: "high",
        message: "Restock Gold Rings - AI predicts 67% chance of stockout in 5 days",
        impact: "₹23,000 potential loss prevention"
      },
      {
        type: "pricing",
        priority: "medium", 
        message: "Consider 5% price increase on Artificial Jewelry - demand is 40% above average",
        impact: "₹8,500 additional monthly revenue"
      },
      {
        type: "marketing",
        priority: "low",
        message: "Launch Silver Collection promotion - competitors showing weakness",
        impact: "15% potential sales increase"
      }
    ]
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'default';
    }
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? '📈' : '📉';
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">AI Analytics Dashboard</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Intelligent insights powered by artificial intelligence
        </p>
      </div>

      {/* Controls */}
      <div className="flex gap-4 justify-center">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="90days">Last 90 Days</SelectItem>
            <SelectItem value="1year">Last Year</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            <SelectItem value="mumbai">Main Store - Mumbai</SelectItem>
            <SelectItem value="delhi">Branch - Delhi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales AI</TabsTrigger>
          <TabsTrigger value="inventory">Inventory AI</TabsTrigger>
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Score</CardTitle>
                <Zap className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">94/100</div>
                <p className="text-xs text-muted-foreground">
                  Business performance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{aiInsights.financialMetrics.revenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {getTrendIcon(aiInsights.salesTrend.direction)} +{aiInsights.salesTrend.percentage}% vs last period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aiInsights.customerBehavior.conversionRate}%</div>
                <p className="text-xs text-muted-foreground">
                  Customer conversion
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
                <PieChart className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aiInsights.financialMetrics.profitMargin}%</div>
                <p className="text-xs text-muted-foreground">
                  Above industry avg
                </p>
              </CardContent>
            </Card>
          </div>

          {/* AI Prediction */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <span>AI Sales Prediction</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-900 font-medium mb-2">📊 Next Week Forecast</p>
                <p className="text-blue-800">{aiInsights.salesTrend.prediction}</p>
                <div className="mt-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Confidence Level</span>
                    <span>87%</span>
                  </div>
                  <Progress value={87} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {aiInsights.topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {product.sales} units sold
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">AI: {product.aiScore}/100</Badge>
                        <span className="text-lg">{getTrendIcon(product.trend)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Behavior Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Peak Hours</div>
                    <div className="font-medium">{aiInsights.customerBehavior.peakHours}</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Avg Visit Duration</div>
                    <div className="font-medium">{aiInsights.customerBehavior.averageVisitDuration}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Conversion Rate</div>
                    <div className="font-medium">{aiInsights.customerBehavior.conversionRate}%</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Return Customers</div>
                    <div className="font-medium">{aiInsights.customerBehavior.returnCustomerRate}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Overstocked Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiInsights.inventoryOptimization.overstocked.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-red-200 bg-red-50 rounded-lg">
                      <span className="font-medium">{item}</span>
                      <Badge variant="destructive">Excess Stock</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-orange-600">Understocked Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiInsights.inventoryOptimization.understocked.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-orange-200 bg-orange-50 rounded-lg">
                      <span className="font-medium">{item}</span>
                      <Badge variant="secondary">Reorder Soon</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>AI Reorder Suggestions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-900 font-medium mb-2">
                  🤖 AI has identified {aiInsights.inventoryOptimization.reorderSuggestions} items that need restocking
                </p>
                <p className="text-green-800">
                  Based on sales velocity, seasonal trends, and supplier lead times, we recommend immediate action on critical items.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-primary mb-2">AI-Powered Recommendations</h3>
              <p className="text-muted-foreground">
                Actionable insights to optimize your business performance
              </p>
            </div>

            <div className="space-y-4">
              {aiInsights.aiRecommendations.map((recommendation, index) => (
                <Card key={index} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <Badge variant={getPriorityColor(recommendation.priority) as any}>
                          {recommendation.priority.toUpperCase()} PRIORITY
                        </Badge>
                        <Badge variant="outline">
                          {recommendation.type.charAt(0).toUpperCase() + recommendation.type.slice(1)}
                        </Badge>
                      </div>
                      <p className="font-medium text-lg mb-2">{recommendation.message}</p>
                      <p className="text-green-600 font-medium">
                        💰 {recommendation.impact}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl mb-2">
                        {recommendation.type === 'inventory' && '📦'}
                        {recommendation.type === 'pricing' && '💰'}
                        {recommendation.type === 'marketing' && '📢'}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="text-center">
                <Zap className="h-12 w-12 mx-auto text-blue-600 mb-4" />
                <h4 className="text-xl font-bold text-blue-900 mb-2">
                  AI Optimization Complete
                </h4>
                <p className="text-blue-800">
                  Implementing these recommendations could increase your monthly revenue by up to ₹47,000 
                  and reduce costs by ₹23,000.
                </p>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};