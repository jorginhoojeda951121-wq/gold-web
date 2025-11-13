import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getSupabase } from "@/lib/supabase";
import { getSubscriptionStatus, SubscriptionStatus } from "@/lib/subscription";

export const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const supabase = getSupabase();
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(true); // Start as ready to show UI immediately
  const [signedIn, setSignedIn] = useState<boolean | null>(true); // Assume signed in initially
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  // Fast authentication check function - optimized for speed
  const checkAuth = async () => {
    try {
      // Use cached session first (fast)
      const { data } = await supabase.auth.getSession();
      
      // If no session, redirect immediately
      if (!data.session) {
        setSignedIn(false);
        return false;
      }
      
      // Session exists - allow immediate access
      setSignedIn(true);
      
      // Check subscription status in background (don't block UI)
      if (data.session.user.id) {
        getSubscriptionStatus(data.session.user.id)
          .then(status => {
            setSubscriptionStatus(status);
            if (status.requiresPayment) {
              navigate("/subscription", { replace: true });
            }
          })
          .catch(error => {
            console.error('Error checking subscription:', error);
            // On error, allow access
          });
      }
      
      return true;
    } catch (error) {
      console.error('Auth check failed:', error);
      setSignedIn(false);
      return false;
    }
  };

  // Check auth on mount and cache user ID immediately
  useEffect(() => {
    let ignore = false;
    
    (async () => {
      const isAuthenticated = await checkAuth();
      if (!ignore) {
        if (isAuthenticated) {
          // User is authenticated - ensure user ID is cached for data loading
          try {
            const supabase = getSupabase();
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
              // Cache user ID immediately so data loading can work
              const { getCurrentUserId } = await import('@/lib/userStorage');
              await getCurrentUserId(); // This will cache the user ID
            }
          } catch (e) {
            console.error('Error caching user ID:', e);
          }
        } else {
          // Only clear cache if user is definitely not authenticated
          try {
            const { clearUserIdCache } = await import('@/lib/userStorage');
            clearUserIdCache();
          } catch (e) {
            console.error('Error clearing user ID cache:', e);
          }
        }
      }
    })();
    
    return () => {
      ignore = true;
    };
  }, []);

  // Re-check auth on navigation (lightweight check)
  useEffect(() => {
    // Quick session check without blocking
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate("/auth", { replace: true });
      }
    });
  }, [location.pathname, navigate, supabase]);

  // Listen for auth state changes
  useEffect(() => {
    let ignore = false;
    
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (ignore) return;
      
      // If user signed out, immediately redirect
      if (event === 'SIGNED_OUT' || !session) {
        setSignedIn(false);
        setReady(true);
        
        // Clear only the user ID cache (keep IndexedDB data for offline use)
        try {
          const { clearUserIdCache } = await import('@/lib/userStorage');
          clearUserIdCache();
        } catch (e) {
          console.error('Error clearing user ID cache:', e);
        }
        
        navigate("/auth", { replace: true });
        return;
      }
      
      // If user signed in, verify and check subscription
      if (session?.user?.id) {
        setSignedIn(true);
        
        // Cache user ID immediately so data loading can work
        try {
          const { getCurrentUserId } = await import('@/lib/userStorage');
          await getCurrentUserId(); // This will cache the user ID
        } catch (e) {
          console.error('Error caching user ID:', e);
        }
        
        try {
          const status = await getSubscriptionStatus(session.user.id);
          setSubscriptionStatus(status);
          
          if (status.requiresPayment) {
            navigate("/subscription", { replace: true });
          }
        } catch (error) {
          console.error('Error checking subscription:', error);
        }
      }
    });
    
    return () => { 
      sub.subscription.unsubscribe(); 
      ignore = true; 
    };
  }, [navigate]);

  // Handle navigation in useEffect to avoid render-phase navigation
  useEffect(() => {
    if (!ready) return;
    
    if (!signedIn) {
      navigate("/auth", { replace: true });
      return;
    }
    
    if (subscriptionStatus?.requiresPayment) {
      navigate("/subscription", { replace: true });
    }
  }, [ready, signedIn, subscriptionStatus, navigate]);

  // Render children immediately - auth checks happen in background
  // If not authenticated, navigation will redirect to /auth
  return <>{children}</>;
};

export default RequireAuth;



