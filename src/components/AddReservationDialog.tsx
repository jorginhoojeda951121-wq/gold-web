import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getSupabase } from '@/lib/supabase';
import { syncReservationToCalendar } from '@/lib/googleCalendar';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface AddReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddReservationDialog({ open, onOpenChange, onSuccess }: AddReservationDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [eventDate, setEventDate] = useState<Date>();
  const [pickupDate, setPickupDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    event_type: 'wedding',
    event_description: '',
    total_amount: '',
    advance_paid: '',
    special_requests: '',
    category_preferences: '',
    color_preferences: '',
    polish_quality: 'high',
    polish_service: false,
    polish_rate: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_name || !formData.customer_phone || !eventDate) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const supabase = getSupabase();

      const reservationId = `RES-${Date.now()}`;

      // Parse category and color preferences
      const categoryPrefs = formData.category_preferences
        ? formData.category_preferences.split(',').map(c => c.trim()).filter(Boolean)
        : [];
      const colorPrefs = formData.color_preferences
        ? formData.color_preferences.split(',').map(c => c.trim()).filter(Boolean)
        : [];

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No authenticated user');

      const { error } = await supabase.from('reservations').insert({
        id: reservationId,
        user_id: userData.user.id,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_email: formData.customer_email || null,
        event_type: formData.event_type,
        event_date: format(eventDate, 'yyyy-MM-dd'),
        event_description: formData.event_description || null,
        pickup_date: pickupDate ? format(pickupDate, 'yyyy-MM-dd') : null,
        return_date: returnDate ? format(returnDate, 'yyyy-MM-dd') : null,
        status: 'pending',
        advance_paid: parseFloat(formData.advance_paid) || 0,
        special_requests: formData.special_requests || null,
        category_preferences: categoryPrefs.length > 0 ? JSON.stringify(categoryPrefs) : null,
        color_preferences: colorPrefs.length > 0 ? JSON.stringify(colorPrefs) : null,
        polish_quality: formData.polish_quality || null,
        polish_service: formData.polish_service || false,
        polish_rate: formData.polish_rate ? parseFloat(formData.polish_rate) : null,
        total_amount: parseFloat(formData.total_amount) || 0,
        notes: formData.notes || null,
      });

      if (error) throw error;

      // Sync to Google Calendar
      try {
        const reservation = {
          id: reservationId,
          customer_name: formData.customer_name,
          customer_email: formData.customer_email || undefined,
          customer_phone: formData.customer_phone,
          event_type: formData.event_type,
          event_date: format(eventDate, 'yyyy-MM-dd'),
          event_description: formData.event_description || undefined,
          pickup_date: pickupDate ? format(pickupDate, 'yyyy-MM-dd') : undefined,
          return_date: returnDate ? format(returnDate, 'yyyy-MM-dd') : undefined,
          status: 'pending',
          special_requests: formData.special_requests || undefined,
          total_amount: 0, // Will be updated when items are added
        };
        
        await syncReservationToCalendar(reservation);
        
        toast({
          title: 'Success',
          description: 'Reservation created and synced to Google Calendar.',
        });
      } catch (calError) {
        console.warn('Calendar sync failed:', calError);
        toast({
          title: 'Success',
          description: 'Reservation created. Calendar sync failed.',
        });
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create reservation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      event_type: 'wedding',
      event_description: '',
      total_amount: '',
      advance_paid: '',
      special_requests: '',
      category_preferences: '',
      color_preferences: '',
      polish_quality: 'high',
      polish_service: false,
      polish_rate: '',
      notes: '',
    });
    setEventDate(undefined);
    setPickupDate(undefined);
    setReturnDate(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Reservation</DialogTitle>
          <DialogDescription>
            Reserve jewelry for weddings, anniversaries, and special events
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Customer Name *</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="Enter customer name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_phone">Phone Number *</Label>
                <Input
                  id="customer_phone"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  placeholder="+91-9876543210"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_email">Email (Optional)</Label>
              <Input
                id="customer_email"
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                placeholder="customer@example.com"
              />
            </div>
          </div>

          {/* Event Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Event Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_type">Event Type *</Label>
                <Select value={formData.event_type} onValueChange={(value) => setFormData({ ...formData, event_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wedding">💍 Wedding</SelectItem>
                    <SelectItem value="anniversary">❤️ Anniversary</SelectItem>
                    <SelectItem value="engagement">💎 Engagement</SelectItem>
                    <SelectItem value="birthday">🎂 Birthday</SelectItem>
                    <SelectItem value="festival">🪔 Festival</SelectItem>
                    <SelectItem value="other">📦 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Event Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {eventDate ? format(eventDate, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={eventDate}
                      onSelect={setEventDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_description">Event Description (Optional)</Label>
              <Input
                id="event_description"
                value={formData.event_description}
                onChange={(e) => setFormData({ ...formData, event_description: e.target.value })}
                placeholder="e.g., Grand wedding ceremony"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Pickup & Return Dates</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pickup Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {pickupDate ? format(pickupDate, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={pickupDate}
                      onSelect={setPickupDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Return Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {returnDate ? format(returnDate, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={returnDate}
                      onSelect={setReturnDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Customer Preferences</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category_preferences">Categories (comma-separated)</Label>
                <Input
                  id="category_preferences"
                  value={formData.category_preferences}
                  onChange={(e) => setFormData({ ...formData, category_preferences: e.target.value })}
                  placeholder="e.g., Necklace, Earrings, Bangles"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color_preferences">Colors/Metals (comma-separated)</Label>
                <Input
                  id="color_preferences"
                  value={formData.color_preferences}
                  onChange={(e) => setFormData({ ...formData, color_preferences: e.target.value })}
                  placeholder="e.g., Gold, Rose Gold, Diamond"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="polish_quality">Polish Quality</Label>
              <Select value={formData.polish_quality} onValueChange={(value) => setFormData({ ...formData, polish_quality: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High (Premium)</SelectItem>
                  <SelectItem value="medium">Medium (Standard)</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Custom Polish Service */}
            <div className="space-y-4 border-t pt-4 mt-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="polish_service"
                  checked={formData.polish_service}
                  onChange={(e) => setFormData({ ...formData, polish_service: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="polish_service" className="cursor-pointer">
                  Add Custom Polish Service
                </Label>
              </div>
              
              {formData.polish_service && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="polish_rate">Custom Polish Rate (₹)</Label>
                  <Input
                    id="polish_rate"
                    type="number"
                    value={formData.polish_rate}
                    onChange={(e) => setFormData({ ...formData, polish_rate: e.target.value })}
                    placeholder="Enter custom polish rate"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">
                    Some stores have their own custom polish rates and services
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Payment Information</h3>
            
            {/* Total Invoice Amount */}
            <div className="space-y-2">
              <Label htmlFor="total_amount">Total Invoice Amount (₹) *</Label>
              <Input
                id="total_amount"
                type="number"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                placeholder="Enter total bill amount"
                min="0"
                step="0.01"
              />
              <p className="text-xs text-muted-foreground">
                Enter the total invoice/bill amount for this reservation
              </p>
            </div>
            
            {/* Advance Amount */}
            <div className="space-y-2">
              <Label htmlFor="advance_paid">Advance Amount Paid (₹)</Label>
              <Input
                id="advance_paid"
                type="number"
                value={formData.advance_paid}
                onChange={(e) => setFormData({ ...formData, advance_paid: e.target.value })}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
            
            {/* Balance Due Display */}
            {formData.total_amount && (
              <div className="p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Balance Due:</span>
                  <span className="text-2xl font-bold text-primary">
                    ₹{(parseFloat(formData.total_amount) - (parseFloat(formData.advance_paid) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span>₹{parseFloat(formData.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Advance Paid:</span>
                    <span>₹{(parseFloat(formData.advance_paid) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Additional Information</h3>
            <div className="space-y-2">
              <Label htmlFor="special_requests">Special Requests</Label>
              <Textarea
                id="special_requests"
                value={formData.special_requests}
                onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                placeholder="Any special requests or requirements..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Internal Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes (not visible to customer)..."
                rows={2}
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
                'Create Reservation'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

