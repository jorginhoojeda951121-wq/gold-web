import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Scan, X, Camera, Keyboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => void;
  title?: string;
  placeholder?: string;
}

export const BarcodeScanner = ({ 
  open, 
  onOpenChange, 
  onScan,
  title = "Scan Barcode",
  placeholder = "Enter or scan barcode..."
}: BarcodeScannerProps) => {
  const [barcode, setBarcode] = useState("");
  const [scanMode, setScanMode] = useState<"manual" | "camera">("manual");
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Auto-focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Listen for barcode scanner input (hardware scanners act as keyboard input)
  useEffect(() => {
    if (!open) return;

    let buffer = "";
    let timeout: NodeJS.Timeout;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Barcode scanners typically send input very fast and end with Enter
      if (e.key === "Enter" && buffer.length > 0) {
        e.preventDefault();
        handleScan(buffer);
        buffer = "";
      } else if (e.key.length === 1) {
        buffer += e.key;
        clearTimeout(timeout);
        // Clear buffer if typing is too slow (indicates manual typing)
        timeout = setTimeout(() => {
          buffer = "";
        }, 100);
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      clearTimeout(timeout);
    };
  }, [open]);

  const handleScan = (code: string) => {
    if (!code || code.trim().length === 0) {
      toast({
        title: "Invalid Barcode",
        description: "Please enter a valid barcode",
        variant: "destructive",
      });
      return;
    }

    onScan(code.trim());
    setBarcode("");
    onOpenChange(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScan(barcode);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-blue-600" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <Button
              type="button"
              variant={scanMode === "manual" ? "default" : "ghost"}
              className="flex-1 gap-2"
              onClick={() => setScanMode("manual")}
            >
              <Keyboard className="h-4 w-4" />
              Manual Entry
            </Button>
            <Button
              type="button"
              variant={scanMode === "camera" ? "default" : "ghost"}
              className="flex-1 gap-2"
              onClick={() => setScanMode("camera")}
              disabled
            >
              <Camera className="h-4 w-4" />
              Camera Scan
              <span className="text-xs">(Coming Soon)</span>
            </Button>
          </div>

          {/* Manual Input Mode */}
          {scanMode === "manual" && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <div className="relative">
                  <Input
                    ref={inputRef}
                    id="barcode"
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder={placeholder}
                    className="pr-10 text-lg font-mono"
                    autoComplete="off"
                  />
                  {barcode && (
                    <button
                      type="button"
                      onClick={() => setBarcode("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 You can also use a barcode scanner gun - just scan and press enter
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="gap-2" disabled={!barcode.trim()}>
                  <Scan className="h-4 w-4" />
                  Scan
                </Button>
              </div>
            </form>
          )}

          {/* Camera Mode (Placeholder for future implementation) */}
          {scanMode === "camera" && (
            <div className="p-8 text-center space-y-4">
              <Camera className="h-16 w-16 mx-auto text-gray-400" />
              <div>
                <h3 className="font-semibold text-gray-900">Camera Scanning</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Camera-based barcode scanning will be available in a future update.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  For now, please use manual entry or a barcode scanner gun.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Inline barcode input component for quick access
interface BarcodeInputProps {
  onScan: (barcode: string) => void;
  placeholder?: string;
  className?: string;
}

export const BarcodeInput = ({ 
  onScan, 
  placeholder = "Scan or enter barcode...",
  className = ""
}: BarcodeInputProps) => {
  const [barcode, setBarcode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode.trim()) {
      onScan(barcode.trim());
      setBarcode("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <div className="relative">
        <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-10 font-mono"
          autoComplete="off"
        />
        {barcode && (
          <button
            type="button"
            onClick={() => setBarcode("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  );
};

// Button to trigger barcode scanner dialog
interface BarcodeScanButtonProps {
  onScan: (barcode: string) => void;
  buttonText?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export const BarcodeScanButton = ({ 
  onScan, 
  buttonText = "Scan Barcode",
  variant = "outline",
  size = "default"
}: BarcodeScanButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Scan className="h-4 w-4" />
        {buttonText}
      </Button>
      <BarcodeScanner
        open={open}
        onOpenChange={setOpen}
        onScan={onScan}
      />
    </>
  );
};

// Utility function to generate simple barcodes (EAN-13 format)
export const generateBarcode = (prefix: string = "GLD"): string => {
  const timestamp = Date.now().toString().slice(-9); // Last 9 digits
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

// Utility function to validate barcode format
export const isValidBarcode = (barcode: string): boolean => {
  if (!barcode || barcode.trim().length === 0) return false;
  
  // Allow alphanumeric barcodes with minimum length of 4
  const cleanBarcode = barcode.trim();
  return cleanBarcode.length >= 4 && /^[A-Za-z0-9-_]+$/.test(cleanBarcode);
};

