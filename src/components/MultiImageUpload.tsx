import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadImageToStorage, deleteImageFromStorage } from "@/lib/storage";

interface MultiImageUploadProps {
  images: (string | null)[];
  onImagesChange: (images: (string | null)[]) => void;
  maxImages?: number;
  label?: string;
  bucket?: string;
  folder?: string;
}

export const MultiImageUpload = ({ 
  images, 
  onImagesChange, 
  maxImages = 4,
  label = "Item Images",
  bucket = 'images',
  folder
}: MultiImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: number]: boolean }>({});

  const handleMultipleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image file`,
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

    // Now upload each file to Supabase Storage
    if (filesToProcess.length === 0) return;

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    // Upload files sequentially to avoid overwhelming the storage
    for (const { file, targetIndex } of filesToProcess) {
      setUploadProgress(prev => ({ ...prev, [targetIndex]: true }));
      
      try {
        const url = await uploadImageToStorage(file, bucket, folder);
        newImages[targetIndex] = url;
        successCount++;
      } catch (error: any) {
        console.error(`Error uploading ${file.name}:`, error);
        errorCount++;
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}: ${error.message || 'Unknown error'}`,
          variant: "destructive",
        });
      } finally {
        setUploadProgress(prev => ({ ...prev, [targetIndex]: false }));
      }
    }

    setUploading(false);

    // Update state with successfully uploaded images
    if (successCount > 0) {
      onImagesChange(newImages);
      toast({
        title: "Images uploaded",
        description: `${successCount} image(s) uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      });
    }

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = async (index: number) => {
    const imageToRemove = images[index];
    const newImages = [...images];
    newImages[index] = null;
    onImagesChange(newImages);

    // Delete from storage if it's a Supabase Storage URL
    if (imageToRemove && (imageToRemove.startsWith('http://') || imageToRemove.startsWith('https://'))) {
      try {
        await deleteImageFromStorage(imageToRemove, bucket);
      } catch (error) {
        console.error('Error deleting image from storage:', error);
        // Don't show error to user - image is already removed from UI
      }
    }
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
          disabled={imageCount >= maxImages || uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {hasImages ? "Add More" : "Upload Images"}
            </>
          )}
        </Button>
      </div>
      
      {hasImages ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {images.map((image, index) => 
            image ? (
              <div key={index} className="relative group">
                {uploadProgress[index] ? (
                  <div className="w-full h-24 bg-muted rounded-lg border-2 border-border flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <img 
                      src={image} 
                      alt={`Preview ${index + 1}`} 
                      className="w-full h-24 object-cover rounded-lg border-2 border-border"
                      onError={(e) => {
                        console.error('Failed to load image:', image);
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%" y="50%" text-anchor="middle" dy=".3em"%3EImage%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-7 w-7 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                      #{index + 1}
                    </div>
                  </>
                )}
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

