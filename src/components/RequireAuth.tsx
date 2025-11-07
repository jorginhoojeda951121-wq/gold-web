import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabase } from "@/lib/supabase";
import { getSubscriptionStatus, SubscriptionStatus } from "@/lib/subscription";

export const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const supabase = getSupabase();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!ignore) {
        const isSignedIn = !!data.session;
        setSignedIn(isSignedIn);
        
        if (isSignedIn && data.session?.user?.id) {
          // Check subscription status
          try {
            const status = await getSubscriptionStatus(data.session.user.id);
            setSubscriptionStatus(status);
            
            // If subscription is expired and requires payment, redirect to subscription page
            if (status.requiresPayment) {
              navigate("/subscription", { replace: true });
              return;
            }
          } catch (error) {
            console.error('Error checking subscription:', error);
            // On error, allow access but log it
          }
        }
        
        setReady(true);
      }
    })();
    
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!ignore) {
        const isSignedIn = !!session;
        setSignedIn(isSignedIn);
        
        if (isSignedIn && session?.user?.id) {
          try {
            const status = await getSubscriptionStatus(session.user.id);
            setSubscriptionStatus(status);
            
            if (status.requiresPayment) {
              navigate("/subscription", { replace: true });
              return;
            }
          } catch (error) {
            console.error('Error checking subscription:', error);
          }
        }
      }
    });
    
    return () => { 
      sub.subscription.unsubscribe(); 
      ignore = true; 
    };
  }, [navigate]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  if (!signedIn) {
    navigate("/auth", { replace: true });
    return null;
  }
  
  // Double check subscription status before rendering
  if (subscriptionStatus?.requiresPayment) {
    navigate("/subscription", { replace: true });
    return null;
  }
  
  return <>{children}</>;
};

export default RequireAuth;



