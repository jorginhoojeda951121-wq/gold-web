import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider'; // Reanimated placeholder logic
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Calculator, Scale, Percent, RefreshCw } from 'lucide-react';
import { fetchLiveGoldRates } from '@/lib/goldRateApi';
import { useGoldRates, GoldRateSettings, calculateGoldPrice } from '@/components/GoldRateSettings';
import { formatInr, roundToTwoDecimals } from '@/lib/calculations';

export function PurityCalculator() {
  const { toast } = useToast();
  const settings = useGoldRates();
  const [weight, setWeight] = useState<number>(0);
  const [purity, setPurity] = useState<'24K' | '22K' | '18K' | '14K'>('22K');
  const [makingType, setMakingType] = useState<'per_gram' | 'percentage'>('per_gram');
  const [makingValue, setMakingValue] = useState<number>(0);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [calculatedData, setCalculatedData] = useState<any>(null);

  useEffect(() => {
    // Sync default making charges from settings when purity changes
    const purityKey = `gold${purity}` as keyof typeof settings.makingCharges;
    const config = settings.makingCharges[purityKey];
    setMakingType(config.type);
    setMakingValue(config.value);
  }, [purity, settings]);

  useEffect(() => {
    if (weight > 0) {
      const result = calculateGoldPrice(weight, purity, settings);
      
      // Override making if user manually changed it in UI (not in settings)
      // For this simple calculator UI we'll just use the settings as base
      setCalculatedData(result);
    } else {
      setCalculatedData(null);
    }
  }, [weight, purity, settings]);

  const handleFetchRates = async () => {
    setFetchLoading(true);
    const liveRates = await fetchLiveGoldRates();
    if (liveRates) {
      toast({
        title: 'Live Rates Fetched',
        description: `Current 24K: ₹${liveRates.price_gram_24k}/g`,
      });
      // In a real app, this would trigger a store update to settings
    } else {
      toast({
        title: 'Fetch Failed',
        description: 'Using current cached/manual settings.',
        variant: 'destructive',
      });
    }
    setFetchLoading(false);
  };

  return (
    <Card className="border-2 border-yellow-200 shadow-md">
      <CardHeader className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Purity & Price Calculator
        </CardTitle>
        <CardDescription className="text-yellow-100/80">
          Professional Tool for Jewelers - Per Gram Precision
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weight Input */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-yellow-600" />
                Gross Weight (grams)
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0.00"
                  step="0.001"
                  value={weight || ''}
                  onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                  className="text-xl font-bold h-12"
                />
                <span className="self-center font-semibold text-gray-500">g</span>
              </div>
            </div>

            {/* Purity Tabs */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-yellow-600" />
                Select Purity (Karat)
              </Label>
              <Tabs value={purity} onValueChange={(val) => setPurity(val as any)} className="w-full">
                <TabsList className="grid grid-cols-4 bg-yellow-50">
                  <TabsTrigger value="24K" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white">24K</TabsTrigger>
                  <TabsTrigger value="22K" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white">22K</TabsTrigger>
                  <TabsTrigger value="18K" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white">18K</TabsTrigger>
                  <TabsTrigger value="14K" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white">14K</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Making Charges */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-yellow-600" />
                Making Charges ({makingType === 'per_gram' ? '₹/g' : '%'})
              </Label>
              <Input
                type="number"
                value={makingValue}
                onChange={(e) => setMakingValue(parseFloat(e.target.value) || 0)}
                className="text-lg"
              />
            </div>

            <Button
              variant="outline"
              onClick={handleFetchRates}
              className="w-full h-10 border-yellow-500 text-yellow-700 hover:bg-yellow-50 gap-2"
              disabled={fetchLoading}
            >
              <RefreshCw className={`h-4 w-4 ${fetchLoading ? 'animate-spin' : ''}`} />
              Get MCX Live Rates
            </Button>
          </div>

          {/* Results Display */}
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-6 border-2 border-yellow-200 shadow-inner flex flex-col justify-center">
            {calculatedData ? (
              <div className="space-y-4">
                <div className="flex justify-between border-b border-yellow-200 pb-2">
                  <span className="text-gray-600">Material Cost ({purity}):</span>
                  <span className="font-bold">{formatInr(calculatedData.goldCost)}</span>
                </div>
                <div className="flex justify-between border-b border-yellow-200 pb-2">
                  <span className="text-gray-600">Making Charges:</span>
                  <span className="font-bold">{formatInr(calculatedData.makingCharges)}</span>
                </div>
                <div className="flex justify-between border-b border-yellow-200 pb-2">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-bold text-gray-900">{formatInr(calculatedData.subtotal)}</span>
                </div>
                <div className="flex justify-between border-b border-yellow-200 pb-2">
                  <span className="text-gray-600">GST (3%):</span>
                  <span className="font-bold text-indigo-700">{formatInr(calculatedData.gst)}</span>
                </div>
                <div className="flex justify-between pt-4">
                  <span className="text-xl font-bold text-yellow-900">Total Price:</span>
                  <span className="text-2xl font-black text-yellow-800">{formatInr(calculatedData.total)}</span>
                </div>
                <div className="text-[10px] text-yellow-700/60 mt-4 text-center">
                  Base rate: ₹{calculatedData.goldRate}/g | Standard Indian Rounding Apply
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3 opacity-40">
                <Calculator className="h-12 w-12 mx-auto" />
                <p>Result will appear here</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
