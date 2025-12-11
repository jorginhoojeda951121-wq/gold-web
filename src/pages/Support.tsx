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
      const userId = await getCurrentUserId();
      const { error } = await supabase.from('support_requests').insert({
        id: `SUP-${Date.now()}`,
        user_id: userId || null,
        user_email: userEmail || null,
        user_name: userName || userEmail || "Authenticated User",
        subject: formData.subject,
        message: formData.message,
        status: 'new',
        created_at: new Date().toISOString()
      });

      if (error) throw error;

      toast({
        title: "Support Request Sent",
        description: "Your request has been submitted to support."
      });

      setFormData({ subject: "", message: "" });
      setOpen(false);
    } catch (err: any) {
      console.error("Support form submission error:", err);
      toast({
        title: "Error",
        description: err?.message || "Failed to send support request. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] py-8 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 rounded-2xl mb-6 shadow-lg shadow-amber-500/30">
            <MessageSquare className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 dark:from-amber-400 dark:via-amber-300 dark:to-amber-400 bg-clip-text text-transparent mb-3">
            Support Center
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Need help? Our dedicated support team is here to assist you. Send us a message and we'll get back to you promptly.
          </p>
        </div>

        {/* Info Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800 mb-6 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-2 text-lg">Authenticated Support</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You are logged in as <strong className="text-foreground font-semibold">{userEmail || "User"}</strong>.
                  Your support requests will be tracked and prioritized for faster resolution.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support Form Card */}
        <Card className="bg-card shadow-lg border-border/50 hover:shadow-xl transition-shadow duration-300">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground">Need Assistance?</h3>
                <p className="text-muted-foreground">Create a support ticket and our team will help you resolve any issues quickly.</p>
              </div>
              <Button 
                onClick={() => setOpen(true)} 
                size="lg"
                className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:via-amber-400 hover:to-amber-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/40 transition-all duration-300 hover:scale-105"
              >
                <Send className="h-5 w-5 mr-2" />
                New Support Request
              </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
            <DialogHeader className="space-y-3 pb-4 border-b">
              <DialogTitle className="text-2xl font-bold text-foreground">Send Support Request</DialogTitle>
              <DialogDescription className="text-base">
                Describe your issue in detail. We'll track it against your account and respond as soon as possible.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              {/* User Info Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Email</label>
                  <p className="text-foreground font-semibold text-lg">{userEmail || "Loading..."}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Account Status</label>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <p className="text-foreground font-semibold">Authenticated</p>
                  </div>
                </div>
              </div>

              {/* Subject Field */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-foreground">
                  Subject <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief description of your issue (e.g., 'Unable to sync data', 'Payment processing issue')"
                  required
                  className="h-14 bg-background border-2 border-border text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-base transition-all"
                />
              </div>

              {/* Message Field */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-foreground">
                  Message <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Please provide detailed information about your issue, including:\n• What you were trying to do\n• What happened instead\n• Steps to reproduce (if applicable)\n• Any error messages you saw"
                  rows={10}
                  required
                  className="bg-background border-2 border-border text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 resize-none text-base transition-all"
                />
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    <strong>Tip:</strong> Include as much detail as possible to help us assist you quickly. Screenshots or error messages are especially helpful.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || !userEmail}
                size="lg"
                className="w-full h-14 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:via-amber-400 hover:to-amber-500 text-white font-bold text-base shadow-lg shadow-amber-500/30 hover:shadow-amber-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:scale-[1.02]"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Sending Request...
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
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                <MessageSquare className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-bold text-foreground text-lg mb-2">Quick Response</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We prioritize authenticated user requests and aim to respond within 24 hours
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-900/30 border-green-200 dark:border-green-800 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                <CheckCircle2 className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-bold text-foreground text-lg mb-2">Tracked Requests</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                All requests are logged with your account for easy reference and follow-up
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-950/30 dark:to-indigo-900/30 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
                <AlertCircle className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-bold text-foreground text-lg mb-2">Secure & Private</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your information is kept confidential and secure with enterprise-grade encryption
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Support;

