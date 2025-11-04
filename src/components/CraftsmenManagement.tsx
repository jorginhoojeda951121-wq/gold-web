import { useState } from "react";
import { Search, Plus, Hammer, Calendar, Package, User, MapPin, Star, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ProjectCompletionDialog } from "@/components/ProjectCompletionDialog";

export interface RawMaterial {
  id: string;
  type: string;
  quantity: number;
  unit: string;
  assignedDate: string;
  projectId: string;
  estimatedDelivery: string;
  status: 'pending' | 'in-progress' | 'completed' | 'delayed';
  completedDate?: string;
  completionNotes?: string;
}

export interface Craftsman {
  id: string;
  name: string;
  specialty: string;
  experience: number;
  phone: string;
  email: string;
  address: string;
  status: 'active' | 'busy' | 'available' | 'on-leave';
  materialsAssigned: number;
  joinDate: string;
  rating: number;
  completedProjects: number;
  assignedMaterials?: RawMaterial[];
}

interface CraftsmenManagementProps {
  craftsmen: Craftsman[];
  onAddCraftsman: (craftsman: Omit<Craftsman, 'id'>) => void;
  onUpdateCraftsman: (id: string, updates: Partial<Craftsman>) => void;
  onDeleteCraftsman: (id: string) => void;
}

