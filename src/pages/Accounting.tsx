import { useState, useMemo } from "react";
import { 
  Wallet, 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  Download,
  Calendar,
  Search,
  PieChart,
  FileText,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useUserStorage } from "@/hooks/useUserStorage";
import { formatInr } from "@/lib/calculations";

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: 'credit' | 'debit';
  category: 'Sales' | 'Purchase' | 'Expense' | 'Karigar' | 'Opening Balance';
  amount: number;
  paymentMethod: 'Cash' | 'UPI' | 'Bank';
}

import { LocationSelector } from "@/components/LocationSelector";

const Accounting = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string | 'all'>('all');
  const { data: rawSales = [] } = useUserStorage<any[]>("pos_recentInvoices", []);
  const { data: rawExpenses = [] } = useUserStorage<any[]>("expenses", []);
  const { data: businessSettings } = useUserStorage("businessSettings", { businessName: "Premium Jewellers" });

  const sales = useMemo(() => {
    if (selectedLocation === 'all') return rawSales;
    return rawSales.filter(s => s.location_id === selectedLocation);
  }, [rawSales, selectedLocation]);

  const expenses = useMemo(() => {
    if (selectedLocation === 'all') return rawExpenses;
    return rawExpenses.filter(e => e.location_id === selectedLocation);
  }, [rawExpenses, selectedLocation]);

  // Generate real-time ledger from sales and other data
  const ledgerData = useMemo(() => {
    const transactions: Transaction[] = [];
    
    // Process Sales
    sales.forEach(sale => {
      transactions.push({
        id: sale.id,
        date: sale.date || new Date().toISOString(),
        description: `Sale to ${sale.customerName || 'Walk-in'}`,
        type: 'credit',
        category: 'Sales',
        amount: sale.total || 0,
        paymentMethod: sale.paymentMethod || 'Cash'
      });
    });

    // Process Expenses (if available)
    expenses.forEach(exp => {
      transactions.push({
        id: exp.id,
        date: exp.date || new Date().toISOString(),
        description: exp.description || 'Business Expense',
        type: 'debit',
        category: 'Expense',
        amount: exp.amount || 0,
        paymentMethod: exp.paymentMethod || 'Cash'
      });
    });

    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, expenses]);

  const filteredLedger = ledgerData.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = useMemo(() => {
    const cash = ledgerData.filter(t => t.paymentMethod === 'Cash');
    const bank = ledgerData.filter(t => t.paymentMethod === 'Bank' || t.paymentMethod === 'UPI');

    const totalIn = ledgerData.reduce((sum, t) => t.type === 'credit' ? sum + t.amount : sum, 0);
    const totalOut = ledgerData.reduce((sum, t) => t.type === 'debit' ? sum + t.amount : sum, 0);

    return {
      cashBalance: cash.reduce((sum, t) => t.type === 'credit' ? sum + t.amount : sum - t.amount, 0),
      bankBalance: bank.reduce((sum, t) => t.type === 'credit' ? sum + t.amount : sum - t.amount, 0),
      totalRevenue: totalIn,
      totalExpenses: totalOut,
      netProfit: totalIn - totalOut
    };
  }, [ledgerData]);

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-20">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Business Ledger</h1>
            <p className="text-slate-500 font-medium">Accounting & Cashbook for {businessSettings.businessName}</p>
          </div>
          <div className="flex gap-3 items-center">
             <LocationSelector 
               onLocationChange={setSelectedLocation}
               className="h-10 border-slate-200 text-sm"
             />
             <Button variant="outline" size="sm" className="rounded-xl border-slate-200 font-bold h-10">
                <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                March 2026
             </Button>
             <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 font-bold h-10">
                <Download className="h-4 w-4 mr-2" />
                Export Ledger
             </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card className="bg-emerald-600 text-white border-none shadow-xl shadow-emerald-100">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-500 rounded-xl"><Wallet className="h-6 w-6" /></div>
                <Badge className="bg-emerald-500/30 text-white border-none">LIVE</Badge>
              </div>
              <p className="text-emerald-100 text-sm font-bold uppercase tracking-wider">Cash Balance</p>
              <h2 className="text-3xl font-black mt-1">{formatInr(stats.cashBalance)}</h2>
            </CardContent>
          </Card>

          <Card className="bg-blue-600 text-white border-none shadow-xl shadow-blue-100">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-500 rounded-xl"><Building2 className="h-6 w-6" /></div>
                <Badge className="bg-blue-500/30 text-white border-none">ACTIVE</Badge>
              </div>
              <p className="text-blue-100 text-sm font-bold uppercase tracking-wider">Digital / Bank</p>
              <h2 className="text-3xl font-black mt-1">{formatInr(stats.bankBalance)}</h2>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="pt-6">
               <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Total Revenue</p>
               <div className="flex items-center gap-2 mt-1">
                 <h2 className="text-2xl font-black text-slate-900">{formatInr(stats.totalRevenue)}</h2>
                 <span className="text-emerald-600 flex items-center text-xs font-bold bg-emerald-50 p-1 px-2 rounded-lg">
                   <ArrowUpRight className="h-3 w-3 mr-1" /> 12%
                 </span>
               </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="pt-6">
               <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Net Profit</p>
               <div className="flex items-center gap-2 mt-1">
                 <h2 className="text-2xl font-black text-slate-900">{formatInr(stats.netProfit)}</h2>
                 <span className={`flex items-center text-xs font-bold p-1 px-2 rounded-lg ${stats.netProfit >=0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50' }`}>
                   {stats.netProfit >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />} 
                   {Math.abs(stats.netProfit > 0 ? (stats.netProfit / stats.totalRevenue) * 100 : 0).toFixed(1)}%
                 </span>
               </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <div className="flex justify-between items-center mb-6">
            <TabsList className="bg-slate-200/50 p-1 rounded-2xl h-12">
              <TabsTrigger value="all" className="rounded-xl px-6 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">All entries</TabsTrigger>
              <TabsTrigger value="credits" className="rounded-xl px-6 font-bold data-[state=active]:text-emerald-600">Credits (+)</TabsTrigger>
              <TabsTrigger value="debits" className="rounded-xl px-6 font-bold data-[state=active]:text-rose-600">Debits (-)</TabsTrigger>
            </TabsList>

            <div className="relative w-72">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
               <Input 
                placeholder="Search transactions..." 
                className="pl-10 h-11 rounded-xl border-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
          </div>

          <TabsContent value="all" className="mt-0">
            <Card className="border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50 border-b">
                  <TableRow>
                    <TableHead className="font-black text-slate-500 text-xs uppercase px-6">Date</TableHead>
                    <TableHead className="font-black text-slate-500 text-xs uppercase px-6">Description</TableHead>
                    <TableHead className="font-black text-slate-500 text-xs uppercase px-6">Category</TableHead>
                    <TableHead className="font-black text-slate-500 text-xs uppercase px-6 text-right">Credit (+)</TableHead>
                    <TableHead className="font-black text-slate-500 text-xs uppercase px-6 text-right">Debit (-)</TableHead>
                    <TableHead className="font-black text-slate-500 text-xs uppercase px-6">Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLedger.map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-slate-50 transition-colors border-slate-100">
                      <TableCell className="px-6 py-4 font-medium text-slate-500">
                        {new Date(transaction.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span className="font-bold text-slate-900">{transaction.description}</span>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                         <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            transaction.category === 'Sales' ? 'bg-emerald-100 text-emerald-700' :
                            transaction.category === 'Purchase' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-700'
                         }`}>
                           {transaction.category}
                         </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        {transaction.type === 'credit' ? (
                          <span className="text-emerald-600 font-black text-lg">+{formatInr(transaction.amount)}</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        {transaction.type === 'debit' ? (
                          <span className="text-rose-600 font-black text-lg">-{formatInr(transaction.amount)}</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                         <div className="flex items-center gap-2">
                           <div className={`p-1 rounded bg-slate-100 text-slate-500`}>
                             {transaction.paymentMethod === 'Cash' ? <Wallet className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                           </div>
                           <span className="text-xs font-bold text-slate-700 uppercase tracking-tighter">{transaction.paymentMethod}</span>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredLedger.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center">
                         <div className="flex flex-col items-center justify-center text-slate-400">
                            <PieChart className="h-12 w-12 mb-2 opacity-20" />
                            <p className="font-bold">No transactions found in this period</p>
                         </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
           <Card className="border-slate-200 shadow-sm rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  Profit & Loss Statement (Estimates)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                       <span className="font-bold text-slate-600">Gross Sales</span>
                       <span className="font-black text-slate-900">{formatInr(stats.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                       <span className="font-bold text-slate-600">Direct Costs (Purchases)</span>
                       <span className="font-black text-rose-600">- ₹0.00</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 bg-slate-50/50 px-2 rounded">
                       <span className="font-black text-slate-800 uppercase text-xs tracking-widest">Gross Profit</span>
                       <span className="font-black text-slate-900">{formatInr(stats.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                       <span className="font-bold text-slate-600">Operating Expenses</span>
                       <span className="font-black text-rose-600">-{formatInr(stats.totalExpenses)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 pt-4">
                       <span className="font-black text-slate-900 text-lg">Net Profit</span>
                       <span className={`font-black text-2xl ${stats.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatInr(stats.netProfit)}</span>
                    </div>
                 </div>
              </CardContent>
           </Card>

           <Card className="border-slate-200 shadow-sm rounded-3xl bg-slate-900 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <FileText className="h-32 w-32" />
              </div>
              <CardHeader>
                <CardTitle>Accounting Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <Button className="w-full justify-between h-14 bg-white/10 hover:bg-white/20 border-white/10 text-white rounded-2xl group transition-all">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-emerald-500 rounded-xl group-hover:scale-110 transition-transform"><Plus className="h-5 w-5" /></div>
                       <span className="font-bold">Record Direct Expense</span>
                    </div>
                    <ArrowUpRight className="h-4 w-4 opacity-50" />
                 </Button>
                 <Button className="w-full justify-between h-14 bg-white/10 hover:bg-white/20 border-white/10 text-white rounded-2xl group transition-all">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-blue-500 rounded-xl group-hover:scale-110 transition-transform"><Building2 className="h-5 w-5" /></div>
                       <span className="font-bold">Bank Reconciliation</span>
                    </div>
                    <ArrowUpRight className="h-4 w-4 opacity-50" />
                 </Button>
                 <Button className="w-full justify-between h-14 bg-white/10 hover:bg-white/20 border-white/10 text-white rounded-2xl group transition-all">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-rose-500 rounded-xl group-hover:scale-110 transition-transform"><PieChart className="h-5 w-5" /></div>
                       <span className="font-bold">Generate Tax Estimate</span>
                    </div>
                    <ArrowUpRight className="h-4 w-4 opacity-50" />
                 </Button>
              </CardContent>
           </Card>
        </div>
      </main>
    </div>
  );
};

export default Accounting;
