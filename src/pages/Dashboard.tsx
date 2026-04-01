import { useState, useEffect, useMemo } from "react";
import { 
  TrendingUp, 
  ShoppingCart, 
  DollarSign, 
  Gem, 
  Hammer, 
  Users, 
  Package, 
  AlertTriangle, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  Building2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/StatsCard";
import { getFromSupabase } from "@/lib/supabaseDirect";
import { useBusinessName } from "@/hooks/useBusinessName";
import { format } from "date-fns";
import { QuickActions } from "@/components/QuickActions";
import { useGoldRates } from "@/components/GoldRateSettings";
import { Scale, Heart, ShieldCheck, Zap } from "lucide-react";

const Dashboard = () => {
  const businessName = useBusinessName();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todaySales: 0,
    todayPurchase: 0,
    cashBalance: 0,
    upiBalance: 0,
    bankBalance: 0,
    goldStock: 0,
    silverStock: 0,
    pendingOrders: 0,
    customerOutstanding: 0,
    karigarGoldBalance: 0,
    lowStockItems: 0,
    goldRate: 6800,
    silverRate: 95,
  });

  const goldRates = useGoldRates();
  const rates = goldRates.currentRates;

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];

        // Fetch sales
        const sales = await getFromSupabase<any>("sales", {});
        const salesArray = Array.isArray(sales) ? sales : [];
        const todaySales = salesArray
          .filter(inv => inv.created_at?.startsWith(today))
          .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

        // Fetch inventory for weights and stock
        const inventory = await getFromSupabase<any>("inventory", {});
        const inventoryArray = Array.isArray(inventory) ? inventory : [];
        const goldStock = inventoryArray
          .filter(item => item.category === 'gold')
          .reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0);
        const silverStock = inventoryArray
          .filter(item => item.category === 'silver')
          .reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0);
        const lowStockItems = inventoryArray.filter(item => (item.stock || 0) < 5).length;

        // Fetch customers for outstanding
        const customers = await getFromSupabase<any>("customers", {});
        const customerArray = Array.isArray(customers) ? customers : [];
        const outstanding = customerArray.reduce((sum, c) => sum + (parseFloat(c.currentBalance || c.ledger_balance || 0)), 0);

        // Fetch karigar assignments
        const assignments = await getFromSupabase<any>("material_assignments", {});
        const assignmentArray = Array.isArray(assignments) ? assignments : [];
        const karigarGold = assignmentArray
          .filter(a => a.status === 'in_progress' || a.status === 'assigned')
          .reduce((sum, a) => sum + (parseFloat(a.weight_gram) || 0), 0);

        // Fetch settings for rates
        const settings = await getFromSupabase<any>("settings", {});
        const settingsArray = Array.isArray(settings) ? settings : [];
        // Map settings to find gold rates - usually stored as JSON or multiple rows
        const rates = { gold: 58000, silver: 72000 }; // Fallback defaults

        // Fetch transactions for balances
        const transactions = await getFromSupabase<any>("payment_transactions", {});
        const transactionArray = Array.isArray(transactions) ? transactions : [];
        const cash = transactionArray.filter(t => t.payment_method === 'Cash').reduce((sum, t) => sum + (t.amount || 0), 0);
        const upi = transactionArray.filter(t => t.payment_method === 'UPI').reduce((sum, t) => sum + (t.amount || 0), 0);
        const bank = transactionArray.filter(t => t.payment_method === 'Bank').reduce((sum, t) => sum + (t.amount || 0), 0);

        setStats({
          todaySales,
          todayPurchase: 0, 
          cashBalance: cash,
          upiBalance: upi,
          bankBalance: bank,
          goldStock,
          silverStock,
          pendingOrders: 0, 
          customerOutstanding: outstanding,
          karigarGoldBalance: karigarGold,
          lowStockItems,
          goldRate: rates.gold || 0,
          silverRate: rates.silver || 0,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] pb-12">
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200/60 shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <span className="text-xs font-black uppercase tracking-widest text-blue-600/80">Premium Jeweller ERP</span>
              </div>
              <h1 className="text-3xl font-black bg-gradient-gold bg-clip-text text-transparent tracking-tight">
                {businessName}
              </h1>
              <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Real-time snapshot for {format(new Date(), "EEEE, MMMM do")}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
               <Card className="bg-amber-50/50 border-amber-200/50 shadow-sm px-4 py-2 flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-tighter">Live 22K Rate</p>
                  <p className="text-sm font-black text-amber-900 leading-none">₹{rates.rate22K.toLocaleString()}/g</p>
                </div>
              </Card>
              <Card className="bg-slate-50 border-slate-200 shadow-sm px-4 py-2 flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-slate-200 text-slate-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-700 uppercase tracking-tighter">Live Silver Rate</p>
                  <p className="text-sm font-black text-slate-900 leading-none">₹{rates.rateSilver.toLocaleString() || '95'}/g</p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Quick Actions - HIGH PRIORITY */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
             <div className="h-1.5 w-8 bg-blue-600 rounded-full" />
             <h2 className="text-lg font-bold text-slate-800">Quick Operations</h2>
          </div>
          <QuickActions />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Today's Sales"
            value={`₹${stats.todaySales.toLocaleString()}`}
            icon={TrendingUp}
            trend="Live sales today"
            variant="blue"
          />
          <StatsCard
            title="Net Gold Stock"
            value={`${stats.goldStock.toFixed(3)}g`}
            icon={Scale}
            trend="In-shop weight"
            variant="gold"
          />
          <StatsCard
            title="Karigar Balance"
            value={`${stats.karigarGoldBalance.toFixed(3)}g`}
            icon={Hammer}
            trend="Metal out with craftsmen"
            variant="purple"
          />
          <StatsCard
            title="Total Outstanding"
            value={`₹${stats.customerOutstanding.toLocaleString()}`}
            icon={Users}
            trend="Payment collection pending"
            variant="green"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="bg-white shadow-xl shadow-slate-200/50 border-slate-200/60 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-200/60">
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                Financial Balances
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <div className="divide-y divide-slate-100">
                  <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-green-100 rounded-xl text-green-600"><Wallet className="h-4 w-4" /></div>
                      <span className="font-bold text-slate-700">Cash Account</span>
                    </div>
                    <span className="text-lg font-black text-slate-900">₹{stats.cashBalance.toLocaleString()}</span>
                  </div>
                  <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600"><Zap className="h-4 w-4" /></div>
                      <span className="font-bold text-slate-700">Digital (UPI/Card)</span>
                    </div>
                    <span className="text-lg font-black text-slate-900">₹{(stats.upiBalance + stats.bankBalance).toLocaleString()}</span>
                  </div>
               </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-xl shadow-slate-200/50 border-slate-200/60 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-200/60">
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Inventory Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {stats.lowStockItems > 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-amber-500 text-white">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-amber-900 leading-tight">Attention Needed</h4>
                      <p className="text-sm text-amber-700 mt-1">{stats.lowStockItems} items are running low on stock units.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-emerald-500 text-white">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-emerald-900 leading-tight">Stock Healthy</h4>
                      <p className="text-sm text-emerald-700 mt-1">All inventory items have sufficient stock levels.</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
