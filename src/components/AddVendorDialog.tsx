import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { enqueueChange } from '@/lib/sync';
import { getUserData, setUserData, getCurrentUserId } from '@/lib/userStorage';
import { Loader2 } from 'lucide-react';

interface AddVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (vendor?: any) => void;
}

export function AddVendorDialog({ open, onOpenChange, onSuccess }: AddVendorDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    vendor_type: 'supplier',
    gst_number: '',
    pan_number: '',
    specialization: '',
    credit_limit: '',
    payment_terms: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    upi_id: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const vendorId = `VEN-${Date.now()}`;
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('No authenticated user');

      // Parse specialization
      const specialization = formData.specialization
        ? formData.specialization.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const newVendor = {
        id: vendorId,
        user_id: userId,
        name: formData.name,
        contact_person: formData.contact_person || null,
        phone: formData.phone,
        email: formData.email || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        pincode: formData.pincode || null,
        vendor_type: formData.vendor_type,
        gst_number: formData.gst_number || null,
        pan_number: formData.pan_number || null,
        specialization: specialization.length > 0 ? JSON.stringify(specialization) : null,
        credit_limit: parseFloat(formData.credit_limit) || 0,
        payment_terms: formData.payment_terms || null,
        bank_name: formData.bank_name || null,
        account_number: formData.account_number || null,
        ifsc_code: formData.ifsc_code || null,
        upi_id: formData.upi_id || null,
        notes: formData.notes || null,
        status: 'active',
        total_purchases: 0,
        outstanding_balance: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Save to IndexedDB first
      const vendors = (await getUserData<any[]>('vendors')) || [];
      vendors.push(newVendor);
      await setUserData('vendors', vendors);
      // Broadcast update so useUserStorage subscribers refresh immediately
      window.dispatchEvent(new CustomEvent('user-storage-updated:vendors', {
        detail: { key: 'vendors', value: vendors }
      }));

      // Queue for sync to Supabase
      try {
        await enqueueChange('vendors', 'upsert', newVendor);
      } catch (syncError) {
        console.warn('Failed to queue sync, but vendor saved locally:', syncError);
        // Don't fail the operation if sync fails - data is saved locally
      }

      toast({
        title: 'Success',
        description: 'Vendor created successfully.',
      });

      onSuccess(newVendor);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating vendor:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create vendor. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      vendor_type: 'supplier',
      gst_number: '',
      pan_number: '',
      specialization: '',
      credit_limit: '',
      payment_terms: '',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      upi_id: '',
      notes: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Vendor</DialogTitle>
          <DialogDescription>
            Create a new supplier or vendor for procurement
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Vendor Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter vendor name"
                  autoComplete="off"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor_type">Vendor Type *</Label>
                <Select value={formData.vendor_type} onValueChange={(value) => setFormData({ ...formData, vendor_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supplier">📦 Supplier</SelectItem>
                    <SelectItem value="manufacturer">🏭 Manufacturer</SelectItem>
                    <SelectItem value="wholesaler">🏪 Wholesaler</SelectItem>
                    <SelectItem value="artisan">👨‍🎨 Artisan</SelectItem>
                    <SelectItem value="other">🏢 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Name of primary contact"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91-9876543210"
                  autoComplete="off"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="vendor@example.com"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Address</h3>
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter full address"
                autoComplete="off"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="State"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="123456"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          {/* Business Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Business Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gst_number">GST Number</Label>
                <Input
                  id="gst_number"
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                  placeholder="22AAAAA0000A1Z5"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pan_number">PAN Number</Label>
                <Input
                  id="pan_number"
                  value={formData.pan_number}
                  onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                  placeholder="AAAAA0000A"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization (comma-separated)</Label>
              <Input
                id="specialization"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                placeholder="e.g., Gold, Silver, Gemstones, Diamonds"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Payment Terms */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Payment Terms</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="credit_limit">Credit Limit (₹)</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                  placeholder="0"
                  autoComplete="off"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Input
                  id="payment_terms"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  placeholder="e.g., Net 30, COD, 50% Advance"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Bank Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="Bank name"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number</Label>
                <Input
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  placeholder="Account number"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ifsc_code">IFSC Code</Label>
                <Input
                  id="ifsc_code"
                  value={formData.ifsc_code}
                  onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                  placeholder="IFSC code"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="upi_id">UPI ID</Label>
                <Input
                  id="upi_id"
                  value={formData.upi_id}
                  onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                  placeholder="vendor@upi"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Additional Information</h3>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes about this vendor..."
                autoComplete="off"
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Vendor'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

