import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Package, Phone, User, Hammer, Check, FileText } from "lucide-react";
import { Craftsman } from "./AddCraftsmanDialog";
import { ProjectCompletionDialog } from "./ProjectCompletionDialog";

interface CraftsmanDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  craftsman: Craftsman | null;
  onAssignMaterial: () => void;
  onCompleteTask?: (materialId: string) => void;
  onCompleteProject?: (materialId: string, notes: string) => void;
}

export const CraftsmanDetailsDialog = ({ 
  open, 
  onOpenChange, 
  craftsman, 
  onAssignMaterial,
  onCompleteTask,
  onCompleteProject
}: CraftsmanDetailsDialogProps) => {
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<{id: string, name: string} | null>(null);

  if (!craftsman) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'available': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCompleteProject = (materialId: string, notes: string) => {
    if (onCompleteProject) {
      onCompleteProject(materialId, notes);
    }
    setShowCompletionDialog(false);
    setSelectedProject(null);
  };

  const handleOpenCompletionDialog = (material: any) => {
    setSelectedProject({
      id: material.id,
      name: material.projectId || `${material.type} Project`
    });
    setShowCompletionDialog(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-green-600 flex items-center space-x-2">
            <Hammer className="h-5 w-5" />
            <span>Craftsman Details</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{craftsman.name}</h3>
                <p className="text-gray-600">{craftsman.specialty}</p>
              </div>
              <Badge className={getStatusColor(craftsman.status)}>
                {craftsman.status}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Experience:</span>
                <span className="font-medium">{craftsman.experience}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Contact:</span>
                <span className="font-medium">{craftsman.contact}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Active Projects:</span>
                <span className="font-medium">{craftsman.currentProjects}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Assigned Materials */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">Assigned Raw Materials</h4>
              <Button 
                onClick={onAssignMaterial}
                size="sm" 
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Assign Material
              </Button>
            </div>
            
            {craftsman.assignedMaterials.length > 0 ? (
              <div className="space-y-3">
                {craftsman.assignedMaterials.map((material) => (
                  <div key={material.id} className="border border-gray-200 p-3 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h5 className="font-medium text-gray-900">{material.type}</h5>
                          {material.completed && (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <Check className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Quantity: {material.quantity} {material.unit}
                        </p>
                        {material.projectId && (
                          <p className="text-sm text-gray-600">
                            Project: {material.projectId}
                          </p>
                        )}
                        {material.completed && material.completedDate && (
                          <div className="space-y-1">
                            <p className="text-sm text-green-600">
                              Completed on: {material.completedDate}
                            </p>
                            {material.completionNotes && (
                              <div className="bg-green-50 p-2 rounded border-l-4 border-green-400">
                                <div className="flex items-start space-x-2">
                                  <FileText className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-xs font-medium text-green-800 mb-1">Completion Notes:</p>
                                    <p className="text-sm text-green-700">{material.completionNotes}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div className="flex items-center space-x-1 mb-2">
                          <Calendar className="h-3 w-3" />
                          <span>{material.assignedDate}</span>
                        </div>
                        {!material.completed && (
                          <div className="space-y-2">
                            {onCompleteTask && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onCompleteTask(material.id)}
                                className="text-green-600 border-green-600 hover:bg-green-50 w-full"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Mark Complete
                              </Button>
                            )}
                            {onCompleteProject && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenCompletionDialog(material)}
                                className="text-blue-600 border-blue-600 hover:bg-blue-50 w-full"
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                Complete with Notes
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No materials assigned yet</p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Project Completion Dialog */}
      {selectedProject && (
        <ProjectCompletionDialog
          open={showCompletionDialog}
          onOpenChange={setShowCompletionDialog}
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          craftsmanName={craftsman.name}
          onComplete={handleCompleteProject}
        />
      )}
    </Dialog>
  );
};