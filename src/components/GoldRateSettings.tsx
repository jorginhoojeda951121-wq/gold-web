import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import {
  TrendingUp,
  DollarSign,
  Clock,
  Settings2,
  Zap,
  RefreshCw,
  Key,
  AlertCircle,
  CheckCircle2,
  History,
  Lock,
  Edit3,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  GoldRate,
  GoldRateStore,
  DEFAULT_STORE,
  STORAGE_KEY_WEB,
  fetchLiveGoldRate,
  calculatePurityRates,
} from "@/lib/goldRateService";

export type { GoldRate };

// ─── Legacy compat exports used elsewhere in app ───────────────────────────
export interface MakingCharges {
  type: "per_gram" | "percentage";
  value: number;
  minimumCharge?: number;
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

const DEFAULT_MAKING_CHARGES = {
  gold24K: { type: "per_gram" as const, value: 600, minimumCharge: 500 },
  gold22K: { type: "per_gram" as const, value: 550, minimumCharge: 450 },
  gold18K: { type: "per_gram" as const, value: 500, minimumCharge: 400 },
  gold14K: { type: "per_gram" as const, value: 450, minimumCharge: 350 },
};

// ─── Storage helpers ────────────────────────────────────────────────────────
function loadStore(): GoldRateStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WEB);
    if (raw) return { ...DEFAULT_STORE, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_STORE;
}

function saveStore(store: GoldRateStore) {
  try {
    localStorage.setItem(STORAGE_KEY_WEB, JSON.stringify(store));
  } catch {}
}

// ─── Hook: current gold rates ────────────────────────────────────────────────
export const useGoldRates = (): GoldRateSettings => {
  const [store, setStore] = useState<GoldRateStore>(loadStore);

  useEffect(() => {
    const handler = () => setStore(loadStore());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return {
    currentRates: store.currentRates,
    makingCharges: DEFAULT_MAKING_CHARGES,
    rateHistory: store.rateHistory,
  };
};

// ─── Utility: calculate gold item price ─────────────────────────────────────
export const calculateGoldPrice = (
  weight: number,
  purity: "24K" | "22K" | "18K" | "14K",
  settings: GoldRateSettings,
  taxRate = 3
) => {
  const rateKey = `rate${purity}` as keyof GoldRate;
  const makingKey = `gold${purity}` as keyof typeof settings.makingCharges;
  const goldRate = settings.currentRates[rateKey] as number;
  const makingConfig = settings.makingCharges[makingKey];
  const goldCost = weight * goldRate;
  const makingCharges = Math.max(
    weight * makingConfig.value,
    makingConfig.minimumCharge || 0
  );
  const subtotal = Math.round((goldCost + makingCharges) * 100) / 100;
  const gst = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + gst) * 100) / 100;
  return {
    goldRate,
    goldCost: Math.round(goldCost * 100) / 100,
    makingCharges: Math.round(makingCharges * 100) / 100,
    subtotal,
    gst,
    total,
  };
};

// ─── Rate Row Component ──────────────────────────────────────────────────────
interface RateRowProps {
  label: string;
  purity: string;
  value: number;
  onChange: (v: number) => void;
  readOnly?: boolean;
  badge?: string;
}

const RateRow = ({ label, purity, value, onChange, readOnly, badge }: RateRowProps) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-200/50 group hover:bg-amber-50 transition-colors">
    <div className="w-14 text-center">
      <span className="text-base font-black text-amber-800">{purity}</span>
      {badge && (
        <div>
          <span className="text-[9px] font-semibold text-amber-600 uppercase">{badge}</span>
        </div>
      )}
    </div>
    <div className="flex-1">
      <p className="text-xs text-amber-700 font-medium">{label}</p>
    </div>
    <div className="flex items-center gap-1">
      <span className="text-sm font-bold text-amber-900">₹</span>
      <Input
        type="number"
        step="1"
        min="0"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        readOnly={readOnly}
        className={`w-28 text-right font-bold text-amber-900 border-amber-300 focus:border-amber-500 ${
          readOnly ? "bg-gray-50 cursor-not-allowed opacity-75" : "bg-white"
        }`}
      />
      <span className="text-xs text-amber-600 w-10">/g</span>
    </div>
    {readOnly && <Lock className="h-3 w-3 text-amber-400" />}
  </div>
);

// ─── Main Dialog ─────────────────────────────────────────────────────────────
interface GoldRateSettingsProps {
  trigger?: React.ReactNode;
  onRateUpdate?: (settings: GoldRateSettings) => void;
}

