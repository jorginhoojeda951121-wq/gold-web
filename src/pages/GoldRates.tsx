import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  RefreshCw,
  Wifi,
  WifiOff,
  Key,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
  Edit3,
  Zap,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
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

// ─── Storage helpers ─────────────────────────────────────────────────────────
function loadStore(): GoldRateStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WEB);
    if (raw) return { ...DEFAULT_STORE, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_STORE;
}
function saveStore(s: GoldRateStore) {
  try {
    localStorage.setItem(STORAGE_KEY_WEB, JSON.stringify(s));
    window.dispatchEvent(new Event("storage"));
  } catch {}
}

// ─── Rate Card ───────────────────────────────────────────────────────────────
interface RateCardProps {
  purity: string;
  label: string;
  subtitle: string;
  rate: number;
  prevRate?: number;
  color: string;
  bgColor: string;
}

const RateDisplayCard = ({ purity, label, subtitle, rate, prevRate, color, bgColor }: RateCardProps) => {
  const diff = prevRate && prevRate !== rate ? rate - prevRate : 0;
  const pct = prevRate && prevRate !== 0 ? ((diff / prevRate) * 100).toFixed(2) : "0.00";

  return (
    <div className={`rounded-2xl p-5 ${bgColor} border-2 ${color} relative overflow-hidden group`}>
      <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-current to-transparent pointer-events-none" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest opacity-60">{purity}</p>
          <p className="text-2xl font-black mt-1">₹{rate.toLocaleString("en-IN")}</p>
          <p className="text-xs opacity-60 mt-0.5">per gram</p>
          <p className="text-xs font-medium mt-1 opacity-70">{label}</p>
          <p className="text-xs opacity-50">{subtitle}</p>
        </div>
        {prevRate && diff !== 0 && (
          <div
            className={`flex flex-col items-end ${
              diff > 0 ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {diff > 0 ? (
              <ArrowUpRight className="h-5 w-5" />
            ) : (
              <ArrowDownRight className="h-5 w-5" />
            )}
            <span className="text-xs font-bold">{pct}%</span>
          </div>
        )}
        {(!prevRate || diff === 0) && <Minus className="h-4 w-4 opacity-30" />}
      </div>
    </div>
  );
};

// ─── Gold Rate Page ───────────────────────────────────────────────────────────
const GoldRates = () => {
  const { toast } = useToast();
  const [store, setStore] = useState<GoldRateStore>(loadStore);
  const [rateForm, setRateForm] = useState<GoldRate>(store.currentRates);
  const [apiKey, setApiKey] = useState(store.apiKey || "");
  const [autoCalc, setAutoCalc] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchSuccess, setFetchSuccess] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const prevRates = store.rateHistory[0];

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
        setRateForm((p) => ({ ...p, rate24K: v }));
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
      toast({ title: "✅ Live Rate Fetched", description: `24K: ₹${rates.rate24K.toLocaleString("en-IN")}/g` });
      setTimeout(() => setFetchSuccess(false), 4000);
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
    toast({
      title: "Gold Rates Locked In",
      description: `Today's 24K rate: ₹${rateForm.rate24K.toLocaleString("en-IN")}/g`,
    });
  };

  const rateCards = [
    {
      purity: "24K",
      label: "Pure Gold",
      subtitle: "99.9% fineness",
      rate: rateForm.rate24K,
      color: "border-yellow-400",
      bgColor: "bg-yellow-50",
    },
    {
      purity: "22K",
      label: "Standard Hallmark",
      subtitle: "91.6% fineness",
      rate: rateForm.rate22K,
      color: "border-amber-400",
      bgColor: "bg-amber-50",
    },
    {
      purity: "20K",
      label: "Gold",
      subtitle: "83.3% fineness",
      rate: rateForm.rate20K,
      color: "border-orange-300",
      bgColor: "bg-orange-50",
    },
    {
      purity: "18K",
      label: "Gold",
      subtitle: "75% fineness",
      rate: rateForm.rate18K,
      color: "border-orange-400",
      bgColor: "bg-orange-50",
    },
    {
      purity: "14K",
      label: "Gold",
      subtitle: "58.3% fineness",
      rate: rateForm.rate14K,
      color: "border-amber-300",
      bgColor: "bg-amber-50/60",
    },
    {
      purity: "Silver",
      label: "Fine Silver",
      subtitle: "99.9% fineness",
      rate: rateForm.rateSilver,
      color: "border-slate-300",
      bgColor: "bg-slate-50",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-yellow-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-30 border-b border-amber-100 shadow-sm">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Zap className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-black uppercase tracking-widest text-amber-600">
                  Live Tracker
                </span>
              </div>
              <h1 className="text-2xl font-black text-amber-900">Gold Rate Tracker</h1>
              <p className="text-sm text-amber-700 font-medium flex items-center gap-1.5 mt-0.5">
                <Clock className="h-3.5 w-3.5" />
                {new Date(store.currentRates.lastUpdated).toLocaleString("en-IN", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
                <Badge
                  variant="outline"
                  className={`ml-2 text-[10px] ${
                    store.currentRates.source === "api"
                      ? "border-green-300 text-green-700"
                      : "border-slate-300 text-slate-600"
                  }`}
                >
                  {store.currentRates.source === "api" ? "🟢 Live API" : "✏️ Manual"}
                </Badge>
              </p>
            </div>
            <Button
              onClick={handleFetchLive}
              disabled={isFetching || !apiKey.trim()}
              className="bg-amber-600 hover:bg-amber-700 gap-2 shrink-0"
            >
              {isFetching ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4" />
              )}
              {isFetching ? "Fetching..." : "Refresh Live"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Rate Cards Grid */}
        <section>
          <h2 className="text-sm font-black uppercase tracking-widest text-amber-700 mb-4">
            Today's Rates (₹ per gram)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {rateCards.map((card) => (
              <RateDisplayCard
                key={card.purity}
                {...card}
                prevRate={
                  prevRates
                    ? card.purity === "Silver"
                      ? prevRates.rateSilver
                      : (prevRates as any)[`rate${card.purity}`]
                    : undefined
                }
              />
            ))}
          </div>
        </section>

        {/* Settings Panel */}
        <section>
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="manual">
                <Edit3 className="h-3.5 w-3.5 mr-1" />
                Manual Entry
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

            {/* Manual Entry */}
            <TabsContent value="manual" className="mt-4">
              <Card className="border-amber-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Edit3 className="h-5 w-5 text-amber-600" />
                    Enter Today's Gold Rate
                  </CardTitle>
                  <CardDescription>
                    Enter the 24K rate and all purities auto-calculate using standard multipliers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Auto-calc toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-200">
                    <div>
                      <p className="text-sm font-semibold text-blue-800">Auto-calculate purities</p>
                      <p className="text-xs text-blue-600">
                        24K → 22K (×0.916), 20K (×0.833), 18K (×0.75), 14K (×0.583)
                      </p>
                    </div>
                    <Switch checked={autoCalc} onCheckedChange={setAutoCalc} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      { key: "rate24K", label: "24K Pure Gold", placeholder: "7200", base: true },
                      { key: "rate22K", label: "22K (91.6%)", placeholder: "6600" },
                      { key: "rate20K", label: "20K (83.3%)", placeholder: "6000" },
                      { key: "rate18K", label: "18K (75%)", placeholder: "5400" },
                      { key: "rate14K", label: "14K (58.3%)", placeholder: "4200" },
                      { key: "rateSilver", label: "Silver (99.9%)", placeholder: "95" },
                    ].map(({ key, label, placeholder, base }) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs font-semibold flex items-center gap-1">
                          {label}
                          {base && <Badge variant="secondary" className="text-[9px] px-1">Base Rate</Badge>}
                          {autoCalc && !base && key !== "rateSilver" && (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                        </Label>
                        <div className="flex">
                          <span className="border border-r-0 rounded-l-md bg-amber-50 px-3 flex items-center text-amber-700 font-bold text-sm">₹</span>
                          <Input
                            type="number"
                            placeholder={placeholder}
                            value={(rateForm as any)[key]}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value) || 0;
                              if (key === "rate24K") {
                                update24K(v);
                              } else {
                                setRateForm((p) => ({ ...p, [key]: v }));
                              }
                            }}
                            readOnly={autoCalc && !base && key !== "rateSilver"}
                            className="rounded-l-none font-bold"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2 border-t">
                    <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700 gap-2">
                      <Lock className="h-4 w-4" />
                      Save & Lock Today's Rate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Live API */}
            <TabsContent value="api" className="mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-green-200 bg-green-50/30">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2 text-green-800">
                      <Zap className="h-5 w-5" />
                      GoldAPI.io Setup
                    </CardTitle>
                    <CardDescription className="text-green-700">
                      Free API — 100 requests/day. Returns live INR gold price per gram.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="apikey-main" className="text-xs font-semibold flex items-center gap-1">
                        <Key className="h-3 w-3" />
                        API Key
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="apikey-main"
                          type={showApiKey ? "text" : "password"}
                          placeholder="goldapi-xxxx-io"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="font-mono text-sm flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? "Hide" : "Show"}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Get your free key at{" "}
                        <a
                          href="https://www.goldapi.io"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-green-700 font-medium"
                        >
                          goldapi.io
                        </a>
                      </p>
                    </div>

                    {fetchError && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        {fetchError}
                      </div>
                    )}
                    {fetchSuccess && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        Live rates fetched! Review in Manual tab and save.
                      </div>
                    )}

                    <Button
                      onClick={handleFetchLive}
                      disabled={isFetching || !apiKey.trim()}
                      className="w-full bg-green-600 hover:bg-green-700 gap-2"
                    >
                      {isFetching ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wifi className="h-4 w-4" />
                      )}
                      {isFetching ? "Fetching..." : "Fetch Live Gold Rate (INR)"}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-slate-600" />
                      API Formula
                    </CardTitle>
                    <CardDescription>How rates are calculated from the API</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="p-3 rounded-lg bg-slate-50 border font-mono text-xs space-y-1">
                        <p className="font-semibold text-slate-700">XAU/INR → per gram</p>
                        <p>24K = price_gram_24k (from API)</p>
                        <p>22K = 24K × 0.916</p>
                        <p>20K = 24K × 0.833</p>
                        <p>18K = 24K × 0.750</p>
                        <p>14K = 24K × 0.583</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ✅ API also directly provides 22K & 18K rates when available.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              {fetchSuccess && (
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700 gap-2">
                    <Lock className="h-4 w-4" />
                    Save Fetched Rates
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* History */}
            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-5 w-5 text-amber-600" />
                    Rate Change History
                  </CardTitle>
                  <CardDescription>Last 30 saved rate days</CardDescription>
                </CardHeader>
                <CardContent>
                  {store.rateHistory.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <WifiOff className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No history yet.</p>
                      <p className="text-xs mt-1">Save rates to start tracking daily history.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            <th className="pb-2 text-left">Date & Time</th>
                            <th className="pb-2 text-right">24K</th>
                            <th className="pb-2 text-right">22K</th>
                            <th className="pb-2 text-right">18K</th>
                            <th className="pb-2 text-right">Silver</th>
                            <th className="pb-2 text-center">Source</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {store.rateHistory.map((rate, i) => (
                            <tr key={i} className="hover:bg-amber-50/50 transition-colors">
                              <td className="py-2.5 text-xs font-medium text-slate-700">
                                {new Date(rate.lastUpdated).toLocaleString("en-IN", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </td>
                              <td className="py-2.5 text-right font-bold text-amber-800">₹{rate.rate24K.toLocaleString()}</td>
                              <td className="py-2.5 text-right text-slate-600">₹{rate.rate22K.toLocaleString()}</td>
                              <td className="py-2.5 text-right text-slate-600">₹{rate.rate18K.toLocaleString()}</td>
                              <td className="py-2.5 text-right text-slate-500">₹{rate.rateSilver}</td>
                              <td className="py-2.5 text-center">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    rate.source === "api"
                                      ? "border-green-300 text-green-700"
                                      : "border-slate-300 text-slate-600"
                                  }`}
                                >
                                  {rate.source === "api" ? "API" : "Manual"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        {/* Info Banner */}
        <section className="rounded-2xl bg-amber-900/5 border border-amber-200 p-5">
          <h3 className="font-bold text-amber-900 text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            How Jewellery Billing Works
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {[
              { k: "24K", desc: "Base rate (pure gold)", mult: "× 1.000" },
              { k: "22K", desc: "Most jewellery grade", mult: "× 0.916" },
              { k: "20K", desc: "Designer  jewellery", mult: "× 0.833" },
              { k: "18K", desc: "Setting stones", mult: "× 0.750" },
            ].map(({ k, desc, mult }) => (
              <div key={k} className="bg-white rounded-xl p-3 border border-amber-100">
                <p className="font-black text-amber-800 text-base">{k}</p>
                <p className="text-amber-600 font-mono text-[11px] mt-0.5">{mult}</p>
                <p className="text-slate-500 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default GoldRates;
