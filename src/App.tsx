import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { CustomerLedger } from "@/components/CustomerLedger";
import { BusinessSettings } from "@/components/BusinessSettings";
import Auth from "@/components/Auth";
import RequireAuth from "@/components/RequireAuth";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Staff from "./pages/Staff";
import POS from "./pages/POS";
import Analytics from "./pages/Analytics";
import { ReportingDashboard } from "@/components/ReportingDashboard";
import Contact from "./pages/Contact";
import GoldCollection from "./pages/GoldCollection";
import PreciousStones from "./pages/PreciousStones";
import JewelryCollection from "./pages/JewelryCollection";
import CraftsmenTracking from "./pages/CraftsmenTracking";
import NotFound from "./pages/NotFound";
import SyncApi from "./pages/SyncApi";
import { Subscription } from "./pages/Subscription";

const queryClient = new QueryClient();

const App = () => {
  console.log("App component rendering...");
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Landing page - no layout wrapper */}
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          
          {/* Protected routes with layout */}
          <Route element={<Layout />}>
            {/* Subscription page - accessible when subscription check redirects here */}
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/dashboard" element={<RequireAuth><Index /></RequireAuth>} />
            <Route path="/gold-collection" element={<GoldCollection />} />
            <Route path="/precious-stones" element={<PreciousStones />} />
            <Route path="/jewelry-collection" element={<JewelryCollection />} />
            <Route path="/inventory" element={<Index />} />
            <Route path="/craftsmen" element={<CraftsmenTracking />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="/pos" element={<RequireAuth><POS /></RequireAuth>} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/reports" element={<ReportingDashboard />} />
            <Route path="/ledger" element={<CustomerLedger />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/settings" element={<BusinessSettings />} />
            <Route path="/api/sync/download" element={<SyncApi />} />
            <Route path="/api/sync/upload" element={<SyncApi />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
