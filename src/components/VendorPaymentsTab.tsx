import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getUserData, setUserData } from '@/lib/userStorage';
import { enqueueChange } from '@/lib/sync';
import { CreditCard, History, PlusCircle, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import jsPDF from 'jspdf';

interface Vendor {
  id: string;
  name: string;
}

interface VendorPaymentsTabProps {
  vendors: Vendor[];
  onUpdate: () => void;
}

interface VendorPayment {
  id: string;
  vendor_id: string;
  vendor_name: string;
  invoice_id?: string | null;
  invoice_number?: string | null;
  payment_date: string;
  amount: number;
  payment_method: string;
  transaction_reference?: string | null;
  notes?: string | null;
  created_at: string;
}

const paymentMethods = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card'];

export function VendorPaymentsTab({ vendors, onUpdate }: VendorPaymentsTabProps) {
  const { toast } = useToast();
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    vendor_id: '',
    amount: '',
    payment_method: 'Cash',
    payment_date: new Date().toISOString().split('T')[0],
    invoice_number: '',
    transaction_reference: '',
    notes: '',
  });

  const loadPayments = async () => {
    try {
      const existing = (await getUserData<VendorPayment[]>('vendor_payments')) || [];
      setPayments(existing);
    } catch (error) {
      console.error('Failed to load vendor payments', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vendor_id || !form.amount) {
      toast({
        title: 'Missing info',
        description: 'Vendor and amount are required.',
        variant: 'destructive',
      });
      return;
    }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Enter a valid positive amount.',
        variant: 'destructive',
      });
      return;
    }

    const vendor = vendors.find(v => v.id === form.vendor_id);
    const payment: VendorPayment = {
      id: `PAY-${Date.now()}`,
      vendor_id: form.vendor_id,
      vendor_name: vendor?.name || 'Unknown',
      invoice_id: null,
      invoice_number: form.invoice_number || null,
      payment_date: form.payment_date,
      amount,
      payment_method: form.payment_method,
      transaction_reference: form.transaction_reference || null,
      notes: form.notes || null,
      created_at: new Date().toISOString(),
    };

    try {
      const updated = [...payments, payment];
      setPayments(updated);
      await setUserData('vendor_payments', updated);
      await enqueueChange('vendor_payments', 'upsert', payment);
      toast({ title: 'Payment recorded' });
      setForm(prev => ({
        ...prev,
        amount: '',
        invoice_number: '',
        transaction_reference: '',
        notes: '',
      }));
      setShowDialog(false);
      onUpdate?.();
    } catch (error: any) {
      console.error('Failed to save vendor payment', error);
      toast({
        title: 'Error',
        description: error?.message || 'Could not save payment',
        variant: 'destructive',
      });
    }
  };

  const downloadPdf = (payment: VendorPayment) => {
    const pdf = new jsPDF();
    pdf.setFontSize(14);
    pdf.text('Vendor Payment', 20, 20);
    pdf.setFontSize(11);
    pdf.text(`Vendor: ${payment.vendor_name}`, 20, 32);
    pdf.text(`Amount: ₹${(payment.amount || 0).toLocaleString()}`, 20, 40);
    pdf.text(`Method: ${payment.payment_method}`, 20, 48);
    pdf.text(`Date: ${payment.payment_date}`, 20, 56);
    if (payment.invoice_number) pdf.text(`Invoice: ${payment.invoice_number}`, 20, 64);
    if (payment.transaction_reference) pdf.text(`Ref: ${payment.transaction_reference}`, 20, 72);
    if (payment.notes) {
      const notes = pdf.splitTextToSize(`Notes: ${payment.notes}`, 170);
      pdf.text(notes, 20, 80);
    }
    pdf.save(`VendorPayment-${payment.vendor_name}-${payment.id}.pdf`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Vendor Payments</h3>
                <span className="text-sm text-muted-foreground">({vendors.length} vendors)</span>
              </div>
            </div>
            <Button onClick={() => setShowDialog(true)} disabled={vendors.length === 0}>
              <PlusCircle className="h-4 w-4 mr-2" />
              New Payment
            </Button>
          </div>

          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Record Vendor Payment</DialogTitle>
                <DialogDescription>Track payments made to vendors.</DialogDescription>
              </DialogHeader>

              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label>Vendor *</Label>
                  <Select
                    value={form.vendor_id}
                    onValueChange={(value) => setForm(prev => ({ ...prev, vendor_id: value }))}
                    disabled={vendors.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={vendors.length === 0 ? 'No vendors available' : 'Select vendor'} />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Add a vendor first
                        </SelectItem>
                      ) : (
                        vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="e.g. 12000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select
                    value={form.payment_method}
                    onValueChange={(value) => setForm(prev => ({ ...prev, payment_method: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(method => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Input
                    type="date"
                    value={form.payment_date}
                    onChange={(e) => setForm(prev => ({ ...prev, payment_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Invoice # (optional)</Label>
                  <Input
                    value={form.invoice_number}
                    onChange={(e) => setForm(prev => ({ ...prev, invoice_number: e.target.value }))}
                    placeholder="INV-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Transaction Ref (optional)</Label>
                  <Input
                    value={form.transaction_reference}
                    onChange={(e) => setForm(prev => ({ ...prev, transaction_reference: e.target.value }))}
                    placeholder="Txn / Cheque / UPI ref"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any remarks about this payment"
                    rows={3}
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={vendors.length === 0}>
                    Record Payment
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <h4 className="font-semibold">Payment History</h4>
            </div>
            <span className="text-sm text-muted-foreground">{payments.length} total</span>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {payments
                .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
                .map((payment) => (
                  <div key={payment.id} className="border rounded-lg p-4 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{payment.vendor_name}</div>
                      <span className="text-xs px-2 py-1 rounded-full bg-muted text-foreground capitalize">
                        {payment.payment_method}
                      </span>
                    </div>
                    <div className="text-sm font-medium">₹{payment.amount.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      {payment.payment_date}
                      {payment.invoice_number && ` • Invoice: ${payment.invoice_number}`}
                    </div>
                    {payment.transaction_reference && (
                      <div className="text-xs text-muted-foreground">Ref: {payment.transaction_reference}</div>
                    )}
                    {payment.notes && (
                      <div className="text-xs text-muted-foreground">Notes: {payment.notes}</div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" onClick={() => downloadPdf(payment)}>
                        <Download className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

