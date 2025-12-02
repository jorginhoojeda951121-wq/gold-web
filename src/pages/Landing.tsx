import { useNavigate, Link } from "react-router-dom";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Gem,
  DollarSign,
  BarChart3,
  Package,
  ShoppingCart,
  FileText,
  Calendar,
  TrendingUp,
  BookOpen,
  Users,
  Hammer,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle2,
  Activity,
  ShoppingBag,
  FileCheck,
  Receipt,
  CreditCard,
  Settings,
  Sparkles,
  Crown,
  Facebook,
  Twitter,
  Youtube,
  Instagram,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertCircle, ExternalLink, Palette } from "lucide-react";
import { AIChatbot, ChatbotButton } from "@/components/AIChatbot";
import { useTheme } from "@/contexts/ThemeContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Landing = () => {
  const navigate = useNavigate();
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { theme, setTheme, themeClasses } = useTheme();
  const supabase = getSupabase();

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Generate animated particles
  const particles = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
      size: Math.random() * 3 + 1,
    }));
  }, []);

  const handleSignUpClick = () => {
    setShowSignUpModal(true);
  };

  const handleSupportClick = () => {
    // Navigate to public support page (no login required)
    navigate("/public-support");
  };

  const handleSignInClick = () => {
    navigate("/auth");
  };

  return (
    <div className={`min-h-screen ${themeClasses.background} ${themeClasses.text} relative overflow-hidden`}>
      {/* Animated Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Star particles */}
        <div className="absolute inset-0">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute rounded-full bg-yellow-400/30 animate-pulse"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`
              }}
            />
          ))}
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      {/* Header */}
      <header className={`container mx-auto px-6 py-6 flex items-center justify-between relative z-50 ${themeClasses.header} border-b`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-500/50 animate-pulse">
            <Gem className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-300 to-yellow-100 bg-clip-text text-transparent">
              Gold Crafts Manager
            </h1>
            <p className="text-xs text-gray-200">Luxury Jewelry Business Management</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-gray-200 hover:text-yellow-300 transition-all duration-300 relative group">
            Features
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-400 group-hover:w-full transition-all duration-300"></span>
          </a>
          <a href="#how-it-works" className="text-gray-200 hover:text-yellow-300 transition-all duration-300 relative group">
            How It Works
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-400 group-hover:w-full transition-all duration-300"></span>
          </a>
          <button
            onClick={handleSupportClick}
            className="text-gray-200 hover:text-yellow-300 transition-all duration-300 relative group"
          >
            Support
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-yellow-400 group-hover:w-full transition-all duration-300"></span>
          </button>
        </nav>
        <div className="flex items-center gap-4">
          {/* Theme Selector */}
          <div className="flex items-center gap-2">
            <Palette className={`h-4 w-4 ${theme === 'minimal' ? 'text-gray-600' : 'text-gray-400'}`} />
            <Select value={theme} onValueChange={(value) => setTheme(value as 'default' | 'dark' | 'luxury' | 'minimal')}>
              <SelectTrigger className={`w-32 h-9 ${theme === 'minimal' ? 'bg-white border-gray-300 text-gray-900' : 'bg-slate-800/50 border-slate-700 text-white'}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={theme === 'minimal' ? 'bg-white border-gray-200' : 'bg-slate-800 border-slate-700'}>
                <SelectItem value="default" className={theme === 'minimal' ? 'text-gray-900' : 'text-white'}>Default</SelectItem>
                <SelectItem value="dark" className={theme === 'minimal' ? 'text-gray-900' : 'text-white'}>Dark</SelectItem>
                <SelectItem value="luxury" className={theme === 'minimal' ? 'text-gray-900' : 'text-white'}>Luxury</SelectItem>
                <SelectItem value="minimal" className={theme === 'minimal' ? 'text-gray-900' : 'text-white'}>Minimal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button
            onClick={handleSignInClick}
            className="text-gray-200 hover:text-yellow-300 hover:bg-yellow-500/10 px-4 py-2 rounded-lg transition-all duration-300 font-medium border border-transparent hover:border-yellow-500/50"
          >
            Login
          </button>
          <Button
            onClick={handleSignUpClick}
            className="bg-gradient-to-r from-yellow-500 via-yellow-500 to-yellow-600 hover:from-yellow-400 hover:via-yellow-400 hover:to-yellow-500 text-white shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-all duration-300 hover:scale-105"
          >
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-fade-in">
            <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50 px-4 py-1.5 backdrop-blur-sm">
              <Crown className="h-3 w-3 mr-1 animate-pulse" />
              Complete Jewelry Business Solution
            </Badge>
            <div>
              <h2 className={`text-5xl lg:text-6xl font-bold mb-4 leading-tight ${theme === 'minimal' ? 'text-gray-900' : 'text-white'}`}>
                Transform Your
                <br />
                <span className="text-6xl lg:text-7xl bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 bg-clip-text text-transparent animate-gradient">
                  Gold Crafts
                </span>
                <br />
                Business
              </h2>
              <p className={`text-lg mt-6 max-w-xl leading-relaxed ${theme === 'minimal' ? 'text-gray-700' : 'text-gray-100'}`}>
                Comprehensive business management system designed specifically for jewelry and gold crafts businesses. Manage inventory, track craftsmen, process sales, and grow your luxury jewelry enterprise with ease.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card 
                onClick={() => isAuthenticated ? navigate('/gold-collection') : handleSignInClick()}
                className={`${themeClasses.card} hover:border-yellow-500/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/20 backdrop-blur-sm group cursor-pointer animate-float`}
                style={{ animationDelay: '0s' }}
              >
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-yellow-500/30 group-hover:scale-110 transition-all duration-300">
                    <Gem className="h-6 w-6 text-yellow-400" />
                  </div>
                  <h3 className="font-bold text-sm mb-1 text-white">Gold Collection</h3>
                  <p className="text-xs text-gray-200">Management</p>
                </CardContent>
              </Card>
              <Card 
                onClick={() => isAuthenticated ? navigate('/precious-stones') : handleSignInClick()}
                className={`${themeClasses.card} hover:border-purple-500/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20 backdrop-blur-sm group cursor-pointer animate-float`}
                style={{ animationDelay: '0.2s' }}
              >
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-500/30 group-hover:scale-110 transition-all duration-300">
                    <Sparkles className="h-6 w-6 text-purple-400" />
                  </div>
                  <h3 className="font-bold text-sm mb-1 text-white">Precious Stones</h3>
                  <p className="text-xs text-gray-200">Catalog</p>
                </CardContent>
              </Card>
              <Card 
                onClick={() => isAuthenticated ? navigate('/analytics') : handleSignInClick()}
                className={`${themeClasses.card} hover:border-blue-500/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 backdrop-blur-sm group cursor-pointer animate-float`}
                style={{ animationDelay: '0.4s' }}
              >
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-500/30 group-hover:scale-110 transition-all duration-300">
                    <BarChart3 className="h-6 w-6 text-blue-400" />
                  </div>
                  <h3 className="font-bold text-sm mb-1 text-white">Real-time</h3>
                  <p className="text-xs text-gray-200">Analytics</p>
                </CardContent>
              </Card>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={handleSignUpClick}
                className="bg-gradient-to-r from-yellow-500 via-yellow-500 to-yellow-600 hover:from-yellow-400 hover:via-yellow-400 hover:to-yellow-500 text-white shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-all duration-300 hover:scale-105"
                size="lg"
              >
                Start Free Trial <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                variant="outline"
                className="border-slate-600 bg-slate-800/50 text-white hover:bg-slate-800 hover:border-yellow-500/50 hover:text-yellow-300 backdrop-blur-sm transition-all duration-300 hover:scale-105"
                size="lg"
              >
                Schedule Demo
              </Button>
            </div>
          </div>

          {/* Right - Dashboard Widget */}
          <div className="lg:flex justify-end">
            <Card className={`${themeClasses.card} backdrop-blur-sm w-full max-w-md shadow-2xl ${theme === 'minimal' ? 'shadow-gray-200' : 'shadow-yellow-500/10'} hover:shadow-yellow-500/20 transition-all duration-300`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Activity className={`h-4 w-4 ${theme === 'minimal' ? 'text-yellow-600' : 'text-yellow-400'} animate-pulse`} />
                    <h3 className={`font-semibold ${theme === 'minimal' ? 'text-gray-900' : 'text-white'}`}>Business Dashboard</h3>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className={`${theme === 'minimal' ? 'bg-yellow-100 border-yellow-300 hover:bg-yellow-200' : 'bg-yellow-500/20 border-yellow-500/30 hover:bg-yellow-500/30'} rounded-lg p-4 border transition-all duration-300`}>
                    <div className={`text-3xl font-bold mb-1 ${theme === 'minimal' ? 'text-yellow-700' : 'bg-gradient-to-r from-yellow-300 to-yellow-100 bg-clip-text text-transparent'}`}>1,247</div>
                    <div className={`text-sm ${theme === 'minimal' ? 'text-gray-700' : 'text-gray-200'}`}>Jewelry Items</div>
                  </div>
                  <div className={`${theme === 'minimal' ? 'bg-orange-100 border-orange-300 hover:bg-orange-200' : 'bg-orange-500/20 border-orange-500/30 hover:bg-orange-500/30'} rounded-lg p-4 border transition-all duration-300`}>
                    <div className={`text-3xl font-bold mb-1 ${theme === 'minimal' ? 'text-orange-700' : 'text-orange-300'}`}>23</div>
                    <div className={`text-sm ${theme === 'minimal' ? 'text-gray-700' : 'text-gray-200'}`}>Active Craftsmen</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className={`text-sm ${theme === 'minimal' ? 'text-gray-900' : 'text-white'}`}>System Sync</span>
                    </div>
                    <span className="text-sm text-green-600 font-medium">Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className={`h-4 w-4 ${theme === 'minimal' ? 'text-gray-600' : 'text-gray-300'}`} />
                      <span className={`text-sm ${theme === 'minimal' ? 'text-gray-900' : 'text-white'}`}>Pending Orders</span>
                    </div>
                    <span className="text-sm text-orange-600 font-medium">8 Orders</span>
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                      <FileCheck className={`h-4 w-4 ${theme === 'minimal' ? 'text-gray-600' : 'text-gray-300'}`} />
                      <span className={`text-sm ${theme === 'minimal' ? 'text-gray-900' : 'text-white'}`}>Recent Sales</span>
                    </div>
                    <div className="pl-6 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className={theme === 'minimal' ? 'text-gray-600' : 'text-gray-200'}>Sale #SALE-2024-001</span>
                        <span className={`font-medium ${theme === 'minimal' ? 'text-gray-900' : 'text-white'}`}>₹45,280</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={theme === 'minimal' ? 'text-gray-600' : 'text-gray-200'}>Invoice #INV-2024-156</span>
                        <span className={`font-medium ${theme === 'minimal' ? 'text-gray-900' : 'text-white'}`}>₹12,450</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-6 py-20 relative z-10">
        <div className="text-center mb-12">
          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50 mb-4 backdrop-blur-sm">
            <Crown className="h-3 w-3 mr-1" />
            Premium Features
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-yellow-300 via-yellow-200 to-yellow-300 bg-clip-text text-transparent">
              Run Your Jewelry Business
            </span>
          </h2>
          <p className="text-lg text-gray-100 max-w-2xl mx-auto">
            Complete business management solution designed specifically for jewelry and gold crafts businesses. From inventory tracking to craftsmen management, from point of sale to customer ledgers - everything you need in one elegant platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Gem,
              title: "Gold Collection Management",
              description: "Track all gold items with purity, weight, pricing, and detailed specifications. Manage your precious metal inventory with precision and care.",
              iconBg: "bg-yellow-500/20",
              iconColor: "text-yellow-400",
              hoverBorder: "hover:border-yellow-500/30",
            },
            {
              icon: Sparkles,
              title: "Precious Stones Catalog",
              description: "Catalog and manage precious stones including diamonds, gemstones, and rare stones with detailed characteristics and valuations.",
              iconBg: "bg-purple-500/20",
              iconColor: "text-purple-400",
              hoverBorder: "hover:border-purple-500/30",
            },
            {
              icon: ShoppingCart,
              title: "Jewelry Collection",
              description: "Complete jewelry inventory management with images, descriptions, specifications, and comprehensive tracking of all your elegant pieces.",
              iconBg: "bg-blue-500/20",
              iconColor: "text-blue-400",
              hoverBorder: "hover:border-blue-500/30",
            },
            {
              icon: Hammer,
              title: "Craftsmen Tracking",
              description: "Manage and track your craftsmen, assign projects, monitor performance, and track specialties. Ensure quality craftsmanship across all projects.",
              iconBg: "bg-orange-500/20",
              iconColor: "text-orange-400",
              hoverBorder: "hover:border-orange-500/30",
            },
            {
              icon: Receipt,
              title: "Point of Sale (POS)",
              description: "Complete POS system for quick checkout, multiple payment methods, receipt generation, and seamless transaction processing.",
              iconBg: "bg-green-500/20",
              iconColor: "text-green-400",
              hoverBorder: "hover:border-green-500/30",
            },
            {
              icon: CreditCard,
              title: "Customer Ledger",
              description: "Track customer transactions, manage credit, maintain purchase history, and handle customer relationships with comprehensive ledger management.",
              iconBg: "bg-teal-500/20",
              iconColor: "text-teal-400",
              hoverBorder: "hover:border-teal-500/30",
            },
            {
              icon: Users,
              title: "Staff Management",
              description: "Complete employee management system with roles, permissions, performance tracking, and comprehensive staff administration.",
              iconBg: "bg-pink-500/20",
              iconColor: "text-pink-400",
              hoverBorder: "hover:border-pink-500/30",
            },
            {
              icon: BarChart3,
              title: "AI Analytics Dashboard",
              description: "Advanced analytics and insights with AI-powered recommendations. Track sales trends, revenue, inventory turnover, and business performance.",
              iconBg: "bg-indigo-500/20",
              iconColor: "text-indigo-400",
              hoverBorder: "hover:border-indigo-500/30",
            },
            {
              icon: FileText,
              title: "Comprehensive Reports",
              description: "Generate detailed business reports including sales reports, inventory reports, financial summaries, and custom analytics.",
              iconBg: "bg-cyan-500/20",
              iconColor: "text-cyan-400",
              hoverBorder: "hover:border-cyan-500/30",
            },
            {
              icon: Settings,
              title: "Business Settings",
              description: "Configure company profile, payment settings, business hours, tax settings, and customize your business operations.",
              iconBg: "bg-gray-500/20",
              iconColor: "text-gray-300",
              hoverBorder: "hover:border-gray-500/30",
            },
            {
              icon: Shield,
              title: "Secure & Reliable",
              description: "Enterprise-grade security with data encryption, regular backups, and secure cloud storage for complete peace of mind.",
              iconBg: "bg-emerald-500/20",
              iconColor: "text-emerald-400",
              hoverBorder: "hover:border-emerald-500/30",
            },
            {
              icon: Crown,
              title: "Luxury Brand Management",
              description: "Maintain your luxury jewelry brand with professional inventory management, elegant presentation, and premium business tools.",
              iconBg: "bg-yellow-500/20",
              iconColor: "text-yellow-400",
              hoverBorder: "hover:border-yellow-500/30",
            },
          ].map((feature, index) => (
            <Card key={index} className={`bg-slate-800/60 border-slate-700/50 ${feature.hoverBorder} transition-all duration-300 group hover:scale-105 hover:shadow-xl hover:shadow-yellow-500/10 backdrop-blur-sm`}>
              <CardContent className="p-6">
                <div className={`w-12 h-12 ${feature.iconBg} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-white group-hover:text-yellow-300 transition-colors">{feature.title}</h3>
                <p className="text-gray-200 text-sm leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="container mx-auto px-6 py-20 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Get Started in{" "}
            <span className="bg-gradient-to-r from-yellow-300 via-yellow-200 to-yellow-300 bg-clip-text text-transparent">
              Three Simple Steps
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
          {[
            {
              number: "01",
              icon: Gem,
              title: "Download & Sign Up",
              description: "Download our mobile app from App Store or Google Play. Create your account and set up your jewelry business profile with basic information.",
            },
            {
              number: "02",
              icon: Package,
              title: "Add Your Collections",
              description: "Import your gold collection, precious stones, and jewelry inventory. Upload images, set prices, and organize your luxury items effortlessly.",
            },
            {
              number: "03",
              icon: CheckCircle2,
              title: "Start Managing",
              description: "Begin processing sales, tracking craftsmen, managing customers, and generating reports. Full setup support and onboarding included.",
            },
          ].map((step, index) => (
            <div key={index} className="relative z-20">
              {/* Connecting line - positioned between cards, perfectly centered with icon */}
              {index < 2 && (
                <div className="hidden md:block absolute top-[8.75rem] left-full z-10" style={{ 
                  width: 'calc(100% + 2rem)', 
                  height: '1px'
                }}>
                  {/* Glow effect (behind) */}
                  <div className="absolute top-1/2 left-0 w-full h-3 bg-gradient-to-r from-transparent via-yellow-300/40 to-transparent rounded-full blur-sm transform -translate-y-1/2"></div>
                  
                  {/* Main gradient line */}
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 rounded-full shadow-lg shadow-yellow-500/50 transform -translate-y-1/2"></div>
                  
                  {/* Decorative dots with border to stand out */}
                  <div className="absolute top-1/2 left-1/4 w-3 h-3 bg-yellow-400 rounded-full transform -translate-y-1/2 shadow-lg shadow-yellow-400/70 animate-pulse border-2 border-slate-800/80"></div>
                  <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-yellow-300 rounded-full transform -translate-y-1/2 shadow-lg shadow-yellow-300/70 animate-pulse border-2 border-slate-800/80" style={{ animationDelay: '0.5s' }}></div>
                  <div className="absolute top-1/2 left-3/4 w-3 h-3 bg-yellow-400 rounded-full transform -translate-y-1/2 shadow-lg shadow-yellow-400/70 animate-pulse border-2 border-slate-800/80" style={{ animationDelay: '1s' }}></div>
                  
                  {/* Arrow indicator with background circle */}
                  <div className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-1/2 z-20">
                    <div className="w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center shadow-xl border-2 border-yellow-400/30">
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
              <Card className="bg-slate-800/80 border-slate-700/50 hover:border-yellow-500/30 relative z-30 transition-all duration-300 group backdrop-blur-sm hover:scale-105 hover:shadow-xl hover:shadow-yellow-500/20">
                <CardContent className="p-8 text-center relative">
                  <div className="text-6xl font-bold text-yellow-400/30 mb-4 group-hover:text-yellow-400/50 transition-colors">{step.number}</div>
                  <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-yellow-500/30 group-hover:scale-110 transition-all duration-300 relative z-10">
                    <step.icon className="h-8 w-8 text-yellow-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white group-hover:text-yellow-300 transition-colors">{step.title}</h3>
                  <p className="text-gray-200 text-sm leading-relaxed">{step.description}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="container mx-auto px-6 py-20 relative z-10">
        <Card className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 border-0 shadow-2xl shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-all duration-300">
          <CardContent className="p-12 text-center">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-yellow-100 bg-clip-text text-transparent">
              Ready to Transform Your Jewelry Business?
            </h2>
            <p className="text-lg text-yellow-100 mb-8">
              Join luxury jewelry businesses using Gold Crafts Manager to streamline their operations and grow their enterprise.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                onClick={handleSignUpClick}
                className="bg-white text-yellow-600 hover:bg-gray-100 shadow-lg font-semibold hover:scale-105 transition-all duration-300"
                size="lg"
              >
                Get Started Today <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                onClick={handleSignInClick}
                variant="outline"
                className="border-white/50 bg-white/10 text-white hover:bg-yellow-500/20 hover:border-yellow-500 hover:text-yellow-300 backdrop-blur-sm font-semibold hover:scale-105 transition-all duration-300"
                size="lg"
              >
                Login to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer - Similar to RetailPro */}
      <footer className="relative z-10 border-t border-slate-800/50 bg-slate-950/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-500/50">
                  <Gem className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    <span className="text-white">Gold Crafts</span>{" "}
                    <span className="bg-gradient-to-r from-yellow-300 to-yellow-100 bg-clip-text text-transparent">Manager</span>
                  </h3>
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Complete jewelry business management platform with mobile POS integration, multi-location support, and real-time analytics.
              </p>
              <div className="flex gap-3">
                <a href="https://www.facebook.com/profile.php?id=61578900585501" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-yellow-500/20 hover:border-yellow-500/50 border border-slate-700 transition-all duration-300 group">
                  <Facebook className="h-4 w-4 text-gray-400 group-hover:text-yellow-400" />
                </a>
                <a href="https://x.com/IndiaRetailPro" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-yellow-500/20 hover:border-yellow-500/50 border border-slate-700 transition-all duration-300 group">
                  <Twitter className="h-4 w-4 text-gray-400 group-hover:text-yellow-400" />
                </a>
                <a href="https://www.youtube.com/@RetailMARKETINGPRO" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-yellow-500/20 hover:border-yellow-500/50 border border-slate-700 transition-all duration-300 group">
                  <Youtube className="h-4 w-4 text-gray-400 group-hover:text-yellow-400" />
                </a>
                <a href="https://www.instagram.com/indiaretailpro/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-yellow-500/20 hover:border-yellow-500/50 border border-slate-700 transition-all duration-300 group">
                  <Instagram className="h-4 w-4 text-gray-400 group-hover:text-yellow-400" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold text-white mb-4">Quick Links</h4>
              <ul className="space-y-3">
                <li><a href="/" className="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Home</a></li>
                <li><a href="#features" className="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Features</a></li>
                <li><a href="#how-it-works" className="text-gray-300 hover:text-yellow-400 transition-colors text-sm">How It Works</a></li>
                <li><button onClick={handleSupportClick} className="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Support</button></li>
                <li><button onClick={handleSignInClick} className="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Login</button></li>
              </ul>
            </div>

            {/* Features */}
            <div>
              <h4 className="font-bold text-white mb-4">Features</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Mobile POS Integration</a></li>
                <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Multi-Location Management</a></li>
                <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Real-time Analytics</a></li>
                <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Inventory Tracking</a></li>
                <li><a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Transaction Processing</a></li>
              </ul>
            </div>

            {/* Contact Us */}
            <div>
              <h4 className="font-bold text-white mb-4">Contact Us</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                  <a href="mailto:retailmarketingpro1.0@gmail.com" className="text-gray-300 hover:text-yellow-400 transition-colors text-sm">retailmarketingpro1.0@gmail.com</a>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                  <a href="tel:+919876543210" className="text-gray-300 hover:text-yellow-400 transition-colors text-sm">+91 8910921128</a>
                </li>
                <li className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">India</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">© 2024 Gold Crafts Manager. All rights reserved.</p>
            <div className="flex gap-6 flex-wrap">
              <Link 
                to="/policy" 
                className="text-sm text-gray-400 hover:text-yellow-400 transition-colors cursor-pointer"
              >
                Privacy Policy
              </Link>
              <Link 
                to="/terms" 
                className="text-sm text-gray-400 hover:text-yellow-400 transition-colors cursor-pointer"
              >
                Terms of Service
              </Link>
              <Link 
                to="/refund" 
                className="text-sm text-gray-400 hover:text-yellow-400 transition-colors cursor-pointer"
              >
                Refund Policy
              </Link>
              <Link 
                to="/disclaimer" 
                className="text-sm text-gray-400 hover:text-yellow-400 transition-colors cursor-pointer"
              >
                Disclaimer
              </Link>
              <Link 
                to="/cookies" 
                className="text-sm text-gray-400 hover:text-yellow-400 transition-colors cursor-pointer"
              >
                Cookie Notice
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* AI Chatbot */}
      <ChatbotButton onClick={() => setShowChatbot(true)} />
      <AIChatbot open={showChatbot} onOpenChange={setShowChatbot} />

      {/* Sign Up Modal */}
      <Dialog open={showSignUpModal} onOpenChange={setShowSignUpModal}>
        <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-orange-900/95 via-orange-800/95 to-orange-900/95 border-orange-700/50 backdrop-blur-sm">
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
                window.open('https://play.google.com/store/apps/details?id=com.goldcrafts.app', '_blank');
              }}
              className="flex-1 h-12 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-lg shadow-lg transition-all duration-200 hover:scale-105"
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
                window.open('https://apps.apple.com/app/gold-crafts-manager/id123456789', '_blank');
              }}
              className="flex-1 h-12 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-lg shadow-lg transition-all duration-200 hover:scale-105"
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
    </div>
  );
};

export default Landing;
