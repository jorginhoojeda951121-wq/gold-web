import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  DollarSign, 
  Calendar,
  Receipt,
  Edit,
  X,
  Wallet
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  creditLimit: number;
  currentBalance: number;
  totalPurchases: number;
  lastPurchaseDate: string;
  status: 'active' | 'suspended' | 'blacklisted';
}

interface Transaction {
  id: string;
  customerId: string;
  type: 'purchase' | 'payment' | 'credit_adjustment';
  amount: number;
  description: string;
  date: string;
  invoiceId?: string;
  paymentMethod?: string;
}

interface CustomerDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  transactions: Transaction[];
  onEdit?: (customer: Customer) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800 border-green-200';
    case 'suspended': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'blacklisted': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getTransactionTypeColor = (type: string) => {
  switch (type) {
    case 'purchase': return 'bg-blue-100 text-blue-800';
    case 'payment': return 'bg-green-100 text-green-800';
    case 'credit_adjustment': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const CustomerDetailsDialog = ({ 
  open, 
  onOpenChange, 
  customer, 
  transactions,
  onEdit
}: CustomerDetailsDialogProps) => {
  if (!customer) return null;

  const customerTransactions = transactions.filter(t => t.customerId === customer.id);
  const totalPurchases = customerTransactions
    .filter(t => t.type === 'purchase')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalPayments = customerTransactions
    .filter(t => t.type === 'payment')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[800px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-green-600" />
              <span>Customer Details: {customer.name}</span>
            </div>
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onEdit(customer);
                  onOpenChange(false);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Customer
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{customer.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">Customer ID: {customer.id}</p>
                </div>
                <Badge className={getStatusColor(customer.status)}>
                  {customer.status || 'active'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{customer.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{customer.email || 'Not provided'}</span>
                  </div>
                  <div className="flex items-start space-x-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div>
                      <span className="text-gray-600">Address:</span>
                      <span className="font-medium block">{customer.address || 'Not provided'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm">
                    <CreditCard className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Loan Amount:</span>
                    <span className="font-medium">₹{(customer.creditLimit || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Current Balance:</span>
                    <span className={`font-bold ${(customer.currentBalance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{(customer.currentBalance || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Last Purchase:</span>
                    <span className="font-medium">
                      {customer.lastPurchaseDate 
                        ? new Date(customer.lastPurchaseDate).toLocaleDateString() 
                        : 'Never'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Purchases</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ₹{totalPurchases.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Payments</p>
                  <p className="text-2xl font-bold text-green-600">
                    ₹{totalPayments.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Outstanding Balance</p>
                  <p className="text-2xl font-bold text-red-600">
                    ₹{(customer.currentBalance || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              
              {/* Credit Utilization */}
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Credit Utilization</span>
                  <span className="font-medium">
                    {customer.creditLimit > 0 
                      ? `${Math.round(((customer.currentBalance || 0) / customer.creditLimit) * 100)}%`
                      : '0%'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      (customer.currentBalance || 0) / (customer.creditLimit || 1) > 0.8 
                        ? 'bg-red-600' 
                        : (customer.currentBalance || 0) / (customer.creditLimit || 1) > 0.5
                        ? 'bg-yellow-600'
                        : 'bg-green-600'
                    }`}
                    style={{
                      width: `${Math.min(
                        ((customer.currentBalance || 0) / (customer.creditLimit || 1)) * 100,
                        100
                      )}%`
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Repayment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Wallet className="h-5 w-5" />
                <span>Repayment Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Repayments</p>
                  <p className="text-2xl font-bold text-green-600">
                    ₹{customerTransactions
                      .filter(t => t.type === 'payment')
                      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
                      .toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {customerTransactions.filter(t => t.type === 'payment').length} payment(s)
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Purchases</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ₹{customerTransactions
                      .filter(t => t.type === 'purchase')
                      .reduce((sum, t) => sum + t.amount, 0)
                      .toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {customerTransactions.filter(t => t.type === 'purchase').length} purchase(s)
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Average Repayment</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ₹{(() => {
                      const repayments = customerTransactions.filter(t => t.type === 'payment');
                      return repayments.length > 0
                        ? (repayments.reduce((sum, t) => sum + Math.abs(t.amount), 0) / repayments.length).toLocaleString(undefined, { maximumFractionDigits: 0 })
                        : '0';
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Per payment
                  </p>
                </div>
              </div>

              {/* Repayment Timeline Chart */}
              {customerTransactions.filter(t => t.type === 'payment').length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Repayment Timeline</h4>
                  <div className="space-y-2">
                    {customerTransactions
                      .filter(t => t.type === 'payment')
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 5)
                      .map((transaction, index) => (
                        <div key={transaction.id} className="flex items-center space-x-3">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{new Date(transaction.date).toLocaleDateString()}</span>
                              <span className="text-sm font-bold text-green-600">
                                ₹{Math.abs(transaction.amount).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Receipt className="h-5 w-5" />
                  <span>Detailed Transaction History</span>
                  <Badge variant="secondary">
                    {customerTransactions.length} transactions
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customerTransactions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No transactions found</p>
              ) : (
                <div className="space-y-3">
                  {customerTransactions
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(transaction => (
                      <div 
                        key={transaction.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge className={getTransactionTypeColor(transaction.type)}>
                              {transaction.type === 'purchase' ? 'Purchase' :
                               transaction.type === 'payment' ? 'Repayment' :
                               'Credit Adjustment'}
                            </Badge>
                            {transaction.invoiceId && (
                              <span className="text-xs text-gray-500">Invoice: {transaction.invoiceId}</span>
                            )}
                            <span className="text-xs text-gray-400">
                              #{transaction.id.slice(-6)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">
                            {transaction.description}
                          </p>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(transaction.date).toLocaleDateString('en-IN', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</span>
                            </span>
                            {transaction.paymentMethod && (
                              <span>Method: {transaction.paymentMethod}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${
                            transaction.amount > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {transaction.amount > 0 ? '+' : ''}₹{Math.abs(transaction.amount).toLocaleString()}
                          </p>
                          {transaction.type === 'payment' && (
                            <p className="text-xs text-green-600 mt-1">Repayment</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

