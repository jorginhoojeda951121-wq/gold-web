import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RawMaterial } from "./AddCraftsmanDialog";

interface MaterialAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  craftsmanName: string;
  onAssign: (material: Omit<RawMaterial, 'id'>) => void;
}

export const MaterialAssignDialog = ({ open, onOpenChange, craftsmanName, onAssign }: MaterialAssignDialogProps) => {
  const [formData, setFormData] = useState({
    type: "",
    quantity: "",
    unit: "",
    projectId: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type || !formData.quantity || !formData.unit) {
      return;
    }

    const newMaterial: Omit<RawMaterial, 'id'> = {
      type: formData.type,
      quantity: parseFloat(formData.quantity),
      unit: formData.unit,
      assignedDate: new Date().toISOString().split('T')[0],
      projectId: formData.projectId || undefined
    };

    onAssign(newMaterial);
    setFormData({
      type: "",
      quantity: "",
      unit: "",
      projectId: ""
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-green-600">
            Assign Raw Material to {craftsmanName}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="projectId">Project ID (Optional)</Label>
            <Input
              id="projectId"
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              placeholder="Enter project ID"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Assign Material
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};