export const CraftsmenManagement = ({ 
  craftsmen, 
  onAddCraftsman, 
  onUpdateCraftsman, 
  onDeleteCraftsman 
}: CraftsmenManagementProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedCraftsman, setSelectedCraftsman] = useState<Craftsman | null>(null);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  
  const [newCraftsman, setNewCraftsman] = useState({
    name: "",
    specialty: "",
    experience: 0,
    phone: "",
    email: "",
    address: "",
    status: "available" as const,
    materialsAssigned: 0,
    rating: 5,
    completedProjects: 0
  });

  const [materialAssignment, setMaterialAssignment] = useState({
    type: "",
    quantity: 0,
    unit: "",
    projectId: "",
    estimatedDelivery: "",
    status: "pending" as const
  });

  const filteredCraftsmen = craftsmen.filter(craftsman =>
    craftsman.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    craftsman.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'busy': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';
      case 'available': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'on-leave': return 'bg-gray-500/10 text-gray-600 border-gray-200';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  const getMaterialStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-600';
      case 'in-progress': return 'bg-blue-500/10 text-blue-600';
      case 'completed': return 'bg-green-500/10 text-green-600';
      case 'delayed': return 'bg-red-500/10 text-red-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  const handleAddCraftsman = () => {
    if (!newCraftsman.name || !newCraftsman.specialty) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    onAddCraftsman({
      ...newCraftsman,
      joinDate: new Date().toISOString()
    });

    setNewCraftsman({
      name: "",
      specialty: "",
      experience: 0,
      phone: "",
      email: "",
      address: "",
      status: "available",
      materialsAssigned: 0,
      rating: 5,
      completedProjects: 0
    });
    
    setShowAddDialog(false);
    toast({
      title: "Craftsman Added",
      description: `${newCraftsman.name} has been added to your team.`
    });
  };

  const handleAssignMaterial = () => {
    if (!selectedCraftsman || !materialAssignment.type || !materialAssignment.quantity) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const newMaterial: RawMaterial = {
      ...materialAssignment,
      id: Date.now().toString(),
      assignedDate: new Date().toISOString()
    };

    const updatedMaterials = [...(selectedCraftsman.assignedMaterials || []), newMaterial];
    
    onUpdateCraftsman(selectedCraftsman.id, {
      assignedMaterials: updatedMaterials,
      materialsAssigned: updatedMaterials.length,
      status: 'busy'
    });

    setMaterialAssignment({
      type: "",
      quantity: 0,
      unit: "",
      projectId: "",
      estimatedDelivery: "",
      status: "pending"
    });
    
    setShowAssignDialog(false);
    toast({
      title: "Material Assigned",
      description: `${materialAssignment.type} assigned to ${selectedCraftsman.name}.`
    });
  };

  const handleQuickComplete = (materialId: string) => {
    if (!selectedCraftsman) return;
    const updatedMaterials = (selectedCraftsman.assignedMaterials || []).map(m =>
      m.id === materialId
        ? { ...m, status: 'completed' as const, completedDate: new Date().toISOString().split('T')[0] }
        : m
    );

    onUpdateCraftsman(selectedCraftsman.id, {
      assignedMaterials: updatedMaterials,
      completedProjects: selectedCraftsman.completedProjects + 1
    });

    setSelectedCraftsman({ ...selectedCraftsman, assignedMaterials: updatedMaterials, completedProjects: selectedCraftsman.completedProjects + 1 });
    toast({ title: "Marked Completed", description: "Project marked as completed." });
  };

  const openCompletionWithNotes = (material: RawMaterial) => {
    setSelectedMaterial(material);
    setShowCompletionDialog(true);
  };

  const handleCompleteWithNotes = (_projectId: string, notes: string) => {
    if (!selectedCraftsman || !selectedMaterial) return;
    const updatedMaterials = (selectedCraftsman.assignedMaterials || []).map(m =>
      m.id === selectedMaterial.id
        ? { ...m, status: 'completed' as const, completedDate: new Date().toISOString().split('T')[0], completionNotes: notes }
        : m
    );

    onUpdateCraftsman(selectedCraftsman.id, {
      assignedMaterials: updatedMaterials,
      completedProjects: selectedCraftsman.completedProjects + 1
    });

    setSelectedCraftsman({ ...selectedCraftsman, assignedMaterials: updatedMaterials, completedProjects: selectedCraftsman.completedProjects + 1 });
    setShowCompletionDialog(false);
    setSelectedMaterial(null);
    toast({ title: "Project Completed", description: "Notes saved with completion." });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">Craftsmen Management</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Track craftsmen progress and material assignments
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-primary">{craftsmen.length}</div>
          <div className="text-sm text-muted-foreground">Total Craftsmen</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-green-600">
            {craftsmen.filter(c => c.status === 'available').length}
          </div>
          <div className="text-sm text-muted-foreground">Available</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {craftsmen.filter(c => c.status === 'busy').length}
          </div>
          <div className="text-sm text-muted-foreground">Busy</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-blue-600">
            {craftsmen.reduce((sum, c) => sum + c.completedProjects, 0)}
          </div>
          <div className="text-sm text-muted-foreground">Projects Completed</div>
        </Card>
      </div>

      {/* Controls */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search craftsmen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="ml-4">
            <Plus className="h-4 w-4 mr-2" />
            Add Craftsman
          </Button>
        </div>

        {/* Craftsmen Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Craftsman</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Materials</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCraftsmen.map(craftsman => (
                <TableRow key={craftsman.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Hammer className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <span className="font-medium">{craftsman.name}</span>
                        <p className="text-sm text-muted-foreground">
                          Joined: {new Date(craftsman.joinDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{craftsman.specialty}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(craftsman.status)}>
                      {craftsman.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{craftsman.experience} years</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span>{craftsman.rating}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{craftsman.materialsAssigned}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{craftsman.phone}</div>
                    <div className="text-muted-foreground">{craftsman.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedCraftsman(craftsman);
                          setShowDetailsDialog(true);
                        }}
                      >
                        View
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => {
                          setSelectedCraftsman(craftsman);
                          setShowAssignDialog(true);
                        }}
                      >
                        Assign
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add Craftsman Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Craftsman</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={newCraftsman.name}
                onChange={(e) => setNewCraftsman({ ...newCraftsman, name: e.target.value })}
                placeholder="Enter craftsman name"
              />
            </div>
            <div>
              <Label htmlFor="specialty">Specialty *</Label>
              <Select 
                value={newCraftsman.specialty} 
                onValueChange={(value) => setNewCraftsman({ ...newCraftsman, specialty: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gold Jewelry">Gold Jewelry</SelectItem>
                  <SelectItem value="Diamond Setting">Diamond Setting</SelectItem>
                  <SelectItem value="Stone Cutting">Stone Cutting</SelectItem>
                  <SelectItem value="Traditional Designs">Traditional Designs</SelectItem>
                  <SelectItem value="Modern Jewelry">Modern Jewelry</SelectItem>
                  <SelectItem value="Artificial Jewelry">Artificial Jewelry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="experience">Experience (years)</Label>
              <Input
                id="experience"
                type="number"
                value={newCraftsman.experience}
                onChange={(e) => setNewCraftsman({ ...newCraftsman, experience: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newCraftsman.phone}
                onChange={(e) => setNewCraftsman({ ...newCraftsman, phone: e.target.value })}
                placeholder="+91 12345 67890"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newCraftsman.email}
                onChange={(e) => setNewCraftsman({ ...newCraftsman, email: e.target.value })}
                placeholder="craftsman@example.com"
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={newCraftsman.address}
                onChange={(e) => setNewCraftsman({ ...newCraftsman, address: e.target.value })}
                placeholder="Enter address"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCraftsman}>
                Add Craftsman
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Material Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Material to {selectedCraftsman?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="materialType">Material Type *</Label>
              <Select 
                value={materialAssignment.type} 
                onValueChange={(value) => setMaterialAssignment({ ...materialAssignment, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select material type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gold 22K">Gold 22K</SelectItem>
                  <SelectItem value="Gold 18K">Gold 18K</SelectItem>
                  <SelectItem value="Silver">Silver</SelectItem>
                  <SelectItem value="Platinum">Platinum</SelectItem>
                  <SelectItem value="Diamond">Diamond</SelectItem>
                  <SelectItem value="Ruby">Ruby</SelectItem>
                  <SelectItem value="Emerald">Emerald</SelectItem>
                  <SelectItem value="Sapphire">Sapphire</SelectItem>
                  <SelectItem value="Pearl">Pearl</SelectItem>
                  <SelectItem value="Artificial Stone">Artificial Stone</SelectItem>
                  <SelectItem value="Crystal">Crystal</SelectItem>
                  <SelectItem value="Brass">Brass</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.1"
                  value={materialAssignment.quantity}
                  onChange={(e) => setMaterialAssignment({ ...materialAssignment, quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="unit">Unit *</Label>
                <Select 
                  value={materialAssignment.unit} 
                  onValueChange={(value) => setMaterialAssignment({ ...materialAssignment, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grams">Grams</SelectItem>
                    <SelectItem value="pieces">Pieces</SelectItem>
                    <SelectItem value="carats">Carats</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="projectId">Project ID</Label>
              <Input
                id="projectId"
                value={materialAssignment.projectId}
                onChange={(e) => setMaterialAssignment({ ...materialAssignment, projectId: e.target.value })}
                placeholder="PRJ-001"
              />
            </div>
            <div>
              <Label htmlFor="estimatedDelivery">Estimated Delivery</Label>
              <Input
                id="estimatedDelivery"
                type="date"
                value={materialAssignment.estimatedDelivery}
                onChange={(e) => setMaterialAssignment({ ...materialAssignment, estimatedDelivery: e.target.value })}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignMaterial}>
                Assign Material
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Craftsman Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Craftsman Details: {selectedCraftsman?.name}</DialogTitle>
          </DialogHeader>
          {selectedCraftsman && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Contact Information</Label>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>{selectedCraftsman.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>📧</span>
                      <span>{selectedCraftsman.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span>{selectedCraftsman.address}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Work Statistics</Label>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Experience:</span>
                      <span>{selectedCraftsman.experience} years</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rating:</span>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 fill-current mr-1" />
                        <span>{selectedCraftsman.rating}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed Projects:</span>
                      <span>{selectedCraftsman.completedProjects}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assigned Materials */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Assigned Materials</Label>
                {selectedCraftsman.assignedMaterials && selectedCraftsman.assignedMaterials.length > 0 ? (
                  <div className="space-y-2">
                    {selectedCraftsman.assignedMaterials.map((material) => (
                      <Card key={material.id} className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="font-medium">{material.type}</div>
                            <div className="text-sm text-muted-foreground">
                              Quantity: {material.quantity} {material.unit}
                            </div>
                            {material.projectId && (
                              <div className="text-sm text-muted-foreground">
                                Project: {material.projectId}
                              </div>
                            )}
                            <div className="text-sm text-muted-foreground">
                              Assigned: {new Date(material.assignedDate).toLocaleDateString()}
                            </div>
                            {material.estimatedDelivery && (
                              <div className="text-sm text-muted-foreground">
                                Expected: {new Date(material.estimatedDelivery).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <Badge className={getMaterialStatusColor(material.status)}>
                              {material.status}
                            </Badge>
                            {material.status !== 'completed' && (
                              <div className="mt-2 space-y-2">
                                <Button size="sm" variant="outline" onClick={() => handleQuickComplete(material.id)}>
                                  Mark Complete
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => openCompletionWithNotes(material)}>
                                  Complete with Notes
                                </Button>
                              </div>
                            )}
                            {material.status === 'completed' && material.completedDate && (
                              <div className="mt-2 text-xs text-green-700">Completed on: {material.completedDate}</div>
                            )}
                            {material.completionNotes && (
                              <div className="mt-2 text-sm bg-green-50 p-2 rounded border-l-4 border-green-400">
                                {material.completionNotes}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No materials assigned yet.</p>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDetailsDialog(false);
                    setShowAssignDialog(true);
                  }}
                >
                  Assign Material
                </Button>
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Completion with notes dialog */}
      {selectedMaterial && (
        <ProjectCompletionDialog
          open={showCompletionDialog}
          onOpenChange={setShowCompletionDialog}
          projectId={selectedMaterial.id}
          projectName={selectedMaterial.projectId || selectedMaterial.type}
          craftsmanName={selectedCraftsman?.name || ''}
          onComplete={handleCompleteWithNotes}
        />
      )}
    </div>
  );
};