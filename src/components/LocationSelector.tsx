import { useState, useEffect } from "react";
import { MapPin, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { getFromSupabase } from "@/lib/supabaseDirect";
import { getSupabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";

interface Location {
  id: string;
  name: string;
  address: string;
}

interface LocationSelectorProps {
  onLocationChange: (locationId: string | 'all') => void;
  showAllOption?: boolean;
  className?: string;
}

export const LocationSelector = ({ onLocationChange, showAllOption = true, className }: LocationSelectorProps) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | 'all'>(showAllOption ? 'all' : null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const data = await getFromSupabase<Location>('locations');
        setLocations(data);
        
        // Check if there's a current location in user metadata
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        const userLocId = session?.user?.user_metadata?.location_id;
        
        if (userLocId && !showAllOption) {
          const current = data.find(l => l.id === userLocId);
          if (current) {
            setSelectedLocation(current);
            onLocationChange(current.id);
          }
        }
      } catch (error) {
        console.error('Error fetching locations for selector:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  const handleSelect = (loc: Location | 'all') => {
    setSelectedLocation(loc);
    onLocationChange(loc === 'all' ? 'all' : loc.id);
  };

  if (loading) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={`rounded-xl border-slate-200 font-bold px-4 gap-2 ${className}`}>
          <MapPin className="h-4 w-4 text-primary" />
          <span className="truncate max-w-[120px]">
            {selectedLocation === 'all' ? 'All Branches' : selectedLocation?.name}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px] rounded-xl shadow-xl border-slate-100">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">
          Select Branch
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {showAllOption && (
          <DropdownMenuItem onClick={() => handleSelect('all')} className="flex justify-between items-center rounded-lg">
            <span>All Branches</span>
            {selectedLocation === 'all' && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        )}
        {locations.map((loc) => (
          <DropdownMenuItem 
            key={loc.id} 
            onClick={() => handleSelect(loc)}
            className="flex justify-between items-center rounded-lg"
          >
            <div className="flex flex-col">
              <span className="font-bold">{loc.name}</span>
              <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{loc.address}</span>
            </div>
            {typeof selectedLocation !== 'string' && selectedLocation?.id === loc.id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
