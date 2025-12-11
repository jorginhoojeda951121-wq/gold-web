import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Send, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/userStorage";

const Support = () => {
  const { toast } = useToast();
  const supabase = getSupabase();

  const [formData, setFormData] = useState({
    subject: "",
    message: ""
  });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

  const setUserFromSession = (user: any) => {
    if (!user) {
      setUserEmail("");
      setUserName("");
      return;
    }

    const email = user.email || "";
    const name = user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      email?.split("@")[0] ||
      "User";

    setUserEmail(email);
    setUserName(name);
  };

  const loadUserInfo = async (isActive = true) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isActive) return;

      if (session?.user) {
        setUserFromSession(session.user);
        return;
      }

      // Fallback: explicitly fetch the user (helps when session isn't hydrated yet)
      const { data: userData } = await supabase.auth.getUser();
      if (!isActive) return;
      setUserFromSession(userData.user);
    } catch (error) {
      console.error("Error loading user info:", error);
    }
  };

  // Get user information from session
  useEffect(() => {
    let isMounted = true;

    loadUserInfo(isMounted);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        setUserFromSession(session.user);
      } else {
        setUserEmail("");
        setUserName("");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate required fields
    if (!formData.subject || !formData.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in both Subject and Message fields.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    try {
      const { getUserData, setUserData } = await import('@/lib/userStorage');
      const userId = await getCurrentUserId();
      const supportRequests = (await getUserData<any[]>('support_requests')) || [];
      supportRequests.push({
        id: `SUP-${Date.now()}`,
        user_id: userId || "Unknown",
        user_email: userEmail,
        user_name: userName || userEmail || "Authenticated User",
        subject: formData.subject,
        message: formData.message,
        created_at: new Date().toISOString(),
        status: 'saved'
      });
      await setUserData('support_requests', supportRequests);

      toast({
        title: "Support Request Saved",
        description: "Your request has been saved. We will review and contact you shortly."
      });

      setFormData({ subject: "", message: "" });
      setOpen(false);
    } catch (err: any) {
      console.error("Support form submission error:", err);
      toast({
        title: "Error",
        description: err?.message || "Failed to save support request. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] py-8 bg-gradient-elegant">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-gold rounded-full mb-4">
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Support Center</h1>
          <p className="text-muted-foreground">
            Need help? Send us a message and our support team will assist you.
          </p>
        </div>

        {/* Info Card */}
        <Card className="bg-card shadow-card border-border/50 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Authenticated Support</h3>
                <p className="text-sm text-muted-foreground">
                  You are logged in as <strong className="text-foreground">{userEmail || "User"}</strong>.
                  Your support requests will be tracked and prioritized.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support Form Card */}
        <Card className="bg-card shadow-card border-border/50">
          <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Need help?</h3>
              <p className="text-sm text-muted-foreground">Create a support ticket just like adding a vendor.</p>
            </div>
            <Button onClick={() => setOpen(true)} className="bg-gradient-gold hover:bg-gold-dark text-primary">
              <Send className="h-4 w-4 mr-2" />
              New Support Request
            </Button>
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Send Support Request</DialogTitle>
              <DialogDescription>
                Describe your issue in detail. We’ll track it against your account.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Your Email</label>
                  <p className="text-foreground font-medium">{userEmail || "Loading..."}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Account Status</label>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <p className="text-foreground font-medium">Authenticated</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Subject <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief description of your issue (e.g., 'Unable to sync data')"
                  required
                  className="h-12 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Message <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Please provide detailed information about your issue, including steps to reproduce if applicable..."
                  rows={8}
                  required
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Include as much detail as possible to help us assist you quickly.
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading || !userEmail}
                className="w-full h-12 bg-gradient-gold hover:bg-gold-dark text-primary font-semibold shadow-gold transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Send Support Request
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Additional Help Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 text-center">
              <MessageSquare className="h-6 w-6 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-foreground text-sm mb-1">Quick Response</h3>
              <p className="text-xs text-muted-foreground">
                We prioritize authenticated user requests
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <h3 className="font-semibold text-foreground text-sm mb-1">Tracked Requests</h3>
              <p className="text-xs text-muted-foreground">
                All requests are logged with your account
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 text-center">
              <AlertCircle className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <h3 className="font-semibold text-foreground text-sm mb-1">Secure & Private</h3>
              <p className="text-xs text-muted-foreground">
                Your information is kept confidential
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Support;

