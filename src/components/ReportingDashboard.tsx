import { useState } from "react";
import { FileText, Download, Calendar, TrendingUp, PieChart, BarChart3, Users } from "lucide-react";
import jsPDF from 'jspdf';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export const ReportingDashboard = () => {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedReport, setSelectedReport] = useState("sales");

  const reportTypes = [
    { id: 'sales', name: 'Sales Report', icon: TrendingUp },
    { id: 'inventory', name: 'Inventory Report', icon: BarChart3 },
    { id: 'financial', name: 'Financial Report', icon: PieChart },
    { id: 'employee', name: 'Employee Report', icon: Users }
  ];

  // Mock report data
  const reportData = {
    sales: {
      totalSales: 2450000,
      totalOrders: 145,
      averageOrderValue: 16897,
      topProducts: [
        { name: "Gold Chains", revenue: 450000, orders: 25 },
        { name: "Diamond Earrings", revenue: 380000, orders: 18 },
        { name: "Silver Bracelets", revenue: 280000, orders: 35 },
        { name: "Artificial Jewelry", revenue: 180000, orders: 67 }
      ],
      salesByCategory: {
        gold: 45,
        diamond: 30,
        silver: 15,
        artificial: 10
      },
      monthlyTrend: [
        { month: 'Jan', sales: 180000 },
        { month: 'Feb', sales: 220000 },
        { month: 'Mar', sales: 245000 },
      ]
    },
    inventory: {
      totalItems: 856,
      totalValue: 4250000,
      lowStock: 23,
      outOfStock: 5,
      categories: {
        rings: 245,
        necklaces: 189,
        earrings: 178,
        bracelets: 134,
        brooches: 67,
        artificial: 43
      },
      topMoving: [
        { name: "Gold Rings", sold: 45, remaining: 12 },
        { name: "Diamond Studs", sold: 38, remaining: 8 },
        { name: "Silver Chains", sold: 52, remaining: 24 }
      ]
    },
    financial: {
      revenue: 2450000,
      expenses: 1470000,
      profit: 980000,
      profitMargin: 40,
      taxes: 73500,
      netProfit: 906500,
      cashFlow: {
        opening: 450000,
        closing: 680000,
        change: 230000
      },
      expenseBreakdown: {
        inventory: 60,
        salaries: 25,
        utilities: 8,
        marketing: 4,
        other: 3
      }
    },
    employee: {
      totalEmployees: 8,
      activeEmployees: 7,
      onLeave: 1,
      totalSalaries: 285000,
      averageSalary: 40714,
      attendance: 92.5,
      productivity: 87,
      departments: {
        sales: 4,
        operations: 2,
        management: 2
      }
    }
  };

  const generateReport = (type: string) => {
    toast({
      title: "Generating Report",
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} report is being generated...`
    });
    
    // Simulate report generation
    setTimeout(() => {
      toast({
        title: "Report Ready",
        description: "Your report has been generated and downloaded."
      });
    }, 2000);
  };

  const exportReport = (format: string) => {
    toast({
      title: "Exporting Report", 
      description: `Report is being exported as ${format.toUpperCase()}...`
    });

    // Get current report data
    const currentData = reportData[selectedReport as keyof typeof reportData];
    
    if (format === 'pdf') {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text(`${selectedReport.charAt(0).toUpperCase() + selectedReport.slice(1)} Report`, 20, 30);
      
      doc.setFontSize(12);
      let yPos = 50;
      
      if (selectedReport === 'sales') {
        const sales = currentData as typeof reportData.sales;
        doc.text(`Total Sales: ₹${sales.totalSales.toLocaleString()}`, 20, yPos);
        doc.text(`Total Orders: ${sales.totalOrders}`, 20, yPos + 10);
        doc.text(`Average Order Value: ₹${sales.averageOrderValue.toLocaleString()}`, 20, yPos + 20);
        
        yPos += 40;
        doc.text('Top Products:', 20, yPos);
        sales.topProducts.forEach((product, index) => {
          yPos += 10;
          doc.text(`${index + 1}. ${product.name} - ₹${product.revenue.toLocaleString()} (${product.orders} orders)`, 25, yPos);
        });
      } else if (selectedReport === 'inventory') {
        const inventory = currentData as typeof reportData.inventory;
        doc.text(`Total Items: ${inventory.totalItems}`, 20, yPos);
        doc.text(`Total Value: ₹${inventory.totalValue.toLocaleString()}`, 20, yPos + 10);
        doc.text(`Low Stock Items: ${inventory.lowStock}`, 20, yPos + 20);
        doc.text(`Out of Stock Items: ${inventory.outOfStock}`, 20, yPos + 30);
      } else if (selectedReport === 'financial') {
        const financial = currentData as typeof reportData.financial;
        doc.text(`Revenue: ₹${financial.revenue.toLocaleString()}`, 20, yPos);
        doc.text(`Expenses: ₹${financial.expenses.toLocaleString()}`, 20, yPos + 10);
        doc.text(`Net Profit: ₹${financial.netProfit.toLocaleString()}`, 20, yPos + 20);
        doc.text(`Profit Margin: ${financial.profitMargin}%`, 20, yPos + 30);
      } else if (selectedReport === 'employee') {
        const employee = currentData as typeof reportData.employee;
        doc.text(`Total Employees: ${employee.totalEmployees}`, 20, yPos);
        doc.text(`Active Employees: ${employee.activeEmployees}`, 20, yPos + 10);
        doc.text(`Average Salary: ₹${employee.averageSalary.toLocaleString()}`, 20, yPos + 20);
        doc.text(`Attendance Rate: ${employee.attendance}%`, 20, yPos + 30);
      }
      
      doc.save(`${selectedReport}_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } else if (format === 'csv' || format === 'excel') {
      let csvContent = '';
      
      if (selectedReport === 'sales') {
        const sales = currentData as typeof reportData.sales;
        csvContent = 'Metric,Value\n';
        csvContent += `Total Sales,₹${sales.totalSales.toLocaleString()}\n`;
        csvContent += `Total Orders,${sales.totalOrders}\n`;
        csvContent += `Average Order Value,₹${sales.averageOrderValue.toLocaleString()}\n\n`;
        csvContent += 'Product,Revenue,Orders\n';
        sales.topProducts.forEach(product => {
          csvContent += `${product.name},₹${product.revenue.toLocaleString()},${product.orders}\n`;
        });
      } else if (selectedReport === 'inventory') {
        const inventory = currentData as typeof reportData.inventory;
        csvContent = 'Metric,Value\n';
        csvContent += `Total Items,${inventory.totalItems}\n`;
        csvContent += `Total Value,₹${inventory.totalValue.toLocaleString()}\n`;
        csvContent += `Low Stock,${inventory.lowStock}\n`;
        csvContent += `Out of Stock,${inventory.outOfStock}\n\n`;
        csvContent += 'Category,Count\n';
        Object.entries(inventory.categories).forEach(([category, count]) => {
          csvContent += `${category},${count}\n`;
        });
      } else if (selectedReport === 'financial') {
        const financial = currentData as typeof reportData.financial;
        csvContent = 'Metric,Value\n';
        csvContent += `Revenue,₹${financial.revenue.toLocaleString()}\n`;
        csvContent += `Expenses,₹${financial.expenses.toLocaleString()}\n`;
        csvContent += `Net Profit,₹${financial.netProfit.toLocaleString()}\n`;
        csvContent += `Profit Margin,${financial.profitMargin}%\n`;
      } else if (selectedReport === 'employee') {
        const employee = currentData as typeof reportData.employee;
        csvContent = 'Metric,Value\n';
        csvContent += `Total Employees,${employee.totalEmployees}\n`;
        csvContent += `Active Employees,${employee.activeEmployees}\n`;
        csvContent += `Average Salary,₹${employee.averageSalary.toLocaleString()}\n`;
        csvContent += `Attendance Rate,${employee.attendance}%\n`;
      }
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${selectedReport}_report_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    setTimeout(() => {
      toast({
        title: "Report Downloaded",
        description: `Your ${selectedReport} report has been downloaded as ${format.toUpperCase()}.`
      });
    }, 1000);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">Reporting Dashboard</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Comprehensive business reports and analytics
        </p>
      </div>

      {/* Controls */}
      <div className="flex gap-4 justify-center">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={selectedReport} onValueChange={setSelectedReport}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {reportTypes.map(type => (
              <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button onClick={() => generateReport(selectedReport)}>
          <FileText className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </div>

      <Tabs value={selectedReport} onValueChange={setSelectedReport} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {reportTypes.map(type => {
            const Icon = type.icon;
            return (
              <TabsTrigger key={type.id} value={type.id}>
                <Icon className="h-4 w-4 mr-2" />
                {type.name.split(' ')[0]}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="sales">
          <div className="space-y-6">
            {/* Sales Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{reportData.sales.totalSales.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">+12.5% from last period</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.sales.totalOrders}</div>
                  <p className="text-xs text-muted-foreground">+8.3% from last period</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{reportData.sales.averageOrderValue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">+3.7% from last period</p>
                </CardContent>
              </Card>
            </div>

            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.sales.topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">{product.orders} orders</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">₹{product.revenue.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Revenue</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sales by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Sales by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(reportData.sales.salesByCategory).map(([category, percentage]) => (
                    <div key={category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{category}</span>
                        <span>{percentage}%</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle>Export Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => exportReport('pdf')}>
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button variant="outline" onClick={() => exportReport('csv')}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                  <Button variant="outline" onClick={() => exportReport('csv')}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory">
          <div className="space-y-6">
            {/* Inventory Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.inventory.totalItems}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{(reportData.inventory.totalValue / 1000000).toFixed(1)}M</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{reportData.inventory.lowStock}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{reportData.inventory.outOfStock}</div>
                </CardContent>
              </Card>
            </div>

            {/* Inventory by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(reportData.inventory.categories).map(([category, count]) => (
                    <div key={category} className="p-3 border rounded-lg text-center">
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-sm text-muted-foreground capitalize">{category}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Fast Moving Items */}
            <Card>
              <CardHeader>
                <CardTitle>Fast Moving Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.inventory.topMoving.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">{item.sold} sold this period</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{item.remaining} remaining</div>
                        <Badge variant={item.remaining < 10 ? 'destructive' : 'default'}>
                          {item.remaining < 10 ? 'Low Stock' : 'In Stock'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle>Export Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => exportReport('pdf')}>
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button variant="outline" onClick={() => exportReport('csv')}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                  <Button variant="outline" onClick={() => exportReport('csv')}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial">
          <div className="space-y-6">
            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">₹{(reportData.financial.revenue / 1000000).toFixed(1)}M</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">₹{(reportData.financial.expenses / 1000000).toFixed(1)}M</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">₹{(reportData.financial.netProfit / 1000000).toFixed(1)}M</div>
                  <p className="text-xs text-muted-foreground">{reportData.financial.profitMargin}% margin</p>
                </CardContent>
              </Card>
            </div>

            {/* Cash Flow */}
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-lg font-bold">₹{(reportData.financial.cashFlow.opening / 1000).toFixed(0)}K</div>
                    <div className="text-sm text-muted-foreground">Opening Balance</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-lg font-bold text-green-600">+₹{(reportData.financial.cashFlow.change / 1000).toFixed(0)}K</div>
                    <div className="text-sm text-muted-foreground">Net Change</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-lg font-bold">₹{(reportData.financial.cashFlow.closing / 1000).toFixed(0)}K</div>
                    <div className="text-sm text-muted-foreground">Closing Balance</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expense Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(reportData.financial.expenseBreakdown).map(([category, percentage]) => (
                    <div key={category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{category}</span>
                        <span>{percentage}%</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle>Export Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => exportReport('pdf')}>
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button variant="outline" onClick={() => exportReport('csv')}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                  <Button variant="outline" onClick={() => exportReport('csv')}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employee">
          <div className="space-y-6">
            {/* Employee Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.employee.totalEmployees}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Active</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{reportData.employee.activeEmployees}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">On Leave</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{reportData.employee.onLeave}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.employee.attendance}%</div>
                </CardContent>
              </Card>
            </div>

            {/* Salary Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Salary Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border rounded-lg">
                    <div className="text-lg font-bold">₹{reportData.employee.totalSalaries.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total Monthly Salaries</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-lg font-bold">₹{reportData.employee.averageSalary.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Average Salary</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Department Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Department Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(reportData.employee.departments).map(([dept, count]) => (
                    <div key={dept} className="p-3 border rounded-lg text-center">
                      <div className="text-xl font-bold">{count}</div>
                      <div className="text-sm text-muted-foreground capitalize">{dept}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle>Export Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => exportReport('pdf')}>
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button variant="outline" onClick={() => exportReport('csv')}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                  <Button variant="outline" onClick={() => exportReport('csv')}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};