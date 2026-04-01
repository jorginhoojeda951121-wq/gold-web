import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Recycle, Scale, TrendingDown, Calculator, ArrowRight } from 'lucide-react';
import { useGoldRates } from '@/components/GoldRateSettings';
import { formatInr, roundToTwoDecimals } from '@/lib/calculations';

interface OldGoldExchangeProps {
  onApplyCredit?: (amount: number) => void;
}

export function OldGoldExchange({ onApplyCredit }: OldGoldExchangeProps) {
  const { toast } = useToast();
  const settings = useGoldRates();
  
  const [oldWeight, setOldWeight] = useState<number>(0);
  const [touch, setTouch] = useState<number>(92); // Default 92% (Standard 22K)
  const [meltingCharge, setMeltingCharge] = useState<number>(200); // Standard melting fee
  const [otherDeductions, setOtherDeductions] = useState<number>(0);
  const [exchangeValue, setExchangeValue] = useState<number>(0);

  useEffect(() => {
    if (oldWeight > 0) {
      // Professional Indian Bullion Calculation:
      const fineWeight = (oldWeight * (touch / 100));
      const marketRate = settings.currentRates.rate24K;
      const grossValue = fineWeight * marketRate;
      const netValue = grossValue - meltingCharge - otherDeductions;
      setExchangeValue(roundToTwoDecimals(Math.max(0, netValue)));
    } else {
      setExchangeValue(0);
    }
  }, [oldWeight, touch, meltingCharge, otherDeductions, settings]);

  return (
    <Card className="border-2 border-emerald-200 shadow-xl overflow-hidden rounded-3xl">
      <CardHeader className="bg-[#10b981] text-white p-6 pb-8">
        <div className="flex justify-between items-start">
           <div>
              <CardTitle className="flex items-center gap-2 text-2xl font-black italic tracking-tighter uppercase">
                <Recycle className="h-6 w-6" />
                Old Gold Exchange
              </CardTitle>
              <CardDescription className="text-emerald-50 font-bold opacity-90 mt-1">
                Professional Bullion Value Assessment (Touch Wise)
              </CardDescription>
           </div>
           <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <Calculator className="h-6 w-6" />
           </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-8 -mt-4 bg-white rounded-t-[2.5rem] space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="flex items-center gap-2 font-black text-slate-700 uppercase text-xs tracking-widest">
                <Scale className="h-4 w-4 text-emerald-600" />
                Gross Weight (grams)
              </Label>
              <Input
                type="number"
                placeholder="0.000"
                value={oldWeight || ''}
                onChange={(e) => setOldWeight(parseFloat(e.target.value) || 0)}
                className="h-14 text-2xl font-black border-2 focus:border-emerald-500 rounded-2xl"
              />
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2 font-black text-slate-700 uppercase text-xs tracking-widest">
                <TrendingDown className="h-4 w-4 text-emerald-600" />
                Touch % (Purity)
              </Label>
              <div className="flex gap-2 mb-2">
                 {[92, 84, 75].map(t => (
                   <Button 
                    key={t}
                    variant={touch === t ? 'default' : 'outline'}
                    className={`flex-1 rounded-xl h-10 font-black ${touch === t ? 'bg-emerald-600' : 'text-slate-500 border-slate-200'}`}
                    onClick={() => setTouch(t)}
                   >
                     {t === 92 ? '22K' : t === 75 ? '18K' : t}%
                   </Button>
                 ))}
              </div>
              <Input
                type="number"
                value={touch}
                onChange={(e) => setTouch(parseFloat(e.target.value) || 0)}
                className="h-12 font-bold rounded-xl border-slate-200"
                placeholder="Custom Touch %"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Melting Charge</Label>
                <Input
                  type="number"
                  value={meltingCharge}
                  onChange={(e) => setMeltingCharge(parseFloat(e.target.value) || 0)}
                  className="rounded-xl font-bold bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Other Deductions</Label>
                <Input
                  type="number"
                  value={otherDeductions}
                  onChange={(e) => setOtherDeductions(parseFloat(e.target.value) || 0)}
                  className="rounded-xl font-bold bg-slate-50"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#f0fdf4] rounded-[2rem] p-8 border-2 border-emerald-100/50 shadow-inner flex flex-col items-center justify-between text-center border-dashed">
            <div className="w-full space-y-4">
               <h4 className="text-emerald-800 font-black uppercase text-xs tracking-[0.2em] mb-6">Assessment Summary</h4>
               <div className="space-y-3">
                 <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                    <span>Pure Gold Yield</span>
                    <span className="text-slate-900">{(oldWeight * (touch/100)).toFixed(3)}g</span>
                 </div>
                 <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                    <span>Market Rate (24K)</span>
                    <span className="text-slate-900">₹{settings.currentRates.rate24K.toLocaleString()}/g</span>
                 </div>
                 <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                    <span>Total Deductions</span>
                    <span className="text-rose-600">-₹{(meltingCharge + otherDeductions).toLocaleString()}</span>
                 </div>
               </div>
            </div>

            <div className="mt-8 mb-4">
               <p className="text-emerald-600 font-black uppercase text-[10px] tracking-widest mb-1">Final Value</p>
               <h2 className="text-4xl font-black text-emerald-900 tracking-tighter">
                  {formatInr(exchangeValue)}
               </h2>
            </div>

            {exchangeValue > 0 && (
               <Button 
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 rounded-2xl text-lg font-black shadow-xl shadow-emerald-200 transition-all hover:scale-[1.02]"
                onClick={() => {
                  if (onApplyCredit) onApplyCredit(exchangeValue);
                  toast({
                    title: "Credit Applied",
                    description: `₹${exchangeValue.toLocaleString()} credited.`,
                  });
                }}
               >
                 Apply Credit <ArrowRight className="ml-2 h-5 w-5" />
               </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
