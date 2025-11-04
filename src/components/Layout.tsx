import { useState, useEffect, useRef } from "react";
import { Sidebar, MobileSidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Menu, ChevronLeft, ChevronRight, LogOut, Clock, RefreshCw } from "lucide-react";
import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { getSupabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { syncAll } from "@/lib/sync";
import { useBusinessName } from "@/hooks/useBusinessName";

export const Layout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [timeUntilNextSync, setTimeUntilNextSync] = useState(30 * 60); // 30 minutes in seconds
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const location = useLocation();
  const isAuthRoute = location.pathname === "/auth";
  const supabase = getSupabase();
  const { toast } = useToast();
  const syncIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const businessName = useBusinessName();

  // Background auto-sync: on load, every 30 minutes, on visibility/online
  useEffect(() => {
    let cancelled = false;
    const SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds

    const runSync = async () => {
      try {
        if (isAuthRoute) return;
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        
        if (!cancelled) {
          setIsSyncing(true);
          setTimeUntilNextSync(30 * 60); // Reset countdown
          
          // Show sync started notification
          toast({
            title: "Sync Started",
            description: "Syncing data with Supabase...",
          });

          const startTime = Date.now();
          await syncAll();
          const duration = Math.round((Date.now() - startTime) / 1000);

          setLastSyncTime(new Date());
          setIsSyncing(false);
          setTimeUntilNextSync(30 * 60); // Reset countdown after sync completes
          
          // Show sync completed notification
          toast({
            title: "Sync Completed",
            description: `Data synced successfully in ${duration}s`,
          });
        }
      } catch (e: any) {
        setIsSyncing(false);
        setTimeUntilNextSync(30 * 60); // Reset countdown even on failure
        const msg = e?.message || 'Unknown error';
        // Show sync failed notification
        toast({
          title: "Sync Failed",
          description: msg,
          variant: "destructive",
        });
      }
    };

    // initial sync
    runSync();

    // periodic sync every 30 minutes (30, 60, 90, 120...)
    syncIntervalRef.current = window.setInterval(runSync, SYNC_INTERVAL);

    const onVisibility = () => {
      if (document.visibilityState === "visible") runSync();
    };
    const onOnline = () => runSync();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      if (syncIntervalRef.current) {
        window.clearInterval(syncIntervalRef.current);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [isAuthRoute, supabase, toast]);

  // Countdown timer update every second
  useEffect(() => {
    if (isAuthRoute) return;

    const updateCountdown = () => {
      setTimeUntilNextSync((prev) => {
        if (prev <= 1) {
          return 30 * 60; // Reset to 30 minutes when it reaches 0
        }
        return prev - 1;
      });
    };

    countdownIntervalRef.current = window.setInterval(updateCountdown, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
      }
    };
  }, [isAuthRoute]);

  // Format time remaining (MM:SS)
  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    } finally {
      try { toast({ title: "Signed out", description: "You have been logged out." }); } catch {}
      window.location.href = "/auth";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      {!isAuthRoute && (
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggle={toggleSidebar} 
        />
      )}
      
      {/* Mobile Sidebar */}
      {!isAuthRoute && (
        <MobileSidebar 
          isOpen={mobileSidebarOpen} 
          onClose={() => setMobileSidebarOpen(false)} 
        />
      )}

      {/* Main Content */}
      <div className={`transition-all duration-300 ease-in-out ${!isAuthRoute ? (sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64') : ''} ml-0`}>
        {/* Top Bar */}
        {!isAuthRoute && (
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileSidebar}
              className="lg:hidden h-10 w-10 p-0 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            {/* Page Title */}
            <div className="flex items-center gap-3">
              <div className="hidden lg:block">
                <h1 className="text-xl font-bold text-gray-900">
                  {businessName}
                </h1>
                <p className="text-sm text-gray-500">Professional jewelry inventory management</p>
              </div>
              <div className="lg:hidden">
                <h1 className="text-lg font-semibold text-gray-900">
                  {businessName}
                </h1>
              </div>
            </div>
            
            {/* Right side actions */}
            <div className="flex items-center gap-3">
              {/* Sync Countdown Timer */}
              {!isAuthRoute && (
                <div className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border ${
                  isSyncing 
                    ? 'bg-blue-50 border-blue-200' 
                    : timeUntilNextSync <= 300 
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-green-50 border-green-200'
                }`}>
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                      <span className="text-sm font-medium text-blue-700">Syncing...</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">
                        Next sync: {formatTimeRemaining(timeUntilNextSync)}
                      </span>
                    </>
                  )}
                </div>
              )}
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700">Live</span>
              </div>
              <div className="text-sm text-gray-500 hidden md:block">
                {new Date().toLocaleDateString()}
              </div>
              <Button
                onClick={handleLogout}
                variant="destructive"
                size="sm"
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
        )}

        {/* Page Content */}
        {isAuthRoute ? (
          <main className="min-h-screen bg-gray-900">
            <Outlet />
          </main>
        ) : (
          <main className="p-4 lg:p-8 bg-gradient-to-br from-gray-50 to-white min-h-screen">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        )}
      </div>
    </div>
  );
};
