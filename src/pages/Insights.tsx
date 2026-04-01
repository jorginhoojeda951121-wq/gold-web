import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, FileText, Sparkles, Brain } from "lucide-react";
import Analytics from "./Analytics";
import { ReportingDashboard } from "@/components/ReportingDashboard";
import { MetalBalance } from "@/components/MetalBalance";
import GenAIReports from "./GenAIReports";
import { useBusinessName } from "@/hooks/useBusinessName";

interface InsightsProps {
  defaultTab?: string;
}

const Insights = ({ defaultTab = "analytics" }: InsightsProps) => {
  const businessName = useBusinessName();
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  return (
    <div className="min-h-screen bg-gradient-elegant pb-10">
      <header className="bg-gradient-primary shadow-elegant border-b border-border/50 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground flex items-center gap-2">
                <Brain className="h-6 w-6" />
                Business Insights
              </h1>
              <p className="text-primary-foreground/70 text-sm">Comprehensive analytics and reporting for {businessName}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex justify-center">
            <TabsList className="grid grid-cols-4 w-full max-w-3xl bg-white/10 backdrop-blur-md border border-white/20 p-1 rounded-xl shadow-lg">
              <TabsTrigger 
                value="analytics" 
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary transition-all duration-300 gap-2 font-bold"
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger 
                value="metal-balance" 
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary transition-all duration-300 gap-2 font-bold"
              >
                <Brain className="h-4 w-4" />
                Metal Accounting
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary transition-all duration-300 gap-2 font-bold"
              >
                <FileText className="h-4 w-4" />
                Reports
              </TabsTrigger>
              <TabsTrigger 
                value="ai-reports" 
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary transition-all duration-300 gap-2 font-bold"
              >
                <Sparkles className="h-4 w-4" />
                AI Reports
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="analytics" className="mt-0 focus-visible:outline-none outline-none animate-in fade-in duration-500">
            <Card className="border-none bg-transparent shadow-none">
              <CardContent className="p-0">
                <Analytics standalone={false} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metal-balance" className="mt-0 focus-visible:outline-none outline-none animate-in fade-in duration-500">
            <MetalBalance />
          </TabsContent>

          <TabsContent value="reports" className="mt-0 focus-visible:outline-none outline-none">
             <div className="bg-white rounded-2xl shadow-elegant border border-gray-100 p-6">
               <ReportingDashboard />
             </div>
          </TabsContent>

          <TabsContent value="ai-reports" className="mt-0 focus-visible:outline-none outline-none">
            <div className="bg-white rounded-2xl shadow-elegant border border-gray-100 p-6">
              <GenAIReports standalone={false} />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Insights;
