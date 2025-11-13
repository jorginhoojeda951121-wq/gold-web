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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageCircle, Share2, Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { JewelryItem } from "./JewelryCard";

interface WhatsAppShareProps {
  item: JewelryItem;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Message templates
const MESSAGE_TEMPLATES = {
  simple: (item: JewelryItem) => 
    `Check out this beautiful ${item.name}!\n\nPrice: ₹${item.price.toLocaleString()}\nType: ${item.type}\nMetal: ${item.metal}`,
  
  detailed: (item: JewelryItem) => 
    `✨ *${item.name}* ✨\n\n` +
    `💰 Price: ₹${item.price.toLocaleString()}\n` +
    `💍 Type: ${item.type}\n` +
    `⚜️ Metal: ${item.metal}\n` +
    `${item.gemstone && item.gemstone !== 'None' ? `💎 Gemstone: ${item.gemstone}\n` : ''}` +
    `${item.carat ? `📏 Carat: ${item.carat}\n` : ''}` +
    `${item.inStock > 0 ? `✅ In Stock: ${item.inStock} units\n` : '❌ Out of Stock\n'}\n` +
    `📞 Contact us for more details!`,
  
  promotional: (item: JewelryItem) => 
    `🎉 *SPECIAL OFFER* 🎉\n\n` +
    `${item.name}\n\n` +
    `💰 Only ₹${item.price.toLocaleString()}!\n` +
    `⚜️ ${item.metal} | 💍 ${item.type}\n\n` +
    `${item.inStock > 0 ? '✅ Limited Stock Available!\n' : ''}\n` +
    `📱 WhatsApp us now to order!`,
  
  inquiry: (item: JewelryItem) => 
    `Hi! I'm interested in this item:\n\n` +
    `${item.name}\n` +
    `Price: ₹${item.price.toLocaleString()}\n\n` +
    `Can you provide more information?`,
};

export const WhatsAppShare = ({ item, trigger, open: controlledOpen, onOpenChange: controlledOnOpenChange }: WhatsAppShareProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [template, setTemplate] = useState<keyof typeof MESSAGE_TEMPLATES>("detailed");
  const [customMessage, setCustomMessage] = useState(MESSAGE_TEMPLATES.detailed(item));
  const { toast } = useToast();
  
  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const handleTemplateChange = (value: keyof typeof MESSAGE_TEMPLATES) => {
    setTemplate(value);
    setCustomMessage(MESSAGE_TEMPLATES[value](item));
  };

  const handleShare = () => {
    const message = encodeURIComponent(customMessage);
    let url = "";

    if (phone && phone.trim()) {
      // Share to specific number
      const cleanPhone = phone.replace(/\D/g, ""); // Remove non-digits
      url = `https://wa.me/${cleanPhone}?text=${message}`;
    } else {
      // Open WhatsApp with message (user chooses recipient)
      url = `https://wa.me/?text=${message}`;
    }

    // Open WhatsApp in new tab
    window.open(url, "_blank");

    toast({
      title: "Opening WhatsApp",
      description: "Message ready to send!",
    });

    setOpen(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(customMessage);
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    });
  };

  return (
    <>
      {trigger && (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Share on WhatsApp
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Item Preview */}
            <div className="p-3 bg-gray-50 rounded-lg border">
              <div className="flex gap-3">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold">{item.name}</h4>
                  <p className="text-sm text-gray-600">{item.type} • {item.metal}</p>
                  <p className="text-lg font-bold text-green-600">
                    ₹{item.price.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

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

            {/* Message Template */}
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

            {/* Custom Message */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="message">Customize Message</Label>
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
                rows={8}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleShare} className="gap-2 bg-green-600 hover:bg-green-700">
              <MessageCircle className="h-4 w-4" />
              Share on WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Quick share button with icon only
interface QuickWhatsAppShareProps {
  item: JewelryItem;
  size?: "sm" | "default" | "lg" | "icon";
}

export const QuickWhatsAppShare = ({ item, size = "icon" }: QuickWhatsAppShareProps) => {
  const { toast } = useToast();

  const handleQuickShare = () => {
    const message = encodeURIComponent(MESSAGE_TEMPLATES.detailed(item));
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
};

// Bulk share component for multiple items
interface BulkWhatsAppShareProps {
  items: JewelryItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BulkWhatsAppShare = ({ items, open, onOpenChange }: BulkWhatsAppShareProps) => {
  const [phone, setPhone] = useState("");
  const { toast } = useToast();

  const generateCatalogMessage = () => {
    let message = `📿 *Jewelry Catalog* 📿\n\n`;
    message += `We have ${items.length} beautiful items for you:\n\n`;

    items.forEach((item, index) => {
      message += `${index + 1}. *${item.name}*\n`;
      message += `   💰 ₹${item.price.toLocaleString()} | ⚜️ ${item.metal}\n`;
      if (item.inStock > 0) {
        message += `   ✅ In Stock\n`;
      }
      message += `\n`;
    });

    message += `\n📱 Contact us for more details or to place an order!`;
    return message;
  };

  const [customMessage, setCustomMessage] = useState(generateCatalogMessage());

  const handleShare = () => {
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
      description: `Sharing ${items.length} items`,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-green-600" />
            Share Catalog ({items.length} items)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Items Preview */}
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

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="bulk-phone">WhatsApp Number (Optional)</Label>
            <Input
              id="bulk-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="bulk-message">Catalog Message</Label>
            <Textarea
              id="bulk-message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleShare} className="gap-2 bg-green-600 hover:bg-green-700">
            <MessageCircle className="h-4 w-4" />
            Share Catalog
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Utility function to create WhatsApp share URL
export const createWhatsAppShareUrl = (message: string, phone?: string): string => {
  const encodedMessage = encodeURIComponent(message);
  if (phone) {
    const cleanPhone = phone.replace(/\D/g, "");
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  }
  return `https://wa.me/?text=${encodedMessage}`;
};

// Utility function to open WhatsApp with message
export const openWhatsAppShare = (message: string, phone?: string): void => {
  const url = createWhatsAppShareUrl(message, phone);
  window.open(url, "_blank");
};

