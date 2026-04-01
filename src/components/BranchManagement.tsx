import { useState, useEffect } from "react";
import { Landmark, Plus, Edit2, MapPin, Phone, Mail, Building2, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getFromSupabase, upsertToSupabase } from "@/lib/supabaseDirect";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getSupabase } from "@/lib/supabase";

interface Location {
  id: string;
  company_id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  manager_id?: string;
  created_at?: string;
}

interface Company {
  id: string;
  name: string;
  description: string;
}

export const BranchManagement = () => {
  const { toast } = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Partial<Location> | null>(null);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user?.user_metadata?.company_id) {
        // If no company exists, we might need to create one first
        // But for now, just show empty
        setLoading(false);
        return;
      }

      // Fetch Company
      const companies = await getFromSupabase<Company>('companies', { id: session.user.user_metadata.company_id });
      if (companies.length > 0) {
        setCompany(companies[0]);
      }

      // Fetch Locations
      const data = await getFromSupabase<Location>('locations');
      setLocations(data);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast({
        title: "Error",
        description: "Failed to load branch data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleCreateCompany = async (name: string) => {
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const companyId = `comp_${Date.now()}`;
      await upsertToSupabase('companies', {
        id: companyId,
        name: name,
        owner_id: session.user.id
      });

      // Update user metadata to link to company
      await supabase.auth.updateUser({
        data: { company_id: companyId, role: 'owner' }
      });

      toast({
        title: "Company Created",
        description: "Your business profile is now active."
      });
      
      fetchBranches();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create company.",
        variant: "destructive"
      });
    }
  };

  const handleSaveLocation = async () => {
    if (!editingLocation?.name) {
      toast({ title: "Validation Error", description: "Branch name is required.", variant: "destructive" });
      return;
    }

    try {
      const isNew = !editingLocation.id;
      const id = isNew ? `loc_${Date.now()}` : editingLocation.id;
      
      await upsertToSupabase('locations', {
        ...editingLocation,
        id,
        company_id: company?.id
      });

      toast({
        title: isNew ? "Branch Added" : "Branch Updated",
        description: `${editingLocation.name} has been ${isNew ? 'registered' : 'modified'}.`
      });
      
      setIsDialogOpen(false);
      setEditingLocation(null);
      fetchBranches();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save branch.",
        variant: "destructive"
      });
    }
  };

  const handleSwitchBranch = async (locationId: string) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.updateUser({
        data: { location_id: locationId }
      });

      if (error) throw error;

      toast({
        title: "Branch Switched",
        description: "Your session context has been updated. Data is now filtered for this location."
      });
      
      // Reload to ensure all components refresh with new location context
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to switch branch.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <Card className="border-dashed border-2">
        <CardHeader className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <CardTitle>Setup Your Company</CardTitle>
          <CardDescription>First, register your business to start adding branches.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">
           <div className="flex w-full max-w-sm items-center space-x-2">
            <Input id="comp-name" placeholder="Business Name" />
            <Button onClick={() => {
              const input = document.getElementById('comp-name') as HTMLInputElement;
              handleCreateCompany(input.value);
            }}>Initialize</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="h-6 w-6 text-primary" />
            Manage Branches
          </h3>
          <p className="text-muted-foreground">Branches for {company.name}</p>
        </div>
        <Button onClick={() => {
          setEditingLocation({});
          setIsDialogOpen(true);
        }} className="gap-2 bg-yellow-600 hover:bg-yellow-700">
          <Plus className="h-4 w-4" />
          Add Branch
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map((loc) => (
          <Card key={loc.id} className="relative overflow-hidden group hover:border-primary/50 transition-all">
            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="ghost" onClick={() => {
                setEditingLocation(loc);
                setIsDialogOpen(true);
              }}>
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-center">
                <span>{loc.name}</span>
                {loc.id === company.id && <Badge variant="secondary">Main</Badge>}
              </CardTitle>
              <CardDescription className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {loc.address || "No address set"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                {loc.phone || "No phone"}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {loc.email || "No email"}
              </div>
              <div className="pt-2">
                 <Button 
                   variant="outline" 
                   className="w-full justify-between group/btn" 
                   onClick={() => handleSwitchBranch(loc.id)}
                 >
                   Switch to Branch
                   <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                 </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {locations.length === 0 && (
          <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border-2 border-dashed">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No branches found. Connect your first showroom.</p>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingLocation?.id ? 'Edit Branch' : 'Add New Branch'}</DialogTitle>
            <DialogDescription>
              Enter details for your showroom. Each additional branch costs ₹6,000/year.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="branchName">Branch Name</Label>
              <Input 
                id="branchName" 
                value={editingLocation?.name || ''} 
                onChange={e => setEditingLocation({...editingLocation, name: e.target.value})}
                placeholder="Central Showroom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branchAddress">Address</Label>
              <Input 
                id="branchAddress" 
                value={editingLocation?.address || ''} 
                onChange={e => setEditingLocation({...editingLocation, address: e.target.value})}
                placeholder="Market Area, City"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label htmlFor="branchPhone">Phone</Label>
                <Input 
                  id="branchPhone" 
                  value={editingLocation?.phone || ''} 
                  onChange={e => setEditingLocation({...editingLocation, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branchEmail">Email</Label>
                <Input 
                  id="branchEmail" 
                  value={editingLocation?.email || ''} 
                  onChange={e => setEditingLocation({...editingLocation, email: e.target.value})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveLocation} className="w-full bg-yellow-600 hover:bg-yellow-700">
              {editingLocation?.id ? 'Update Branch' : 'Register Branch (₹6,000)'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
