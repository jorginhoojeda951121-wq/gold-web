import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { User, Mail, Phone, Building2, Send, Loader2, MapPin, Globe, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabase";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";

const Contact = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const supabase = getSupabase();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobileNumber: "",
    businessType: "",
    message: ""
  });
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Load business settings for contact information
  const { data: businessSettings } = useOfflineStorage('businessSettings', {
    businessName: "Golden Treasures",
    address: "123 Jewelry Street, Mumbai",
    phone: "+91 8910921128",
    email: "info@goldentreasures.com",
    gstNumber: "27XXXXX1234X1Z5",
    currency: "INR",
    timezone: "Asia/Kolkata"
  });

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      
      // If logged in, pre-fill email from session
      if (session?.user?.email) {
        setFormData(prev => ({
          ...prev,
          email: session.user.email || prev.email
        }));
      }
    };
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      if (session?.user?.email) {
        setFormData(prev => ({
          ...prev,
          email: session.user.email || prev.email
        }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Validate required fields
    if (!formData.fullName || !formData.email || !formData.message) {
      toast({ 
        title: "Missing Information", 
        description: "Please fill in all required fields (Full Name, Email, and Message).", 
        variant: "destructive" 
      });
      setLoading(false);
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
          access_key: import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || "YOUR_ACCESS_KEY_HERE",
          subject: "New Contact Form Submission - Gold Crafts Manager",
          from_name: "Gold Crafts Manager Contact Form",
          name: formData.fullName,
          email: formData.email,
          phone: formData.mobileNumber,
          business_type: formData.businessType || "Not specified",
          message: formData.message,
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
        setFormData({
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
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] py-8 bg-gray-50">
      {/* Content Container */}
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Business Contact Information Card */}
          <div className="w-full">
            <Card className="bg-white border border-gray-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-800">
                  Contact Information
                </CardTitle>
                <p className="text-gray-600 text-sm mt-2">
                  Our business contact details and location
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Business Name */}
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Business Name</p>
                    <p className="text-gray-800 font-semibold text-lg">
                      {businessSettings?.businessName || "Not set"}
                    </p>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <MapPin className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Address</p>
                    <p className="text-gray-800">
                      {businessSettings?.address || "Not set"}
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Phone</p>
                    {businessSettings?.phone ? (
                      <a 
                        href={`tel:${businessSettings.phone}`}
                        className="text-green-600 hover:text-green-700 transition-colors"
                      >
                        {businessSettings.phone}
                      </a>
                    ) : (
                      <p className="text-gray-800">Not set</p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Mail className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Email</p>
                    {businessSettings?.email ? (
                      <a 
                        href={`mailto:${businessSettings.email}`}
                        className="text-green-600 hover:text-green-700 transition-colors"
                      >
                        {businessSettings.email}
                      </a>
                    ) : (
                      <p className="text-gray-800">Not set</p>
                    )}
                  </div>
                </div>

                {/* GST Number */}
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Globe className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">GST Number</p>
                    <p className="text-gray-800">
                      {businessSettings?.gstNumber || "Not set"}
                    </p>
                  </div>
                </div>

                {/* Currency */}
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Globe className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Currency</p>
                    <p className="text-gray-800">
                      {businessSettings?.currency || "Not set"}
                    </p>
                  </div>
                </div>

                {/* Timezone */}
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Clock className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Timezone</p>
                    <p className="text-gray-800">
                      {businessSettings?.timezone || "Not set"}
                    </p>
                  </div>
                </div>

                {/* Edit Settings Link */}
                <div className="pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/settings")}
                    className="w-full border-green-600 text-green-600 hover:bg-green-50"
                  >
                    Edit Contact Information
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form Card */}
          <div className="w-full">
            <Card className="bg-white border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="space-y-3 pb-6">
                <CardTitle className="text-3xl font-bold text-gray-800">
                  Get in Touch
                </CardTitle>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Fill out the form below and our team will contact you to help set up your business account.
                </p>
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-xs leading-relaxed">
                    <strong>Important:</strong> Each signup supports <strong>1 business only</strong>. 
                    For additional locations, please create a separate account with a new signup.
                  </p>
                </div>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    <label className="block text-sm font-medium text-gray-700">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                      <Input
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="Enter your full name"
                        required
                        className="pl-10 h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500/20 transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div className="group space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="your@email.com"
                        required
                        className="pl-10 h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500/20 transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div className="group space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                      <Input
                        type="tel"
                        value={formData.mobileNumber}
                        onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                        placeholder="Enter your mobile number"
                        className="pl-10 h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500/20 transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div className="group space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Business Type <span className="text-gray-500 text-xs">(1 Business per Account)</span>
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                      <Input
                        value={formData.businessType}
                        onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                        placeholder="Enter your business name or type (e.g., Gold Jewelry Store)"
                        className="pl-10 h-12 bg-white border-gray-300 text-gray-800 placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500/20 transition-all duration-200"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Note: Each account supports one business. Additional locations require separate signups.
                    </p>
                  </div>

                  <div className="group space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us about your business and setup requirements. Remember: 1 business = 1 account. For multiple locations, create separate accounts."
                      rows={4}
                      required
                      className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500/20 transition-all duration-200 resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold text-base rounded-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
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

                  {/* Only show login link if user is not logged in */}
                  {!isLoggedIn && (
                    <p className="text-center text-gray-500 text-xs mt-4">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => navigate("/auth")}
                        className="text-green-600 hover:text-green-700 font-medium underline underline-offset-2 transition-colors"
                      >
                        Login here
                      </button>
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
