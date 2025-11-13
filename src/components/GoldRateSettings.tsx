import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, DollarSign, Clock, Settings2 } from "lucide-react";
import { useUserStorage } from "@/hooks/useUserStorage";
import { useToast } from "@/hooks/use-toast";

export interface GoldRate {
  rate24K: number;      // Rate per gram for 24K gold
  rate22K: number;      // Rate per gram for 22K gold
  rate18K: number;      // Rate per gram for 18K gold
  rate14K: number;      // Rate per gram for 14K gold
  lastUpdated: string;  // ISO timestamp
  updatedBy?: string;   // User who updated the rate
}

export interface MakingCharges {
  type: 'per_gram' | 'percentage';  // Charge type
  value: number;                     // Amount per gram OR percentage
  minimumCharge?: number;            // Minimum making charge
}

export interface GoldRateSettings {
  currentRates: GoldRate;
  makingCharges: {
    gold24K: MakingCharges;
    gold22K: MakingCharges;
    gold18K: MakingCharges;
    gold14K: MakingCharges;
  };
  rateHistory: GoldRate[];
}

const DEFAULT_SETTINGS: GoldRateSettings = {
  currentRates: {
    rate24K: 6800,
    rate22K: 6200,
    rate18K: 5100,
    rate14K: 4000,
    lastUpdated: new Date().toISOString(),
  },
  makingCharges: {
    gold24K: { type: 'per_gram', value: 600, minimumCharge: 500 },
    gold22K: { type: 'per_gram', value: 550, minimumCharge: 450 },
    gold18K: { type: 'per_gram', value: 500, minimumCharge: 400 },
    gold14K: { type: 'per_gram', value: 450, minimumCharge: 350 },
  },
  rateHistory: [],
};

interface GoldRateSettingsProps {
  trigger?: React.ReactNode;
  onRateUpdate?: (settings: GoldRateSettings) => void;
}

