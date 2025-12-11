import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, PlusCircle, Building2 } from 'lucide-react';
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
import { AddVendorDialog } from './AddVendorDialog';
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

interface SupplierInvoicesTabProps {
  vendors: Vendor[];
  onUpdate: () => void;
}

export function SupplierInvoicesTab({ vendors, onUpdate }: SupplierInvoicesTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    vendor_id: '',
    invoice_number: '',
    amount: '',
    status: 'unpaid',
    due_date: '',
    notes: '',
  });

  const loadInvoices = async () => {
    try {
      const { getUserData } = await import('@/lib/userStorage');
      const existing = (await getUserData<any[]>('supplier_invoices')) || [];
      setInvoices(existing);
    } catch (error) {
      console.error('Failed to load supplier invoices', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vendor_id || !form.invoice_number || !form.amount) {
      toast({
        title: 'Missing info',
        description: 'Vendor, invoice number, and amount are required.',
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

    const newInvoice = {
      id: Date.now().toString(),
      vendor_id: form.vendor_id,
      invoice_number: form.invoice_number,
      amount,
      status: form.status,
      due_date: form.due_date || null,
      notes: form.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { setUserData } = await import('@/lib/userStorage');
      const { enqueueChange } = await import('@/lib/sync');
      const updated = [...invoices, newInvoice];
      setInvoices(updated);
      await setUserData('supplier_invoices', updated);
      await enqueueChange('supplier_invoices', 'upsert', newInvoice);
      toast({ title: 'Invoice created' });
      setForm({
        vendor_id: '',
        invoice_number: '',
        amount: '',
        status: 'unpaid',
        due_date: '',
        notes: '',
      });
      onUpdate?.();
      setShowDialog(false);
    } catch (error: any) {
      console.error('Failed to save supplier invoice', error);
      toast({
        title: 'Error',
        description: error?.message || 'Could not save invoice',
        variant: 'destructive',
      });
    }
  };

  const downloadPdf = (invoice: any) => {
    const pdf = new jsPDF();
    const vendor = vendors.find((v) => v.id === invoice.vendor_id);
    pdf.setFontSize(14);
    pdf.text('Supplier Invoice', 20, 20);
    pdf.setFontSize(11);
    pdf.text(`Invoice #: ${invoice.invoice_number}`, 20, 32);
    pdf.text(`Vendor: ${vendor?.name || 'Unknown'}`, 20, 40);
    pdf.text(`Amount: ₹${(invoice.amount || 0).toLocaleString()}`, 20, 48);
    pdf.text(`Status: ${invoice.status}`, 20, 56);
    if (invoice.due_date) {
      pdf.text(`Due: ${invoice.due_date}`, 20, 64);
    }
    if (invoice.notes) {
      pdf.text(`Notes: ${invoice.notes}`, 20, 72);
    }
    pdf.save(`Invoice-${invoice.invoice_number || invoice.id}.pdf`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Supplier Invoices</h3>
              <span className="text-sm text-muted-foreground">({vendors.length} vendors)</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddVendor(true)}>
                <Building2 className="h-4 w-4 mr-2" />
                Add Vendor
              </Button>
              <Button onClick={() => setShowDialog(true)} disabled={vendors.length === 0}>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Invoice
              </Button>
            </div>
          </div>

          {vendors.length === 0 && (
            <div className="border border-dashed rounded-lg p-6 text-center bg-muted/40">
              <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <h4 className="font-semibold">No vendors yet</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Add a vendor to start creating supplier invoices.
              </p>
              <Button onClick={() => setShowAddVendor(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Vendor
              </Button>
            </div>
          )}

          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Supplier Invoice</DialogTitle>
                <DialogDescription>
                  Add a supplier invoice for a vendor. Fields marked * are required.
                </DialogDescription>
              </DialogHeader>

              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label>Vendor *</Label>
                  <Select
                    value={form.vendor_id}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, vendor_id: value }))}
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
                  <Label>Invoice Number *</Label>
                  <Input
                    value={form.invoice_number}
                    onChange={(e) => setForm((prev) => ({ ...prev, invoice_number: e.target.value }))}
                    placeholder="INV-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="e.g. 8500"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add payment terms or remarks"
                    rows={3}
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Invoice
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
            <h4 className="font-semibold">Recent Supplier Invoices</h4>
            <span className="text-sm text-muted-foreground">{invoices.length} total</span>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No supplier invoices yet.</p>
          ) : (
            <div className="grid gap-3">
              {invoices
                .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
                .map((invoice) => {
                  const vendor = vendors.find((v) => v.id === invoice.vendor_id);
                  return (
                    <div key={invoice.id} className="border rounded-lg p-4 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{invoice.invoice_number}</div>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted text-foreground capitalize">
                          {invoice.status}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Vendor: {vendor?.name || 'Unknown'}
                      </div>
                      <div className="text-sm font-medium">₹{invoice.amount?.toLocaleString()}</div>
                      {invoice.due_date && (
                        <div className="text-xs text-muted-foreground">Due: {invoice.due_date}</div>
                      )}
                      {invoice.notes && (
                        <div className="text-xs text-muted-foreground">Notes: {invoice.notes}</div>
                      )}
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => downloadPdf(invoice)}>
                      Download PDF
                    </Button>
                  </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      <AddVendorDialog
        open={showAddVendor}
        onOpenChange={setShowAddVendor}
        onSuccess={() => {
          setShowAddVendor(false);
          loadInvoices();
          onUpdate?.();
        }}
      />
    </div>
  );
}

