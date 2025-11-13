import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Phone, Mail, DollarSign, Clock, Search, Plus, Eye, Edit, Trash2, CheckCircle, XCircle, AlertCircle, Package, Settings } from 'lucide-react';
import { AddReservationDialog } from '@/components/AddReservationDialog';
import { ReservationDetailsDialog } from '@/components/ReservationDetailsDialog';
import { GoogleCalendarSettings } from '@/components/GoogleCalendarSettings';
import { getSupabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface Reservation {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  event_type: string;
  event_date: string;
  reservation_date: string;
  pickup_date?: string;
  return_date?: string;
  status: string;
  total_amount: number;
  advance_paid: number;
  balance_due: number;
  special_requests?: string;
  notes?: string;
  item_count?: number;
  ready_count?: number;
  is_overdue?: boolean;
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-500', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-500', icon: CheckCircle },
  ready: { label: 'Ready', color: 'bg-green-500', icon: Package },
  picked_up: { label: 'Picked Up', color: 'bg-purple-500', icon: CheckCircle },
  returned: { label: 'Returned', color: 'bg-gray-500', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-500', icon: XCircle },
};

const eventTypeConfig = {
  wedding: { label: 'Wedding', color: 'bg-pink-100 text-pink-800', icon: '💍' },
  anniversary: { label: 'Anniversary', color: 'bg-red-100 text-red-800', icon: '❤️' },
  engagement: { label: 'Engagement', color: 'bg-purple-100 text-purple-800', icon: '💎' },
  birthday: { label: 'Birthday', color: 'bg-blue-100 text-blue-800', icon: '🎂' },
  festival: { label: 'Festival', color: 'bg-orange-100 text-orange-800', icon: '🪔' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-800', icon: '📦' },
};

export default function Reservations() {
  const { toast } = useToast();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    loadReservations();
  }, []);

  useEffect(() => {
    filterReservations();
  }, [searchQuery, activeTab, reservations]);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const supabase = getSupabase();
      
      // Query reservations directly from the table
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          reservation_items(count)
        `)
        .order('event_date', { ascending: true });

      if (error) throw error;

      // Transform data to add computed fields
      const transformedData = (data || []).map(reservation => ({
        ...reservation,
        item_count: reservation.reservation_items?.[0]?.count || 0,
        ready_count: 0, // Would need separate query to count ready items
        is_overdue: reservation.status !== 'cancelled' && 
                   reservation.status !== 'returned' && 
                   new Date(reservation.event_date) < new Date()
      }));

      setReservations(transformedData as any);
    } catch (error) {
      console.error('Error loading reservations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reservations. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterReservations = () => {
    // Skip filtering for calendar settings tab
    if (activeTab === 'calendar') {
      return;
    }

    let filtered = [...reservations];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(res =>
        res.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.customer_phone.includes(searchQuery) ||
        res.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by tab/status
    if (activeTab === 'upcoming') {
      filtered = filtered.filter(res => {
        const eventDate = new Date(res.event_date);
        const today = new Date();
        const next30Days = new Date();
        next30Days.setDate(today.getDate() + 30);
        return eventDate >= today && eventDate <= next30Days && res.status !== 'cancelled' && res.status !== 'returned';
      });
    } else if (activeTab === 'overdue') {
      filtered = filtered.filter(res => res.is_overdue);
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(res => res.status === 'returned' || res.status === 'cancelled');
    } else if (activeTab !== 'all') {
      filtered = filtered.filter(res => res.status === activeTab);
    }

    setFilteredReservations(filtered);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reservation?')) return;

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Reservation deleted successfully.',
      });
      loadReservations();
    } catch (error) {
      console.error('Error deleting reservation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete reservation.',
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

  const getEventTypeInfo = (type: string) => {
    return eventTypeConfig[type as keyof typeof eventTypeConfig] || eventTypeConfig.other;
  };

  const getStatusInfo = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  };

  const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-2">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const stats = {
    total: reservations.length,
    upcoming: reservations.filter(r => {
      const eventDate = new Date(r.event_date);
      const today = new Date();
      const next30Days = new Date();
      next30Days.setDate(today.getDate() + 30);
      return eventDate >= today && eventDate <= next30Days && r.status !== 'cancelled' && r.status !== 'returned';
    }).length,
    overdue: reservations.filter(r => r.is_overdue).length,
    totalValue: reservations.reduce((sum, r) => sum + (r.total_amount || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Event Reservations</h1>
          <p className="text-muted-foreground mt-1">Manage jewelry reservations for weddings, anniversaries, and special events</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          New Reservation
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Reservations"
          value={stats.total}
          icon={Package}
          color="bg-blue-500"
        />
        <StatCard
          title="Upcoming (30 Days)"
          value={stats.upcoming}
          icon={Calendar}
          color="bg-green-500"
        />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          icon={AlertCircle}
          color="bg-red-500"
        />
        <StatCard
          title="Total Value"
          value={formatCurrency(stats.totalValue)}
          icon={DollarSign}
          color="bg-purple-500"
        />
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by customer name, phone, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs and Reservations List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="all">All ({reservations.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({stats.upcoming})</TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({stats.overdue})</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="ready">Ready</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="calendar">
            <Settings className="h-4 w-4 mr-1" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredReservations.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Reservations Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Try adjusting your search criteria' : 'Create your first reservation to get started'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Reservation
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredReservations.map((reservation) => {
                const statusInfo = getStatusInfo(reservation.status);
                const eventInfo = getEventTypeInfo(reservation.event_type);
                const StatusIcon = statusInfo.icon;

                return (
                  <Card key={reservation.id} className={reservation.is_overdue ? 'border-red-500' : ''}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          {/* Header Row */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-lg font-semibold">{reservation.customer_name}</h3>
                            <Badge className={statusInfo.color}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {statusInfo.label}
                            </Badge>
                            <Badge variant="outline" className={eventInfo.color}>
                              <span className="mr-1">{eventInfo.icon}</span>
                              {eventInfo.label}
                            </Badge>
                            {reservation.is_overdue && (
                              <Badge variant="destructive">
                                <AlertCircle className="mr-1 h-3 w-3" />
                                Overdue
                              </Badge>
                            )}
                          </div>

                          {/* Contact Info */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {reservation.customer_phone}
                            </div>
                            {reservation.customer_email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                {reservation.customer_email}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Event: {format(new Date(reservation.event_date), 'MMM dd, yyyy')}
                            </div>
                          </div>

                          {/* Financial Info */}
                          <div className="flex items-center gap-6 text-sm">
                            <div>
                              <span className="text-muted-foreground">Total:</span>
                              <span className="ml-2 font-semibold">{formatCurrency(reservation.total_amount)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Advance:</span>
                              <span className="ml-2 font-semibold text-green-600">{formatCurrency(reservation.advance_paid)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Balance:</span>
                              <span className="ml-2 font-semibold text-orange-600">{formatCurrency(reservation.balance_due)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Items:</span>
                              <span className="ml-2 font-semibold">{reservation.item_count || 0}</span>
                              {reservation.ready_count > 0 && (
                                <span className="ml-1 text-green-600">({reservation.ready_count} ready)</span>
                              )}
                            </div>
                          </div>

                          {/* Special Requests */}
                          {reservation.special_requests && (
                            <p className="text-sm text-muted-foreground italic">
                              "{reservation.special_requests}"
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedReservation(reservation);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(reservation.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Calendar Settings Tab */}
        <TabsContent value="calendar" className="mt-6">
          <GoogleCalendarSettings />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddReservationDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={loadReservations}
      />

      {selectedReservation && (
        <ReservationDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          reservation={selectedReservation}
          onSuccess={loadReservations}
        />
      )}
    </div>
  );
}

