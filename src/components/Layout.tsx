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

  // Cache user ID immediately on mount to ensure data loading works
  useEffect(() => {
    if (isAuthRoute) return;
    
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user?.id) {
          // Cache user ID immediately so data loading can work
          const { getCurrentUserId } = await import('@/lib/userStorage');
          await getCurrentUserId(); // This will cache the user ID
        }
      } catch (e) {
        console.error('Error caching user ID on mount:', e);
      }
    })();
  }, [isAuthRoute, supabase]);

  // Auto-sync on page load and every 30 minutes
  useEffect(() => {
    let cancelled = false;
    const SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds

    const runSync = async (skipRecentCheck = false) => {
      // Check if we should skip sync
      if (isAuthRoute) return;
      if (cancelled) return;
      
      // Skip if synced recently (within last 5 minutes) unless forced
      if (!skipRecentCheck && lastSyncTime) {
        const timeSinceLastSync = Date.now() - lastSyncTime.getTime();
        const fiveMinutes = 5 * 60 * 1000;
        if (timeSinceLastSync < fiveMinutes) {
          return;
        }
      }
      
      try {
        // Verify user is authenticated
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          return;
        }
        
        setIsSyncing(true);
        setTimeUntilNextSync(30 * 60);
        
        // Show sync notification
        toast({
          title: "Syncing...",
          description: "Synchronizing data with server",
        });

        const startTime = Date.now();
        await syncAll();
        const duration = Math.round((Date.now() - startTime) / 1000);

        if (!cancelled) {
          setLastSyncTime(new Date());
          setIsSyncing(false);
          setTimeUntilNextSync(30 * 60);
          
          // Show success notification
          toast({
            title: "✓ Sync Complete",
            description: `Data synced in ${duration}s`,
          });
          
          // Trigger custom event that pages can listen to for reloading data
          window.dispatchEvent(new CustomEvent('data-synced'));
        }
      } catch (e: any) {
        if (!cancelled) {
          setIsSyncing(false);
          setTimeUntilNextSync(30 * 60);
          const msg = e?.message || 'Unknown error';
          console.error('Sync error:', e);
          
          // Show error notification
          toast({
            title: "Sync Failed",
            description: msg,
            variant: "destructive",
          });
        }
      }
    };

    // Run sync after a longer delay to let the page load first and display local data
    // This prevents blocking the UI on initial load
    const initialSyncTimer = setTimeout(() => {
      runSync();
    }, 5000); // 5 seconds delay - enough time for page to load and display local data

    // Set up periodic sync every 30 minutes (force sync on interval)
    syncIntervalRef.current = window.setInterval(() => runSync(true), SYNC_INTERVAL);

    return () => {
      cancelled = true;
      clearTimeout(initialSyncTimer);
      if (syncIntervalRef.current) {
        window.clearInterval(syncIntervalRef.current);
      }
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

  const handleLogout = () => {
    // Show immediate feedback
    toast({ 
      title: "Logging out...", 
      description: "Please wait while we sign you out." 
    });

    // Perform logout asynchronously but don't wait for it
    (async () => {
      try {
        // 1. Sign out from Supabase
        await supabase.auth.signOut({ scope: 'global' }).catch(() => {});
        
        // 2. Clear user ID cache only (keep IndexedDB data for offline use)
        try {
          const { clearUserIdCache } = await import('@/lib/userStorage');
          clearUserIdCache();
        } catch {}
        
        // 3. Clear auth tokens from storage
        try {
          localStorage.removeItem('supabase.auth.token');
          sessionStorage.clear();
        } catch {}
      } catch (e) {
        console.error('Logout cleanup error:', e);
      }
    })();

    // Immediately redirect (don't wait for cleanup)
    setTimeout(() => {
      window.location.href = "/auth";
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar - Hidden on mobile, visible on lg+ */}
      {!isAuthRoute && (
        <div className="hidden lg:block">
          <Sidebar 
            isCollapsed={sidebarCollapsed} 
            onToggle={toggleSidebar} 
          />
        </div>
      )}
      
      {/* Mobile Sidebar */}
      {!isAuthRoute && (
        <MobileSidebar 
          isOpen={mobileSidebarOpen} 
          onClose={() => setMobileSidebarOpen(false)} 
        />
      )}

      {/* Main Content */}
      <div className={`transition-all duration-300 ease-in-out ${
        !isAuthRoute 
          ? (sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-[272px]') 
          : ''
      }`}>
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
                data-logout-btn
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
          <main className="p-4 lg:p-6 xl:p-8 bg-gradient-to-br from-gray-50 to-white min-h-screen">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        )}
      </div>
    </div>
  );
};
