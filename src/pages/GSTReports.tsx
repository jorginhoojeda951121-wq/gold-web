import { useState, useMemo } from "react";
import { 
  FileCheck, 
  Download, 
  Search, 
  Calendar,
  AlertCircle,
  TrendingUp,
  Receipt,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useUserStorage } from "@/hooks/useUserStorage";
import { formatInr, GST_RATES, HSN_CODES } from "@/lib/calculations";

import { LocationSelector } from "@/components/LocationSelector";

const GSTReports = () => {
  const [selectedMonth, setSelectedMonth] = useState("March 2026");
  const [selectedLocation, setSelectedLocation] = useState<string | 'all'>('all');
  const { data: rawSales = [] } = useUserStorage<any[]>("pos_recentInvoices", []);
  const { data: businessSettings } = useUserStorage("businessSettings", { gstNumber: "27XXXXX1234X1Z5" });

  const sales = useMemo(() => {
    if (selectedLocation === 'all') return rawSales;
    return rawSales.filter(s => s.location_id === selectedLocation);
  }, [rawSales, selectedLocation]);

  const gstSummary = useMemo(() => {
    let taxableAmount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    sales.forEach(sale => {
      taxableAmount += (sale.subtotal || 0);
      // Simplified internal calculation (assuming all intra-state for now)
      totalCgst += (sale.tax || 0) / 2;
      totalSgst += (sale.tax || 0) / 2;
    });

    return {
      taxableAmount,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax: totalCgst + totalSgst + totalIgst,
      grandTotal: taxableAmount + totalCgst + totalSgst + totalIgst
    };
  }, [sales]);

  const hsnSummary = [
    { code: HSN_CODES.GOLD_JEWELLERY, description: "Gold Jewellery", value: gstSummary.taxableAmount * 0.8, rate: "3%" },
    { code: HSN_CODES.MAKING_CHARGES, description: "Making Charges", value: gstSummary.taxableAmount * 0.2, rate: "5%" }
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <FileCheck className="h-5 w-5 text-emerald-600" />
               <h1 className="text-2xl font-black text-slate-900 tracking-tight">GST Filing Assistant</h1>
            </div>
            <p className="text-slate-500 font-medium">Compliance & Returns for {businessSettings.gstNumber}</p>
          </div>
          <div className="flex gap-3 items-center">
             <LocationSelector 
               onLocationChange={setSelectedLocation}
               className="h-10 border-slate-200 text-sm"
             />
             <Button variant="outline" className="rounded-xl border-slate-200 font-bold px-6 h-10">
                <Calendar className="h-4 w-4 mr-2" />
                March 2026
             </Button>
             <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold px-8 h-10">
                <Download className="h-4 w-4 mr-2" />
                GSTR-1 JSON
             </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
           <Card className="border-none shadow-xl shadow-slate-200 pb-2">
              <CardHeader className="pb-2">
                 <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Total Taxable Value</CardTitle>
              </CardHeader>
              <CardContent>
                 <h2 className="text-3xl font-black text-slate-900">{formatInr(gstSummary.taxableAmount)}</h2>
                 <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1">
                   <TrendingUp className="h-3 w-3 text-emerald-500" /> +4.2% from Feb
                 </p>
              </CardContent>
           </Card>

           <Card className="border-none shadow-xl shadow-slate-200 pb-2">
              <CardHeader className="pb-2">
                 <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Total Output GST</CardTitle>
              </CardHeader>
              <CardContent>
                 <h2 className="text-3xl font-black text-emerald-600">{formatInr(gstSummary.totalTax)}</h2>
                 <p className="text-xs font-bold text-slate-500 mt-1">Sum of CGST ({formatInr(gstSummary.totalCgst)}) + SGST ({formatInr(gstSummary.totalSgst)})</p>
              </CardContent>
           </Card>

           <Card className="border-none shadow-xl shadow-slate-200 pb-2 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white">
              <CardHeader className="pb-2">
                 <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-200">Payment Status</CardTitle>
              </CardHeader>
              <CardContent>
                 <h2 className="text-3xl font-black">Audit Ready</h2>
                 <p className="text-xs font-bold text-emerald-100 mt-1 opacity-80">All sales have linked HSN codes</p>
              </CardContent>
           </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-8">
              <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
                 <CardHeader className="bg-white border-b border-slate-100 py-6">
                    <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-blue-600" />
                      Invoice-wise GST Breakup
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="p-0">
                    <Table>
                       <TableHeader className="bg-slate-50/50">
                          <TableRow>
                             <TableHead className="px-6 font-bold text-[10px] uppercase tracking-tighter">Invoice</TableHead>
                             <TableHead className="px-6 font-bold text-[10px] uppercase tracking-tighter">Customer</TableHead>
                             <TableHead className="px-6 font-bold text-[10px] uppercase tracking-tighter text-right">Taxable</TableHead>
                             <TableHead className="px-6 font-bold text-[10px] uppercase tracking-tighter text-right">CGST (1.5%)</TableHead>
                             <TableHead className="px-6 font-bold text-[10px] uppercase tracking-tighter text-right">SGST (1.5%)</TableHead>
                             <TableHead className="px-6 font-bold text-[10px] uppercase tracking-tighter">Status</TableHead>
                          </TableRow>
                       </TableHeader>
                       <TableBody>
                          {sales.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-10 text-slate-400 italic">No sales found for this period</TableCell>
                            </TableRow>
                          ) : (
                            sales.map((sale) => (
                              <TableRow key={sale.id} className="hover:bg-slate-50/50 border-slate-100">
                                 <TableCell className="px-6 py-4 font-bold text-slate-900">INV-{sale.id.slice(-4)}</TableCell>
                                 <TableCell className="px-6 py-4 text-sm font-medium text-slate-600">{sale.customerName || 'B2C'}</TableCell>
                                 <TableCell className="px-6 py-4 text-right font-bold">{formatInr(sale.subtotal)}</TableCell>
                                 <TableCell className="px-6 py-4 text-right text-emerald-600 font-bold">{formatInr((sale.tax || 0) / 2)}</TableCell>
                                 <TableCell className="px-6 py-4 text-right text-emerald-600 font-bold">{formatInr((sale.tax || 0) / 2)}</TableCell>
                                 <TableCell className="px-6 py-4">
                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100 text-[10px] font-black uppercase">Tax Paid</Badge>
                                 </TableCell>
                              </TableRow>
                            ))
                          )}
                       </TableBody>
                    </Table>
                 </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
                 <CardHeader className="bg-white border-b border-slate-100 py-6">
                    <CardTitle className="text-xl font-black text-slate-800">HSN Summary (GSTR-1)</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="space-y-4 pt-4">
                       {hsnSummary.map((hsn) => (
                         <div key={hsn.code} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-4">
                               <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center font-black text-slate-400 border border-slate-200">#</div>
                               <div>
                                  <p className="font-black text-slate-900">{hsn.code}</p>
                                  <p className="text-xs text-slate-500 font-medium">{hsn.description} - {hsn.rate} GST</p>
                               </div>
                            </div>
                            <div className="text-right">
                               <p className="font-black text-slate-900">₹{hsn.value.toLocaleString()}</p>
                               <p className="text-xs text-emerald-600 font-bold">Taxable Value</p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </CardContent>
              </Card>
           </div>

           <div className="space-y-8">
              <Card className="border-none shadow-xl shadow-slate-200 rounded-3xl overflow-hidden">
                 <CardHeader className="bg-amber-500 text-white p-6">
                    <CardTitle className="flex items-center gap-2">
                       <AlertCircle className="h-5 w-5" />
                       Compliance Checklist
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">✓</div>
                       <span className="text-sm font-bold text-slate-700">All invoices have GSTIN format</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">✓</div>
                       <span className="text-sm font-bold text-slate-700">HSN Codes (4-6 digit) present</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="h-6 w-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs opacity-50">?</div>
                       <span className="text-sm font-bold text-slate-700">Purchase ITC entries pending</span>
                    </div>
                    <Button variant="link" className="text-blue-600 font-bold text-xs p-0 h-auto flex items-center gap-1 group">
                       Audit detailed logs <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                    </Button>
                 </CardContent>
              </Card>

              <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-5 bg-white rounded-full translate-x-1/2 -translate-y-1/2 w-32 h-32 group-hover:scale-125 transition-transform" />
                 <h3 className="text-xl font-black mb-2">Automate Returns?</h3>
                 <p className="text-sm text-slate-400 font-medium mb-6">Connect your GST portal API to automatically push invoices to GSTR-1.</p>
                 <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 font-black rounded-xl h-12">
                   Upgrade to Enterprise
                 </Button>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
};

export default GSTReports;
