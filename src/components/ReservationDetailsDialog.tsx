import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getSupabase } from '@/lib/supabase';
import { Calendar, Phone, Mail, DollarSign, Save, Plus, Trash2, Package, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Reservation {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  event_type: string;
  event_date: string;
  status: string;
  total_amount: number;
  advance_paid: number;
  balance_due: number;
  special_requests?: string;
  notes?: string;
}

interface ReservationItem {
  id: string;
  item_name: string;
  item_description?: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  status: string;
  notes?: string;
}

interface ReservationDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: Reservation;
  onSuccess: () => void;
}

export function ReservationDetailsDialog({ open, onOpenChange, reservation, onSuccess }: ReservationDetailsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [newItem, setNewItem] = useState({
    item_name: '',
    item_description: '',
    quantity: 1,
    unit_price: '',
    notes: '',
  });

  const [editData, setEditData] = useState({
    status: reservation.status,
    advance_paid: reservation.advance_paid.toString(),
    notes: reservation.notes || '',
  });

  useEffect(() => {
    if (open) {
      loadItems();
    }
  }, [open]);

  const loadItems = async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('reservation_items')
        .select('*')
        .eq('reservation_id', reservation.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading reservation items:', error);
    }
  };

  const handleUpdateReservation = async () => {
    try {
      setLoading(true);
      const supabase = getSupabase();

      const { error } = await supabase
        .from('reservations')
        .update({
          status: editData.status,
          advance_paid: parseFloat(editData.advance_paid) || 0,
          notes: editData.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservation.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Reservation updated successfully.',
      });

      onSuccess();
    } catch (error) {
      console.error('Error updating reservation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update reservation.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.item_name || !newItem.quantity) {
      toast({
        title: 'Validation Error',
        description: 'Please provide item name and quantity.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const supabase = getSupabase();

      const unitPrice = parseFloat(newItem.unit_price) || 0;
      const totalPrice = unitPrice * newItem.quantity;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No authenticated user');

      const { error } = await supabase.from('reservation_items').insert({
        id: `RI-${Date.now()}`,
        user_id: userData.user.id,
        reservation_id: reservation.id,
        item_name: newItem.item_name,
        item_description: newItem.item_description || null,
        quantity: newItem.quantity,
        unit_price: unitPrice > 0 ? unitPrice : null,
        total_price: unitPrice > 0 ? totalPrice : null,
        status: 'pending',
        notes: newItem.notes || null,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Item added successfully.',
      });

      setNewItem({
        item_name: '',
        item_description: '',
        quantity: 1,
        unit_price: '',
        notes: '',
      });

      loadItems();
      onSuccess();
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: 'Error',
        description: 'Failed to add item.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('reservation_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Item deleted successfully.',
      });

      loadItems();
      onSuccess();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete item.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateItemStatus = async (itemId: string, status: string) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('reservation_items')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', itemId);

      if (error) throw error;

      loadItems();
      toast({
        title: 'Success',
        description: 'Item status updated.',
      });
    } catch (error) {
      console.error('Error updating item status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update item status.',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-500' },
    { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-500' },
    { value: 'ready', label: 'Ready', color: 'bg-green-500' },
    { value: 'picked_up', label: 'Picked Up', color: 'bg-purple-500' },
    { value: 'returned', label: 'Returned', color: 'bg-gray-500' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
  ];

  const itemStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'allocated', label: 'Allocated' },
    { value: 'ready', label: 'Ready' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'returned', label: 'Returned' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Reservation Details</span>
            <Badge className={statusOptions.find(s => s.value === reservation.status)?.color || 'bg-gray-500'}>
              {statusOptions.find(s => s.value === reservation.status)?.label}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Reservation ID: {reservation.id}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="items">Items ({items.length})</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6 mt-6">
            {/* Customer Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Customer Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{reservation.customer_phone}</span>
                </div>
                {reservation.customer_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{reservation.customer_email}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Event Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Event Information</h3>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{format(new Date(reservation.event_date), 'MMMM dd, yyyy')}</span>
                <Badge variant="outline">{reservation.event_type}</Badge>
              </div>
              {reservation.special_requests && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Special Requests:</p>
                  <p className="text-sm text-muted-foreground">{reservation.special_requests}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Status Update */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Update Status</h3>
              <div className="space-y-2">
                <Label>Reservation Status</Label>
                <Select value={editData.status} onValueChange={(value) => setEditData({ ...editData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  placeholder="Add internal notes..."
                  rows={3}
                />
              </div>

              <Button onClick={handleUpdateReservation} disabled={loading}>
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
          </TabsContent>

          {/* Items Tab */}
          <TabsContent value="items" className="space-y-6 mt-6">
            {/* Add New Item */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h3 className="text-lg font-semibold">Add New Item</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item_name">Item Name *</Label>
                  <Input
                    id="item_name"
                    value={newItem.item_name}
                    onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                    placeholder="e.g., Gold Necklace Set"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit_price">Unit Price (₹)</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newItem.unit_price}
                    onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item_description">Description</Label>
                  <Input
                    id="item_description"
                    value={newItem.item_description}
                    onChange={(e) => setNewItem({ ...newItem, item_description: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <Button onClick={handleAddItem} disabled={loading}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>

            {/* Items List */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Reserved Items</h3>
              {items.length === 0 ? (
                <div className="text-center p-8 border rounded-lg">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No items added yet</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.item_name}</h4>
                        {item.item_description && (
                          <p className="text-sm text-muted-foreground">{item.item_description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span>Qty: {item.quantity}</span>
                          {item.unit_price && (
                            <>
                              <span>Unit: {formatCurrency(item.unit_price)}</span>
                              <span className="font-semibold">Total: {formatCurrency(item.total_price || 0)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={item.status}
                          onValueChange={(value) => handleUpdateItemStatus(item.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {itemStatusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground italic">{item.notes}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Payment Tab */}
          <TabsContent value="payment" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Payment Summary</h3>
              
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="text-2xl font-bold">{formatCurrency(reservation.total_amount)}</span>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                  <span className="text-muted-foreground">Advance Paid</span>
                  <span className="text-2xl font-bold text-green-600">{formatCurrency(reservation.advance_paid)}</span>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg bg-orange-50">
                  <span className="text-muted-foreground">Balance Due</span>
                  <span className="text-2xl font-bold text-orange-600">{formatCurrency(reservation.balance_due)}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Update Advance Payment</h3>
                <div className="space-y-2">
                  <Label htmlFor="advance_paid">Advance Amount (₹)</Label>
                  <Input
                    id="advance_paid"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editData.advance_paid}
                    onChange={(e) => setEditData({ ...editData, advance_paid: e.target.value })}
                  />
                  <p className="text-sm text-muted-foreground">
                    New Balance: {formatCurrency(reservation.total_amount - (parseFloat(editData.advance_paid) || 0))}
                  </p>
                </div>

                <Button onClick={handleUpdateReservation} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Update Payment
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

