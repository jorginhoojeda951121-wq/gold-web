import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Phone, Mail, DollarSign, TrendingUp, Search, Plus, Eye, Edit, Trash2, ShoppingCart, FileText, CreditCard } from 'lucide-react';
import { AddVendorDialog } from '@/components/AddVendorDialog';
import { VendorDetailsDialog } from '@/components/VendorDetailsDialog';
import { PurchaseOrdersTab } from '@/components/PurchaseOrdersTab';
import { SupplierInvoicesTab } from '@/components/SupplierInvoicesTab';
import { getSupabase } from '@/lib/supabase';
import { useUserStorage } from '@/hooks/useUserStorage';

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
  purchase_order_count?: number;
  invoice_count?: number;
  outstanding_invoice_count?: number;
  specialization?: string[];
}

const statusConfig = {
  active: { label: 'Active', color: 'bg-green-500' },
  inactive: { label: 'Inactive', color: 'bg-gray-500' },
  blocked: { label: 'Blocked', color: 'bg-red-500' },
};

const vendorTypeConfig = {
  supplier: { label: 'Supplier', icon: '📦' },
  manufacturer: { label: 'Manufacturer', icon: '🏭' },
  wholesaler: { label: 'Wholesaler', icon: '🏪' },
  artisan: { label: 'Artisan', icon: '👨‍🎨' },
  other: { label: 'Other', icon: '🏢' },
};

