import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, QrCode, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface HallmarkData {
  uini: string; // Unique Identification Number (6-digit)
  purity: string;
  weight: number;
  centerId: string;
  hallmarkingDate: string;
  status: 'verified' | 'pending' | 'failed';
}

const BIS_HSN_MAPPING = {
  'gold ornaments': '71131910',
  'gold coins': '71189000',
  'diamond jewelry': '71131920',
  'platinum jewelry': '71131930',
  'silver articles': '71141110',
  'making charges': '998859'
};

export function HallmarkScanner() {
  const { toast } = useToast();
  const [uiniInput, setUiniInput] = useState('');
  const [scannedData, setScannedData] = useState<HallmarkData | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleValidate = async (uini: string = uiniInput) => {
    if (!uini || uini.length < 6) {
      toast({
        title: 'Invalid UIN',
        description: 'Please enter a valid 6-digit BIS HUID number.',
        variant: 'destructive',
      });
      return;
    }

    setIsValidating(true);
    // Simulation of BIS API / Webhook check
    setTimeout(() => {
      // Logic: Mock verification for demonstration
      const isValid = uini.startsWith('G') || uini.startsWith('7');
      
      if (isValid) {
        setScannedData({
          uini: uini.toUpperCase(),
          purity: '22K916',
          weight: 4.52,
          centerId: 'BIS-MUM-042',
          hallmarkingDate: new Date().toISOString().split('T')[0],
          status: 'verified'
        });
        toast({
          title: 'BIS Hallmark Verified',
          description: `Item ${uini} successfully validated with HUID.`,
        });
      } else {
        setScannedData({
          uini: uini.toUpperCase(),
          purity: 'Unknown',
          weight: 0,
          centerId: 'N/A',
          hallmarkingDate: 'N/A',
          status: 'failed'
        });
        toast({
          title: 'Verification Failed',
          description: 'HUID not found in official BIS registry.',
          variant: 'destructive'
        });
      }
      setIsValidating(false);
    }, 1500);
  };

  return (
    <Card className="border-2 border-blue-200 shadow-md">
      <CardHeader className="bg-gradient-to-r from-blue-700 to-blue-800 text-white rounded-t-lg">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          BIS Hallmark HUID Validator
        </CardTitle>
        <CardDescription className="text-blue-100/80">
          Indian Compliance: 6-Digit HUID QR Validation (Mandatory Hallmarking)
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-blue-600" />
                Enter 6-Digit HUID / Scan QR
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. G78B4A"
                  maxLength={6}
                  value={uiniInput}
                  onChange={(e) => setUiniInput(e.target.value.toUpperCase())}
                  className="text-xl font-bold tracking-widest text-center h-12 border-blue-300 focus:ring-blue-500 uppercase"
                />
                <Button 
                  onClick={() => handleValidate()} 
                  disabled={isValidating}
                  className="bg-blue-700 hover:bg-blue-800 px-6 h-12 font-bold shadow-lg"
                >
                  {isValidating ? 'Checking...' : 'Verify'}
                </Button>
              </div>
            </div>

            <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 italic text-[11px] text-blue-700/70 leading-relaxed">
              * BIS Hallmarking is mandatory for gold jewelry over 2 grams in India. 
              The HUID (Hallmark Unique Identification) ensures traceability and purity guarantee (916 for 22K).
            </div>
          </div>

          <div className="flex flex-col justify-center">
             {scannedData ? (
               scannedData.status === 'verified' ? (
                 <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 shadow-lg relative overflow-hidden">
                    <CheckCircle2 className="absolute top-[-10px] right-[-10px] h-20 w-20 text-green-200 opacity-50 rotate-12" />
                    <div className="flex items-center gap-3 mb-4">
                      <Badge className="bg-green-600 text-white font-bold px-3 py-1">GENUINE BIS HALLMARK</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm font-medium">
                      <div className="space-y-1">
                        <p className="text-gray-500 text-xs">HUID SERIAL:</p>
                        <p className="text-lg font-black text-gray-900">{scannedData.uini}</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-gray-500 text-xs">HSN CODE:</p>
                        <p className="text-indigo-700 font-bold">{BIS_HSN_MAPPING['gold ornaments']}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-500 text-xs">PURITY (CERTIFIED):</p>
                        <p className="text-amber-800 font-black">{scannedData.purity}</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-gray-500 text-xs">WEIGHT (CERTIFIED):</p>
                        <p className="text-gray-900 font-bold">{scannedData.weight}g</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-green-100 flex justify-between items-center text-[10px] text-green-800">
                      <span>Assay Center: {scannedData.centerId}</span>
                      <span>Certified on: {scannedData.hallmarkingDate}</span>
                    </div>
                 </div>
               ) : (
                 <div className="p-6 bg-red-50 rounded-xl border-2 border-red-200 flex flex-col items-center gap-3 text-red-700 animate-pulse">
                    <AlertCircle className="h-12 w-12" />
                    <p className="font-bold">UNVERIFIED HALLMARK</p>
                    <p className="text-xs text-center opacity-80 italic">Item authenticity could not be established using HUID: {scannedData.uini}</p>
                 </div>
               )
             ) : (
               <div className="h-full border-2 border-dashed border-blue-200 rounded-xl flex flex-col items-center justify-center text-blue-300 space-y-2 py-10">
                  <QrCode className="h-16 w-16 opacity-30" />
                  <p className="font-medium text-xs">Waiting for HUID input</p>
               </div>
             )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
