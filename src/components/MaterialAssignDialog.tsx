import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RawMaterial } from "./AddCraftsmanDialog";
import { getUserData } from "@/lib/userStorage";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MaterialAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  craftsmanName: string;
  onAssign: (material: Omit<RawMaterial, 'id'>) => void;
}

interface InventoryItem {
  id: string;
  name: string;
  item_type?: string;
  type?: string;
  category?: string;
  price?: number;
  stock?: number;
  inStock?: number;
}

export const MaterialAssignDialog = ({ open, onOpenChange, craftsmanName, onAssign }: MaterialAssignDialogProps) => {
  const [assignmentType, setAssignmentType] = useState<'raw_material' | 'inventory_item'>('raw_material');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventorySearchQuery, setInventorySearchQuery] = useState("");
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    type: "",
    quantity: "",
    unit: "",
    projectId: "",
    agreedAmount: "",
    estimatedDelivery: ""
  });

  // Load inventory items when dialog opens
  useEffect(() => {
    if (open && assignmentType === 'inventory_item') {
      loadInventoryItems();
    }
  }, [open, assignmentType]);

  const loadInventoryItems = async () => {
    try {
      const inventoryData = await getUserData<any[]>('inventory_items') || [];
      setInventoryItems(inventoryData);
    } catch (error) {
      console.error('Error loading inventory items:', error);
    }
  };

  const filteredInventoryItems = useMemo(() => {
    if (!inventorySearchQuery) return inventoryItems;
    const query = inventorySearchQuery.toLowerCase();
    return inventoryItems.filter(item =>
      item.name?.toLowerCase().includes(query) ||
      item.item_type?.toLowerCase().includes(query) ||
      item.type?.toLowerCase().includes(query) ||
      item.category?.toLowerCase().includes(query)
    );
  }, [inventoryItems, inventorySearchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (assignmentType === 'raw_material') {
      if (!formData.type || !formData.quantity || !formData.unit) {
        return;
      }

      const newMaterial: Omit<RawMaterial, 'id'> = {
        type: formData.type,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        assignedDate: new Date().toISOString().split('T')[0],
        projectId: formData.projectId || undefined,
        agreedAmount: formData.agreedAmount ? parseFloat(formData.agreedAmount) : undefined,
        amountPaid: 0,
        paymentStatus: 'unpaid',
        assignmentType: 'raw_material',
        estimatedDelivery: formData.estimatedDelivery || undefined,
        status: 'pending'
      };

      onAssign(newMaterial);
    } else {
      // Inventory item assignment
      if (!selectedInventoryItem || !formData.quantity) {
        return;
      }

      const itemType = selectedInventoryItem.item_type || 
        (selectedInventoryItem.category === 'stones' ? 'stone' :
         selectedInventoryItem.category === 'gold' ? 'gold' :
         selectedInventoryItem.category === 'artificial' ? 'artificial' :
         selectedInventoryItem.type === 'Gold Bar' ? 'gold' :
         selectedInventoryItem.type === 'Gemstone' ? 'stone' : 'jewelry');

      const newMaterial: Omit<RawMaterial, 'id'> = {
        type: selectedInventoryItem.name || 'Inventory Item',
        quantity: parseFloat(formData.quantity) || 1,
        unit: 'pieces',
        assignedDate: new Date().toISOString().split('T')[0],
        projectId: formData.projectId || undefined,
        agreedAmount: formData.agreedAmount ? parseFloat(formData.agreedAmount) : undefined,
        amountPaid: 0,
        paymentStatus: 'unpaid',
        assignmentType: 'inventory_item',
        inventoryItemId: selectedInventoryItem.id,
        inventoryItemName: selectedInventoryItem.name,
        inventoryItemType: itemType,
        estimatedDelivery: formData.estimatedDelivery || undefined,
        status: 'pending'
      };

      onAssign(newMaterial);
    }

    // Reset form
    setFormData({
      type: "",
      quantity: "",
      unit: "",
      projectId: "",
      agreedAmount: "",
      estimatedDelivery: ""
    });
    setSelectedInventoryItem(null);
    setInventorySearchQuery("");
    setAssignmentType('raw_material');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-green-600">
            Assign Item to {craftsmanName}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Assignment Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="assignmentType">Assignment Type</Label>
            <Select
              value={assignmentType}
              onValueChange={(value: 'raw_material' | 'inventory_item') => {
                setAssignmentType(value);
                setSelectedInventoryItem(null);
                setInventorySearchQuery("");
                setFormData({
                  type: "",
                  quantity: "",
                  unit: "",
                  projectId: "",
                  agreedAmount: ""
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="raw_material">Raw Material</SelectItem>
                <SelectItem value="inventory_item">Inventory Item</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {assignmentType === 'raw_material' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="type">Material Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select material type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gold 24K">Gold 24K</SelectItem>
                    <SelectItem value="Gold 22K">Gold 22K</SelectItem>
                    <SelectItem value="Gold 18K">Gold 18K</SelectItem>
                    <SelectItem value="Silver">Silver</SelectItem>
                    <SelectItem value="Platinum">Platinum</SelectItem>
                    <SelectItem value="Diamond">Diamond</SelectItem>
                    <SelectItem value="Ruby">Ruby</SelectItem>
                    <SelectItem value="Emerald">Emerald</SelectItem>
                    <SelectItem value="Sapphire">Sapphire</SelectItem>
                    <SelectItem value="Pearl">Pearl</SelectItem>
                    <SelectItem value="Copper Wire">Copper Wire</SelectItem>
                    <SelectItem value="Brass">Brass</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="Enter quantity"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grams">Grams</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="pieces">Pieces</SelectItem>
                    <SelectItem value="carats">Carats</SelectItem>
                    <SelectItem value="ounces">Ounces</SelectItem>
                    <SelectItem value="meters">Meters</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              {/* Inventory Item Selection */}
              <div className="space-y-2">
                <Label htmlFor="inventorySearch">Search Inventory Items</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="inventorySearch"
                    type="text"
                    value={inventorySearchQuery}
                    onChange={(e) => setInventorySearchQuery(e.target.value)}
                    placeholder="Search by name, type, or category..."
                    className="pl-10"
                  />
                </div>
              </div>

              {inventorySearchQuery && (
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                  {filteredInventoryItems.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No items found</p>
                  ) : (
                    filteredInventoryItems.map((item) => {
                      const itemType = item.item_type || 
                        (item.category === 'stones' ? 'stone' :
                         item.category === 'gold' ? 'gold' :
                         item.category === 'artificial' ? 'artificial' :
                         item.type === 'Gold Bar' ? 'gold' :
                         item.type === 'Gemstone' ? 'stone' : 'jewelry');
                      
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedInventoryItem(item)}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedInventoryItem?.id === item.id
                              ? 'bg-green-50 border-green-500'
                              : 'hover:bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {itemType}
                                </Badge>
                                {item.price && (
                                  <span className="text-xs text-gray-500">
                                    ₹{item.price.toLocaleString()}
                                  </span>
                                )}
                                {(item.stock !== undefined || item.inStock !== undefined) && (
                                  <span className="text-xs text-gray-500">
                                    Stock: {item.stock ?? item.inStock ?? 0}
                                  </span>
                                )}
                              </div>
                            </div>
                            {selectedInventoryItem?.id === item.id && (
                              <div className="text-green-600">✓</div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {selectedInventoryItem && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">
                    Selected: {selectedInventoryItem.name}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {selectedInventoryItem.item_type || selectedInventoryItem.type || 'Inventory Item'}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="1"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="Enter quantity (pieces)"
                  required
                />
                <p className="text-xs text-gray-500">
                  Number of items to assign
                </p>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="projectId">Project ID (Optional)</Label>
            <Input
              id="projectId"
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              placeholder="Enter project ID"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedDelivery">Estimated Delivery Date (Optional)</Label>
            <Input
              id="estimatedDelivery"
              type="date"
              value={formData.estimatedDelivery}
              onChange={(e) => setFormData({ ...formData, estimatedDelivery: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-gray-500">
              Expected completion date for this task
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agreedAmount">Agreed Amount (₹) (Optional)</Label>
            <Input
              id="agreedAmount"
              type="number"
              step="0.01"
              value={formData.agreedAmount}
              onChange={(e) => setFormData({ ...formData, agreedAmount: e.target.value })}
              placeholder="Enter agreed payment amount"
            />
            <p className="text-xs text-gray-500">
              Amount to be paid to craftsman for this work
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setFormData({
                  type: "",
                  quantity: "",
                  unit: "",
                  projectId: "",
                  agreedAmount: "",
                  estimatedDelivery: ""
                });
                setSelectedInventoryItem(null);
                setInventorySearchQuery("");
                setAssignmentType('raw_material');
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={
                assignmentType === 'raw_material' 
                  ? !formData.type || !formData.quantity || !formData.unit
                  : !selectedInventoryItem || !formData.quantity
              }
            >
              {assignmentType === 'raw_material' ? 'Assign Material' : 'Assign Item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