export default function Vendors() {
  const { toast } = useToast();
  
  // CRITICAL: Use IndexedDB first for instant loading (no loading screen!)
  const { data: vendorsRaw, updateData: setVendors, loaded } = useUserStorage<Vendor[]>('vendors', []);
  
  // Parse JSON fields when loading from IndexedDB - useMemo to prevent infinite loops
  const vendors = useMemo(() => {
    return vendorsRaw.map((vendor: any) => {
      // Create a copy to avoid mutating the original
      const parsedVendor = { ...vendor };
      if (parsedVendor.specialization && typeof parsedVendor.specialization === 'string') {
        try {
          parsedVendor.specialization = JSON.parse(parsedVendor.specialization);
        } catch {
          // If parsing fails, try comma-separated
          parsedVendor.specialization = parsedVendor.specialization.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }
      return parsedVendor;
    });
  }, [vendorsRaw]);
  
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('vendors');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [backgroundSyncing, setBackgroundSyncing] = useState(false);

  // Load fresh data from Supabase in background (no loading screen!)
  useEffect(() => {
    if (!loaded) return; // Wait for IndexedDB to load first
    
    const syncFromSupabase = async () => {
      try {
        setBackgroundSyncing(true);
        const supabase = getSupabase();
        
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        // Query vendors from Supabase
        const { data, error } = await supabase
          .from('vendors')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          // Silent fail for table not found errors
          if (error.code === 'PGRST301' || error.message.includes('JWT') || error.message.includes('schema cache')) {
            return;
          }
          throw error;
        }

        await setVendors(data || []);
      } catch (error: any) {
        console.error('Background sync error for vendors:', error);
      } finally {
        setBackgroundSyncing(false);
      }
    };

    syncFromSupabase();
  }, [loaded, setVendors]);

  // Listen for sync completion events to reload data after sync
  useEffect(() => {
    const handleDataSynced = () => {
      // Reload vendors after sync to show newly synced data
      const syncFromSupabase = async () => {
        try {
          const supabase = getSupabase();
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;
          
          const { data, error } = await supabase
            .from('vendors')
            .select('*')
            .order('name', { ascending: true });

          if (error) {
            if (error.code === 'PGRST301' || error.message.includes('JWT') || error.message.includes('schema cache')) {
              return;
            }
            throw error;
          }

          // Parse specialization fields from JSON strings
          const parsedData = (data || []).map((vendor: any) => {
            if (vendor.specialization && typeof vendor.specialization === 'string') {
              try {
                vendor.specialization = JSON.parse(vendor.specialization);
              } catch {
                // If parsing fails, try comma-separated
                vendor.specialization = vendor.specialization.split(',').map((s: string) => s.trim()).filter(Boolean);
              }
            }
            return vendor;
          });
          await setVendors(parsedData);
        } catch (error: any) {
          console.error('Background sync error for vendors:', error);
        }
      };
      syncFromSupabase();
    };

    window.addEventListener('data-synced', handleDataSynced);
    
    return () => {
      window.removeEventListener('data-synced', handleDataSynced);
    };
  }, [setVendors]);

  useEffect(() => {
    filterVendors();
  }, [searchQuery, statusFilter, vendors]);

  const refreshVendors = async () => {
    // Manual refresh - show toast
    try {
      setBackgroundSyncing(true);
      const supabase = getSupabase();
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Not Authenticated',
          description: 'Please log in to refresh vendors.',
          variant: 'destructive',
        });
        return;
      }
      
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      await setVendors(data || []);
      
      toast({
        title: 'Refreshed',
        description: 'Vendors updated successfully.',
      });
    } catch (error: any) {
      console.error('Error refreshing vendors:', error);
      if (!error?.message?.includes('JWT') && error?.code !== 'PGRST301') {
        toast({
          title: 'Error',
          description: 'Failed to refresh vendors.',
          variant: 'destructive',
        });
      }
    } finally {
      setBackgroundSyncing(false);
    }
  };

  const filterVendors = () => {
    let filtered = [...vendors];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(vendor =>
        vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.phone.includes(searchQuery) ||
        vendor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.gst_number?.includes(searchQuery)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(vendor => vendor.status === statusFilter);
    }

    setFilteredVendors(filtered);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) return;

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local storage immediately
      await setVendors(vendors.filter(v => v.id !== id));
      
      toast({
        title: 'Success',
        description: 'Vendor deleted successfully.',
      });
    } catch (error: any) {
      console.error('Error deleting vendor:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete vendor. They may have associated purchase orders.',
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

  const getVendorTypeInfo = (type: string) => {
    return vendorTypeConfig[type as keyof typeof vendorTypeConfig] || vendorTypeConfig.other;
  };

  const getStatusInfo = (status: string) => {
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
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
    total: vendors.length,
    active: vendors.filter(v => v.status === 'active').length,
    totalPurchases: vendors.reduce((sum, v) => sum + (v.total_purchases || 0), 0),
    outstanding: vendors.reduce((sum, v) => sum + (v.outstanding_balance || 0), 0),
  };

  // No loading screen - show UI immediately with cached data from IndexedDB!
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendor Management</h1>
          <p className="text-muted-foreground mt-1">Manage suppliers, purchase orders, and invoices</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          New Vendor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Total Vendors"
          value={stats.total}
          icon={Building2}
          color="bg-blue-500"
        />
        <StatCard
          title="Active Vendors"
          value={stats.active}
          icon={TrendingUp}
          color="bg-green-500"
        />
        <StatCard
          title="Total Purchases"
          value={formatCurrency(stats.totalPurchases)}
          icon={ShoppingCart}
          color="bg-purple-500"
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(stats.outstanding)}
          icon={DollarSign}
          color="bg-orange-500"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vendors">
            <Building2 className="mr-2 h-4 w-4" />
            Vendors ({vendors.length})
          </TabsTrigger>
          <TabsTrigger value="purchase-orders">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Purchase Orders
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <FileText className="mr-2 h-4 w-4" />
            Supplier Invoices
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="mr-2 h-4 w-4" />
            Payments
          </TabsTrigger>
        </TabsList>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="mt-6 space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by name, phone, email, or GST number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={statusFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('all')}
                    size="sm"
                  >
                    All
                  </Button>
                  <Button
                    variant={statusFilter === 'active' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('active')}
                    size="sm"
                  >
                    Active
                  </Button>
                  <Button
                    variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('inactive')}
                    size="sm"
                  >
                    Inactive
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vendors List */}
          {filteredVendors.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Vendors Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Try adjusting your search criteria' : 'Create your first vendor to get started'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Vendor
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredVendors.map((vendor) => {
                const statusInfo = getStatusInfo(vendor.status);
                const typeInfo = getVendorTypeInfo(vendor.vendor_type);

                return (
                  <Card key={vendor.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          {/* Header Row */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-lg font-semibold">{vendor.name}</h3>
                            <Badge className={statusInfo.color}>
                              {statusInfo.label}
                            </Badge>
                            <Badge variant="outline">
                              <span className="mr-1">{typeInfo.icon}</span>
                              {typeInfo.label}
                            </Badge>
                            {vendor.outstanding_balance > 0 && (
                              <Badge variant="destructive">
                                Outstanding: {formatCurrency(vendor.outstanding_balance)}
                              </Badge>
                            )}
                          </div>

                          {/* Contact Info */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            {vendor.contact_person && (
                              <div>👤 {vendor.contact_person}</div>
                            )}
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {vendor.phone}
                            </div>
                            {vendor.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                {vendor.email}
                              </div>
                            )}
                            {vendor.gst_number && (
                              <div className="font-mono">
                                GST: {vendor.gst_number}
                              </div>
                            )}
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-6 text-sm">
                            <div>
                              <span className="text-muted-foreground">Total Purchases:</span>
                              <span className="ml-2 font-semibold">{formatCurrency(vendor.total_purchases)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Purchase Orders:</span>
                              <span className="ml-2 font-semibold">{vendor.purchase_order_count || 0}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Invoices:</span>
                              <span className="ml-2 font-semibold">{vendor.invoice_count || 0}</span>
                              {vendor.outstanding_invoice_count > 0 && (
                                <span className="ml-1 text-orange-600">({vendor.outstanding_invoice_count} unpaid)</span>
                              )}
                            </div>
                          </div>

                          {/* Specialization */}
                          {(() => {
                            // Parse specialization if it's a JSON string
                            let specializationArray: string[] = [];
                            if (vendor.specialization) {
                              if (typeof vendor.specialization === 'string') {
                                try {
                                  specializationArray = JSON.parse(vendor.specialization);
                                } catch {
                                  // If parsing fails, treat as comma-separated string
                                  specializationArray = vendor.specialization.split(',').map(s => s.trim()).filter(Boolean);
                                }
                              } else if (Array.isArray(vendor.specialization)) {
                                specializationArray = vendor.specialization;
                              }
                            }
                            
                            return specializationArray.length > 0 ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-muted-foreground">Specialization:</span>
                                {specializationArray.map((spec, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {spec}
                                  </Badge>
                                ))}
                              </div>
                            ) : null;
                          })()}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedVendor(vendor);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(vendor.id)}
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

        {/* Purchase Orders Tab */}
        <TabsContent value="purchase-orders" className="mt-6">
          <PurchaseOrdersTab vendors={vendors} onUpdate={refreshVendors} />
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="mt-6">
          <SupplierInvoicesTab vendors={vendors} onUpdate={refreshVendors} />
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardContent className="p-12 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Payments Management</h3>
              <p className="text-muted-foreground">
                Payment tracking and history will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddVendorDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={refreshVendors}
      />

      {selectedVendor && (
        <VendorDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          vendor={selectedVendor}
          onSuccess={refreshVendors}
        />
      )}
    </div>
  );
}

