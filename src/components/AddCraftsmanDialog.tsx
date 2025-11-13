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
  // Firm Type Fields
  type?: 'individual' | 'firm';   // Type of craftsman: individual person or firm/company
  firmName?: string;               // Name of firm (if type is 'firm')
  firmContact?: string;            // Firm's primary contact number (if different from individual contact)
  firmAddress?: string;            // Firm's business address
  firmGSTNumber?: string;          // Firm's GST registration number (for invoicing)
  contactPerson?: string;          // Contact person name (if type is 'firm')
  // Payment Tracking Fields
  totalAmountDue?: number;        // Total amount to be paid for all work
  totalAmountPaid?: number;       // Total amount already paid
  pendingAmount?: number;         // Amount still pending (due - paid)
  paymentHistory?: PaymentRecord[]; // History of all payments
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
  // Payment tracking per project/material
  agreedAmount?: number;          // Amount agreed for this work
  amountPaid?: number;            // Amount paid for this specific work
  paymentStatus?: 'unpaid' | 'partial' | 'paid'; // Payment status
}

export interface PaymentRecord {
  id: string;
  craftsmanId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque';
  projectId?: string;             // Optional: Link to specific project
  description: string;
  receiptNumber?: string;
  notes?: string;
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
    type: 'individual' | 'firm';
    firmName: string;
    firmContact: string;
    firmAddress: string;
    firmGSTNumber: string;
    contactPerson: string;
  }>({
    name: "",
    specialty: "",
    experience: "",
    contact: "",
    status: "available",
    type: "individual",
    firmName: "",
    firmContact: "",
    firmAddress: "",
    firmGSTNumber: "",
    contactPerson: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.specialty || !formData.experience || !formData.contact) {
      return;
    }

    const newCraftsman: Omit<Craftsman, 'id'> = {
      name: formData.name,
      specialty: formData.specialty,
      experience: formData.experience,
      contact: formData.contact,
      status: formData.status,
      currentProjects: 0,
      assignedMaterials: [],
      // Firm type fields
      type: formData.type,
      ...(formData.type === 'firm' && {
        firmName: formData.firmName || undefined,
        firmContact: formData.firmContact || undefined,
        firmAddress: formData.firmAddress || undefined,
        firmGSTNumber: formData.firmGSTNumber || undefined,
        contactPerson: formData.contactPerson || undefined,
      }),
      // Initialize payment tracking fields
      totalAmountDue: 0,
      totalAmountPaid: 0,
      pendingAmount: 0,
      paymentHistory: []
    };

    onAdd(newCraftsman);
    setFormData({
      name: "",
      specialty: "",
      experience: "",
      contact: "",
      status: "available",
      type: "individual",
      firmName: "",
      firmContact: "",
      firmAddress: "",
      firmGSTNumber: "",
      contactPerson: ""
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-green-600">Add New Craftsman</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Craftsman Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="type">Craftsman Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => 
                setFormData({ ...formData, type: value as 'individual' | 'firm' })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual Craftsman</SelectItem>
                <SelectItem value="firm">Firm / Company</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {formData.type === 'individual' 
                ? 'Select for individual craftsman' 
                : 'Select for a firm or company providing craftsmanship services'}
            </p>
          </div>

          {/* Name field - changes label based on type */}
          <div className="space-y-2">
            <Label htmlFor="name">
              {formData.type === 'individual' ? 'Full Name' : 'Firm Name'}
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={formData.type === 'individual' ? 'Enter craftsman name' : 'Enter firm name'}
              required
            />
          </div>

          {/* Contact Person (only for firms) */}
          {formData.type === 'firm' && (
            <div className="space-y-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
              <Label htmlFor="contactPerson">Contact Person Name</Label>
              <Input
                id="contactPerson"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="Enter contact person name"
              />
            </div>
          )}

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
            <Label htmlFor="contact">
              {formData.type === 'individual' ? 'Contact Number' : 'Primary Contact Number'}
            </Label>
            <Input
              id="contact"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              placeholder="+91 9876543210"
              required
            />
          </div>

          {/* Firm-specific fields */}
          {formData.type === 'firm' && (
            <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 text-sm">Firm Details</h4>
              
              <div className="space-y-2">
                <Label htmlFor="firmContact">Firm Contact Number (Optional)</Label>
                <Input
                  id="firmContact"
                  value={formData.firmContact}
                  onChange={(e) => setFormData({ ...formData, firmContact: e.target.value })}
                  placeholder="+91 9876543210"
                />
                <p className="text-xs text-gray-600">Alternative contact number for the firm</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="firmAddress">Firm Address (Optional)</Label>
                <Input
                  id="firmAddress"
                  value={formData.firmAddress}
                  onChange={(e) => setFormData({ ...formData, firmAddress: e.target.value })}
                  placeholder="Enter firm business address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="firmGSTNumber">GST Number (Optional)</Label>
                <Input
                  id="firmGSTNumber"
                  value={formData.firmGSTNumber}
                  onChange={(e) => setFormData({ ...formData, firmGSTNumber: e.target.value })}
                  placeholder="Enter GST registration number"
                />
                <p className="text-xs text-gray-600">For invoicing and tax purposes</p>
              </div>
            </div>
          )}

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
