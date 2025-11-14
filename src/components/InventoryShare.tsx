import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Mail, Share2, Check, Copy, Checkbox } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Generic inventory item interface
export interface InventoryItem {
  id: string;
  name: string;
  price: number;
  stock?: number;
  inStock?: number;
  image?: string;
  image_1?: string;
  image_2?: string;
  image_3?: string;
  image_4?: string;
  type?: string;
  metal?: string;
  gemstone?: string;
  carat?: number | string;
  purity?: string;
  weight?: string;
  color?: string;
  size?: string;
  cut?: string;
  clarity?: string;
  item_type?: 'jewelry' | 'gold' | 'stone' | 'artificial';
}

interface InventoryShareProps {
  items: InventoryItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareType?: 'single' | 'bulk';
}

// Message templates for different item types
const generateItemMessage = (item: InventoryItem, template: 'simple' | 'detailed' | 'promotional' | 'inquiry' = 'detailed'): string => {
  const itemType = item.item_type || 'jewelry';
  const stock = item.stock ?? item.inStock ?? 0;
  const price = item.price || 0;
  const image = item.image_1 || item.image || '';

  if (template === 'simple') {
    return `Check out this ${item.name}!\n\nPrice: ₹${price.toLocaleString()}`;
  }

  if (template === 'inquiry') {
    return `Hi! I'm interested in this item:\n\n${item.name}\nPrice: ₹${price.toLocaleString()}\n\nCan you provide more information?`;
  }

  if (template === 'promotional') {
    let message = `🎉 *SPECIAL OFFER* 🎉\n\n${item.name}\n\n💰 Only ₹${price.toLocaleString()}!\n`;
    
    if (itemType === 'gold') {
      message += `⚜️ ${item.purity || 'Gold'} | Weight: ${item.weight || 'N/A'}\n`;
    } else if (itemType === 'stone' || itemType === 'artificial') {
      message += `💎 ${item.color || 'N/A'} | Size: ${item.size || 'N/A'}\n`;
      if (item.cut) message += `✨ Cut: ${item.cut}\n`;
      if (item.clarity) message += `🔍 Clarity: ${item.clarity}\n`;
    } else {
      message += `⚜️ ${item.metal || 'Gold'} | 💍 ${item.type || 'Jewelry'}\n`;
      if (item.gemstone && item.gemstone !== 'None') message += `💎 ${item.gemstone}\n`;
    }
    
    message += `\n${stock > 0 ? '✅ Limited Stock Available!\n' : ''}\n📱 Contact us now to order!`;
    return message;
  }

  // Detailed template (default)
  let message = `✨ *${item.name}* ✨\n\n`;
  message += `💰 Price: ₹${price.toLocaleString()}\n`;

  if (itemType === 'gold') {
    message += `⚜️ Purity: ${item.purity || 'Gold 18K'}\n`;
    message += `⚖️ Weight: ${item.weight || 'N/A'}\n`;
  } else if (itemType === 'stone') {
    message += `💎 Type: Precious Stone\n`;
    if (item.carat) message += `📏 Carat: ${item.carat}\n`;
    if (item.clarity) message += `🔍 Clarity: ${item.clarity}\n`;
    if (item.cut) message += `✨ Cut: ${item.cut}\n`;
  } else if (itemType === 'artificial') {
    message += `💎 Type: Artificial Stone\n`;
    if (item.color) message += `🎨 Color: ${item.color}\n`;
    if (item.size) message += `📏 Size: ${item.size}\n`;
    if (item.cut) message += `✨ Cut: ${item.cut}\n`;
    if (item.clarity) message += `🔍 Clarity: ${item.clarity}\n`;
  } else {
    message += `💍 Type: ${item.type || 'Jewelry'}\n`;
    message += `⚜️ Metal: ${item.metal || 'Gold 18K'}\n`;
    if (item.gemstone && item.gemstone !== 'None') message += `💎 Gemstone: ${item.gemstone}\n`;
    if (item.carat) message += `📏 Carat: ${item.carat}ct\n`;
  }

  message += `${stock > 0 ? `✅ In Stock: ${stock} units\n` : '❌ Out of Stock\n'}\n`;
  message += `📞 Contact us for more details!`;

  return message;
};

