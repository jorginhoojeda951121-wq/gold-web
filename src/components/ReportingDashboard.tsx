import { useState, useEffect, useCallback } from "react";
import { FileText, Download, Calendar, TrendingUp, PieChart, BarChart3, Users } from "lucide-react";
import jsPDF from 'jspdf';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getUserData } from "@/lib/userStorage";
import { getSupabase } from "@/lib/supabase";

export const ReportingDashboard = () => {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedReport, setSelectedReport] = useState("sales");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const reportTypes = [
    { id: 'sales', name: 'Sales Report', icon: TrendingUp },
    { id: 'inventory', name: 'Inventory Report', icon: BarChart3 },
    { id: 'financial', name: 'Financial Report', icon: PieChart },
    { id: 'employee', name: 'Employee Report', icon: Users }
  ];

  // Load real user-scoped data for reports
  const loadReportData = useCallback(async () => {
    setLoading(true);
    
    try {
      // Load all user-scoped data with proper null/undefined handling
      const [invoicesRaw, inventoryItemsRaw, customersRaw, employeesRaw, vendorsRaw, craftsmenRaw, transactionsRaw] = await Promise.all([
        getUserData<any[]>('pos_recentInvoices'),
        getUserData<any[]>('inventory_items'),
        getUserData<any[]>('customers'),
        getUserData<any[]>('staff'),
        getUserData<any[]>('vendors'),
        getUserData<any[]>('craftsmen'),
        getUserData<any[]>('customer_transactions'),
      ]);

      // Ensure all data is an array (handle undefined/null)
      const invoices = Array.isArray(invoicesRaw) ? invoicesRaw : [];
      const inventoryItems = Array.isArray(inventoryItemsRaw) ? inventoryItemsRaw : [];
      const customers = Array.isArray(customersRaw) ? customersRaw : [];
      const employees = Array.isArray(employeesRaw) ? employeesRaw : [];
      const vendors = Array.isArray(vendorsRaw) ? vendorsRaw : [];
      const craftsmen = Array.isArray(craftsmenRaw) ? craftsmenRaw : [];
      const transactions = Array.isArray(transactionsRaw) ? transactionsRaw : [];

      // Filter invoices by selected period
      const now = new Date();
      let periodStart: Date;
      
      switch (selectedPeriod) {
        case 'week':
          periodStart = new Date(now);
          periodStart.setDate(periodStart.getDate() - 7);
          break;
        case 'month':
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          periodStart = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case 'year':
          periodStart = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const filteredInvoices = Array.isArray(invoices)
        ? invoices.filter((inv: any) => {
            if (!inv?.date) return false;
            const invDate = new Date(inv.date);
            return invDate >= periodStart && invDate <= now;
          })
        : [];

      // Calculate sales report data - with safe array operations
      const totalSales = filteredInvoices.reduce((sum: number, inv: any) => sum + (inv?.total || 0), 0);
      const totalOrders = filteredInvoices.length;
      const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

      // Top products by revenue (from filtered invoices)
      const productRevenueMap = new Map<string, { revenue: number; orders: number }>();
      filteredInvoices.forEach((inv: any) => {
        if (inv?.items && Array.isArray(inv.items)) {
          inv.items.forEach((item: any) => {
            const itemName = item.name || 'Unknown Item';
            const revenue = (item.price || 0) * (item.quantity || 0);
            const existing = productRevenueMap.get(itemName);
            if (existing) {
              existing.revenue += revenue;
              existing.orders += 1;
            } else {
              productRevenueMap.set(itemName, { revenue, orders: 1 });
            }
          });
        }
      });

      const topProducts = Array.from(productRevenueMap.entries())
        .map(([name, data]) => ({ name, revenue: data.revenue, orders: data.orders }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 4);

      // Calculate inventory report data - with safe array operations
      const totalItems = Array.isArray(inventoryItems) ? inventoryItems.length : 0;
      const totalValue = Array.isArray(inventoryItems)
        ? inventoryItems.reduce((sum: number, item: any) => sum + ((item?.price || 0) * (item?.inStock || item?.stock || 0)), 0)
        : 0;
      const lowStock = Array.isArray(inventoryItems)
        ? inventoryItems.filter((item: any) => (item?.inStock || item?.stock || 0) > 0 && (item?.inStock || item?.stock || 0) < 10).length
        : 0;
      const outOfStock = Array.isArray(inventoryItems)
        ? inventoryItems.filter((item: any) => (item?.inStock || item?.stock || 0) === 0).length
        : 0;

      // Calculate expense breakdown
      // 1. Salary expenses (monthly salaries from employees)
      const monthlySalaries = Array.isArray(employees)
        ? employees.reduce((sum: number, emp: any) => {
            const salary = parseFloat(String(emp?.salary || 0)) || 0;
            return sum + salary;
          }, 0)
        : 0;

      // 2. Vendor payments (outstanding balances + total purchases)
      const vendorPayments = Array.isArray(vendors)
        ? vendors.reduce((sum: number, vendor: any) => {
            const outstanding = parseFloat(String(vendor?.outstanding_balance || 0)) || 0;
            const totalPurchases = parseFloat(String(vendor?.total_purchases || 0)) || 0;
            // Use outstanding balance if available, otherwise use total purchases as estimate
            return sum + (outstanding > 0 ? outstanding : totalPurchases * 0.1); // 10% of purchases as estimate if no outstanding
          }, 0)
        : 0;

      // 3. Vendor invoices (from vendor data - total purchases can represent invoices)
      const vendorInvoices = Array.isArray(vendors)
        ? vendors.reduce((sum: number, vendor: any) => {
            const totalPurchases = parseFloat(String(vendor?.total_purchases || 0)) || 0;
            return sum + totalPurchases;
          }, 0)
        : 0;

      // 4. Craftsmen payments (from payment history)
      const craftsmenPayments = Array.isArray(craftsmen)
        ? craftsmen.reduce((sum: number, craftsman: any) => {
            const paymentHistory = Array.isArray(craftsman?.paymentHistory) ? craftsman.paymentHistory : [];
            const totalPaid = paymentHistory.reduce((paySum: number, payment: any) => {
              return paySum + (parseFloat(String(payment?.amount || 0)) || 0);
            }, 0);
            return sum + totalPaid;
          }, 0)
        : 0;

      // 5. Customer ledger (outstanding balances from customers)
      const customerLedgerOutstanding = Array.isArray(customers)
        ? customers.reduce((sum: number, customer: any) => {
            const balance = parseFloat(String(customer?.currentBalance || 0)) || 0;
            return sum + balance;
          }, 0)
        : 0;

      // Total expenses (excluding bills and marketing as per requirements)
      const totalExpenses = monthlySalaries + vendorPayments + vendorInvoices + craftsmenPayments + customerLedgerOutstanding;

      // Calculate financial report data
      const revenue = totalSales;
      const expenses = totalExpenses;
      const profit = revenue - expenses;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const taxes = revenue * 0.03; // 3% GST estimate
      const netProfit = profit - taxes;

      // Calculate employee report data - with safe array operations
      const totalEmployees = Array.isArray(employees) ? employees.length : 0;
      // Handle both 'Active'/'Inactive' and 'active'/'inactive' status values (case-insensitive)
      const activeEmployees = Array.isArray(employees)
        ? employees.filter((emp: any) => {
            const status = String(emp?.status || '').toLowerCase();
            return status === 'active';
          }).length
        : 0;
      const onLeave = Array.isArray(employees)
        ? employees.filter((emp: any) => {
            const status = String(emp?.status || '').toLowerCase();
            return status === 'inactive';
          }).length
        : 0;
      const totalSalaries = Array.isArray(employees)
        ? employees.reduce((sum: number, emp: any) => {
            const salary = parseFloat(String(emp?.salary || 0)) || 0;
            return sum + salary;
          }, 0)
        : 0;
      const averageSalary = totalEmployees > 0 ? totalSalaries / totalEmployees : 0;

      // Build report data object
      const data = {
        sales: {
          totalSales,
          totalOrders,
          averageOrderValue: Math.round(averageOrderValue),
          topProducts,
          salesByCategory: {
            gold: 0, // Would need category tracking
            diamond: 0,
            silver: 0,
            artificial: 0
          },
          monthlyTrend: [] // Would need date-based grouping
        },
        inventory: {
          totalItems,
          totalValue,
          lowStock,
          outOfStock,
          categories: {
            rings: 0, // Would need category tracking
            necklaces: 0,
            earrings: 0,
            bracelets: 0,
            brooches: 0,
            artificial: 0
          },
          topMoving: topProducts.slice(0, 3).map(p => ({
            name: p.name,
            sold: p.orders,
            remaining: 0 // Would need stock tracking
          }))
        },
        financial: {
          revenue,
          expenses,
          profit,
          profitMargin: Math.round(profitMargin),
          taxes: Math.round(taxes),
          netProfit: Math.round(netProfit),
          cashFlow: {
            opening: 0, // Would need cash flow tracking
            closing: revenue,
            change: revenue
          },
          expenseBreakdown: {
            salaries: totalExpenses > 0 ? (monthlySalaries / totalExpenses) * 100 : 0,
            vendorPay: totalExpenses > 0 ? (vendorPayments / totalExpenses) * 100 : 0,
            vendorInvoices: totalExpenses > 0 ? (vendorInvoices / totalExpenses) * 100 : 0,
            craftsmenPay: totalExpenses > 0 ? (craftsmenPayments / totalExpenses) * 100 : 0,
            customerLedger: totalExpenses > 0 ? (customerLedgerOutstanding / totalExpenses) * 100 : 0
          },
          expenseDetails: {
            salaries: monthlySalaries,
            vendorPay: vendorPayments,
            vendorInvoices: vendorInvoices,
            craftsmenPay: craftsmenPayments,
            customerLedger: customerLedgerOutstanding
          }
        },
        employee: {
          totalEmployees,
          activeEmployees,
          onLeave,
          totalSalaries,
          averageSalary: Math.round(averageSalary),
          attendance: 0, // Would need attendance tracking
          productivity: 0, // Would need productivity tracking
          departments: {
            sales: employees.filter((e: any) => String(e.department || '').toLowerCase() === 'sales').length,
            operations: employees.filter((e: any) => String(e.department || '').toLowerCase() === 'operations').length,
            management: employees.filter((e: any) => String(e.department || '').toLowerCase() === 'management').length
          }
        }
      };

      
      setReportData(data);
    } catch (error: any) {
      console.error('❌ Error loading report data:', error);
      toast({
        title: "Error Loading Report Data",
        description: error?.message || "Failed to load report data. Please try again.",
        variant: "destructive"
      });
      // Fallback to empty data
      setReportData({
        sales: { totalSales: 0, totalOrders: 0, averageOrderValue: 0, topProducts: [], salesByCategory: {}, monthlyTrend: [] },
        inventory: { totalItems: 0, totalValue: 0, lowStock: 0, outOfStock: 0, categories: {}, topMoving: [] },
        financial: { revenue: 0, expenses: 0, profit: 0, profitMargin: 0, taxes: 0, netProfit: 0, cashFlow: {}, expenseBreakdown: {}, expenseDetails: {} },
        employee: { totalEmployees: 0, activeEmployees: 0, onLeave: 0, totalSalaries: 0, averageSalary: 0, attendance: 0, productivity: 0, departments: {} }
      });
    } finally {
      // Always set loading to false, even if there was an error
      setLoading(false);
    }
  }, [selectedPeriod]);

  // Removed data-synced listener - no longer using sync queue

  // Load data on mount and when user changes
  useEffect(() => {
    loadReportData();
    
    // Listen for auth state changes to reload data when user changes
    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Clear user ID cache when user changes to ensure fresh data load
      const { clearUserIdCache } = await import('@/lib/userStorage');
      clearUserIdCache();
      
      // Reload data when user changes (login/logout)
      if (session?.user?.id) {
        // Small delay to ensure cache is cleared and new user ID is fetched
        setTimeout(() => {
          loadReportData();
        }, 100);
      } else {
        // User logged out, clear data
        setReportData({
          sales: { totalSales: 0, totalOrders: 0, averageOrderValue: 0, topProducts: [], salesByCategory: {}, monthlyTrend: [] },
          inventory: { totalItems: 0, totalValue: 0, lowStock: 0, outOfStock: 0, categories: {}, topMoving: [] },
          financial: { revenue: 0, expenses: 0, profit: 0, profitMargin: 0, taxes: 0, netProfit: 0, cashFlow: {}, expenseBreakdown: {}, expenseDetails: {} },
          employee: { totalEmployees: 0, activeEmployees: 0, onLeave: 0, totalSalaries: 0, averageSalary: 0, attendance: 0, productivity: 0, departments: {} }
        });
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [loadReportData]);

  // Reload data when window gains focus or becomes visible (in case sync happened)
  useEffect(() => {
    const handleFocus = () => {
      loadReportData();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadReportData();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadReportData]);

  const generateReport = async (type: string) => {
    try {
      setLoading(true);
      toast({
        title: "Generating Report",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} report is being generated...`
      });
      
      // Reload fresh data before generating report
      await loadReportData();
      
      // Wait a moment for data to be set
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Generate PDF report
      if (!reportData) {
        throw new Error("Report data not available. Please try again.");
      }
      
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text(`${type.charAt(0).toUpperCase() + type.slice(1)} Report`, 20, 30);
      doc.setFontSize(12);
      doc.text(`Period: ${selectedPeriod}`, 20, 40);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 50);
      
      let yPos = 70;
      const currentData = reportData[type as keyof typeof reportData];
      
      if (currentData) {
        Object.entries(currentData).forEach(([key, value]) => {
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }
          if (typeof value === 'object' && value !== null) {
            doc.text(`${key}:`, 20, yPos);
            yPos += 10;
            Object.entries(value).forEach(([subKey, subValue]) => {
              if (yPos > 250) {
                doc.addPage();
                yPos = 20;
              }
              doc.text(`  ${subKey}: ${subValue}`, 25, yPos);
              yPos += 7;
            });
          } else {
            doc.text(`${key}: ${value}`, 20, yPos);
            yPos += 10;
          }
        });
      }
      
      doc.save(`${type}-report-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "Report Generated",
        description: "Your report has been generated and downloaded successfully."
      });
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (format: string) => {
    toast({
      title: "Exporting Report", 
      description: `Report is being exported as ${format.toUpperCase()}...`
    });

    // Get current report data
    if (!reportData) {
      toast({
        title: "Error",
        description: "Report data not loaded. Please try again.",
        variant: "destructive"
      });
      return;
    }
    const currentData = reportData[selectedReport as keyof typeof reportData];
    
    if (format === 'pdf') {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text(`${selectedReport.charAt(0).toUpperCase() + selectedReport.slice(1)} Report`, 20, 30);
      
      doc.setFontSize(10);
      doc.text(`Period: ${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}`, 20, 40);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);
      
      doc.setFontSize(12);
      let yPos = 55;
      
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
        
        if (inventory.topMoving && inventory.topMoving.length > 0) {
          yPos += 40;
          doc.text('Fast Moving Items:', 20, yPos);
          inventory.topMoving.forEach((item, index) => {
            yPos += 10;
            doc.text(`${index + 1}. ${item.name} - ${item.sold} sold, ${item.remaining} remaining`, 25, yPos);
          });
        }
      } else if (selectedReport === 'financial') {
        const financial = currentData as typeof reportData.financial;
        doc.text(`Revenue: ₹${financial.revenue.toLocaleString()}`, 20, yPos);
        doc.text(`Expenses: ₹${financial.expenses.toLocaleString()}`, 20, yPos + 10);
        doc.text(`Net Profit: ₹${financial.netProfit.toLocaleString()}`, 20, yPos + 20);
        doc.text(`Profit Margin: ${financial.profitMargin}%`, 20, yPos + 30);
        
        yPos += 50;
        doc.text('Expense Breakdown:', 20, yPos);
        if (financial.expenseDetails) {
          Object.entries(financial.expenseDetails).forEach(([category, amount]) => {
            yPos += 10;
            const categoryLabel = category === 'vendorPay' ? 'Vendor Payments' :
                                 category === 'vendorInvoices' ? 'Vendor Invoices' :
                                 category === 'craftsmenPay' ? 'Craftsmen Payments' :
                                 category === 'customerLedger' ? 'Customer Ledger' :
                                 category.charAt(0).toUpperCase() + category.slice(1);
            doc.text(`${categoryLabel}: ₹${(amount as number).toLocaleString()}`, 25, yPos);
          });
        }
      } else if (selectedReport === 'employee') {
        const employee = currentData as typeof reportData.employee;
        doc.text(`Total Employees: ${employee.totalEmployees}`, 20, yPos);
        doc.text(`Active Employees: ${employee.activeEmployees}`, 20, yPos + 10);
        doc.text(`On Leave: ${employee.onLeave}`, 20, yPos + 20);
        doc.text(`Total Monthly Salaries: ₹${Math.round((employee.totalSalaries || 0) / 12).toLocaleString()}`, 20, yPos + 30);
        doc.text(`Average Monthly Salary: ₹${Math.round((employee.averageSalary || 0) / 12).toLocaleString()}`, 20, yPos + 40);
        
        if (employee.departments && Object.keys(employee.departments).length > 0) {
          yPos += 50;
          doc.text('Department Breakdown:', 20, yPos);
          Object.entries(employee.departments).forEach(([dept, count]) => {
            yPos += 10;
            doc.text(`${dept.charAt(0).toUpperCase() + dept.slice(1)}: ${count}`, 25, yPos);
          });
        }
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
        csvContent += `Profit Margin,${financial.profitMargin}%\n\n`;
        csvContent += 'Expense Breakdown\n';
        csvContent += 'Category,Amount,Percentage\n';
        if (financial.expenseDetails) {
          Object.entries(financial.expenseDetails).forEach(([category, amount]) => {
            const categoryLabel = category === 'vendorPay' ? 'Vendor Payments' :
                                 category === 'vendorInvoices' ? 'Vendor Invoices' :
                                 category === 'craftsmenPay' ? 'Craftsmen Payments' :
                                 category === 'customerLedger' ? 'Customer Ledger' :
                                 category.charAt(0).toUpperCase() + category.slice(1);
            const percentage = financial.expenses > 0 ? ((amount as number) / financial.expenses) * 100 : 0;
            csvContent += `${categoryLabel},₹${(amount as number).toLocaleString()},${percentage.toFixed(1)}%\n`;
          });
        }
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

      <Tabs 
        value={selectedReport} 
        onValueChange={(value) => {
          setSelectedReport(value);
          // Reload data when switching to employee tab to ensure fresh data
          if (value === 'employee') {
            loadReportData();
          }
        }} 
        className="w-full"
      >
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
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading report data...</div>
          ) : !reportData ? (
            <div className="text-center py-12 text-muted-foreground">No data available</div>
          ) : (
          <div className="space-y-6">
            {/* Sales Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{reportData.sales.totalSales.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">All time sales</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.sales.totalOrders}</div>
                  <p className="text-xs text-muted-foreground">Total invoices</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{reportData.sales.averageOrderValue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Per order</p>
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
                  {reportData.sales.topProducts.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">No sales data available</div>
                  ) : (
                    reportData.sales.topProducts.map((product, index) => (
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
                    ))
                  )}
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
                  {Object.keys(reportData.sales.salesByCategory).length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">Category data not available</div>
                  ) : (
                    Object.entries(reportData.sales.salesByCategory).map(([category, percentage]) => (
                      <div key={category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{category}</span>
                          <span>{percentage}%</span>
                        </div>
                        <Progress value={percentage as number} className="h-2" />
                      </div>
                    ))
                  )}
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
          )}
        </TabsContent>

        <TabsContent value="inventory">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading report data...</div>
          ) : !reportData ? (
            <div className="text-center py-12 text-muted-foreground">No data available</div>
          ) : (
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
          )}
        </TabsContent>

        <TabsContent value="financial">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading report data...</div>
          ) : !reportData ? (
            <div className="text-center py-12 text-muted-foreground">No data available</div>
          ) : (
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
                <div className="space-y-4">
                  {reportData.financial.expenseDetails && Object.keys(reportData.financial.expenseDetails).length > 0 ? (
                    <>
                      {Object.entries(reportData.financial.expenseDetails).map(([category, amount]) => {
                        const percentage = reportData.financial.expenses > 0 
                          ? ((amount as number) / reportData.financial.expenses) * 100 
                          : 0;
                        const categoryLabel = category === 'vendorPay' ? 'Vendor Payments' :
                                             category === 'vendorInvoices' ? 'Vendor Invoices' :
                                             category === 'craftsmenPay' ? 'Craftsmen Payments' :
                                             category === 'customerLedger' ? 'Customer Ledger (Outstanding)' :
                                             category.charAt(0).toUpperCase() + category.slice(1);
                        
                        return (
                          <div key={category}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium">{categoryLabel}</span>
                              <div className="text-right">
                                <span className="font-bold">₹{(amount as number).toLocaleString()}</span>
                                <span className="text-muted-foreground ml-2">({percentage.toFixed(1)}%)</span>
                              </div>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                      <div className="pt-3 border-t">
                        <div className="flex justify-between font-bold">
                          <span>Total Expenses</span>
                          <span className="text-red-600">₹{reportData.financial.expenses.toLocaleString()}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">No expense data available</div>
                  )}
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
          )}
        </TabsContent>

        <TabsContent value="employee">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading report data...</div>
          ) : !reportData || !reportData.employee ? (
            <div className="text-center py-12 text-muted-foreground">No data available</div>
          ) : (
          <div className="space-y-6">
            {/* Employee Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.employee?.totalEmployees || 0}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Active</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{reportData.employee?.activeEmployees || 0}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">On Leave</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{reportData.employee?.onLeave || 0}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.employee?.attendance || 0}%</div>
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
                    <div className="text-lg font-bold">₹{Math.round(((reportData.employee?.totalSalaries || 0) / 12)).toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total Monthly Salaries</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-lg font-bold">₹{Math.round(((reportData.employee?.averageSalary || 0) / 12)).toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Average Monthly Salary</div>
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
                {reportData.employee.departments && Object.keys(reportData.employee.departments).length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(reportData.employee.departments).map(([dept, count]) => (
                      <div key={dept} className="p-3 border rounded-lg text-center">
                        <div className="text-xl font-bold">{count as number}</div>
                        <div className="text-sm text-muted-foreground capitalize">{dept}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">No department data available</p>
                  </div>
                )}
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
