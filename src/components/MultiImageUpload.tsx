import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MultiImageUploadProps {
  images: (string | null)[];
  onImagesChange: (images: (string | null)[]) => void;
  maxImages?: number;
  label?: string;
}

export const MultiImageUpload = ({ 
  images, 
  onImagesChange, 
  maxImages = 4,
  label = "Item Images"
}: MultiImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleMultipleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if adding these files would exceed max images
    const emptySlots = images.filter(img => !img).length;
    if (files.length > emptySlots) {
      toast({
        title: "Too many images",
        description: `You can only upload ${emptySlots} more image(s). Maximum is ${maxImages} images.`,
        variant: "destructive",
      });
      return;
    }

    const newImages = [...images];
    let processedCount = 0;
    const filesToProcess: { file: File; targetIndex: number }[] = [];

    // First, determine which slot each file should go to
    let currentIndex = 0;
    Array.from(files).forEach((file) => {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive",
        });
        return;
      }

      // Find next empty slot
      while (currentIndex < maxImages && newImages[currentIndex] !== null) {
        currentIndex++;
      }

      if (currentIndex >= maxImages) return;

      filesToProcess.push({ file, targetIndex: currentIndex });
      currentIndex++;
    });

    // Now process each file with its assigned slot
    if (filesToProcess.length === 0) return;

    filesToProcess.forEach(({ file, targetIndex }) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        newImages[targetIndex] = result;
        processedCount++;

        // Update state after all files are processed
        if (processedCount === filesToProcess.length) {
          onImagesChange(newImages);
          toast({
            title: "Images uploaded",
            description: `${processedCount} image(s) uploaded successfully`,
          });
        }
      };
      reader.readAsDataURL(file);
    });

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages[index] = null;
    onImagesChange(newImages);
  };

  const hasImages = images.some(img => img !== null);
  const imageCount = images.filter(img => img !== null).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {label}
          <span className="text-muted-foreground ml-2 text-xs">
            ({imageCount}/{maxImages} uploaded)
          </span>
        </Label>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          onChange={handleMultipleImageUpload}
          className="hidden"
        />
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={imageCount >= maxImages}
        >
          <Upload className="h-4 w-4 mr-2" />
          {hasImages ? "Add More" : "Upload Images"}
        </Button>
      </div>
      
      {hasImages ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {images.map((image, index) => 
            image ? (
              <div key={index} className="relative group">
                <img 
                  src={image} 
                  alt={`Preview ${index + 1}`} 
                  className="w-full h-24 object-cover rounded-lg border-2 border-border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-7 w-7 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                  #{index + 1}
                </div>
              </div>
            ) : null
          )}
        </div>
      ) : (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <Upload className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">
            Click "Upload Images" to select images
          </p>
          <p className="text-xs text-muted-foreground">
            You can select up to {maxImages} images at once
          </p>
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        <strong>Tip:</strong> Select multiple images at once (JPG, PNG, GIF, WEBP up to 10MB each)
      </p>
    </div>
  );
};