// Generate email subject and body
const generateEmailContent = (items: InventoryItem[], template: 'simple' | 'detailed' | 'promotional' | 'inquiry' = 'detailed') => {
  const isBulk = items.length > 1;
  const subject = isBulk 
    ? `Jewelry Catalog - ${items.length} Beautiful Items`
    : `Check out this ${items[0].name}`;

  let body = '';
  
  if (isBulk) {
    body = `Dear Customer,\n\n`;
    body += `We are pleased to share our jewelry catalog with ${items.length} beautiful items:\n\n`;
    body += `${'='.repeat(50)}\n\n`;

    items.forEach((item, index) => {
      body += `${index + 1}. ${item.name}\n`;
      body += `   Price: ₹${item.price.toLocaleString()}\n`;
      
      const itemType = item.item_type || 'jewelry';
      if (itemType === 'gold') {
        body += `   Purity: ${item.purity || 'Gold 18K'} | Weight: ${item.weight || 'N/A'}\n`;
      } else if (itemType === 'stone' || itemType === 'artificial') {
        if (item.color) body += `   Color: ${item.color}\n`;
        if (item.size) body += `   Size: ${item.size}\n`;
      } else {
        body += `   Type: ${item.type || 'Jewelry'} | Metal: ${item.metal || 'Gold 18K'}\n`;
      }
      
      body += `   Stock: ${item.stock ?? item.inStock ?? 0} units\n\n`;
    });

    body += `${'='.repeat(50)}\n\n`;
    body += `Please contact us for more information or to place an order.\n\n`;
    body += `Best regards,\nJewelry Store`;
  } else {
    const item = items[0];
    body = generateItemMessage(item, template).replace(/\*/g, ''); // Remove markdown for email
    body += `\n\nPlease contact us for more information or to place an order.\n\nBest regards,\nJewelry Store`;
  }

  return { subject, body };
};

