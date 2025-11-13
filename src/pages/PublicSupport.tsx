import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Loader2, ArrowLeft, Mail, User, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PublicSupport = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Validate required fields
    if (!formData.fullName || !formData.email || !formData.subject || !formData.message) {
      toast({ 
        title: "Missing Information", 
        description: "Please fill in all required fields (Name, Email, Subject, and Message).", 
        variant: "destructive" 
      });
      setLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({ 
        title: "Invalid Email", 
        description: "Please enter a valid email address.", 
        variant: "destructive" 
      });
      setLoading(false);
      return;
    }

    try {
      // Web3Forms API endpoint - messages go to administrator only
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: import.meta.env.VITE_WEB3FORMS_ACCESS_KEY || "YOUR_ACCESS_KEY_HERE",
          subject: `[Public Support] ${formData.subject} - From: ${formData.fullName}`,
          from_name: "Gold Crafts Manager - Public Support",
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone || "Not provided",
          message: `Public Support Request:\n\nFrom: ${formData.fullName}\nEmail: ${formData.email}\nPhone: ${formData.phone || "Not provided"}\n\nSubject: ${formData.subject}\n\nMessage:\n${formData.message}`,
          // Send to administrator email only
          to: "retailmarketingpro1.0@gmail.com",
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({ 
          title: "Message Sent Successfully!", 
          description: "Thank you for contacting us. Our team will respond to you via email soon!" 
        });
        // Reset form
        setFormData({
          fullName: "",
          email: "",
          phone: "",
          subject: "",
          message: ""
        });
      } else {
        throw new Error(result.message || "Failed to send message");
      }
    } catch (err: any) {
      console.error("Support form submission error:", err);
      toast({ 
        title: "Error", 
        description: err?.message || "Failed to send support request. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="text-gray-300 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/auth")}
              className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full mb-6 shadow-lg shadow-yellow-500/50">
            <MessageSquare className="h-10 w-10 text-slate-900" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Contact Support
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Have questions or need assistance? Send us a message and our support team will get back to you as soon as possible.
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <Mail className="h-8 w-8 text-yellow-400 mx-auto mb-3" />
              <h3 className="font-semibold text-white text-sm mb-2">Email Response</h3>
              <p className="text-xs text-gray-400">
                We'll respond to your email within 24-48 hours
              </p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-8 w-8 text-yellow-400 mx-auto mb-3" />
              <h3 className="font-semibold text-white text-sm mb-2">Direct Support</h3>
              <p className="text-xs text-gray-400">
                Your message goes directly to our admin team
              </p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <User className="h-8 w-8 text-yellow-400 mx-auto mb-3" />
              <h3 className="font-semibold text-white text-sm mb-2">No Account Needed</h3>
              <p className="text-xs text-gray-400">
                Send inquiries before signing up
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Support Form Card */}
        <Card className="bg-slate-900/70 border-slate-800 backdrop-blur-sm shadow-2xl">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-2xl font-bold text-white">
              Send Support Request
            </CardTitle>
            <p className="text-gray-400 text-sm mt-2">
              Fill out the form below and we'll get back to you via email.
            </p>
          </CardHeader>
          
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name and Email Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <Input
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Your full name"
                      required
                      className="pl-10 h-12 bg-slate-950/50 border-slate-700 text-white placeholder:text-gray-500 focus:border-yellow-500 focus:ring-yellow-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your@email.com"
                      required
                      className="pl-10 h-12 bg-slate-950/50 border-slate-700 text-white placeholder:text-gray-500 focus:border-yellow-500 focus:ring-yellow-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Phone Number <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="pl-10 h-12 bg-slate-950/50 border-slate-700 text-white placeholder:text-gray-500 focus:border-yellow-500 focus:ring-yellow-500/20"
                  />
                </div>
              </div>

              {/* Subject Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Subject <span className="text-red-400">*</span>
                </label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief description of your inquiry"
                  required
                  className="h-12 bg-slate-950/50 border-slate-700 text-white placeholder:text-gray-500 focus:border-yellow-500 focus:ring-yellow-500/20"
                />
              </div>

              {/* Message Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Message <span className="text-red-400">*</span>
                </label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Please provide detailed information about your inquiry or issue..."
                  rows={6}
                  required
                  className="bg-slate-950/50 border-slate-700 text-white placeholder:text-gray-500 focus:border-yellow-500 focus:ring-yellow-500/20 resize-none"
                />
                <p className="text-xs text-gray-500">
                  Include as much detail as possible to help us assist you quickly.
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-slate-900 font-semibold shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Send Message to Admin
                  </>
                )}
              </Button>

              {/* Help Text */}
              <div className="text-center pt-2">
                <p className="text-xs text-gray-500">
                  Your message will be sent directly to our administrator team.
                  <br />
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/auth")}
                    className="text-yellow-400 hover:text-yellow-300 font-medium underline underline-offset-2 transition-colors"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicSupport;