export const GoldRateSettingsDialog = ({ trigger, onRateUpdate }: GoldRateSettingsProps) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { data: settings, updateData: setSettings } = useUserStorage<GoldRateSettings>(
    'gold_rate_settings',
    DEFAULT_SETTINGS
  );

  const [rateForm, setRateForm] = useState<GoldRate>(settings.currentRates);
  const [makingForm, setMakingForm] = useState(settings.makingCharges);

  useEffect(() => {
    if (open) {
      setRateForm(settings.currentRates);
      setMakingForm(settings.makingCharges);
    }
  }, [open, settings]);

  const handleSaveRates = () => {
    const updatedSettings: GoldRateSettings = {
      ...settings,
      currentRates: {
        ...rateForm,
        lastUpdated: new Date().toISOString(),
      },
      rateHistory: [
        settings.currentRates, // Save old rate to history
        ...settings.rateHistory.slice(0, 19), // Keep last 20 entries
      ],
    };

    setSettings(updatedSettings);
    onRateUpdate?.(updatedSettings);
    
    toast({
      title: "Gold Rates Updated",
      description: `Rates updated successfully at ${new Date().toLocaleTimeString()}`,
    });
  };

  const handleSaveMaking = () => {
    const updatedSettings: GoldRateSettings = {
      ...settings,
      makingCharges: makingForm,
    };

    setSettings(updatedSettings);
    onRateUpdate?.(updatedSettings);
    
    toast({
      title: "Making Charges Updated",
      description: "Making charges saved successfully",
    });
  };

  const handleSaveAll = () => {
    const updatedSettings: GoldRateSettings = {
      currentRates: {
        ...rateForm,
        lastUpdated: new Date().toISOString(),
      },
      makingCharges: makingForm,
      rateHistory: [
        settings.currentRates,
        ...settings.rateHistory.slice(0, 19),
      ],
    };

    setSettings(updatedSettings);
    onRateUpdate?.(updatedSettings);
    
    toast({
      title: "Settings Saved",
      description: "All gold rate settings updated successfully",
    });
    
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Gold Rate Settings
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-yellow-600" />
            Gold Rate & Making Charges
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="rates" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rates">Current Rates</TabsTrigger>
            <TabsTrigger value="making">Making Charges</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Current Rates Tab */}
          <TabsContent value="rates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-yellow-600" />
                  Gold Rates per Gram
                </CardTitle>
                <CardDescription>
                  Update current market rates for different gold purities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rate24K" className="flex items-center gap-2">
                      <span className="font-bold text-yellow-700">24K</span> Pure Gold (99.9%)
                    </Label>
                    <div className="flex gap-2">
                      <span className="text-2xl font-bold text-muted-foreground">₹</span>
                      <Input
                        id="rate24K"
                        type="number"
                        step="0.01"
                        value={rateForm.rate24K}
                        onChange={(e) => setRateForm({ ...rateForm, rate24K: parseFloat(e.target.value) || 0 })}
                        className="text-lg font-semibold"
                      />
                      <span className="text-muted-foreground self-center">/gram</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rate22K" className="flex items-center gap-2">
                      <span className="font-bold text-yellow-600">22K</span> Standard Gold (91.6%)
                    </Label>
                    <div className="flex gap-2">
                      <span className="text-2xl font-bold text-muted-foreground">₹</span>
                      <Input
                        id="rate22K"
                        type="number"
                        step="0.01"
                        value={rateForm.rate22K}
                        onChange={(e) => setRateForm({ ...rateForm, rate22K: parseFloat(e.target.value) || 0 })}
                        className="text-lg font-semibold"
                      />
                      <span className="text-muted-foreground self-center">/gram</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rate18K" className="flex items-center gap-2">
                      <span className="font-bold text-yellow-500">18K</span> Gold (75%)
                    </Label>
                    <div className="flex gap-2">
                      <span className="text-2xl font-bold text-muted-foreground">₹</span>
                      <Input
                        id="rate18K"
                        type="number"
                        step="0.01"
                        value={rateForm.rate18K}
                        onChange={(e) => setRateForm({ ...rateForm, rate18K: parseFloat(e.target.value) || 0 })}
                        className="text-lg font-semibold"
                      />
                      <span className="text-muted-foreground self-center">/gram</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rate14K" className="flex items-center gap-2">
                      <span className="font-bold text-yellow-400">14K</span> Gold (58.3%)
                    </Label>
                    <div className="flex gap-2">
                      <span className="text-2xl font-bold text-muted-foreground">₹</span>
                      <Input
                        id="rate14K"
                        type="number"
                        step="0.01"
                        value={rateForm.rate14K}
                        onChange={(e) => setRateForm({ ...rateForm, rate14K: parseFloat(e.target.value) || 0 })}
                        className="text-lg font-semibold"
                      />
                      <span className="text-muted-foreground self-center">/gram</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Last updated: {new Date(settings.currentRates.lastUpdated).toLocaleString()}
                  </div>
                  <Button onClick={handleSaveRates} className="bg-yellow-600 hover:bg-yellow-700">
                    Update Rates
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Making Charges Tab */}
          <TabsContent value="making" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-yellow-600" />
                  Making Charges Configuration
                </CardTitle>
                <CardDescription>
                  Set making charges per gram for different gold purities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {(['gold24K', 'gold22K', 'gold18K', 'gold14K'] as const).map((purity) => {
                  const label = purity.replace('gold', '') + ' Gold';
                  return (
                    <div key={purity} className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h4 className="font-semibold text-yellow-900 mb-3">{label}</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`${purity}-value`}>Making Charge (₹/gram)</Label>
                          <Input
                            id={`${purity}-value`}
                            type="number"
                            step="0.01"
                            value={makingForm[purity].value}
                            onChange={(e) => setMakingForm({
                              ...makingForm,
                              [purity]: { ...makingForm[purity], value: parseFloat(e.target.value) || 0 }
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${purity}-min`}>Minimum Charge (₹)</Label>
                          <Input
                            id={`${purity}-min`}
                            type="number"
                            step="0.01"
                            value={makingForm[purity].minimumCharge || 0}
                            onChange={(e) => setMakingForm({
                              ...makingForm,
                              [purity]: { ...makingForm[purity], minimumCharge: parseFloat(e.target.value) || 0 }
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleSaveMaking} className="bg-yellow-600 hover:bg-yellow-700">
                    Save Making Charges
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  Rate Change History
                </CardTitle>
                <CardDescription>
                  Last 20 rate updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {settings.rateHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No history available yet</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {settings.rateHistory.map((rate, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {new Date(rate.lastUpdated).toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground flex gap-4">
                            <span>24K: ₹{rate.rate24K}/g</span>
                            <span>22K: ₹{rate.rate22K}/g</span>
                            <span>18K: ₹{rate.rate18K}/g</span>
                            <span>14K: ₹{rate.rate14K}/g</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {index === 0 ? 'Previous' : `${index + 1} ago`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveAll} className="bg-gradient-gold hover:bg-gold-dark">
            Save All Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Hook to get current gold rates
export const useGoldRates = () => {
  const { data: settings } = useUserStorage<GoldRateSettings>('gold_rate_settings', DEFAULT_SETTINGS);
  return settings;
};

// Utility function to calculate gold item price
export const calculateGoldPrice = (
  weight: number,
  purity: '24K' | '22K' | '18K' | '14K',
  settings: GoldRateSettings,
  taxRate: number = 3
): {
  goldRate: number;
  goldCost: number;
  makingCharges: number;
  subtotal: number;
  gst: number;
  total: number;
} => {
  const rateKey = `rate${purity}` as keyof GoldRate;
  const makingKey = `gold${purity}` as keyof typeof settings.makingCharges;
  
  const goldRate = settings.currentRates[rateKey] as number;
  const makingConfig = settings.makingCharges[makingKey];
  
  const goldCost = weight * goldRate;
  const makingCharges = Math.max(
    weight * makingConfig.value,
    makingConfig.minimumCharge || 0
  );
  
  const subtotal = goldCost + makingCharges;
  const gst = subtotal * (taxRate / 100);
  const total = subtotal + gst;
  
  return {
    goldRate,
    goldCost,
    makingCharges,
    subtotal,
    gst,
    total,
  };
};