export const InventoryShare = ({ items, open, onOpenChange, shareType = 'single' }: InventoryShareProps) => {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [template, setTemplate] = useState<'simple' | 'detailed' | 'promotional' | 'inquiry'>('detailed');
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'email'>('whatsapp');
  const { toast } = useToast();

  const isBulk = items.length > 1 || shareType === 'bulk';
  const item = items[0];

  // Generate message based on template
  const generateMessage = () => {
    if (isBulk) {
      let message = `📿 *Jewelry Catalog* 📿\n\n`;
      message += `We have ${items.length} beautiful items for you:\n\n`;

      items.forEach((item, index) => {
        message += `${index + 1}. *${item.name}*\n`;
        message += `   💰 ₹${item.price.toLocaleString()}`;
        
        const itemType = item.item_type || 'jewelry';
        if (itemType === 'gold') {
          message += ` | ⚜️ ${item.purity || 'Gold'}`;
        } else if (itemType === 'stone' || itemType === 'artificial') {
          if (item.color) message += ` | 🎨 ${item.color}`;
        } else {
          message += ` | ⚜️ ${item.metal || 'Gold'}`;
        }
        
        message += `\n`;
        if ((item.stock ?? item.inStock ?? 0) > 0) {
          message += `   ✅ In Stock\n`;
        }
        message += `\n`;
      });

      message += `\n📱 Contact us for more details or to place an order!`;
      return message;
    } else {
      return generateItemMessage(item, template);
    }
  };

  const [customMessage, setCustomMessage] = useState(generateMessage());

  // Update message when template changes
  const handleTemplateChange = (value: 'simple' | 'detailed' | 'promotional' | 'inquiry') => {
    setTemplate(value);
    if (!isBulk) {
      setCustomMessage(generateItemMessage(item, value));
    }
  };

  // WhatsApp Share
  const handleWhatsAppShare = () => {
    const message = encodeURIComponent(customMessage);
    let url = "";

    if (phone && phone.trim()) {
      const cleanPhone = phone.replace(/\D/g, "");
      url = `https://wa.me/${cleanPhone}?text=${message}`;
    } else {
      url = `https://wa.me/?text=${message}`;
    }

    window.open(url, "_blank");

    toast({
      title: "Opening WhatsApp",
      description: isBulk ? `Sharing ${items.length} items` : "Message ready to send!",
    });

    onOpenChange(false);
  };

  // Email Share
  const handleEmailShare = () => {
    if (!email || !email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    const { subject, body } = generateEmailContent(items, template);
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.location.href = mailtoLink;

    toast({
      title: "Opening Email Client",
      description: "Email draft ready to send!",
    });

    onOpenChange(false);
  };

  const copyToClipboard = () => {
    const text = activeTab === 'whatsapp' 
      ? customMessage 
      : generateEmailContent(items, template).body;
    
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Content copied to clipboard",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-blue-600" />
            {isBulk ? `Share Catalog (${items.length} items)` : 'Share Item'}
          </DialogTitle>
          <DialogDescription>
            Share {isBulk ? 'your catalog' : 'this item'} via WhatsApp or Email
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'whatsapp' | 'email')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="whatsapp" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
          </TabsList>

          {/* WhatsApp Tab */}
          <TabsContent value="whatsapp" className="space-y-4 mt-4">
            {/* Items Preview */}
            {isBulk ? (
              <div className="max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-gray-500">{index + 1}.</span>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-gray-600">- ₹{item.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg border">
                <div className="flex gap-3">
                  {(item.image_1 || item.image) && (
                    <img
                      src={item.image_1 || item.image}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.name}</h4>
                    <p className="text-sm text-gray-600">
                      {item.item_type === 'gold' ? `${item.purity || 'Gold'}` :
                       item.item_type === 'stone' || item.item_type === 'artificial' ? `${item.color || 'Stone'}` :
                       `${item.type || 'Jewelry'} • ${item.metal || 'Gold'}`}
                    </p>
                    <p className="text-lg font-bold text-green-600">
                      ₹{item.price.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Phone Number (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                WhatsApp Number (Optional)
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to choose recipient in WhatsApp
              </p>
            </div>

            {/* Message Template (only for single items) */}
            {!isBulk && (
              <div className="space-y-2">
                <Label htmlFor="template">Message Template</Label>
                <Select value={template} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="detailed">Detailed (Recommended)</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="inquiry">Customer Inquiry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Custom Message */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="message">Message</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  className="gap-2 h-8"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
              </div>
              <Textarea
                id="message"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={isBulk ? 10 : 8}
                className="font-mono text-sm"
              />
            </div>
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email" className="space-y-4 mt-4">
            {/* Items Preview */}
            {isBulk ? (
              <div className="max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-gray-500">{index + 1}.</span>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-gray-600">- ₹{item.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg border">
                <div className="flex gap-3">
                  {(item.image_1 || item.image) && (
                    <img
                      src={item.image_1 || item.image}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.name}</h4>
                    <p className="text-sm text-gray-600">
                      {item.item_type === 'gold' ? `${item.purity || 'Gold'}` :
                       item.item_type === 'stone' || item.item_type === 'artificial' ? `${item.color || 'Stone'}` :
                       `${item.type || 'Jewelry'} • ${item.metal || 'Gold'}`}
                    </p>
                    <p className="text-lg font-bold text-blue-600">
                      ₹{item.price.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Email Address */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                required
              />
            </div>

            {/* Message Template (only for single items) */}
            {!isBulk && (
              <div className="space-y-2">
                <Label htmlFor="email-template">Email Template</Label>
                <Select value={template} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="detailed">Detailed (Recommended)</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="inquiry">Customer Inquiry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Email Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Email Preview</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  className="gap-2 h-8"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
              </div>
              <div className="border rounded-lg p-3 bg-gray-50 max-h-60 overflow-y-auto">
                <div className="text-xs space-y-1">
                  <div className="font-semibold">Subject:</div>
                  <div className="text-gray-600 mb-2">{generateEmailContent(items, template).subject}</div>
                  <div className="font-semibold">Body:</div>
                  <div className="text-gray-600 whitespace-pre-wrap text-xs">
                    {generateEmailContent(items, template).body}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {activeTab === 'whatsapp' ? (
            <Button onClick={handleWhatsAppShare} className="gap-2 bg-green-600 hover:bg-green-700">
              <MessageCircle className="h-4 w-4" />
              Share on WhatsApp
            </Button>
          ) : (
            <Button onClick={handleEmailShare} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Mail className="h-4 w-4" />
              Open Email Client
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Quick share button component
interface QuickShareButtonProps {
  item: InventoryItem;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "whatsapp" | "email" | "both";
}

export const QuickShareButton = ({ item, size = "icon", variant = "whatsapp" }: QuickShareButtonProps) => {
  const [shareOpen, setShareOpen] = useState(false);
  const { toast } = useToast();

  if (variant === 'whatsapp') {
    const handleQuickShare = () => {
      const message = encodeURIComponent(generateItemMessage(item, 'detailed'));
      const url = `https://wa.me/?text=${message}`;
      window.open(url, "_blank");
      
      toast({
        title: "Opening WhatsApp",
        description: "Message ready to send!",
      });
    };

    return (
      <Button
        variant="outline"
        size={size}
        onClick={handleQuickShare}
        className="bg-green-50 border-green-200 hover:bg-green-100 text-green-700"
        title="Share on WhatsApp"
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size={size}
        onClick={() => setShareOpen(true)}
        className="bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700"
        title="Share item"
      >
        {variant === 'email' ? <Mail className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      </Button>
      <InventoryShare
        items={[item]}
        open={shareOpen}
        onOpenChange={setShareOpen}
        shareType="single"
      />
    </>
  );
};

