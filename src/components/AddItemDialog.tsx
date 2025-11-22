import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { JewelryItem } from "./JewelryCard";
import { Upload, X, Calculator, Barcode } from "lucide-react";
import { useGoldRates, calculateGoldPrice } from "./GoldRateSettings";
import { generateBarcode } from "./BarcodeScanner";
import { MultiImageUpload } from "./MultiImageUpload";
import { useToast } from "@/hooks/use-toast";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: Omit<JewelryItem, 'id'>) => void;
}

const jewelryTypes = [
  "Ring", "Necklace", "Earrings", "Bracelet", "Brooch", "Pendant", "Chain", "Anklet"
];

const gemstones = [
  "Diamond", "Emerald", "Sapphire", "Ruby", "Pearl", "Amethyst", "Topaz", "Garnet", "Opal", "Turquoise", "Crystal", "None"
];

const metals = [
  "Gold 24K", "Gold 22K", "Gold 18K", "Gold 14K", "Gold 10K", "White Gold", "Rose Gold", "Platinum", "Silver", "Stainless Steel", "Brass", "Copper"
];

export const AddItemDialog = ({ open, onOpenChange, onAdd }: AddItemDialogProps) => {
  const { toast } = useToast();
  const goldSettings = useGoldRates();
  const [autoCalculate, setAutoCalculate] = useState(false);
  const [weight, setWeight] = useState("");
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null]);
  
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    gemstone: "",
    carat: "",
    metal: "",
    price: "",
    inStock: "",
    isArtificial: false,
    taxRate: "3",           // Default 3% for jewelry
    taxIncluded: false,
    taxCategory: "jewelry" as 'jewelry' | 'artificial' | 'gemstones' | 'other',
    barcode: "",
    sku: "",
  });

  // Auto-calculate price when metal or weight changes for gold items
  useEffect(() => {
    if (!autoCalculate || !weight || !formData.metal) return;
    
    const isGoldMetal = formData.metal.includes('Gold');
    if (!isGoldMetal) return;

    let purity: '24K' | '22K' | '18K' | '14K' | null = null;
    if (formData.metal.includes('24K')) purity = '24K';
    else if (formData.metal.includes('22K') || formData.metal === 'Gold') purity = '22K';
    else if (formData.metal.includes('18K')) purity = '18K';
    else if (formData.metal.includes('14K')) purity = '14K';

    if (purity) {
      const calculation = calculateGoldPrice(
        parseFloat(weight),
        purity,
        goldSettings,
        parseFloat(formData.taxRate)
      );
      
      // Update price with calculated total
      setFormData(prev => ({
        ...prev,
        price: calculation.total.toFixed(2),
      }));
    }
  }, [weight, formData.metal, formData.taxRate, autoCalculate, goldSettings]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields with user feedback
    if (!formData.name || !formData.type || !formData.metal || !formData.price || !formData.inStock) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (Name, Type, Metal, Price, and Stock Quantity).",
        variant: "destructive"
      });
      return;
    }

    // Validate price is a valid number
    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0.",
        variant: "destructive"
      });
      return;
    }

    // Validate stock is a valid number
    const stock = parseInt(formData.inStock);
    if (isNaN(stock) || stock < 0) {
      toast({
        title: "Invalid Stock Quantity",
        description: "Please enter a valid stock quantity (0 or greater).",
        variant: "destructive"
      });
      return;
    }

    try {
      onAdd({
        name: formData.name,
        type: formData.type,
        gemstone: formData.gemstone || "None",
        carat: formData.carat ? parseFloat(formData.carat) : 0,
        metal: formData.metal,
        price: price,
        inStock: stock,
        isArtificial: formData.isArtificial,
        image: images[0] || "",
        image_1: images[0] || undefined,
        image_2: images[1] || undefined,
        image_3: images[2] || undefined,
        image_4: images[3] || undefined,
        taxRate: parseFloat(formData.taxRate),
        taxIncluded: formData.taxIncluded,
        taxCategory: formData.taxCategory,
        barcode: formData.barcode || undefined,
        sku: formData.sku || undefined,
      });
    } catch (error) {
      console.error("Error adding item:", error);
      toast({
        title: "Error",
        description: "Failed to add item. Please try again.",
        variant: "destructive"
      });
      return;
    }

    // Reset form
    setFormData({
      name: "",
      type: "",
      gemstone: "",
      carat: "",
      metal: "",
      price: "",
      inStock: "",
      isArtificial: false,
      taxRate: "3",
      taxIncluded: false,
      taxCategory: "jewelry",
      barcode: "",
      sku: "",
    });
    setImages([null, null, null, null]);
    setWeight("");
    setAutoCalculate(false);
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] bg-card flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-foreground">Add New Jewelry Item</DialogTitle>
          <DialogDescription>
            Add a new jewelry item to your inventory with images and pricing details
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 overflow-y-auto pr-2 flex-1">
          {/* Multi-Image Upload Section */}
          <MultiImageUpload 
            images={images}
            onImagesChange={setImages}
            maxImages={4}
            label="Item Images"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                placeholder="e.g., Diamond Solitaire Ring"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData(prev => ({...prev, type: value}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {jewelryTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gemstone">Gemstone</Label>
              <Select 
                value={formData.gemstone} 
                onValueChange={(value) => setFormData(prev => ({...prev, gemstone: value}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gemstone" />
                </SelectTrigger>
                <SelectContent>
                  {gemstones.map(stone => (
                    <SelectItem key={stone} value={stone}>{stone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="carat">Carat Weight</Label>
              <Input
                id="carat"
                type="number"
                step="0.1"
                value={formData.carat}
                onChange={(e) => setFormData(prev => ({...prev, carat: e.target.value}))}
                placeholder="e.g., 2.5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metal">Metal *</Label>
            <Select 
              value={formData.metal} 
              onValueChange={(value) => setFormData(prev => ({...prev, metal: value}))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select metal" />
              </SelectTrigger>
              <SelectContent>
                {metals.map(metal => (
                  <SelectItem key={metal} value={metal}>{metal}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Gold Price Calculator */}
          {formData.metal && formData.metal.includes('Gold') && (
            <div className="space-y-3 bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-lg border-2 border-yellow-300">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-yellow-900 flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Gold Price Calculator
                </h4>
                <Switch
                  id="autoCalculate"
                  checked={autoCalculate}
                  onCheckedChange={setAutoCalculate}
                />
              </div>
              
              {autoCalculate && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="weight" className="text-yellow-900">
                      Weight (grams) *
                    </Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.001"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="Enter weight in grams"
                      className="bg-white"
                    />
                  </div>

                  {weight && parseFloat(weight) > 0 && (() => {
                    let purity: '24K' | '22K' | '18K' | '14K' | null = null;
                    if (formData.metal.includes('24K')) purity = '24K';
                    else if (formData.metal.includes('22K')) purity = '22K';
                    else if (formData.metal.includes('18K')) purity = '18K';
                    else if (formData.metal.includes('14K')) purity = '14K';

                    if (!purity) return null;

                    const calc = calculateGoldPrice(
                      parseFloat(weight),
                      purity,
                      goldSettings,
                      parseFloat(formData.taxRate)
                    );

                    return (
                      <div className="space-y-2 bg-white p-3 rounded border border-yellow-300">
                        <div className="text-xs font-semibold text-yellow-900 uppercase tracking-wide">
                          Price Breakdown
                        </div>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Gold Rate ({purity}):</span>
                            <span className="font-medium">₹{calc.goldRate}/gram</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Weight:</span>
                            <span className="font-medium">{weight}g</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Gold Cost:</span>
                            <span className="font-medium">₹{calc.goldCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Making Charges:</span>
                            <span className="font-medium">₹{calc.makingCharges.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center border-t pt-1.5">
                            <span className="text-gray-700 font-medium">Subtotal:</span>
                            <span className="font-semibold">₹{calc.subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">GST ({formData.taxRate}%):</span>
                            <span className="font-medium">₹{calc.gst.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center border-t pt-1.5 bg-yellow-100 -mx-3 px-3 py-2 rounded">
                            <span className="text-yellow-900 font-bold">Total Price:</span>
                            <span className="text-xl font-bold text-yellow-900">₹{calc.total.toFixed(2)}</span>
                          </div>
                        </div>
                        <p className="text-xs text-yellow-700 mt-2">
                          ✓ Price automatically calculated and updated
                        </p>
                      </div>
                    );
                  })()}

                  <p className="text-xs text-yellow-700">
                    💡 Toggle ON to auto-calculate price based on weight, current gold rate, and making charges
                  </p>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (₹) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({...prev, price: e.target.value}))}
                placeholder="e.g., 1500.00"
                required
                disabled={autoCalculate}
                className={autoCalculate ? "bg-gray-100" : ""}
              />
              {autoCalculate && (
                <p className="text-xs text-muted-foreground">Auto-calculated from weight</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stock">Stock Quantity *</Label>
              <Input
                id="stock"
                type="number"
                value={formData.inStock}
                onChange={(e) => setFormData(prev => ({...prev, inStock: e.target.value}))}
                placeholder="e.g., 5"
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="artificial"
              checked={formData.isArtificial}
              onCheckedChange={(checked) => setFormData(prev => ({...prev, isArtificial: checked}))}
            />
            <Label htmlFor="artificial">Artificial Jewelry</Label>
          </div>

          {/* Barcode/SKU Section */}
          <div className="space-y-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 text-sm flex items-center">
              <Barcode className="h-4 w-4 mr-2" />
              Barcode & SKU (Optional)
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <div className="flex gap-2">
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData(prev => ({...prev, barcode: e.target.value}))}
                    placeholder="Scan or enter barcode"
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setFormData(prev => ({...prev, barcode: generateBarcode()}))}
                    title="Generate barcode"
                  >
                    <Barcode className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sku">SKU / Item Code</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({...prev, sku: e.target.value}))}
                  placeholder="e.g., RING-001"
                />
              </div>
            </div>
            
            <p className="text-xs text-blue-700">
              💡 Add a barcode for quick lookup in POS. Click the barcode icon to auto-generate one.
            </p>
          </div>

          {/* Tax Configuration Section */}
          <div className="space-y-4 bg-amber-50 p-4 rounded-lg border border-amber-200">
            <h4 className="font-semibold text-amber-900 text-sm flex items-center">
              <span className="mr-2">📊</span> Tax Configuration (GST)
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxRate">GST Rate (%) *</Label>
                <Select 
                  value={formData.taxRate} 
                  onValueChange={(value) => setFormData(prev => ({...prev, taxRate: value}))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (Exempt)</SelectItem>
                    <SelectItem value="0.25">0.25%</SelectItem>
                    <SelectItem value="1">1%</SelectItem>
                    <SelectItem value="3">3% (Standard Jewelry)</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12% (Artificial/Imitation)</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="28">28%</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-amber-700">
                  {formData.taxRate === "3" && "✓ Standard rate for gold/silver jewelry"}
                  {formData.taxRate === "12" && "✓ Common rate for artificial jewelry"}
                  {formData.taxRate === "5" && "✓ Rate for precious & semi-precious stones"}
                  {formData.taxRate === "0" && "⚠️ Tax exempt item"}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="taxCategory">Tax Category</Label>
                <Select 
                  value={formData.taxCategory} 
                  onValueChange={(value) => setFormData(prev => ({...prev, taxCategory: value as any}))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jewelry">Gold/Silver Jewelry</SelectItem>
                    <SelectItem value="artificial">Artificial/Imitation</SelectItem>
                    <SelectItem value="gemstones">Gemstones</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-white p-3 rounded border border-amber-300">
              <Switch
                id="taxIncluded"
                checked={formData.taxIncluded}
                onCheckedChange={(checked) => setFormData(prev => ({...prev, taxIncluded: checked}))}
              />
              <div>
                <Label htmlFor="taxIncluded" className="cursor-pointer">Tax Included in Price</Label>
                <p className="text-xs text-gray-600">
                  {formData.taxIncluded 
                    ? "Price already includes GST" 
                    : "GST will be added to the price"}
                </p>
              </div>
            </div>

            {/* Tax Preview */}
            {formData.price && (
              <div className="bg-white p-3 rounded border border-amber-300 text-sm">
                <div className="font-medium text-amber-900 mb-2">Price Breakdown:</div>
                {formData.taxIncluded ? (
                  <div className="space-y-1 text-gray-700">
                    <div className="flex justify-between">
                      <span>Total Price (incl. GST):</span>
                      <span className="font-bold">₹{parseFloat(formData.price || "0").toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Base Price:</span>
                      <span>₹{(parseFloat(formData.price || "0") / (1 + parseFloat(formData.taxRate) / 100)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>GST ({formData.taxRate}%):</span>
                      <span>₹{(parseFloat(formData.price || "0") - (parseFloat(formData.price || "0") / (1 + parseFloat(formData.taxRate) / 100))).toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-gray-700">
                    <div className="flex justify-between">
                      <span>Base Price:</span>
                      <span>₹{parseFloat(formData.price || "0").toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST ({formData.taxRate}%):</span>
                      <span>₹{(parseFloat(formData.price || "0") * parseFloat(formData.taxRate) / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-1">
                      <span>Total Price:</span>
                      <span>₹{(parseFloat(formData.price || "0") * (1 + parseFloat(formData.taxRate) / 100)).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          </div>

          {/* Sticky Footer with Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t mt-4 flex-shrink-0 bg-card">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-gold hover:bg-gold-dark text-primary transition-smooth"
            >
              Add Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
