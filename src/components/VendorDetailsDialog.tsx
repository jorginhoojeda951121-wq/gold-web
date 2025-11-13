import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getSupabase } from '@/lib/supabase';
import { Building2, Phone, Mail, Save, Loader2, DollarSign } from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  vendor_type: string;
  gst_number?: string;
  status: string;
  total_purchases: number;
  outstanding_balance: number;
  credit_limit?: number;
  payment_terms?: string;
}

interface VendorDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: Vendor;
  onSuccess: () => void;
}

export function VendorDetailsDialog({ open, onOpenChange, vendor, onSuccess }: VendorDetailsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState({
    status: vendor.status,
    credit_limit: vendor.credit_limit?.toString() || '',
    payment_terms: vendor.payment_terms || '',
  });

  const handleUpdate = async () => {
    try {
      setLoading(true);
      const supabase = getSupabase();

      const { error } = await supabase
        .from('vendors')
        .update({
          status: editData.status,
          credit_limit: parseFloat(editData.credit_limit) || 0,
          payment_terms: editData.payment_terms || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vendor.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Vendor updated successfully.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating vendor:', error);
      toast({
        title: 'Error',
        description: 'Failed to update vendor.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Building2 className="h-5 w-5" />
            {vendor.name}
          </DialogTitle>
          <DialogDescription>Vendor ID: {vendor.id}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Contact Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {vendor.contact_person && (
                <div>
                  <span className="text-muted-foreground">Contact Person:</span>
                  <p className="font-medium">{vendor.contact_person}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Phone:</span>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4" />
                  <p className="font-medium">{vendor.phone}</p>
                </div>
              </div>
              {vendor.email && (
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4" />
                    <p className="font-medium">{vendor.email}</p>
                  </div>
                </div>
              )}
              {vendor.gst_number && (
                <div>
                  <span className="text-muted-foreground">GST Number:</span>
                  <p className="font-medium font-mono">{vendor.gst_number}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Financial Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Financial Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  Total Purchases
                </div>
                <p className="text-2xl font-bold">{formatCurrency(vendor.total_purchases)}</p>
              </div>
              <div className="p-4 border rounded-lg bg-orange-50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  Outstanding Balance
                </div>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(vendor.outstanding_balance)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Update Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Update Vendor</h3>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={editData.status} onValueChange={(value) => setEditData({ ...editData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="credit_limit">Credit Limit (₹)</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  value={editData.credit_limit}
                  onChange={(e) => setEditData({ ...editData, credit_limit: e.target.value })}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Input
                  id="payment_terms"
                  value={editData.payment_terms}
                  onChange={(e) => setEditData({ ...editData, payment_terms: e.target.value })}
                  placeholder="e.g., Net 30"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

