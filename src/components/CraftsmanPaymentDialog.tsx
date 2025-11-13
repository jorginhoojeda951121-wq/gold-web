import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DollarSign, Receipt } from "lucide-react";
import { PaymentRecord } from "./AddCraftsmanDialog";

interface CraftsmanPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  craftsmanId: string;
  craftsmanName: string;
  pendingAmount: number;
  onRecordPayment: (payment: Omit<PaymentRecord, 'id' | 'craftsmanId'>) => void;
}

export const CraftsmanPaymentDialog = ({ 
  open, 
  onOpenChange, 
  craftsmanId,
  craftsmanName,
  pendingAmount,
  onRecordPayment 
}: CraftsmanPaymentDialogProps) => {
  const [formData, setFormData] = useState({
    amount: "",
    paymentMethod: "Cash" as 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque',
    projectId: "",
    description: "",
    receiptNumber: "",
    notes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return;
    }

    const payment: Omit<PaymentRecord, 'id' | 'craftsmanId'> = {
      amount: parseFloat(formData.amount),
      paymentDate: new Date().toISOString(),
      paymentMethod: formData.paymentMethod,
      projectId: formData.projectId || undefined,
      description: formData.description || `Payment to ${craftsmanName}`,
      receiptNumber: formData.receiptNumber || undefined,
      notes: formData.notes || undefined
    };

    onRecordPayment(payment);
    
    // Reset form
    setFormData({
      amount: "",
      paymentMethod: "Cash",
      projectId: "",
      description: "",
      receiptNumber: "",
      notes: ""
    });
    
    onOpenChange(false);
  };

  const handleQuickPay = (percentage: number) => {
    const amount = (pendingAmount * percentage / 100).toFixed(2);
    setFormData({ ...formData, amount });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-green-600 flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Record Payment - {craftsmanName}</span>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pending Amount Display */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-amber-800">Pending Amount:</span>
              <span className="text-2xl font-bold text-amber-900">
                ₹{pendingAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleQuickPay(25)}
                className="flex-1"
              >
                25%
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleQuickPay(50)}
                className="flex-1"
              >
                50%
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleQuickPay(75)}
                className="flex-1"
              >
                75%
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleQuickPay(100)}
                className="flex-1"
              >
                Full
              </Button>
            </div>
          </div>

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="Enter amount"
              required
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) => 
                setFormData({ ...formData, paymentMethod: value as typeof formData.paymentMethod })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Project ID (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="projectId">Project ID (Optional)</Label>
            <Input
              id="projectId"
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              placeholder="e.g., PRJ-001"
            />
          </div>

          {/* Receipt Number (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="receiptNumber">Receipt Number (Optional)</Label>
            <Input
              id="receiptNumber"
              value={formData.receiptNumber}
              onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
              placeholder="e.g., RCP-001"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={`Payment to ${craftsmanName}`}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this payment"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

