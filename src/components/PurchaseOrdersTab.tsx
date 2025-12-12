import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, PlusCircle, Building2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AddVendorDialog } from './AddVendorDialog';
import jsPDF from 'jspdf';

interface Vendor {
  id: string;
  name: string;
}

interface PurchaseOrdersTabProps {
  vendors: Vendor[];
  onUpdate: () => void;
}

export function PurchaseOrdersTab({ vendors, onUpdate }: PurchaseOrdersTabProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [form, setForm] = useState({
    vendor_id: '',
    po_number: '',
    amount: '',
    status: 'draft',
    notes: '',
    expected_date: '',
  });

  const loadOrders = async () => {
    try {
      const { getUserData } = await import('@/lib/userStorage');
      const existing = (await getUserData<any[]>('purchase_orders')) || [];
      setOrders(existing);
    } catch (error) {
      console.error('Failed to load purchase orders', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vendor_id || !form.po_number || !form.amount) {
      toast({
        title: 'Missing info',
        description: 'Vendor, PO number, and amount are required.',
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

    const newOrder = {
      id: Date.now().toString(),
      vendor_id: form.vendor_id,
      po_number: form.po_number,
      amount,
      status: form.status,
      notes: form.notes,
      expected_date: form.expected_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { setUserData } = await import('@/lib/userStorage');
      const { upsertToSupabase } = await import('@/lib/supabaseDirect');
      const updated = [...orders, newOrder];
      setOrders(updated);
      await setUserData('purchase_orders', updated);
      await upsertToSupabase('purchase_orders', newOrder);
      toast({ title: 'Purchase order created' });
      setForm({
        vendor_id: '',
        po_number: '',
        amount: '',
        status: 'draft',
        notes: '',
        expected_date: '',
      });
      setShowDialog(false);
      onUpdate?.();
    } catch (error: any) {
      console.error('Failed to save purchase order', error);
      toast({
        title: 'Error',
        description: error?.message || 'Could not save purchase order',
        variant: 'destructive',
      });
    }
  };

  const downloadPdf = (order: any) => {
    const pdf = new jsPDF();
    const vendor = vendors.find((v) => v.id === order.vendor_id);
    pdf.setFontSize(14);
    pdf.text('Purchase Order', 20, 20);
    pdf.setFontSize(11);
    pdf.text(`PO Number: ${order.po_number}`, 20, 32);
    pdf.text(`Vendor: ${vendor?.name || 'Unknown'}`, 20, 40);
    pdf.text(`Amount: ₹${(order.amount || 0).toLocaleString()}`, 20, 48);
    if (order.expected_date) {
      pdf.text(`Expected: ${order.expected_date}`, 20, 56);
    }
    if (order.notes) {
      pdf.text(`Notes: ${order.notes}`, 20, 64);
    }
    pdf.save(`PO-${order.po_number || order.id}.pdf`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Purchase Orders</h3>
                <span className="text-sm text-muted-foreground">({vendors.length} vendors)</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddVendor(true)}>
                <Building2 className="h-4 w-4 mr-2" />
                Add Vendor
              </Button>
              <Button onClick={() => setShowDialog(true)} disabled={vendors.length === 0}>
                <PlusCircle className="h-4 w-4 mr-2" />
                New PO
              </Button>
            </div>
          </div>

          {vendors.length === 0 && (
            <div className="border border-dashed rounded-lg p-6 text-center bg-muted/40">
              <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <h4 className="font-semibold">No vendors yet</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Add a vendor to start creating purchase orders.
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
                <DialogTitle>Create Purchase Order</DialogTitle>
                <DialogDescription>
                  Add a purchase order for a vendor. All fields marked with * are required.
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
                  <Label>PO Number *</Label>
                  <Input
                    value={form.po_number}
                    onChange={(e) => setForm((prev) => ({ ...prev, po_number: e.target.value }))}
                    placeholder="PO-001"
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
                    placeholder="e.g. 15000"
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
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Expected Date</Label>
                  <Input
                    type="date"
                    value={form.expected_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, expected_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add any remarks"
                    rows={3}
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create PO
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
            <h4 className="font-semibold">Recent Purchase Orders</h4>
            <span className="text-sm text-muted-foreground">{orders.length} total</span>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchase orders yet.</p>
          ) : (
            <div className="grid gap-3">
              {orders
                .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
                .map((order) => {
                  const vendor = vendors.find((v) => v.id === order.vendor_id);
                  return (
                    <div key={order.id} className="border rounded-lg p-4 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{order.po_number}</div>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted text-foreground capitalize">
                          {order.status}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Vendor: {vendor?.name || 'Unknown'}
                      </div>
                      <div className="text-sm font-medium">₹{order.amount?.toLocaleString()}</div>
                      {order.expected_date && (
                        <div className="text-xs text-muted-foreground">Expected: {order.expected_date}</div>
                      )}
                      {order.notes && (
                        <div className="text-xs text-muted-foreground">Notes: {order.notes}</div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={() => downloadPdf(order)}>
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
          loadOrders();
          onUpdate?.();
        }}
      />
    </div>
  );
}

