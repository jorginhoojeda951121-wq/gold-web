import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export interface Craftsman {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  currentProjects: number;
  status: 'active' | 'busy' | 'available';
  contact: string;
  assignedMaterials: RawMaterial[];
}

export interface RawMaterial {
  id: string;
  type: string;
  quantity: number;
  unit: string;
  assignedDate: string;
  projectId?: string;
  completed?: boolean;
  completedDate?: string;
  completionNotes?: string;
}

interface AddCraftsmanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (craftsman: Omit<Craftsman, 'id'>) => void;
}

export const AddCraftsmanDialog = ({ open, onOpenChange, onAdd }: AddCraftsmanDialogProps) => {
  const [formData, setFormData] = useState<{
    name: string;
    specialty: string;
    experience: string;
    contact: string;
    status: 'active' | 'busy' | 'available';
  }>({
    name: "",
    specialty: "",
    experience: "",
    contact: "",
    status: "available"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.specialty || !formData.experience || !formData.contact) {
      return;
    }

    const newCraftsman: Omit<Craftsman, 'id'> = {
      ...formData,
      currentProjects: 0,
      assignedMaterials: []
    };

    onAdd(newCraftsman);
    setFormData({
      name: "",
      specialty: "",
      experience: "",
      contact: "",
      status: "available"
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-green-600">Add New Craftsman</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter craftsman name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialty">Specialty</Label>
            <Select
              value={formData.specialty}
              onValueChange={(value) => setFormData({ ...formData, specialty: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select specialty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Gold Jewelry">Gold Jewelry</SelectItem>
                <SelectItem value="Diamond Setting">Diamond Setting</SelectItem>
                <SelectItem value="Stone Cutting">Stone Cutting</SelectItem>
                <SelectItem value="Traditional Designs">Traditional Designs</SelectItem>
                <SelectItem value="Chain Making">Chain Making</SelectItem>
                <SelectItem value="Ring Making">Ring Making</SelectItem>
                <SelectItem value="Earring Crafting">Earring Crafting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience">Experience</Label>
            <Input
              id="experience"
              value={formData.experience}
              onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
              placeholder="e.g., 10 years"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contact Number</Label>
            <Input
              id="contact"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              placeholder="+91 9876543210"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Initial Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => 
                setFormData({ ...formData, status: value as 'active' | 'busy' | 'available' })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
              </SelectContent>
            </Select>
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
              Add Craftsman
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};