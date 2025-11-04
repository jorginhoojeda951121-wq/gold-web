import { useState } from "react";
import { Search, Plus, Hammer, ArrowLeft, Package, Database, TableIcon, Users } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { AddCraftsmanDialog, Craftsman, RawMaterial } from "@/components/AddCraftsmanDialog";
import { MaterialAssignDialog } from "@/components/MaterialAssignDialog";
import { CraftsmanDetailsDialog } from "@/components/CraftsmanDetailsDialog";
import { useToast } from "@/hooks/use-toast";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";

const CraftsmenTracking = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedCraftsman, setSelectedCraftsman] = useState<Craftsman | null>(null);

  const { data: craftsmen, updateData: setCraftsmen, loaded } = useOfflineStorage<Craftsman[]>("craftsmen", [
    {
      id: "1",
      name: "Rajesh Kumar",
      specialty: "Gold Jewelry",
      experience: "15 years",
      currentProjects: 3,
      status: "active",
      contact: "+91 9876543210",
      assignedMaterials: [
        {
          id: "1",
          type: "Gold 22K",
          quantity: 50,
          unit: "grams",
          assignedDate: "2024-01-15",
          projectId: "PRJ-001",
          completed: false
        },
        {
          id: "1b",
          type: "Gold 18K Ring",
          quantity: 1,
          unit: "piece",
          assignedDate: "2024-01-10",
          projectId: "PRJ-001B",
          completed: true,
          completedDate: "2024-01-25",
          completionNotes: "Ring completed successfully. Customer was very satisfied with the design and quality. No issues encountered during production."
        }
      ]
    },
    {
      id: "2",
      name: "Priya Sharma",
      specialty: "Diamond Setting",
      experience: "12 years",
      currentProjects: 2,
      status: "active",
      contact: "+91 9876543211",
      assignedMaterials: [
        {
          id: "2",
          type: "Diamond",
          quantity: 2.5,
          unit: "carats",
          assignedDate: "2024-01-20",
          projectId: "PRJ-002",
          completed: false
        }
      ]
    },
    {
      id: "3",
      name: "Mohammad Ali",
      specialty: "Stone Cutting",
      experience: "20 years",
      currentProjects: 1,
      status: "busy",
      contact: "+91 9876543212",
      assignedMaterials: [
        {
          id: "3",
          type: "Ruby",
          quantity: 5,
          unit: "pieces",
          assignedDate: "2024-01-18",
          projectId: "PRJ-003",
          completed: false
        }
      ]
    },
    {
      id: "4",
      name: "Sunita Devi",
      specialty: "Traditional Designs",
      experience: "18 years",
      currentProjects: 0,
      status: "available",
      contact: "+91 9876543213",
      assignedMaterials: []
    }
  ]);

  // Ensure all materials have the completed field - with comprehensive null checks
  const safeCraftsmen = Array.isArray(craftsmen) ? craftsmen : [];
  const craftsmenWithCompletedField = safeCraftsmen.map(craftsman => ({
    ...craftsman,
    assignedMaterials: Array.isArray(craftsman.assignedMaterials) 
      ? craftsman.assignedMaterials.map(material => ({
          ...material,
          completed: material.completed ?? false
        }))
      : []
  }));

  const filteredCraftsmen = craftsmenWithCompletedField.filter(craftsman =>
    craftsman.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    craftsman.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCraftsman = (newCraftsman: Omit<Craftsman, 'id'>) => {
    const craftsman: Craftsman = {
      ...newCraftsman,
      id: Date.now().toString()
    };
    setCraftsmen(prev => [...prev, craftsman]);
    toast({
      title: "Craftsman Added",
      description: `${craftsman.name} has been added to your team.`
    });
  };

  const handleAssignMaterial = (material: Omit<RawMaterial, 'id'>) => {
    if (!selectedCraftsman) return;
    
    const newMaterial: RawMaterial = {
      ...material,
      id: Date.now().toString(),
      completed: false
    };

    setCraftsmen(prev => prev.map(craftsman => 
      craftsman.id === selectedCraftsman.id
        ? { ...craftsman, assignedMaterials: [...craftsman.assignedMaterials, newMaterial] }
        : craftsman
    ));

    toast({
      title: "Material Assigned",
      description: `${material.type} has been assigned to ${selectedCraftsman.name}.`
    });
    
    // Update selected craftsman for the details dialog
    setSelectedCraftsman(prev => prev ? {
      ...prev,
      assignedMaterials: [...prev.assignedMaterials, newMaterial]
    } : null);
  };

  const handleViewDetails = (craftsman: Craftsman) => {
    setSelectedCraftsman(craftsman);
    setShowDetailsDialog(true);
  };

  const handleAssignProject = (craftsman: Craftsman) => {
    setSelectedCraftsman(craftsman);
    setShowMaterialDialog(true);
  };

  const handleCompleteTask = (materialId: string) => {
    setCraftsmen(prev => prev.map(craftsman => ({
      ...craftsman,
      assignedMaterials: craftsman.assignedMaterials.map(material => 
        material.id === materialId
          ? { ...material, completed: true, completedDate: new Date().toISOString().split('T')[0] }
          : material
      )
    })));

    toast({
      title: "Task Completed",
      description: "Material assignment has been marked as completed."
    });
  };

  const handleCompleteProject = (materialId: string, notes: string) => {
    setCraftsmen(prev => prev.map(craftsman => ({
      ...craftsman,
      assignedMaterials: craftsman.assignedMaterials.map(material => 
        material.id === materialId
          ? { 
              ...material, 
              completed: true, 
              completedDate: new Date().toISOString().split('T')[0],
              completionNotes: notes
            }
          : material
      )
    })));

    toast({
      title: "Project Completed",
      description: "Project has been marked as completed with notes."
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'available': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Show loading state while data is being fetched
  if (!loaded) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading craftsmen data...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-green-600 mb-4">Craftsmen Tracking System</h1>
          <p className="text-xl text-green-500 mb-8">Track raw materials assigned to craftsmen and their work progress.</p>
        </div>

        {/* Main Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 max-w-4xl mx-auto">
          {/* Assign Raw Material Card */}
          <Card 
            className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105"
            onClick={() => {
              if (safeCraftsmen.length === 0) {
                toast({
                  title: "No Craftsmen Available",
                  description: "Please add craftsmen first before assigning materials.",
                  variant: "destructive"
                });
                return;
              }
              // Scroll to table to select a craftsman
              const tableElement = document.getElementById('assignments-table');
              tableElement?.scrollIntoView({ behavior: 'smooth' });
              toast({
                title: "Select a Craftsman",
                description: "Click 'Assign' button next to a craftsman to assign materials."
              });
            }}
          >
            <CardContent className="text-center">
              <div className="p-4 bg-green-600 rounded-lg inline-block mb-4">
                <Database className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-green-800 mb-2">Assign Raw Material to Craftsman</h3>
              <p className="text-green-600">Allocate materials to craftsmen for jewelry production</p>
            </CardContent>
          </Card>

          {/* Craftsmen Assignments Card */}
          <Card 
            className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105"
            onClick={() => {
              const tableElement = document.getElementById('assignments-table');
              tableElement?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <CardContent className="text-center">
              <div className="p-4 bg-blue-600 rounded-lg inline-block mb-4">
                <TableIcon className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-blue-800 mb-2">Craftsmen Assignments</h3>
              <p className="text-blue-600">Table to monitor raw material assignments and progress</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="text-center p-4">
            <div className="text-2xl font-bold text-gray-800">{safeCraftsmen.length}</div>
            <div className="text-sm text-gray-600">Total Craftsmen</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-2xl font-bold text-green-600">
              {safeCraftsmen.reduce((sum, c) => sum + (c.assignedMaterials?.length || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Materials Assigned</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-2xl font-bold text-blue-600">
              {safeCraftsmen.filter(c => c.status === 'available').length}
            </div>
            <div className="text-sm text-gray-600">Available</div>
          </Card>
          <Card className="text-center p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {safeCraftsmen.filter(c => c.status === 'busy').length}
            </div>
            <div className="text-sm text-gray-600">Busy</div>
          </Card>
        </div>

        {/* Assignments Table */}
        <div id="assignments-table" className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Material Assignments</h2>
                <p className="text-gray-600">Monitor craftsmen and their assigned materials</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowAddDialog(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Craftsman
            </Button>
          </div>

          {/* Search */}
          <div className="relative max-w-md mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search craftsmen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-300 focus:border-green-500 focus:ring-green-500"
            />
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <UITable>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Craftsman</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Materials</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCraftsmen.map(craftsman => (
                  <TableRow key={craftsman.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="p-1 bg-green-100 rounded-full">
                          <Hammer className="h-4 w-4 text-green-600" />
                        </div>
                        <span className="font-medium">{craftsman.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{craftsman.specialty}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(craftsman.status)}>
                        {craftsman.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{craftsman.experience}</TableCell>
                    <TableCell>{craftsman.currentProjects}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Package className="h-4 w-4 text-gray-500" />
                        <span>{craftsman.assignedMaterials.length}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{craftsman.contact}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewDetails(craftsman)}
                        >
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleAssignProject(craftsman)}
                        >
                          Assign
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </UITable>
          </div>

          {filteredCraftsmen.length === 0 && (
            <div className="text-center py-12">
              <Hammer className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No craftsmen found</h3>
              <p className="text-gray-600">Try adjusting your search or add new craftsmen</p>
            </div>
          )}
        </div>
      </main>

      {/* Dialogs */}
      <AddCraftsmanDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddCraftsman}
      />

      <MaterialAssignDialog
        open={showMaterialDialog}
        onOpenChange={setShowMaterialDialog}
        craftsmanName={selectedCraftsman?.name || ""}
        onAssign={handleAssignMaterial}
      />

      <CraftsmanDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        craftsman={selectedCraftsman}
        onAssignMaterial={() => {
          setShowDetailsDialog(false);
          setShowMaterialDialog(true);
        }}
        onCompleteTask={handleCompleteTask}
        onCompleteProject={handleCompleteProject}
      />
    </div>
  );
};

export default CraftsmenTracking;