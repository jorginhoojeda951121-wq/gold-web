import { useState } from "react";
import { CreditCard, Banknote, Smartphone, Calculator, Download } from "lucide-react";
import jsPDF from 'jspdf';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: string;
  metal: string;
  gemstone: string;
}

interface Transaction {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  timestamp: string;
  customerName?: string;
  customerPhone?: string;
}

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  onComplete: (transaction: Transaction) => void;
  onClearCart: () => void;
}

export const TransactionDialog = ({ 
  open, 
  onOpenChange, 
  items, 
  onComplete, 
  onClearCart 
}: TransactionDialogProps) => {
  const [paymentMethod, setPaymentMethod] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cashReceived, setCashReceived] = useState(0);

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxRate = 0.03; // 3% GST
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const change = cashReceived - total;

  const generatePDFReceipt = (transaction: Transaction) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Golden Treasures', 20, 20);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Jewelry & Gems Store', 20, 30);
    doc.text('123 Main Street, Mumbai, India', 20, 35);
    doc.text('Phone: +91 12345 67890', 20, 40);
    
    // Receipt details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RECEIPT', 20, 55);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Receipt No: ${transaction.id}`, 20, 65);
    doc.text(`Date: ${new Date(transaction.timestamp).toLocaleString()}`, 20, 72);
    
    if (transaction.customerName) {
      doc.text(`Customer: ${transaction.customerName}`, 20, 79);
    }
    if (transaction.customerPhone) {
      doc.text(`Phone: ${transaction.customerPhone}`, 20, 86);
    }
    
    // Items table header
    let yPos = transaction.customerName || transaction.customerPhone ? 100 : 90;
    doc.setFont('helvetica', 'bold');
    doc.text('Item', 20, yPos);
    doc.text('Qty', 120, yPos);
    doc.text('Price', 140, yPos);
    doc.text('Total', 170, yPos);
    
    // Draw line under header
    doc.line(20, yPos + 2, 190, yPos + 2);
    
    // Items
    doc.setFont('helvetica', 'normal');
    yPos += 10;
    transaction.items.forEach((item) => {
      // Item name (truncate if too long)
      const itemName = item.name.length > 25 ? item.name.substring(0, 25) + '...' : item.name;
      doc.text(itemName, 20, yPos);
      doc.text(item.quantity.toString(), 120, yPos);
      doc.text(`₹${item.price.toLocaleString()}`, 140, yPos);
      doc.text(`₹${(item.price * item.quantity).toLocaleString()}`, 170, yPos);
      yPos += 8;
    });
    
    // Totals
    yPos += 5;
    doc.line(120, yPos, 190, yPos);
    yPos += 8;
    
    doc.text(`Subtotal:`, 120, yPos);
    doc.text(`₹${transaction.subtotal.toLocaleString()}`, 170, yPos);
    yPos += 8;
    
    doc.text(`GST (3%):`, 120, yPos);
    doc.text(`₹${transaction.tax.toFixed(2)}`, 170, yPos);
    yPos += 8;
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Total:`, 120, yPos);
    doc.text(`₹${transaction.total.toLocaleString()}`, 170, yPos);
    yPos += 8;
    
    doc.text(`Payment: ${transaction.paymentMethod.toUpperCase()}`, 120, yPos);
    
    // Footer
    yPos += 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Thank you for your business!', 20, yPos);
    doc.text('Visit us again for more beautiful jewelry', 20, yPos + 5);
    
    // Save the PDF
    doc.save(`receipt-${transaction.id}.pdf`);
  };

  const handleCompleteTransaction = () => {
    if (!paymentMethod) {
      return;
    }

    if (paymentMethod === 'cash' && cashReceived < total) {
      return;
    }

    const transaction: Transaction = {
      id: Date.now().toString(),
      items: [...items],
      subtotal,
      tax,
      total,
      paymentMethod,
      timestamp: new Date().toISOString(),
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined
    };

    onComplete(transaction);
    
    // Generate PDF receipt
    generatePDFReceipt(transaction);
    
    onClearCart();
    
    // Reset form
    setPaymentMethod("");
    setCustomerName("");
    setCustomerPhone("");
    setCashReceived(0);
    onOpenChange(false);
  };

  const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: Banknote },
    { value: 'card', label: 'Credit/Debit Card', icon: CreditCard },
    { value: 'upi', label: 'UPI', icon: Smartphone }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5" />
            <span>Complete Transaction</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <Card className="p-4">
            <h3 className="font-medium mb-3">Customer Information (Optional)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Phone Number</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 12345 67890"
                />
              </div>
            </div>
          </Card>

          {/* Order Summary */}
          <Card className="p-4">
            <h3 className="font-medium mb-3">Order Summary</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div className="flex-1">
                    <span className="font-medium">{item.name}</span>
                    <div className="text-muted-foreground">
                      {item.quantity} × ₹{item.price.toLocaleString()}
                    </div>
                  </div>
                  <span className="font-medium">
                    ₹{(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>GST (3%):</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-primary">₹{total.toLocaleString()}</span>
              </div>
            </div>
          </Card>

          {/* Payment Method */}
          <Card className="p-4">
            <h3 className="font-medium mb-3">Payment Method</h3>
            <div className="grid grid-cols-3 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <Button
                    key={method.value}
                    variant={paymentMethod === method.value ? "default" : "outline"}
                    className="h-20 flex-col space-y-2"
                    onClick={() => setPaymentMethod(method.value)}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-xs">{method.label}</span>
                  </Button>
                );
              })}
            </div>

            {paymentMethod === 'cash' && (
              <div className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="cashReceived">Cash Received</Label>
                  <Input
                    id="cashReceived"
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(Number(e.target.value))}
                    placeholder="Enter amount received"
                    className="text-lg"
                  />
                </div>
                {cashReceived > 0 && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Change to give:</span>
                      <span className={`text-lg font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{Math.abs(change).toLocaleString()}
                      </span>
                    </div>
                    {change < 0 && (
                      <Badge variant="destructive" className="mt-2">
                        Insufficient amount received
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'upi' && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg text-center">
                <Smartphone className="h-12 w-12 mx-auto mb-2 text-blue-600" />
                <p className="text-sm text-blue-800">
                  Show QR code or share UPI ID: <strong>shop@paytm</strong>
                </p>
                <p className="text-lg font-bold text-blue-900 mt-1">
                  Amount: ₹{total.toLocaleString()}
                </p>
              </div>
            )}

            {paymentMethod === 'card' && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg text-center">
                <CreditCard className="h-12 w-12 mx-auto mb-2 text-green-600" />
                <p className="text-sm text-green-800">
                  Process card payment for
                </p>
                <p className="text-lg font-bold text-green-900 mt-1">
                  ₹{total.toLocaleString()}
                </p>
              </div>
            )}
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCompleteTransaction}
              disabled={!paymentMethod || (paymentMethod === 'cash' && cashReceived < total)}
              className="bg-green-600 hover:bg-green-700"
            >
              Complete Transaction
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};