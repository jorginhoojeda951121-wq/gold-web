import { useState, useEffect, useRef } from "react";
import { Sidebar, MobileSidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Menu, ChevronLeft, ChevronRight, LogOut, Clock, RefreshCw } from "lucide-react";
import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { getSupabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
// Sync removed - all operations go directly to Supabase
import { useBusinessName } from "@/hooks/useBusinessName";

export const Layout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const isAuthRoute = location.pathname === "/auth";
  const supabase = getSupabase();
  const { toast } = useToast();
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

  // Sync removed - all operations go directly to Supabase
  // No background sync needed

  // Sync countdown removed - no sync needed

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
