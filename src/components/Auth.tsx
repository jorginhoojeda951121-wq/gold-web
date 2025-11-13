import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, Package, Send, Phone, Building2, Eye, EyeOff, AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { AIChatbot, ChatbotButton } from "@/components/AIChatbot";

export const Auth = () => {
  const supabase = getSupabase();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // View state: 'signin' or 'getintouch'
  const [currentView, setCurrentView] = useState<"signin" | "getintouch">("signin");

  // Sign In state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contact form state
  const [contactForm, setContactForm] = useState({
    fullName: "",
    email: "",
    mobileNumber: "",
    businessType: "",
    message: ""
  });
  const [contactLoading, setContactLoading] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);

  // Generate fixed particle positions
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 2
    }));
  }, []);

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;
      toast({ title: "Signed in", description: "Welcome back!" });
      // ensure profile exists in users table (first login after confirmed signup)
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const userId = userRes.user?.id;
        if (userId) {
          // Upsert to users table (table structure: id, email, created_at)
          const { error: profileErr } = await supabase
            .from("users")
            .upsert({ id: userId, email }, { onConflict: 'id' });
          if (profileErr) {
            console.warn('User profile upsert failed:', profileErr.message);
          }
          
          // Initialize subscription for user
          try {
            const { initializeSubscription } = await import('@/lib/subscription');
            await initializeSubscription(userId, email);
          } catch (subError: any) {
            console.warn('Subscription initialization error:', subError?.message);
            // Don't block login if subscription init fails
          }
        }
      } catch (profileError: any) {
        // Log error but don't block login
        console.warn('User profile update error:', profileError?.message);
      }
      // Double-check we actually have a valid session before redirecting
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Authentication failed: no active session returned.");
      }
      // Cache user ID immediately so data loading works after redirect
      try {
        const { getCurrentUserId } = await import('@/lib/userStorage');
        await getCurrentUserId(); // This will cache the user ID
      } catch (e) {
        console.error('Error caching user ID on login:', e);
      }
      
      // Redirect to dashboard after successful login using React Router (avoids full page reload)
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Authentication failed");
      toast({ title: "Auth error", description: err?.message || "Authentication failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactLoading(true);
    
    // Validate required fields
    if (!contactForm.fullName || !contactForm.email || !contactForm.message) {
      toast({ 
        title: "Missing Information", 
        description: "Please fill in all required fields (Full Name, Email, and Message).", 
        variant: "destructive" 
      });
      setContactLoading(false);
      return;
    }

    try {
      // Web3Forms API endpoint
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || "YOUR_ACCESS_KEY_HERE", // Get your key from https://web3forms.com
          subject: "New Contact Form Submission - Gold Crafts Manager",
          from_name: "Gold Crafts Manager Contact Form",
          name: contactForm.fullName,
          email: contactForm.email,
          phone: contactForm.mobileNumber,
          business_type: contactForm.businessType || "Not specified",
          message: contactForm.message,
          // Set the recipient email address
          to: "retailmarketingpro1.0@gmail.com",
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({ 
          title: "Message Sent Successfully!", 
          description: "Thank you for contacting us. We'll get back to you soon!" 
        });
        // Reset form
        setContactForm({
          fullName: "",
          email: "",
          mobileNumber: "",
          businessType: "",
          message: ""
        });
      } else {
        throw new Error(result.message || "Failed to send message");
      }
    } catch (err: any) {
      console.error("Form submission error:", err);
      toast({ 
        title: "Error", 
        description: err?.message || "Failed to send message. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setContactLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Premium Dark Background with Enhanced Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Enhanced particle effects */}
        <div className="absolute inset-0 opacity-40">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute rounded-full bg-cyan-400/40 animate-pulse"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`
              }}
            />
          ))}
        </div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      {/* Single Panel Layout - Dynamic: Sign In or Get in Touch */}
      <div className="w-full max-w-md relative z-10">
        {/* Sign In Form */}
        {currentView === "signin" ? (
        <Card className="backdrop-blur-md bg-slate-800/90 border border-slate-700/50 shadow-2xl shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-all duration-300">
          <CardHeader className="space-y-3 pb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/50 animate-pulse">
                <Package className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Gold Crafts Manager</CardTitle>
            </div>
            <p className="text-center text-slate-300 text-sm font-medium">Account Management</p>
            <p className="text-center text-white/70 text-sm">Sign in to manage your account</p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={onSignIn} className="space-y-5">
              <div className="group space-y-2">
                <label className="block text-sm font-medium text-slate-200">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="pl-10 h-12 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20 focus:bg-slate-900/70 transition-all duration-200"
                  />
                </div>
              </div>
              
              <div className="group space-y-2">
                <label className="block text-sm font-medium text-slate-200">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 pr-10 h-12 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20 focus:bg-slate-900/70 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 backdrop-blur-sm animate-fadeIn">
                  <p className="text-red-300 text-sm flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-base rounded-lg shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Please wait...
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
            
            <p className="text-center text-slate-400 text-xs mt-4">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setCurrentView("getintouch");
                  setShowSignUpModal(true);
                }}
                className="text-cyan-400 hover:text-cyan-300 font-medium underline underline-offset-2 transition-colors"
              >
                Sign Up
              </button>
            </p>
          </CardContent>
        </Card>
        ) : (
        /* Get in Touch Form */
        <Card className="backdrop-blur-md bg-slate-800/90 border border-slate-700/50 shadow-2xl shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-all duration-300">
          <CardHeader className="space-y-3 pb-6">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Get in Touch</CardTitle>
            <p className="text-white/70 text-sm leading-relaxed">Fill out the form below and our team will contact you to help set up your business account.</p>
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-amber-300 text-xs leading-relaxed">
                <strong>Important:</strong> Each signup supports <strong>1 business only</strong>. 
                For additional locations, please create a separate account with a new signup.
              </p>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={onContactSubmit} className="space-y-4">
              {/* Honeypot field for spam protection */}
              <input
                type="checkbox"
                name="botcheck"
                className="hidden"
                style={{ display: "none" }}
                tabIndex={-1}
                autoComplete="off"
              />
              
              <div className="group space-y-2">
                <label className="block text-sm font-medium text-slate-200">Full Name <span className="text-red-400">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
                  <Input
                    value={contactForm.fullName}
                    onChange={(e) => setContactForm({ ...contactForm, fullName: e.target.value })}
                    placeholder="Enter your full name"
                    required
                    className="pl-10 h-12 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20 focus:bg-slate-900/70 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="group space-y-2">
                <label className="block text-sm font-medium text-slate-200">Email Address <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
                  <Input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="your@email.com"
                    required
                    className="pl-10 h-12 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20 focus:bg-slate-900/70 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="group space-y-2">
                <label className="block text-sm font-medium text-slate-200">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
                  <Input
                    type="tel"
                    value={contactForm.mobileNumber}
                    onChange={(e) => setContactForm({ ...contactForm, mobileNumber: e.target.value })}
                    placeholder="Enter your mobile number"
                    className="pl-10 h-12 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20 focus:bg-slate-900/70 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="group space-y-2">
                <label className="block text-sm font-medium text-slate-200">
                  Business Type <span className="text-slate-400 text-xs">(1 Business per Account)</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
                  <Input
                    value={contactForm.businessType}
                    onChange={(e) => setContactForm({ ...contactForm, businessType: e.target.value })}
                    placeholder="Enter your business name or type (e.g., Gold Jewelry Store)"
                    className="pl-10 h-12 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20 focus:bg-slate-900/70 transition-all duration-200"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Note: Each account supports one business. Additional locations require separate signups.
                </p>
              </div>

              <div className="group space-y-2">
                <label className="block text-sm font-medium text-slate-200">Message <span className="text-red-400">*</span></label>
                <Textarea
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  placeholder="Tell us about your business and setup requirements. Remember: 1 business = 1 account. For multiple locations, create separate accounts."
                  rows={4}
                  required
                  className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20 focus:bg-slate-900/70 transition-all duration-200 resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={contactLoading}
                className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-base rounded-lg shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {contactLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Send Message
                  </>
                )}
              </Button>

              <p className="text-center text-slate-400 text-xs mt-4">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setCurrentView("signin")}
                  className="text-cyan-400 hover:text-cyan-300 font-medium underline underline-offset-2 transition-colors"
                >
                  Login here
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
        )}
      </div>

      {/* Sign Up Available Only on Mobile App Modal */}
      <Dialog open={showSignUpModal} onOpenChange={setShowSignUpModal}>
        <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-orange-900/95 via-orange-800/95 to-orange-900/95 border-orange-700/50">
          <DialogHeader>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <DialogTitle className="text-2xl font-bold text-white mb-2">
                  Sign Up Available Only on Mobile App
                </DialogTitle>
                <DialogDescription className="text-white/90 text-base">
                  To create an account and get started, please download our mobile app from the App Store or Google Play Store. The web application is for account management only.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              onClick={() => {
                // Replace with your actual Google Play Store URL
                window.open('https://play.google.com/store/apps/details?id=com.goldcrafts.app', '_blank');
              }}
              className="flex-1 h-12 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-lg shadow-lg transition-all duration-200"
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                </svg>
                <span>Google Play Store</span>
                <ExternalLink className="h-4 w-4" />
              </div>
            </Button>
            
            <Button
              onClick={() => {
                // Replace with your actual App Store URL
                window.open('https://apps.apple.com/app/gold-crafts-manager/id123456789', '_blank');
              }}
              className="flex-1 h-12 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-lg shadow-lg transition-all duration-200"
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05,20.28C16.23,20.28 15.46,20.15 14.75,19.91C14.04,19.66 13.4,19.32 12.82,18.91C12.24,18.5 11.74,18.02 11.32,17.47C10.9,16.92 10.58,16.31 10.37,15.64C10.15,14.97 10.05,14.26 10.05,13.5C10.05,12.89 10.12,12.29 10.25,11.72C10.38,11.15 10.57,10.61 10.82,10.09C11.07,9.57 11.38,9.08 11.74,8.63C12.1,8.18 12.52,7.77 13,7.41C13.5,7.05 14.04,6.74 14.64,6.5C15.23,6.26 15.87,6.14 16.55,6.14C17.18,6.14 17.77,6.24 18.32,6.43C18.87,6.62 19.36,6.88 19.77,7.23C20.18,7.58 20.5,8 20.73,8.5C20.96,9 21.08,9.54 21.08,10.14H18.94C18.94,9.64 18.83,9.2 18.59,8.82C18.36,8.44 18.05,8.14 17.68,7.91C17.3,7.68 16.88,7.57 16.41,7.57C15.85,7.57 15.35,7.7 14.91,7.95C14.47,8.2 14.1,8.54 13.8,8.95C13.5,9.36 13.27,9.82 13.11,10.32C12.95,10.82 12.87,11.34 12.87,11.87C12.87,12.5 12.98,13.09 13.18,13.64C13.39,14.19 13.68,14.68 14.05,15.1C14.43,15.52 14.87,15.86 15.38,16.11C15.89,16.36 16.46,16.48 17.08,16.48C17.54,16.48 17.97,16.4 18.36,16.23C18.75,16.06 19.09,15.83 19.36,15.54C19.64,15.25 19.85,14.91 19.99,14.52C20.13,14.13 20.2,13.7 20.2,13.23H21.08C21.08,13.84 20.96,14.41 20.71,14.95C20.46,15.48 20.11,15.94 19.64,16.32C19.18,16.7 18.63,16.99 18,17.18C17.37,17.37 16.68,17.46 15.91,17.46C15.19,17.46 14.52,17.36 13.91,17.16C13.3,16.96 12.75,16.68 12.27,16.32C11.79,15.96 11.38,15.52 11.05,15C10.72,14.48 10.49,13.9 10.36,13.27C10.23,12.64 10.16,11.96 10.16,11.23C10.16,10.54 10.24,9.88 10.4,9.26C10.56,8.64 10.79,8.07 11.09,7.55C11.39,7.03 11.76,6.57 12.2,6.18C12.64,5.79 13.14,5.47 13.7,5.23C14.27,4.99 14.9,4.87 15.59,4.87C16.23,4.87 16.82,4.97 17.36,5.18C17.9,5.39 18.37,5.68 18.77,6.05C19.18,6.42 19.5,6.86 19.73,7.36C19.96,7.86 20.08,8.41 20.08,9H22.22C22.22,8.18 22.05,7.41 21.72,6.68C21.39,5.95 20.93,5.3 20.36,4.73C19.79,4.16 19.11,3.7 18.32,3.36C17.54,3.02 16.68,2.85 15.73,2.85C14.73,2.85 13.81,3.03 12.95,3.41C12.1,3.79 11.36,4.33 10.73,5.05C10.1,5.77 9.61,6.63 9.27,7.64C8.93,8.65 8.76,9.77 8.76,11C8.76,12.3 8.95,13.5 9.32,14.59C9.7,15.68 10.24,16.63 10.95,17.45C11.66,18.27 12.52,18.94 13.52,19.45C14.52,19.96 15.64,20.22 16.87,20.22C17.68,20.22 18.45,20.12 19.18,19.91C19.91,19.7 20.57,19.41 21.18,19.05C21.79,18.68 22.32,18.24 22.77,17.73C23.22,17.22 23.57,16.66 23.82,16.05H21.59C21.36,16.55 21.04,16.99 20.64,17.36C20.23,17.73 19.75,18.02 19.18,18.23C18.61,18.44 17.96,18.55 17.22,18.55H17.05V20.28Z" />
                </svg>
                <span>App Store</span>
                <ExternalLink className="h-4 w-4" />
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Chatbot Button - Fixed bottom right */}
      <ChatbotButton onClick={() => setShowChatbot(true)} />

      {/* AI Chatbot Modal */}
      <AIChatbot open={showChatbot} onOpenChange={setShowChatbot} />
    </div>
  );
};

export default Auth;


