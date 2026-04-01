import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Database, Scale, TrendingUp, AlertTriangle } from "lucide-react";
import { useUserStorage } from "@/hooks/useUserStorage";
import { JewelryItem } from "@/components/JewelryCard";

export function MetalBalance() {
  const { data: inventory } = useUserStorage<JewelryItem[]>("inventory_items", []);
  const [balances, setBalances] = useState<Record<string, { gross: number; stone: number; net: number; stock: number }>>({});

  useEffect(() => {
    if (inventory && inventory.length > 0) {
      const newBalances: Record<string, { gross: number; stone: number; net: number; stock: number }> = {};
      
      inventory.forEach(item => {
        const purity = item.metal || "Other";
        if (!newBalances[purity]) {
          newBalances[purity] = { gross: 0, stone: 0, net: 0, stock: 0 };
        }
        
        const qty = item.inStock || 0;
        newBalances[purity].gross += (item.grossWeight || 0) * qty;
        newBalances[purity].stone += (item.stoneWeight || 0) * qty;
        newBalances[purity].net += (item.netWeight || 0) * qty;
        newBalances[purity].stock += qty;
      });
      
      setBalances(newBalances);
    }
  }, [inventory]);

  const totalNet = Object.values(balances).reduce((sum, b) => sum + b.net, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl hover-lift">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Net Gold</p>
                <h3 className="text-3xl font-bold mt-1">{totalNet.toFixed(3)} g</h3>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                <Database className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl hover-lift">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Standard 22K Stock</p>
                <h3 className="text-3xl font-bold mt-1">{(balances["22K"]?.net || 0).toFixed(3)} g</h3>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                <Scale className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl hover-lift">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Fine Gold (24K)</p>
                <h3 className="text-3xl font-bold mt-1">{(balances["24K"]?.net || 0).toFixed(3)} g</h3>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-elegant bg-white overflow-hidden">
        <CardHeader className="border-b bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Metal Weight Summary</CardTitle>
              <CardDescription>Consolidated stock by purity across all locations</CardDescription>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 py-1 px-3">
              Real-time Sync
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="font-bold">Purity</TableHead>
                <TableHead className="text-right font-bold">Items</TableHead>
                <TableHead className="text-right font-bold">Gross Wt (g)</TableHead>
                <TableHead className="text-right font-bold">Stone Wt (g)</TableHead>
                <TableHead className="text-right font-bold bg-amber-50/50">Net Gold (g)</TableHead>
                <TableHead className="text-right font-bold">Fine Gold (est)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(balances)
                .sort((a, b) => b[1].net - a[1].net)
                .map(([purity, data]) => {
                  // Basic conversion to fine gold (24K equivalent)
                  let fineMultiplier = 0.916; // 22K default
                  if (purity.includes("24K")) fineMultiplier = 0.999;
                  else if (purity.includes("22K")) fineMultiplier = 0.916;
                  else if (purity.includes("18K")) fineMultiplier = 0.750;
                  else if (purity.includes("14K")) fineMultiplier = 0.583;
                  
                  return (
                    <TableRow key={purity} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="font-medium">
                        <Badge variant="outline" className={
                          purity.includes("22K") ? "border-amber-500 text-amber-700 bg-amber-50" :
                          purity.includes("24K") ? "border-yellow-500 text-yellow-700 bg-yellow-50 font-bold" :
                          "border-gray-300"
                        }>
                          {purity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{data.stock}</TableCell>
                      <TableCell className="text-right">{data.gross.toFixed(3)}</TableCell>
                      <TableCell className="text-right text-gray-400">{data.stone.toFixed(3)}</TableCell>
                      <TableCell className="text-right font-bold bg-amber-50/30 text-amber-900">{data.net.toFixed(3)}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">{(data.net * fineMultiplier).toFixed(3)} g</TableCell>
                    </TableRow>
                  );
                })}
              
              {Object.keys(balances).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="h-8 w-8 opacity-20" />
                      <p>No inventory data found to calculate balances.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3 text-sm text-blue-800">
        <Info className="h-5 w-5 text-blue-500 shrink-0" />
        <p>
          <strong>Note:</strong> Pure gold equivalence is calculated using standard purity percentages 
          (99.9% for 24K, 91.6% for 22K). Stone weight is deducted from gross weight to arrive at the 
          Net Gold weight used for accounting.
        </p>
      </div>
    </div>
  );
}

function Info({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
