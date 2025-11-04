import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProjectCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  craftsmanName: string;
  onComplete: (projectId: string, notes: string) => void;
}

export const ProjectCompletionDialog = ({ 
  open, 
  onOpenChange, 
  projectId, 
  projectName, 
  craftsmanName,
  onComplete 
}: ProjectCompletionDialogProps) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async () => {
    setIsSubmitting(true);
    
    try {
      await onComplete(projectId, notes);
      
      toast({
        title: "Project Completed",
        description: `Project ${projectName} has been marked as completed with notes.`
      });
      
      setNotes("");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete project. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-green-600 flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>Mark Project as Completed</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Project Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-gray-900">Project ID:</span>
                <span className="text-gray-700">{projectId}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">Project Name:</span>
                <span className="text-gray-700">{projectName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">Craftsman:</span>
                <span className="text-gray-700">{craftsmanName}</span>
              </div>
            </div>
          </div>

          {/* Completion Notes */}
          <div className="space-y-2">
            <Label htmlFor="completion-notes" className="text-base font-medium">
              Completion Notes <span className="text-gray-500">(Optional)</span>
            </Label>
            <Textarea
              id="completion-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about the project completion, quality, issues encountered, or recommendations..."
              className="min-h-[120px] resize-none"
              rows={5}
            />
            <p className="text-sm text-gray-500">
              These notes will be saved with the project completion record and can be viewed later.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={handleComplete}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Completed
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};


