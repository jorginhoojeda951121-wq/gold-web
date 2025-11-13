import { TrendingUp } from "lucide-react";
import { useGoldRates } from "./GoldRateSettings";
import { Card, CardContent } from "@/components/ui/card";

export const GoldRateDisplay = () => {
  const goldSettings = useGoldRates();
  const rates = goldSettings.currentRates;

  return (
    <Card className="bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 border-2 border-yellow-300">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-yellow-700" />
          <h3 className="font-bold text-yellow-900">Today's Gold Rates</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/80 p-2 rounded border border-yellow-300">
            <div className="text-xs text-yellow-700 font-semibold">24K Pure</div>
            <div className="text-lg font-bold text-yellow-900">₹{rates.rate24K}</div>
            <div className="text-xs text-gray-600">/gram</div>
          </div>
          
          <div className="bg-white/80 p-2 rounded border border-yellow-300">
            <div className="text-xs text-yellow-700 font-semibold">22K Standard</div>
            <div className="text-lg font-bold text-yellow-900">₹{rates.rate22K}</div>
            <div className="text-xs text-gray-600">/gram</div>
          </div>
          
          <div className="bg-white/80 p-2 rounded border border-yellow-300">
            <div className="text-xs text-yellow-700 font-semibold">18K Gold</div>
            <div className="text-lg font-bold text-yellow-900">₹{rates.rate18K}</div>
            <div className="text-xs text-gray-600">/gram</div>
          </div>
          
          <div className="bg-white/80 p-2 rounded border border-yellow-300">
            <div className="text-xs text-yellow-700 font-semibold">14K Gold</div>
            <div className="text-lg font-bold text-yellow-900">₹{rates.rate14K}</div>
            <div className="text-xs text-gray-600">/gram</div>
          </div>
        </div>
        
        <div className="text-xs text-yellow-700 mt-2 text-center">
          Updated: {new Date(rates.lastUpdated).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
};

export const GoldRateCompact = () => {
  const goldSettings = useGoldRates();
  const rates = goldSettings.currentRates;

  return (
    <div className="inline-flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-full border-2 border-yellow-300">
      <TrendingUp className="h-4 w-4 text-yellow-700" />
      <div className="flex items-center gap-3 text-sm">
        <span className="font-semibold text-yellow-900">24K:</span>
        <span className="font-bold text-yellow-900">₹{rates.rate24K}/g</span>
        <span className="text-yellow-700">|</span>
        <span className="font-semibold text-yellow-900">22K:</span>
        <span className="font-bold text-yellow-900">₹{rates.rate22K}/g</span>
      </div>
    </div>
  );
};

