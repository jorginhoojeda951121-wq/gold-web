import { useState, useEffect } from "react";
import { ArrowLeftRight, Plus, CheckCircle2, Clock, XCircle, Search, MapPin, Package, ArrowRight, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getFromSupabase, upsertToSupabase } from "@/lib/supabaseDirect";
import { getSupabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  stock: number;
  weight?: number;
  barcode?: string;
  location_id: string;
  company_id: string;
}

interface Location {
  id: string;
  name: string;
  company_id: string;
}

interface StockTransferRecord {
  id: string;
  item_id: string;
  item_name: string;
  category?: string;
  from_location_id: string;
  to_location_id: string;
  quantity: number;
  weight?: number;
  status: "pending" | "completed" | "cancelled" | "rejected";
  transfer_date: string;
  received_date?: string;
  notes?: string;
}

const StockTransfer = () => {
  const { toast } = useToast();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [transfers, setTransfers] = useState<StockTransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
  
  // New Transfer State
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [destinationLocation, setDestinationLocation] = useState<string>("");
  const [transferQty, setTransferQty] = useState<string>("1");
  const [transferNotes, setTransferNotes] = useState<string>("");
  const [transferring, setTransferring] = useState(false);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;
      
      const locId = session.user.user_metadata?.location_id;
      setCurrentLocationId(locId);

      // Fetch Locations for the same company
      const allLocations = await getFromSupabase<Location>('locations');
      setLocations(allLocations);

      // Fetch Inventory for current location
      const stock = await getFromSupabase<InventoryItem>('inventory');
      setInventory(stock.filter(item => item.stock > 0));

      const allTransfers = await getFromSupabase<StockTransferRecord>('stock_transfers');
      const relevant = currentLocationId
        ? allTransfers.filter(
            (t) => t.from_location_id === currentLocationId || t.to_location_id === currentLocationId
          )
        : allTransfers;
      setTransfers(
        relevant.sort((a, b) => new Date(b.transfer_date).getTime() - new Date(a.transfer_date).getTime())
      );

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: "Error", description: "Failed to load stock data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleTransfer = async () => {
    if (!selectedItem || !destinationLocation || !transferQty) {
      toast({ title: "Validation Error", description: "Please enter all transfer details.", variant: "destructive" });
      return;
    }

    const item = inventory.find(i => i.id === selectedItem);
    const qty = parseFloat(transferQty);

    if (!item || qty <= 0 || qty > item.stock) {
      toast({ title: "Invalid Quantity", description: `You only have ${item?.stock || 0} in stock.`, variant: "destructive" });
      return;
    }

    const sourceItem = item as InventoryItem;

    if (destinationLocation === currentLocationId) {
      toast({ title: "Invalid Destination", description: "Source and destination cannot be the same.", variant: "destructive" });
      return;
    }

    if (!currentLocationId) {
      toast({
        title: "Branch required",
        description: "Assign a branch to your account in settings before transferring stock.",
        variant: "destructive",
      });
      return;
    }

    try {
      setTransferring(true);
      const transferId = `trf_${Date.now()}`;
      
      // 1. Create Transfer Record in 'pending' state
      await upsertToSupabase('stock_transfers', {
        id: transferId,
        item_id: sourceItem.id,
        item_name: sourceItem.name,
        category: sourceItem.category,
        from_location_id: currentLocationId,
        to_location_id: destinationLocation,
        quantity: qty,
        weight: sourceItem.weight ? (sourceItem.weight / sourceItem.stock) * qty : 0, 
        status: 'pending', // Items are now in transit
        transfer_date: new Date().toISOString(),
        notes: transferNotes
      });

      // 2. Decrement Source Stock Immediately
      await upsertToSupabase('inventory', {
        ...sourceItem,
        stock: sourceItem.stock - qty,
        updated_at: new Date().toISOString()
      });

      toast({
        title: "Transfer Initiated",
        description: `Sent ${qty}x ${sourceItem.name} to ${locations.find(l => l.id === destinationLocation)?.name}. Awaiting receipt.`
      });

      setIsDialogOpen(false);
      resetForm();
      fetchInitialData();
    } catch (error) {
      console.error('Transfer failed:', error);
      toast({ title: "Transfer Failed", description: "Could not process inventory movement.", variant: "destructive" });
    } finally {
      setTransferring(false);
    }
  };

  const handleReceive = async (trf: StockTransferRecord) => {
    if (!currentLocationId || trf.to_location_id !== currentLocationId) {
      toast({ title: "Cannot receive", description: "You can only receive transfers for your current branch.", variant: "destructive" });
      return;
    }

    try {
      setTransferring(true);

      // Source row lives at sending branch — must bypass location filter
      const sourceItems = await getFromSupabase<InventoryItem>(
        "inventory",
        { id: trf.item_id },
        "*",
        { ignoreLocation: true }
      );
      const itemTemplate = sourceItems[0];

      const destFilter: Record<string, string> = {};
      if (itemTemplate?.barcode) {
        destFilter.barcode = itemTemplate.barcode;
      } else {
        destFilter.name = trf.item_name;
        if (trf.category) destFilter.category = trf.category;
      }

      const destItems = await getFromSupabase<InventoryItem>("inventory", destFilter);

      if (destItems.length > 0) {
        await upsertToSupabase("inventory", {
          ...destItems[0],
          stock: destItems[0].stock + trf.quantity,
          updated_at: new Date().toISOString(),
        });
      } else if (itemTemplate) {
        await upsertToSupabase("inventory", {
          ...itemTemplate,
          id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          location_id: currentLocationId,
          stock: trf.quantity,
          updated_at: new Date().toISOString(),
        });
      } else {
        await upsertToSupabase("inventory", {
          id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          name: trf.item_name,
          category: trf.category || "jewelry",
          subcategory: "General",
          price: 0,
          stock: trf.quantity,
          description: `Received via transfer ${trf.id}`,
          updated_at: new Date().toISOString(),
        });
      }

      // 2. Mark transfer as completed
      await upsertToSupabase('stock_transfers', {
        ...trf,
        status: 'completed',
        received_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      toast({ title: "Inbound Success", description: `Received ${trf.quantity}x ${trf.item_name} into stock.` });
      fetchInitialData();
    } catch (error) {
      console.error('Receipt failed:', error);
      toast({ title: "Error", description: "Could not process inbound stock.", variant: "destructive" });
    } finally {
      setTransferring(false);
    }
  };

  const resetForm = () => {
    setSelectedItem("");
    setDestinationLocation("");
    setTransferQty("1");
    setTransferNotes("");
  };

  const getLocationName = (id: string) => locations.find(l => l.id === id)?.name || "Unknown";

  if (loading) {
    return <div className="flex justify-center p-12"><div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-elegant p-4 md:p-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <ArrowLeftRight className="h-8 w-8 text-primary" />
            Stock Transfer
          </h1>
          <p className="text-muted-foreground">Manage inter-branch inventory logistics</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-gold hover:bg-gold-dark text-primary shadow-gold transition-smooth gap-2">
          <Plus className="h-5 w-5" />
          New Transfer
        </Button>
      </header>

      <main className="space-y-6">
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8 h-12">
            <TabsTrigger value="history" className="gap-2 h-10">
              <History className="h-4 w-4" />
              Transfer Log
            </TabsTrigger>
            <TabsTrigger value="available" className="gap-2 h-10">
              <Package className="h-4 w-4" />
              Available to Move
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <Card className="border-border/50 shadow-elegant">
              <CardHeader>
                <CardTitle>Logistics History</CardTitle>
                <CardDescription>Movement of items across all registered locations.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transfers.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <ArrowLeftRight className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      No transfer history found.
                    </div>
                  ) : (
                    transfers.map(trf => (
                      <div key={trf.id} className="flex items-center justify-between p-4 rounded-xl border border-border/40 hover:bg-accent/5 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "p-3 rounded-full flex items-center justify-center",
                            trf.from_location_id === currentLocationId ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                          )}>
                             {trf.from_location_id === currentLocationId ? <Package className="h-5 w-5 translate-x-[2px]" /> : <Package className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-2">
                              {trf.item_name} 
                              <Badge variant="outline" className="text-[10px] uppercase font-bold py-0">{trf.quantity}x</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                              <span className="font-medium text-red-400">{getLocationName(trf.from_location_id)}</span>
                              <ArrowRight className="h-3 w-3" />
                              <span className="font-medium text-green-400">{getLocationName(trf.to_location_id)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <div className="text-sm font-medium text-foreground">{new Date(trf.transfer_date).toLocaleDateString()}</div>
                          <div className="flex items-center gap-2">
                            <Badge variant={trf.status === 'completed' ? 'default' : 'secondary'}>
                              {trf.status === 'pending' ? <Clock className="h-3 w-3 mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                              {trf.status}
                            </Badge>
                            {trf.status === 'pending' && trf.to_location_id === currentLocationId && (
                              <Button 
                                size="sm" 
                                className="h-7 px-2 text-[10px] bg-green-600 hover:bg-green-700"
                                onClick={() => handleReceive(trf)}
                                disabled={transferring}
                              >
                                Receive
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="available">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inventory.map(item => (
                <Card key={item.id} className="hover:border-primary/50 transition-all group overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <Badge variant="secondary">{item.category}</Badge>
                    </div>
                    <CardDescription>{item.subcategory}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-muted-foreground uppercase tracking-widest font-bold text-[10px]">Stock Balance</div>
                      <div className="text-2xl font-bold text-primary">{item.stock}</div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full gap-2 border-primary/20 hover:border-primary/50"
                      onClick={() => {
                        setSelectedItem(item.id);
                        setIsDialogOpen(true);
                      }}
                    >
                      <ArrowRight className="h-4 w-4" />
                      Initiate Transfer
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Initiate Stock Transfer</DialogTitle>
            <DialogDescription>Move items from {getLocationName(currentLocationId || "")} to another branch.</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label>Select Item</Label>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger>
                  <SelectValue placeholder="Which product?" />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.stock} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Destination Branch</Label>
                <Select value={destinationLocation} onValueChange={setDestinationLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.filter(l => l.id !== currentLocationId).map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" value={transferQty} onChange={e => setTransferQty(e.target.value)} min="1" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Internal Notes</Label>
              <Input value={transferNotes} onChange={e => setTransferNotes(e.target.value)} placeholder="Reason for transfer..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleTransfer} disabled={transferring} className="bg-primary hover:bg-primary/90 min-w-[120px]">
              {transferring ? "Processing..." : "Complete Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper function for class names
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

export default StockTransfer;
