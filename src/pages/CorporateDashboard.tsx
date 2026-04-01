import { useState, useEffect } from "react";
import { 
  Building2, 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Package, 
  ArrowUpRight, 
  ArrowDownRight, 
  MapPin, 
  ChevronRight,
  Filter,
  Users,
  PieChart as PieChartIcon
} from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getFromSupabase } from "@/lib/supabaseDirect";
import { useBusinessName } from "@/hooks/useBusinessName";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';

interface BranchStats {
  id: string;
  name: string;
  revenue: number;
  salesCount: number;
  inventoryCount: number;
  inventoryValue: number;
}

const CorporateDashboard = () => {
  const businessName = useBusinessName();
  const [loading, setLoading] = useState(true);
  const [branchData, setBranchData] = useState<BranchStats[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);

  const fetchCorporateData = async () => {
    try {
      setLoading(true);
      
      // Fetch all locations for the company
      const locations = await getFromSupabase<any>('locations');
      
      // Fetch ALL sales and inventory across ALL locations (ignoreLocation: true)
      const [allSales, allInventory] = await Promise.all([
        getFromSupabase<any>('sales', {}, '*', { ignoreLocation: true }),
        getFromSupabase<any>('inventory', {}, '*', { ignoreLocation: true })
      ]);

      const stats: BranchStats[] = locations.map((loc: any) => {
        const branchSales = allSales.filter((s: any) => s.location_id === loc.id);
        const branchInventory = allInventory.filter((i: any) => i.location_id === loc.id);
        
        const revenue = branchSales.reduce((acc: number, s: any) => acc + (s.total_amount || 0), 0);
        const invValue = branchInventory.reduce((acc: number, i: any) => acc + ((i.stock || 0) * (i.price || 0)), 0);

        return {
          id: loc.id,
          name: loc.name,
          revenue,
          salesCount: branchSales.length,
          inventoryCount: branchInventory.length,
          inventoryValue: invValue
        };
      });

      setBranchData(stats);
      setTotalRevenue(stats.reduce((acc, s) => acc + s.revenue, 0));
      setTotalInventoryValue(stats.reduce((acc, s) => acc + s.inventoryValue, 0));

    } catch (error) {
      console.error('Error fetching corporate data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorporateData();
  }, []);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return <div className="flex justify-center p-12"><div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl shadow-inner">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{businessName} Corporate</h1>
            <p className="text-slate-500 font-medium">Enterprise performance across all branches</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" className="gap-2 bg-white border-slate-200">
             <Filter className="h-4 w-4" />
             Fiscal Year 2024
           </Button>
           <Button className="bg-primary text-white shadow-lg shadow-primary/25">
             Refresh Data
           </Button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Enterprise Revenue"
          value={`₹${(totalRevenue / 100000).toFixed(2)} Lac`}
          icon={DollarSign}
          trend="+18% vs prev period"
          variant="blue"
        />
        <StatsCard
          title="Total Metal Stock Value"
          value={`₹${(totalInventoryValue / 100000).toFixed(2)} Lac`}
          icon={Package}
          trend="Balanced"
          variant="gold"
        />
        <StatsCard
          title="Consolidated Sales"
          value={branchData.reduce((acc, b) => acc + b.salesCount, 0).toLocaleString()}
          icon={TrendingUp}
          variant="purple"
        />
        <StatsCard
          title="Active Showrooms"
          value={branchData.length.toString()}
          icon={MapPin}
          variant="green"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Comparison */}
        <Card className="lg:col-span-2 border-slate-200/60 shadow-elegant overflow-hidden">
          <CardHeader className="bg-white/50 backdrop-blur-sm border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Showroom Revenue Comparison</CardTitle>
                <CardDescription>Performance breakdown by location</CardDescription>
              </div>
              <BarChart3 className="h-5 w-5 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    cursor={{fill: '#f8fafc'}}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Share Pie Chart */}
        <Card className="border-slate-200/60 shadow-elegant overflow-hidden">
          <CardHeader className="bg-white/50 backdrop-blur-sm border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Market Share</CardTitle>
                <CardDescription>Revenue contribution by percentage</CardDescription>
              </div>
              <PieChartIcon className="h-5 w-5 text-slate-400" />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={branchData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="revenue"
                  >
                    {branchData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 mt-4">
              {branchData.map((branch, index) => (
                <div key={branch.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                    <span className="font-medium text-slate-600">{branch.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {((branch.revenue / totalRevenue) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Branch Leaderboard */}
        <Card className="lg:col-span-3 border-slate-200/60 shadow-elegant overflow-hidden">
          <CardHeader className="bg-white/50 backdrop-blur-sm border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Branch Leaderboard</CardTitle>
                <CardDescription>Operational metrics across showrooms</CardDescription>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Top Performing: {branchData.sort((a,b) => b.revenue - a.revenue)[0]?.name}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Showroom Name</th>
                    <th className="px-6 py-4">Revenue (₹)</th>
                    <th className="px-6 py-4">Total Orders</th>
                    <th className="px-6 py-4">Inv. Items</th>
                    <th className="px-6 py-4">Stock Value (₹)</th>
                    <th className="px-6 py-4 text-right">Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branchData.sort((a,b) => b.revenue - a.revenue).map((branch) => (
                    <tr key={branch.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors shadow-sm">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <span className="font-semibold text-slate-900">{branch.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-700">₹{branch.revenue.toLocaleString()}</td>
                      <td className="px-6 py-4 text-slate-600">{branch.salesCount}</td>
                      <td className="px-6 py-4 text-slate-600">{branch.inventoryCount}</td>
                      <td className="px-6 py-4 font-mono text-slate-700">₹{branch.inventoryValue.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-1 rounded-lg text-xs">
                          <TrendingUp className="h-3 w-3" />
                          {((branch.revenue / totalRevenue) * 100).toFixed(0)}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CorporateDashboard;
