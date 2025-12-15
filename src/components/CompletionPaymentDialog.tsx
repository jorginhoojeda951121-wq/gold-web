import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banknote, CreditCard, Smartphone, CheckCircle, X } from "lucide-react";
import { useUserStorage } from "@/hooks/useUserStorage";

interface CompletionPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialId: string;
  materialName: string;
  agreedAmount: number;
  onComplete: (paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Pay Later', amountPaid?: number, cardNumber?: string) => void;
}

export const CompletionPaymentDialog = ({
  open,
  onOpenChange,
  materialId,
  materialName,
  agreedAmount,
  onComplete
}: CompletionPaymentDialogProps) => {
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Pay Later' | ''>('');
  const [cashReceived, setCashReceived] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [showUpi, setShowUpi] = useState(false);
  const [upiUrl, setUpiUrl] = useState('');

  const { data: paymentSettings } = useUserStorage('paymentSettings', {
    upiId: '',
    businessName: '',
    gstNumber: '',
    bankAccount: '',
    ifscCode: ''
  });

  useEffect(() => {
    if (paymentMethod === 'UPI' && paymentSettings.upiId) {
      const amount = agreedAmount || 0;
      const upiString = `${paymentSettings.upiId}?am=${amount}&tn=Payment%20for%20${encodeURIComponent(materialName)}`;
      setUpiUrl(upiString);
    }
  }, [paymentMethod, paymentSettings.upiId, agreedAmount, materialName]);

  const handlePaymentMethodSelect = (method: 'Cash' | 'UPI' | 'Card' | 'Pay Later') => {
    setPaymentMethod(method);
    if (method === 'UPI') {
      setShowUpi(true);
    } else {
      setShowUpi(false);
    }
  };

  const handleComplete = () => {
    if (!paymentMethod) return;

    if (paymentMethod === 'Cash') {
      const received = parseFloat(cashReceived) || 0;
      if (received < agreedAmount) {
        return;
      }
      onComplete('Cash', received);
    } else if (paymentMethod === 'UPI') {
      onComplete('UPI', agreedAmount);
    } else if (paymentMethod === 'Card') {
      if (!cardNumber.trim()) {
        return;
      }
      onComplete('Card', agreedAmount, cardNumber);
    } else if (paymentMethod === 'Pay Later') {
      onComplete('Pay Later', 0);
    }

    setPaymentMethod('');
    setCashReceived('');
    setCardNumber('');
    setShowUpi(false);
    onOpenChange(false);
  };

  const formatInr = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);

  return (
    <>
      <Dialog open={open && !showUpi} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Complete Task - Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Material</p>
              <p className="font-semibold text-lg">{materialName}</p>
              {agreedAmount > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  Agreed Amount: <span className="font-bold text-green-600">{formatInr(agreedAmount)}</span>
                </p>
              )}
            </div>

            {agreedAmount > 0 ? (
              <div className="space-y-3">
                <Label>Select Payment Method</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={paymentMethod === 'Cash' ? 'default' : 'outline'}
                    className={`h-auto py-4 flex flex-col items-center space-y-2 ${
                      paymentMethod === 'Cash' ? 'bg-green-600 hover:bg-green-700' : ''
                    }`}
                    onClick={() => handlePaymentMethodSelect('Cash')}
                  >
                    <Banknote className="h-6 w-6" />
                    <span>Cash</span>
                  </Button>

                  <Button
                    type="button"
                    variant={paymentMethod === 'UPI' ? 'default' : 'outline'}
                    className={`h-auto py-4 flex flex-col items-center space-y-2 ${
                      paymentMethod === 'UPI' ? 'bg-blue-600 hover:bg-blue-700' : ''
                    }`}
                    onClick={() => handlePaymentMethodSelect('UPI')}
                  >
                    <Smartphone className="h-6 w-6" />
                    <span>UPI</span>
                  </Button>

                  <Button
                    type="button"
                    variant={paymentMethod === 'Card' ? 'default' : 'outline'}
                    className={`h-auto py-4 flex flex-col items-center space-y-2 ${
                      paymentMethod === 'Card' ? 'bg-purple-600 hover:bg-purple-700' : ''
                    }`}
                    onClick={() => handlePaymentMethodSelect('Card')}
                  >
                    <CreditCard className="h-6 w-6" />
                    <span>Card</span>
                  </Button>

                  <Button
                    type="button"
                    variant={paymentMethod === 'Pay Later' ? 'default' : 'outline'}
                    className={`h-auto py-4 flex flex-col items-center space-y-2 ${
                      paymentMethod === 'Pay Later' ? 'bg-orange-600 hover:bg-orange-700' : ''
                    }`}
                    onClick={() => handlePaymentMethodSelect('Pay Later')}
                  >
                    <X className="h-6 w-6" />
                    <span>Pay Later</span>
                  </Button>
                </div>

                {paymentMethod === 'Cash' && (
                  <div className="space-y-2">
                    <Label htmlFor="cash-received">Amount Received (₹)</Label>
                    <Input
                      id="cash-received"
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder={`Enter amount (min: ${formatInr(agreedAmount)})`}
                      min={agreedAmount}
                    />
                    {cashReceived && parseFloat(cashReceived) >= agreedAmount && (
                      <p className="text-sm text-green-600">
                        Change: {formatInr(parseFloat(cashReceived) - agreedAmount)}
                      </p>
                    )}
                    {cashReceived && parseFloat(cashReceived) < agreedAmount && (
                      <p className="text-sm text-red-600">
                        Insufficient amount. Required: {formatInr(agreedAmount)}
                      </p>
                    )}
                  </div>
                )}

                {paymentMethod === 'Card' && (
                  <div className="space-y-2">
                    <Label htmlFor="card-number">Card Number (Last 4 digits)</Label>
                    <Input
                      id="card-number"
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="Enter last 4 digits"
                      maxLength={4}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  No payment amount set for this task. You can complete it without payment.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={
                !paymentMethod ||
                (paymentMethod === 'Cash' && (!cashReceived || parseFloat(cashReceived) < agreedAmount)) ||
                (paymentMethod === 'Card' && !cardNumber.trim())
              }
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* UPI Modal */}
      <Dialog open={showUpi} onOpenChange={setShowUpi}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Scan & Pay (UPI)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="w-full flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-white rounded-lg border-2 border-gray-200 shadow-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&margin=2&data=${encodeURIComponent(upiUrl)}`}
                  alt="UPI QR Code"
                  className="w-full max-w-[300px] h-auto"
                  onError={(e) => {
                    console.error("QR code generation failed");
                  }}
                />
              </div>
              <div className="text-center w-full pt-2">
                <p className="text-base font-normal text-gray-800">
                  UPI ID: {paymentSettings.upiId || "No UPI ID configured"}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Amount: {formatInr(agreedAmount)}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUpi(false);
                setPaymentMethod('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowUpi(false);
                onComplete('UPI', agreedAmount);
                setPaymentMethod('');
                onOpenChange(false);
              }}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Payment Received
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

