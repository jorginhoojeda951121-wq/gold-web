import { PurityCalculator } from '@/jeweler/PurityCalculator';
import { OldGoldExchange } from '@/jeweler/OldGoldExchange';
import { HallmarkScanner } from '@/jeweler/HallmarkScanner';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Recycle, ShieldCheck, Scale, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function JewelerModules() {
  return (
    <div className="container mx-auto py-10 space-y-10 bg-gray-50/30 min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <header className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 drop-shadow-sm flex items-center gap-3">
          <Calculator className="h-10 w-10 text-yellow-600" />
          Jeweler Core Modules
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Professional-grade tools for Indian Jewelers: Hallmarking (BIS), Karat-to-Gram conversion, 
          Purity-based valuation, and Gold Exchange management.
        </p>
      </header>

      <Tabs defaultValue="purity" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[600px] h-14 bg-white/80 backdrop-blur-sm border shadow-sm p-1">
          <TabsTrigger value="purity" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white h-12 gap-2 text-base font-bold">
            <Calculator className="h-5 w-5" />
            Pricing & Purity
          </TabsTrigger>
          <TabsTrigger value="exchange" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white h-12 gap-2 text-base font-bold">
            <Recycle className="h-5 w-5" />
            Old Gold Ex
          </TabsTrigger>
          <TabsTrigger value="hallmark" className="data-[state=active]:bg-blue-700 data-[state=active]:text-white h-12 gap-2 text-base font-bold">
            <ShieldCheck className="h-5 w-5" />
            BIS HUID Scan
          </TabsTrigger>
        </TabsList>

        <div className="mt-8">
          <TabsContent value="purity" className="animate-in fade-in-50 slide-in-from-left-4 duration-500">
            <PurityCalculator />
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoCard title="Karat to Gram Formulas" icon={<Scale className="h-5 w-5 text-gray-500" />}>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between"><span>24K (Pure Gold):</span> <span>99.9% / 999.0 Fine</span></div>
                  <div className="flex justify-between"><span>22K (Standard):</span> <span>91.6% / 916.0 Fine</span></div>
                  <div className="flex justify-between"><span>18K (Jewelry):</span> <span>75.0% / 750.0 Fine</span></div>
                  <div className="flex justify-between"><span>14K (Economy):</span> <span>58.3% / 583.0 Fine</span></div>
                </div>
              </InfoCard>
              <InfoCard title="Indian Compliance (Mandatory)" icon={<ShieldCheck className="h-5 w-5 text-gray-500" />}>
                <p className="text-sm text-gray-600 leading-relaxed italic">
                  * All gold jewelry sold in India must carry a 6-digit HUID starting from 2023. 
                  GST is currently 3% on material + making charges.
                </p>
              </InfoCard>
            </div>
          </TabsContent>

          <TabsContent value="exchange" className="animate-in fade-in-50 slide-in-from-right-4 duration-500">
            <OldGoldExchange />
          </TabsContent>

          <TabsContent value="hallmark" className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
            <HallmarkScanner />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function InfoCard({ title, children, icon }: { title: string; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Card className="bg-white/50 border-gray-100 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}
