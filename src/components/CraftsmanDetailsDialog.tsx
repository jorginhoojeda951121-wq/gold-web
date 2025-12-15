import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Calendar, Package, Phone, User, Hammer, Check, FileText, DollarSign, CreditCard, AlertCircle, Building2, MapPin, FileCheck, Clock, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { Craftsman, RawMaterial } from "./AddCraftsmanDialog";
import { ProjectCompletionDialog } from "./ProjectCompletionDialog";

interface CraftsmanDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  craftsman: Craftsman | null;
  onAssignMaterial: () => void;
  onCompleteTask?: (materialId: string) => void;
  onCompleteProject?: (materialId: string, notes: string) => void;
  onRecordPayment?: () => void;
}

export const CraftsmanDetailsDialog = ({ 
  open, 
  onOpenChange, 
  craftsman, 
  onAssignMaterial,
  onCompleteTask,
  onCompleteProject,
  onRecordPayment
}: CraftsmanDetailsDialogProps) => {
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<{id: string, name: string} | null>(null);

  // Filter ongoing tasks (not completed) - MUST be called before any conditional returns
  const ongoingTasks = useMemo(() => {
    if (!craftsman) return [];
    return (craftsman.assignedMaterials || []).filter(
      (material) => !material.completed
    );
  }, [craftsman?.assignedMaterials]);

  // Filter completed tasks - MUST be called before any conditional returns
  const completedTasks = useMemo(() => {
    if (!craftsman) return [];
    return (craftsman.assignedMaterials || []).filter(
      (material) => material.completed
    );
  }, [craftsman?.assignedMaterials]);

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

  // Calculate delivery status and days remaining/overdue
  const getDeliveryStatus = (material: RawMaterial) => {
    if (!material.estimatedDelivery || material.completed) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deliveryDate = new Date(material.estimatedDelivery);
    deliveryDate.setHours(0, 0, 0, 0);
    
    const diffTime = deliveryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: 'overdue',
        days: Math.abs(diffDays),
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: AlertTriangle,
        label: 'Overdue'
      };
    } else if (diffDays <= 3) {
      return {
        status: 'urgent',
        days: diffDays,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        icon: Clock,
        label: 'Due Soon'
      };
    } else if (diffDays <= 7) {
      return {
        status: 'approaching',
        days: diffDays,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        icon: TrendingUp,
        label: 'Approaching'
      };
    } else {
      return {
        status: 'on-time',
        days: diffDays,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: Check,
        label: 'On Track'
      };
    }
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
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-xl font-semibold text-gray-900">{craftsman.name}</h3>
                </div>
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
              
              {/* Firm-specific fields */}
              {craftsman.type === 'firm' && (
                <>
                  {craftsman.firmContact && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Firm Contact:</span>
                      <span className="font-medium">{craftsman.firmContact}</span>
                    </div>
                  )}
                  {craftsman.firmAddress && (
                    <div className="flex items-center space-x-2 col-span-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Address:</span>
                      <span className="font-medium">{craftsman.firmAddress}</span>
                    </div>
                  )}
                  {craftsman.firmGSTNumber && (
                    <div className="flex items-center space-x-2 col-span-2">
                      <FileCheck className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">GST Number:</span>
                      <span className="font-medium">{craftsman.firmGSTNumber}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Payment Tracking Section */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-green-600" />
              Payment Tracking
            </h4>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* Total Due */}
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="text-sm text-blue-600 mb-1">Total Due</div>
                <div className="text-2xl font-bold text-blue-900">
                  ₹{(craftsman.totalAmountDue || 0).toLocaleString()}
                </div>
              </Card>

              {/* Total Paid */}
              <Card className="p-4 bg-green-50 border-green-200">
                <div className="text-sm text-green-600 mb-1">Total Paid</div>
                <div className="text-2xl font-bold text-green-900">
                  ₹{(craftsman.totalAmountPaid || 0).toLocaleString()}
                </div>
              </Card>

              {/* Pending Amount */}
              <Card className="p-4 bg-amber-50 border-amber-200">
                <div className="text-sm text-amber-600 mb-1">Pending</div>
                <div className="text-2xl font-bold text-amber-900">
                  ₹{(craftsman.pendingAmount || 0).toLocaleString()}
                </div>
              </Card>
            </div>

            {/* Record Payment Button */}
            {onRecordPayment && (craftsman.pendingAmount || 0) > 0 && (
              <Button
                onClick={onRecordPayment}
                className="w-full bg-green-600 hover:bg-green-700 text-white mb-4"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            )}

            {/* Payment History */}
            {craftsman.paymentHistory && craftsman.paymentHistory.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-semibold text-gray-700 mb-2">Recent Payments</h5>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {craftsman.paymentHistory.slice(-5).reverse().map((payment) => (
                    <div key={payment.id} className="bg-gray-50 p-3 rounded border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-green-600">
                              ₹{payment.amount.toLocaleString()}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {payment.paymentMethod}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{payment.description}</p>
                          {payment.projectId && (
                            <p className="text-xs text-gray-500">Project: {payment.projectId}</p>
                          )}
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Ongoing Tasks with Delivery Tracker */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-600" />
                Ongoing Tasks ({ongoingTasks.length})
              </h4>
              <Button 
                onClick={onAssignMaterial}
                size="sm" 
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Assign Item
              </Button>
            </div>
            
            {ongoingTasks.length > 0 ? (
              <div className="space-y-3">
                {ongoingTasks.map((material) => {
                  return (
                  <Card 
                    key={material.id} 
                    className="p-4 bg-white border-gray-200 border-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="font-medium text-gray-900">{material.type}</h5>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <p className="text-xs text-gray-500">Quantity</p>
                            <p className="text-sm font-medium">{material.quantity} {material.unit}</p>
                          </div>
                          {material.projectId && (
                            <div>
                              <p className="text-xs text-gray-500">Project ID</p>
                              <p className="text-sm font-medium">{material.projectId}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500 ml-4">
                        <div className="flex items-center space-x-1 mb-2">
                          <Calendar className="h-3 w-3" />
                          <span className="text-xs">Assigned: {new Date(material.assignedDate).toLocaleDateString()}</span>
                        </div>
                        <div className="space-y-2">
                          {!material.completed && onCompleteTask && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onCompleteTask(material.id)}
                              className="text-green-600 border-green-600 hover:bg-green-50 w-full"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Complete
                            </Button>
                          )}
                          {!material.completed && onCompleteProject && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenCompletionDialog(material)}
                              className="text-blue-600 border-blue-600 hover:bg-blue-50 w-full"
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Add Notes
                            </Button>
                          )}
                          {material.completed && (
                            <Badge className="bg-green-100 text-green-800 w-full justify-center">
                              <Check className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No ongoing tasks</p>
                <p className="text-xs mt-1">All tasks are completed or no tasks assigned</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Completed Tasks */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                Completed Tasks ({completedTasks.length})
              </h4>
            </div>
            
            {completedTasks.length > 0 ? (
              <div className="space-y-3">
                {completedTasks.map((material) => (
                  <div key={material.id} className="border border-gray-200 p-3 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="font-medium text-gray-900">{material.type}</h5>
                          <Badge className="bg-green-100 text-green-800">
                            <Check className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Quantity: {material.quantity} {material.unit}
                        </p>
                        {material.projectId && (
                          <p className="text-sm text-gray-600">
                            Project: {material.projectId}
                          </p>
                        )}
                        {material.completedDate && (
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                <Check className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No completed tasks</p>
                <p className="text-xs mt-1">Completed tasks will appear here</p>
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
