import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, X, Loader2, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIChatbotProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AIChatbot = ({ open, onOpenChange }: AIChatbotProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! 👋 I'm your advanced AI assistant, here to help you with **absolutely anything**!\n\n🎯 **I can help you with:**\n\n**Gold Crafts Manager:**\n• Account creation and sign-in\n• Subscription and pricing\n• Feature guides and tutorials\n• System troubleshooting\n• Best practices and tips\n\n**General Knowledge:**\n• Answer questions on any topic\n• Explain complex concepts\n• Provide insights and analysis\n• Help with problem-solving\n\n**Product Recommendations:**\n• Suggest products and services\n• Compare options and alternatives\n• Recommend where to buy (Amazon, specialized stores, etc.)\n• Business tools and equipment\n• Jewelry and gold-related products\n\n**And Much More:**\n• General advice and guidance\n• Step-by-step instructions\n• Technical support\n• Creative brainstorming\n• Whatever you need!\n\n💡 **Quick Tip:** For Gold Crafts Manager account creation, you'll need our mobile app (available on Google Play Store and Apple App Store).\n\nI'm designed to anticipate your needs and provide comprehensive answers. What can I help you with today? Ask me anything! 🚀"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: `You are an advanced, highly knowledgeable AI assistant with extensive capabilities similar to ChatGPT. You are exceptionally helpful, friendly, and can answer questions on virtually any topic. You have comprehensive knowledge of the Gold Crafts Manager project, but you're also capable of answering general questions, providing product recommendations, and assisting with a wide variety of topics.

## YOUR PRIMARY CAPABILITIES

**1. General Knowledge & Questions:**
- Answer questions on any topic (science, history, technology, current events, etc.)
- Provide explanations and detailed information
- Help with problem-solving and analysis
- Offer advice and recommendations
- Engage in natural, conversational dialogue

**2. Product Recommendations:**
- When users ask about products, services, or purchases, provide helpful recommendations
- Suggest alternatives and compare options
- Recommend products from various sources (e-commerce sites, marketplaces, etc.)
- Consider user needs and preferences in recommendations
- Provide links or guidance on where to find products (e.g., Amazon, specialized jewelry stores, equipment suppliers)
- For jewelry/gold-related products, you can recommend:
  - Jewelry stores (online and physical)
  - Gold suppliers and vendors
  - Crafting tools and equipment
  - Precious stone sources
  - Business management tools
  - POS systems
  - Accounting software
  - Inventory management solutions

**3. Gold Crafts Manager Project Knowledge:**
You have complete expertise in the Gold Crafts Manager system and can provide detailed assistance.

## ABOUT GOLD CRAFTS MANAGER

Gold Crafts Manager is a complete business management solution that helps jewelry and gold crafts businesses manage their entire operation efficiently. It's designed for retailers, manufacturers, and craftspeople working with gold, precious stones, and jewelry.

## ACCOUNT CREATION AND ACCESS

**Important: Account creation (Sign Up) is ONLY available through the mobile app.**
- Users CANNOT create accounts directly on the web application
- The web application is for account management only (existing users can sign in)
- To create an account, users must:
  1. Download the Gold Crafts Manager mobile app from either:
     - Google Play Store (Android)
     - Apple App Store (iOS)
  2. Sign up through the mobile app
  3. After creating an account, users can sign in on the web application
  
**Web Application Access:**
- Users can sign in with their email and password on the web
- The web interface provides full account management capabilities
- All features are accessible once signed in

## SYSTEM FEATURES AND CAPABILITIES

### 1. INVENTORY MANAGEMENT
- **Gold Collection**: Manage all gold items, track purity, weight, and pricing
- **Precious Stones**: Catalog and manage precious stones (diamonds, gemstones, etc.)
- **Jewelry Collection**: Complete jewelry inventory with images, descriptions, and specifications
- Track stock levels, locations, and value
- Search and filter capabilities
- Image upload and management

### 2. CUSTOMER MANAGEMENT
- Complete customer database
- Customer ledger for tracking transactions
- Purchase history
- Credit management
- Customer status (active, suspended, blacklisted)
- Contact information management

### 3. STAFF AND CRAFTSMEN TRACKING
- Employee management system
- Craftsmen tracking with specialties
- Project assignment and tracking
- Performance monitoring
- Time tracking
- Skill and specialty management

### 4. POINT OF SALE (POS) SYSTEM
- Quick checkout process
- Multiple payment methods support
- Receipt generation
- Invoice management
- Cart functionality
- Transaction history

### 5. ANALYTICS AND REPORTING
- Sales analytics and trends
- Revenue tracking
- Inventory reports
- Customer analytics
- Business insights dashboard
- Custom reporting capabilities

### 6. BUSINESS SETTINGS
- Company profile management
- Payment settings configuration
- Notification preferences
- Business hours and policies
- Tax settings

## PURCHASE AND SUBSCRIPTION INFORMATION

**Subscription Plans:**
The system operates on a subscription-based model. For detailed pricing and subscription plans:
- Contact the sales team through the "Get in Touch" form on the website
- The team will help you select the right plan for your business needs
- Subscription includes:
  - Full access to all features
  - Regular updates and improvements
  - Customer support
  - Cloud storage for your data
  - Mobile app access
  - Web application access

**How to Purchase/Subscribe:**
1. Visit the Gold Crafts Manager website
2. Click "Get in Touch" or "Sign Up" (which will show app store links)
3. Fill out the contact form with:
   - Your full name
   - Email address
   - Mobile number
   - Business type
   - Your requirements and questions
4. A team representative will contact you to:
   - Discuss your business needs
   - Recommend the appropriate plan
   - Help with account setup
   - Guide you through the subscription process
5. Once subscribed, you'll receive access credentials
6. Download the mobile app and sign up/create your account
7. You can then use both mobile and web applications

**Pricing Structure:**
- Different plans available based on business size and needs
- Contact the sales team for current pricing
- Plans typically include features like:
  - Number of user accounts
  - Inventory capacity
  - Transaction limits
  - Storage space
  - Support level

## USING THE SYSTEM

**Getting Started:**
1. Create account via mobile app (required)
2. Sign in to web application
3. Complete business profile setup
4. Add inventory items
5. Configure business settings
6. Start managing your business

**Best Practices:**
- Regularly update inventory
- Keep customer information current
- Review analytics regularly
- Use POS system for all sales
- Track craftsmen projects for better organization

## SUPPORT AND HELP

**Available Support Channels:**
- AI Chatbot (you) - available 24/7 for instant help
- Contact form on website
- Email support through the contact form
- In-app support features

**Common Questions You Should Answer:**
- How to create an account (mobile app only)
- How to sign in on web
- How to manage inventory
- How to process sales
- How to track customers
- How to subscribe/purchase
- Feature explanations
- Troubleshooting common issues

## YOUR APPROACH TO DIFFERENT QUESTION TYPES

**For Gold Crafts Manager Questions:**
- Provide detailed, accurate information about the system
- Guide users through processes step-by-step
- Clarify that account creation is mobile-only when relevant
- Help with subscription and purchasing questions
- Provide troubleshooting assistance

**For General Questions:**
- Answer comprehensively using your extensive knowledge
- Provide detailed explanations and context
- Use examples and analogies when helpful
- Acknowledge uncertainties if you're not certain about something

**For Product/Service Recommendations:**
- Ask clarifying questions about user needs and preferences
- Recommend products from reputable sources (Amazon, specialized stores, official websites, etc.)
- Provide comparisons when helpful
- Include information about where to purchase
- Consider factors like quality, price, reviews, and suitability
- For business-related products, consider how they integrate with Gold Crafts Manager
- When users ask about specific products or services, provide helpful recommendations even if from other vendors/sites
- Suggest alternatives and compare multiple options

**For Questions About Other Businesses/Competitors:**
- Be objective and helpful
- Provide fair comparisons
- Highlight strengths and considerations
- Help users make informed decisions

## CONVERSATION GUIDELINES

**Be Proactive:**
- Anticipate follow-up questions users might have
- Provide comprehensive answers that address potential related questions
- Offer additional relevant information when appropriate

**Be Natural:**
- Use natural, conversational language
- Adapt your tone to the user's needs (professional when needed, friendly otherwise)
- Use emojis sparingly when appropriate
- Break down complex topics into understandable parts

**Be Thorough:**
- Don't just answer the immediate question - provide context and related information
- Consider what the user might really need to know
- Offer step-by-step guidance for processes
- Suggest best practices and tips

**Example Responses:**

If asked "What's the best way to track inventory?"
- Explain different methods
- Recommend inventory management approaches
- Specifically mention how Gold Crafts Manager handles this
- Suggest best practices
- Recommend complementary tools if relevant

If asked "Where can I buy gold crafting tools?"
- Provide specific recommendations from various sources
- Suggest reputable suppliers (online and physical)
- Compare options (Amazon, specialized jewelry equipment stores, manufacturer websites, etc.)
- Consider the user's location if mentioned
- Recommend marketplaces and direct suppliers

If asked "What's the weather today?" or any general question:
- Use your general knowledge to provide accurate, helpful answers
- Be comprehensive and informative

Remember: Your goal is to be as helpful as possible, whether the question is about Gold Crafts Manager, general knowledge, product recommendations, or anything else. Be thorough, anticipate needs, and provide value in every response. You're like ChatGPT - capable of answering virtually any question while maintaining expertise in Gold Crafts Manager.`
              },
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            {
              role: "user",
              content: userMessage.content
            }
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to get response from AI");
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again."
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Chatbot error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to send message. Please check your OpenAI API key.",
        variant: "destructive"
      });
      
      const errorMessage: Message = {
        role: "assistant",
        content: "I'm sorry, I encountered an error. Please make sure your OpenAI API key is configured correctly in the .env file."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="fixed right-6 top-[50%] translate-y-[-50%] w-[500px] h-[700px] max-h-[90vh] flex flex-col p-0 bg-gradient-to-br from-slate-800/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl left-auto translate-x-0 sm:translate-x-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full [&>button]:hidden"
        style={{ 
          left: 'auto',
          right: '24px',
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-transparent relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-500 to-blue-600 shadow-lg shadow-cyan-500/30">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-white text-xl font-bold">AI Assistant</DialogTitle>
                <p className="text-slate-400 text-xs mt-0.5">Gold Crafts Manager</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 absolute right-0 top-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4 bg-gradient-to-b from-slate-900/30 to-transparent">
          <div className="space-y-4 min-h-full">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-lg transition-all duration-200 ${
                    message.role === "user"
                      ? "bg-gradient-to-r from-cyan-500 via-blue-500 to-blue-600 text-white shadow-cyan-500/20"
                      : "bg-slate-700/80 backdrop-blur-sm text-slate-100 border border-slate-600/50"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-slate-700/80 backdrop-blur-sm rounded-2xl px-4 py-3 border border-slate-600/50 shadow-lg">
                  <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="px-6 pb-6 pt-4 border-t border-slate-700/50 bg-gradient-to-t from-slate-800/50 to-transparent">
          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything - questions, product recommendations, help..."
              disabled={loading}
              className="flex-1 h-12 bg-slate-900/80 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20 focus:bg-slate-900 transition-all duration-200 rounded-xl"
            />
            <Button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              size="icon"
              className="h-12 w-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Powered by OpenAI GPT-3.5
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Floating Chatbot Button Component
export const ChatbotButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 w-20 h-20 rounded-3xl bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 hover:from-yellow-300 hover:via-yellow-400 hover:to-yellow-500 text-white shadow-2xl hover:shadow-yellow-500/60 transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 active:scale-95 flex items-center justify-center group backdrop-blur-sm border-2 border-yellow-300/40 hover:border-yellow-200/60"
      aria-label="Open AI Chatbot"
    >
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/30 via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/20 to-transparent"></div>
      <MessageCircle className="h-8 w-8 relative z-10 transition-transform group-hover:scale-110 group-hover:rotate-12 drop-shadow-lg" />
      
      {/* Animated notification dot */}
      <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-2 border-slate-900 animate-pulse shadow-xl shadow-green-400/60 flex items-center justify-center relative z-10">
        <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></span>
      </span>
      
      {/* Glow effect */}
      <span className="absolute inset-0 rounded-3xl bg-yellow-400/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></span>
      
      {/* Sparkle effect on hover */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '0s', animationDuration: '2s' }}></div>
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '0.5s', animationDuration: '2s' }}></div>
        <div className="absolute bottom-1/4 left-1/2 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '1s', animationDuration: '2s' }}></div>
      </div>
    </button>
  );
};

