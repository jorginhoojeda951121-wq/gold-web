import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
}

interface PurchaseOrdersTabProps {
  vendors: Vendor[];
  onUpdate: () => void;
}

export function PurchaseOrdersTab({ vendors, onUpdate }: PurchaseOrdersTabProps) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Purchase Orders Management</h3>
        <p className="text-muted-foreground mb-4">
          Create and manage purchase orders with vendors
        </p>
        <p className="text-sm text-muted-foreground">
          {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} available
        </p>
      </CardContent>
    </Card>
  );
}

