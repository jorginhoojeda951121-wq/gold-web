import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
}

interface SupplierInvoicesTabProps {
  vendors: Vendor[];
  onUpdate: () => void;
}

export function SupplierInvoicesTab({ vendors, onUpdate }: SupplierInvoicesTabProps) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Supplier Invoices Management</h3>
        <p className="text-muted-foreground mb-4">
          Track and manage invoices from suppliers
        </p>
        <p className="text-sm text-muted-foreground">
          {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} available
        </p>
      </CardContent>
    </Card>
  );
}