export const GoldRateSettingsDialog = ({
  trigger,
  onRateUpdate,
}: GoldRateSettingsProps) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [store, setStore] = useState<GoldRateStore>(loadStore);
  const [rateForm, setRateForm] = useState<GoldRate>(store.currentRates);
  const [apiKey, setApiKey] = useState(store.apiKey || "");
  const [autoCalc, setAutoCalc] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchSuccess, setFetchSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("rates");

  useEffect(() => {
    if (open) {
      const fresh = loadStore();
      setStore(fresh);
      setRateForm(fresh.currentRates);
      setApiKey(fresh.apiKey || "");
    }
  }, [open]);

  const update24K = useCallback(
    (v: number) => {
      if (autoCalc) {
        const calc = calculatePurityRates(v, rateForm.rateSilver);
        setRateForm((prev) => ({
          ...prev,
          ...calc,
          lastUpdated: prev.lastUpdated,
          source: prev.source,
        }));
      } else {
        setRateForm((prev) => ({ ...prev, rate24K: v }));
      }
    },
    [autoCalc, rateForm.rateSilver]
  );

  const handleFetchLive = async () => {
    setIsFetching(true);
    setFetchError(null);
    setFetchSuccess(false);
    try {
      const rates = await fetchLiveGoldRate(apiKey);
      setRateForm(rates);
      setFetchSuccess(true);
      toast({
        title: "✅ Live Rate Fetched",
        description: `24K: ₹${rates.rate24K.toLocaleString()}/g — from GoldAPI.io`,
      });
      setTimeout(() => setFetchSuccess(false), 3000);
    } catch (err: any) {
      setFetchError(err.message);
      toast({ title: "❌ Fetch Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsFetching(false);
    }
  };

  const handleSave = () => {
    const updated: GoldRateStore = {
      ...store,
      apiKey,
      currentRates: { ...rateForm, lastUpdated: new Date().toISOString() },
      rateHistory: [store.currentRates, ...store.rateHistory.slice(0, 29)],
    };
    saveStore(updated);
    setStore(updated);
    onRateUpdate?.({
      currentRates: updated.currentRates,
      makingCharges: DEFAULT_MAKING_CHARGES,
      rateHistory: updated.rateHistory,
    });
    toast({
      title: "Gold Rates Saved",
      description: `24K: ₹${rateForm.rate24K.toLocaleString()}/g — ${
        rateForm.source === "api" ? "via GoldAPI.io" : "manual entry"
      }`,
    });
    setOpen(false);
  };

  const sourceLabel = rateForm.source === "api" ? "Live API" : "Manual";
  const sourceColor =
    rateForm.source === "api"
      ? "bg-green-100 text-green-700 border-green-300"
      : "bg-slate-100 text-slate-600 border-slate-300";

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
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 rounded-lg bg-amber-100">
              <TrendingUp className="h-5 w-5 text-amber-700" />
            </div>
            Gold Rate Tracker
            <Badge className={`ml-auto text-xs border ${sourceColor}`}>
              {sourceLabel}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rates">
              <DollarSign className="h-3.5 w-3.5 mr-1" />
              Rates
            </TabsTrigger>
            <TabsTrigger value="api">
              <Wifi className="h-3.5 w-3.5 mr-1" />
              Live API
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-3.5 w-3.5 mr-1" />
              History
            </TabsTrigger>
          </TabsList>

          {/* ── RATES TAB ─────────────────────────────────────── */}
          <TabsContent value="rates" className="space-y-4 pt-2">
            {/* Auto-calc toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-200">
              <div>
                <p className="text-sm font-semibold text-blue-800">Auto-calculate purities</p>
                <p className="text-xs text-blue-600">
                  Enter 24K rate → 22K, 20K, 18K, 14K auto-fill
                </p>
              </div>
              <Switch
                checked={autoCalc}
                onCheckedChange={setAutoCalc}
                id="auto-calc"
              />
            </div>

            <div className="space-y-2">
              <RateRow
                purity="24K"
                label="Pure Gold (99.9%)"
                badge="Base"
                value={rateForm.rate24K}
                onChange={update24K}
              />
              <RateRow
                purity="22K"
                label="Standard (91.6%)"
                value={rateForm.rate22K}
                onChange={(v) => setRateForm((p) => ({ ...p, rate22K: v }))}
                readOnly={autoCalc}
              />
              <RateRow
                purity="20K"
                label="Gold (83.3%)"
                value={rateForm.rate20K}
                onChange={(v) => setRateForm((p) => ({ ...p, rate20K: v }))}
                readOnly={autoCalc}
              />
              <RateRow
                purity="18K"
                label="Gold (75%)"
                value={rateForm.rate18K}
                onChange={(v) => setRateForm((p) => ({ ...p, rate18K: v }))}
                readOnly={autoCalc}
              />
              <RateRow
                purity="14K"
                label="Gold (58.3%)"
                value={rateForm.rate14K}
                onChange={(v) => setRateForm((p) => ({ ...p, rate14K: v }))}
                readOnly={autoCalc}
              />

              {/* Silver */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-14 text-center">
                  <span className="text-base font-black text-slate-700">Ag</span>
                  <div>
                    <span className="text-[9px] font-semibold text-slate-500 uppercase">Silver</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-600 font-medium">Fine Silver (99.9%)</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-slate-700">₹</span>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    value={rateForm.rateSilver}
                    onChange={(e) =>
                      setRateForm((p) => ({ ...p, rateSilver: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-28 text-right font-bold text-slate-700 border-slate-300"
                  />
                  <span className="text-xs text-slate-500 w-10">/g</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Updated: {new Date(store.currentRates.lastUpdated).toLocaleString("en-IN")}
              </span>
              <Button
                onClick={handleSave}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-1"
              >
                Save Rates
              </Button>
            </div>
          </TabsContent>

          {/* ── LIVE API TAB ───────────────────────────────────── */}
          <TabsContent value="api" className="space-y-4 pt-2">
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-green-800">
                  <Zap className="h-4 w-4" />
                  GoldAPI.io — Live India Rate
                </CardTitle>
                <CardDescription className="text-green-700 text-xs">
                  Free API — 100 req/day. Visit{" "}
                  <a
                    href="https://www.goldapi.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    goldapi.io
                  </a>{" "}
                  to get your free API key.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="gold-api-key"
                    className="text-xs font-semibold flex items-center gap-1"
                  >
                    <Key className="h-3 w-3" />
                    API Key
                  </Label>
                  <Input
                    id="gold-api-key"
                    type="password"
                    placeholder="goldapi-xxxxxxxxxxxx-io"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>

                {fetchError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {fetchError}
                  </div>
                )}

                {fetchSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    Live rates fetched successfully!
                  </div>
                )}

                <Button
                  onClick={handleFetchLive}
                  disabled={isFetching || !apiKey.trim()}
                  className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                >
                  {isFetching ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Fetching Live Rates...
                    </>
                  ) : (
                    <>
                      <Wifi className="h-4 w-4" />
                      Fetch Live Gold Rate (INR)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Manual/IBJA option */}
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-slate-600" />
                  Manual / IBJA Rate
                </CardTitle>
                <CardDescription className="text-xs">
                  Enter today's 24K rate from IBJA or MCX — all purities auto-calculate.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={rateForm.rate24K}
                    onChange={(e) => update24K(parseFloat(e.target.value) || 0)}
                    className="text-xl font-bold text-amber-900 border-amber-300"
                    placeholder="Enter 24K rate per gram"
                  />
                  <span className="text-muted-foreground text-sm whitespace-nowrap">/gram (24K)</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Auto-calculated → 22K: ₹{rateForm.rate22K} | 18K: ₹{rateForm.rate18K}
                </p>
              </CardContent>
            </Card>

            {/* Save from API */}
            <Button
              onClick={handleSave}
              className="w-full bg-amber-600 hover:bg-amber-700 gap-2"
            >
              Save These Rates
            </Button>
          </TabsContent>

          {/* ── HISTORY TAB ───────────────────────────────────── */}
          <TabsContent value="history" className="pt-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4 text-amber-600" />
                  Rate Change History
                </CardTitle>
                <CardDescription className="text-xs">Last 30 rate updates</CardDescription>
              </CardHeader>
              <CardContent>
                {store.rateHistory.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12 text-sm">
                    <WifiOff className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No history yet. Save your first rate to begin tracking.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {store.rateHistory.map((rate, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center p-3 rounded-lg bg-amber-50 border border-amber-100 text-xs"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-amber-900">
                            {new Date(rate.lastUpdated).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                          <div className="flex gap-3 text-amber-700">
                            <span>24K: ₹{rate.rate24K}</span>
                            <span>22K: ₹{rate.rate22K}</span>
                            <span>18K: ₹{rate.rate18K}</span>
                            <span>Ag: ₹{rate.rateSilver}</span>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            rate.source === "api"
                              ? "border-green-300 text-green-700"
                              : "border-slate-300 text-slate-600"
                          }`}
                        >
                          {rate.source === "api" ? "Live API" : "Manual"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
