import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle, 
  Scale, 
  TrendingDown, 
  Plus, 
  Calculator,
  ArrowDownIcon,
  ArrowUpIcon,
  AlertCircle
} from "lucide-react";
import { formatInr } from "@/lib/calculations";
import { RawMaterial } from "./AddCraftsmanDialog";

interface JobReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: RawMaterial;
  craftsmanName: string;
  onComplete: (returnDetails: JobReturnDetails) => void;
}

export interface JobReturnDetails {
  receivedWeight: number;    // Gross weight received back
  fineWeight: number;        // Calculated fine weight based on touch
  wastageGrams: number;      // Actual wastage in grams
  scrapWeight: number;       // Scrap weight received back
  makingCharge: number;      // Final making charge
  notes: string;
  paymentMethod: 'Cash' | 'UPI' | 'Bank' | 'Ledger';
}

export const JobReturnDialog = ({
  open,
  onOpenChange,
  material,
  craftsmanName,
  onComplete
}: JobReturnDialogProps) => {
  const [returnWeight, setReturnWeight] = useState("");
  const [scrapWeight, setScrapWeight] = useState("0");
  const [wastageAllowed, setWastageAllowed] = useState("0.5"); // Default % or g
  const [touch, setTouch] = useState("91.6"); // Default 22K (916)
  const [makingChargeType, setMakingChargeType] = useState<'per_gram' | 'total'>('per_gram');
  const [makingChargeValue, setMakingChargeValue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Ledger'>('Ledger');
  const [notes, setNotes] = useState("");

  const assignedWeight = material.quantity || 0;
  
  // Calculations
  const totalReceived = (parseFloat(returnWeight) || 0) + (parseFloat(scrapWeight) || 0);
  const totalWastage = Math.max(0, assignedWeight - totalReceived);
  const fineWeight = (parseFloat(returnWeight) || 0) * (parseFloat(touch) / 100);
  
  const calculatedMaking = makingChargeType === 'per_gram' 
    ? (parseFloat(returnWeight) || 0) * (parseFloat(makingChargeValue) || 0)
    : (parseFloat(makingChargeValue) || 0);

  const handleComplete = () => {
    onComplete({
      receivedWeight: parseFloat(returnWeight) || 0,
      fineWeight: fineWeight,
      wastageGrams: totalWastage,
      scrapWeight: parseFloat(scrapWeight) || 0,
      makingCharge: calculatedMaking,
      notes: notes,
      paymentMethod: paymentMethod === 'Ledger' ? 'Ledger' : (paymentMethod as any)
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-slate-50">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2 text-2xl font-black text-slate-800">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
            Job Return: {craftsmanName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
               <Label className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2 block">Issue Summary</Label>
               <div className="flex justify-between items-end">
                  <div>
                    <p className="text-sm text-slate-500">Material Issued</p>
                    <p className="text-2xl font-black text-slate-900">{assignedWeight} {material.unit}</p>
                    <p className="text-xs font-bold text-slate-500 opacity-80">{material.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Agreed Amount</p>
                    <p className="text-xl font-bold text-slate-900">₹{material.agreedAmount?.toLocaleString() || '0'}</p>
                  </div>
               </div>
            </div>

            <div className="space-y-4">
               <div className="space-y-2">
                  <Label className="font-bold flex items-center gap-2">
                    <ArrowDownIcon className="h-4 w-4 text-emerald-500" />
                    Finished Weight (grams)
                  </Label>
                  <Input 
                    type="number" 
                    placeholder="0.000" 
                    className="h-12 text-lg font-bold border-2 focus:border-emerald-500"
                    value={returnWeight}
                    onChange={(e) => setReturnWeight(e.target.value)}
                  />
               </div>

               <div className="space-y-2">
                  <Label className="font-bold flex items-center gap-2">
                    <Scale className="h-4 w-4 text-slate-400" />
                    Scrap/Dust Weight (grams)
                  </Label>
                  <Input 
                    type="number" 
                    placeholder="0.000" 
                    className="h-12 border-slate-200"
                    value={scrapWeight}
                    onChange={(e) => setScrapWeight(e.target.value)}
                  />
               </div>

               <div className="space-y-2">
                  <Label className="font-bold flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-slate-400" />
                    Touch % (Purity)
                  </Label>
                  <Input 
                    type="number" 
                    placeholder="91.6" 
                    className="h-12 border-slate-200"
                    value={touch}
                    onChange={(e) => setTouch(e.target.value)}
                  />
               </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-sm space-y-4">
               <h4 className="font-black text-slate-800 uppercase tracking-tighter text-sm border-b pb-2 flex justify-between items-center">
                  <span>Recovery Analysis</span>
                  <div className={`p-1 px-2 rounded text-[10px] ${totalWastage > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {totalWastage > 0 ? 'LOSS OBSERVED' : 'COMPLETE RECOVERY'}
                  </div>
               </h4>
               
               <div className="space-y-3">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-slate-500 font-medium">Fine Gold Yield</span>
                    <span className="font-bold text-slate-900">{fineWeight.toFixed(3)} g</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-slate-500 font-medium">Net Wastage (g)</span>
                    <span className={`font-bold ${totalWastage > 0.5 ? 'text-rose-600' : 'text-amber-600'}`}>
                      {totalWastage.toFixed(3)} g
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t font-black">
                    <span className="text-slate-800">Total Accounted</span>
                    <span className="text-slate-800">{totalReceived.toFixed(3)} / {assignedWeight} g</span>
                  </div>
               </div>
            </div>

            <div className="space-y-4 pt-2">
               <Label className="font-black text-xs uppercase tracking-widest text-slate-500">Making Charges</Label>
               <div className="flex gap-2 mb-2">
                  <Button 
                    variant={makingChargeType === 'per_gram' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 rounded-xl h-10 font-bold"
                    onClick={() => setMakingChargeType('per_gram')}
                  >
                    Per Gram
                  </Button>
                  <Button 
                    variant={makingChargeType === 'total' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 rounded-xl h-10 font-bold"
                    onClick={() => setMakingChargeType('total')}
                  >
                    Lump Sum
                  </Button>
               </div>
               <Input 
                  type="number" 
                  placeholder={makingChargeType === 'per_gram' ? "Rate per gram" : "Total Amount"} 
                  className="h-12 text-lg font-bold border-2"
                  value={makingChargeValue}
                  onChange={(e) => setMakingChargeValue(e.target.value)}
               />
               <p className="text-right text-xs font-black text-blue-600 uppercase">
                  Total Payable: {formatInr(calculatedMaking)}
               </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 text-amber-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-xs font-medium">
            Completing this return will update the Karigar's personal ledger and release the assigned metal from their balance.
          </p>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" className="rounded-xl px-6" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-12 font-bold" onClick={handleComplete}>
            Confirm Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
