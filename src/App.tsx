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
import Payroll from "./pages/Payroll";
import POS from "./pages/POS";
import Analytics from "./pages/Analytics";
import { ReportingDashboard } from "@/components/ReportingDashboard";
import Contact from "./pages/Contact";
import Support from "./pages/Support";
import PublicSupport from "./pages/PublicSupport";
import GoldCollection from "./pages/GoldCollection";
import PreciousStones from "./pages/PreciousStones";
import JewelryCollection from "./pages/JewelryCollection";
import ArtificialStones from "./pages/ArtificialStones";
import CraftsmenTracking from "./pages/CraftsmenTracking";
import NotFound from "./pages/NotFound";
import SyncApi from "./pages/SyncApi";
import { Subscription } from "./pages/Subscription";
import Reservations from "./pages/Reservations";
import Vendors from "./pages/Vendors";
import GoogleOrderCheckout from "./pages/GoogleOrderCheckout";
import OrderConfirmation from "./pages/OrderConfirmation";
import GenAIReports from "./pages/GenAIReports";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import RefundPolicy from "./pages/RefundPolicy";
import Disclaimer from "./pages/Disclaimer";
import CookieNotice from "./pages/CookieNotice";
import { restoreUserIdFromSession } from "./lib/userStorage";
import { migrateToSingleSource, isMigrationComplete } from "./lib/dataMigration";
import { useEffect } from "react";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DataProvider } from "./contexts/DataContext";

const queryClient = new QueryClient();

// Restore cached user ID on app load for faster data loading
restoreUserIdFromSession();

const App = () => {
  // Run migration on app startup if not already completed
  useEffect(() => {
    const runMigration = async () => {
      try {
        const migrationComplete = await isMigrationComplete();
        if (!migrationComplete) {
          console.log('🔄 Starting data migration to single source of truth...');
          const result = await migrateToSingleSource();
          if (result.success) {
            console.log(`✅ Migration complete: ${result.migrated} items migrated`);
          } else {
            console.error('❌ Migration failed:', result.errors);
          }
        }
      } catch (error) {
        console.error('Error during migration:', error);
      }
    };
    
    runMigration();
  }, []);
  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <DataProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Landing page - no layout wrapper */}
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          {/* Google Actions Center - public checkout & confirmation */}
          <Route path="/order" element={<GoogleOrderCheckout />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="/public-support" element={<PublicSupport />} />
          <Route path="/policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/refund" element={<RefundPolicy />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/cookies" element={<CookieNotice />} />
          
          {/* Protected routes with layout */}
          <Route element={<Layout />}>
            {/* Subscription page - accessible when subscription check redirects here */}
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/dashboard" element={<RequireAuth><Index /></RequireAuth>} />
            <Route path="/gold-collection" element={<GoldCollection />} />
            <Route path="/precious-stones" element={<PreciousStones />} />
            <Route path="/artificial-stones" element={<ArtificialStones />} />
            <Route path="/jewelry-collection" element={<JewelryCollection />} />
            <Route path="/inventory" element={<Index />} />
            <Route path="/craftsmen" element={<CraftsmenTracking />} />
            {/* Staff route now redirects to Payroll (unified system) */}
            <Route path="/staff" element={<RequireAuth><Payroll /></RequireAuth>} />
            <Route path="/payroll" element={<RequireAuth><Payroll /></RequireAuth>} />
            <Route path="/pos" element={<RequireAuth><POS /></RequireAuth>} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/reports" element={<ReportingDashboard />} />
            <Route path="/reports/ai" element={<RequireAuth><GenAIReports /></RequireAuth>} />
            <Route path="/ledger" element={<CustomerLedger />} />
            <Route path="/reservations" element={<RequireAuth><Reservations /></RequireAuth>} />
            <Route path="/vendors" element={<RequireAuth><Vendors /></RequireAuth>} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/support" element={<RequireAuth><Support /></RequireAuth>} />
            <Route path="/settings" element={<BusinessSettings />} />
            <Route path="/api/sync/download" element={<SyncApi />} />
            <Route path="/api/sync/upload" element={<SyncApi />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
        </TooltipProvider>
      </DataProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
