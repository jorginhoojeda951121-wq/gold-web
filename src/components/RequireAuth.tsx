import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const supabase = getSupabase();
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!ignore) {
        setSignedIn(!!data.session);
        setReady(true);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => { sub.subscription.unsubscribe(); ignore = true; };
  }, []);

  if (!ready) return null;
  if (!signedIn) {
    window.location.href = "/auth";
    return null;
  }
  return <>{children}</>;
};

export default RequireAuth;



