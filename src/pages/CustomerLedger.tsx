import { useState } from "react";
import { Users, Plus, Search, CreditCard, DollarSign, Calendar, Phone, Mail, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { CustomerDetailsDialog } from "@/components/CustomerDetailsDialog";
import { enqueueChange } from "@/lib/sync";

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

export const CustomerLedger = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Use customers key - data will be auto-populated by seedWebData
  const { data: customers, updateData: setCustomers } = useOfflineStorage<Customer[]>('customers', []);

  const { data: transactions, updateData: setTransactions } = useOfflineStorage<Transaction[]>('customer_transactions', [
    {
      id: "1",
      customerId: "1",
      type: 'purchase',
      amount: 25000,
      description: "Gold necklace purchase",
      date: "2024-01-15",
      invoiceId: "INV-001",
      paymentMethod: "Credit"
    },
    {
      id: "2",
      customerId: "1",
      type: 'payment',
      amount: 10000,
      description: "Partial payment",
      date: "2024-01-20",
      paymentMethod: "Cash"
    },
    {
      id: "3",
      customerId: "2",
      type: 'purchase',
      amount: 45000,
      description: "Diamond ring purchase",
      date: "2024-01-10",
      invoiceId: "INV-002",
      paymentMethod: "Cash"
    }
  ]);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    creditLimit: ""
  });

  const [transactionData, setTransactionData] = useState({
    type: 'payment' as 'purchase' | 'payment' | 'credit_adjustment',
    amount: "",
    description: "",
    paymentMethod: "Cash"
  });

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCustomerTransactions = (customerId: string) => {
    return transactions.filter(t => t.customerId === customerId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      case 'blacklisted': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddCustomer = () => {
    if (!formData.name || !formData.phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in customer name and phone number.",
        variant: "destructive"
      });
      return;
    }

    const newCustomer: Customer = {
      id: Date.now().toString(),
      ...formData,
      creditLimit: parseFloat(formData.creditLimit) || 0,
      currentBalance: 0,
      totalPurchases: 0,
      lastPurchaseDate: "",
      status: 'active'
    };

    setCustomers(prev => [...prev, newCustomer]);

    // Push to Supabase
    enqueueChange('customers', 'upsert', {
      id: newCustomer.id,
      name: newCustomer.name,
      email: newCustomer.email,
      phone: newCustomer.phone,
      address: newCustomer.address,
      credit_limit: newCustomer.creditLimit,
      current_balance: newCustomer.currentBalance,
      total_purchases: newCustomer.totalPurchases,
      last_purchase_date: newCustomer.lastPurchaseDate || null,
      status: newCustomer.status,
      updated_at: new Date().toISOString(),
    });

    setFormData({ name: "", phone: "", email: "", address: "", creditLimit: "" });
    setShowAddDialog(false);
    
    toast({
      title: "Customer Added",
      description: `${newCustomer.name} has been added to the ledger.`
    });
  };

  const handleAddTransaction = () => {
    if (!selectedCustomer || !transactionData.amount || !transactionData.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all transaction details.",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(transactionData.amount);
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      customerId: selectedCustomer.id,
      type: transactionData.type,
      amount: transactionData.type === 'payment' ? -amount : amount,
      description: transactionData.description,
      date: new Date().toISOString(),
      paymentMethod: transactionData.paymentMethod
    };

    setTransactions(prev => [...prev, newTransaction]);

    // Push transaction
    enqueueChange('customer_transactions', 'upsert', {
      id: newTransaction.id,
      customer_id: newTransaction.customerId,
      type: newTransaction.type,
      amount: newTransaction.amount,
      description: newTransaction.description,
      date: newTransaction.date,
      invoice_id: newTransaction.invoiceId ?? null,
      payment_method: newTransaction.paymentMethod ?? null,
      updated_at: new Date().toISOString(),
    });

    // Update customer balance and totals, then push customer
    setCustomers(prev => prev.map(customer => 
      customer.id === selectedCustomer.id
        ? {
            ...customer,
            currentBalance: (customer.currentBalance || 0) + newTransaction.amount,
            totalPurchases: transactionData.type === 'purchase' 
              ? (customer.totalPurchases || 0) + amount 
              : (customer.totalPurchases || 0),
            lastPurchaseDate: transactionData.type === 'purchase' 
              ? new Date().toISOString().split('T')[0]
              : (customer.lastPurchaseDate || new Date().toISOString().split('T')[0])
          }
        : customer
    ));

    // After local update, enqueue latest customer snapshot
    const updatedAt = new Date().toISOString();
    enqueueChange('customers', 'upsert', {
      id: selectedCustomer.id,
      name: selectedCustomer.name,
      email: selectedCustomer.email,
      phone: selectedCustomer.phone,
      address: selectedCustomer.address,
      credit_limit: selectedCustomer.creditLimit,
      current_balance: (selectedCustomer.currentBalance || 0) + newTransaction.amount,
      total_purchases: selectedCustomer.totalPurchases + (transactionData.type === 'purchase' ? amount : 0),
      last_purchase_date: transactionData.type === 'purchase' ? new Date().toISOString().split('T')[0] : selectedCustomer.lastPurchaseDate,
      status: selectedCustomer.status,
      updated_at: updatedAt,
    });

    setTransactionData({ type: 'payment', amount: "", description: "", paymentMethod: "Cash" });
    setShowTransactionDialog(false);
    
    toast({
      title: "Transaction Added",
      description: `${transactionData.type} transaction has been recorded.`
    });
  };

  const totalCreditOutstanding = customers.reduce((sum, customer) => sum + customer.currentBalance, 0);
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const totalCustomers = customers.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Customer Ledger</h2>
          <p className="text-gray-600">Manage customer credit and transactions</p>
        </div>
        <Button 
          onClick={() => setShowAddDialog(true)}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold">{totalCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Active Customers</p>
                <p className="text-2xl font-bold">{activeCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Credit Outstanding</p>
                <p className="text-2xl font-bold">₹{totalCreditOutstanding.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Transactions Today</p>
                <p className="text-2xl font-bold">
                  {transactions.filter(t => new Date(t.date).toDateString() === new Date().toDateString()).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto -mx-6 px-6">
          <div className="min-w-full">
            <UITable>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Customer</TableHead>
                  <TableHead className="min-w-[150px]">Contact</TableHead>
                  <TableHead className="min-w-[120px]">Loan Amount</TableHead>
                  <TableHead className="min-w-[120px]">Current Balance</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map(customer => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium whitespace-nowrap">{customer.name}</p>
                        <p className="text-sm text-gray-600 truncate max-w-[150px]">{customer.address}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1 text-sm whitespace-nowrap">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{customer.phone}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm whitespace-nowrap">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate max-w-[140px]">{customer.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">₹{(customer.creditLimit || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`whitespace-nowrap ${(customer.currentBalance || 0) > 0 ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                        ₹{(customer.currentBalance || 0).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(customer.status || 'active')}>
                        {customer.status || 'active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowDetailsDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowTransactionDialog(true);
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </UITable>
          </div>
        </CardContent>
      </Card>

      {/* Add Customer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="customer-name">Name *</Label>
              <Input
                id="customer-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                placeholder="Customer name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer-phone">Phone *</Label>
                <Input
                  id="customer-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <Label htmlFor="customer-email">Email</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                  placeholder="customer@example.com"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="customer-address">Address</Label>
              <Textarea
                id="customer-address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({...prev, address: e.target.value}))}
                placeholder="Customer address"
              />
            </div>
            <div>
              <Label htmlFor="credit-limit">Loan Amount (₹)</Label>
              <Input
                id="credit-limit"
                type="number"
                value={formData.creditLimit}
                onChange={(e) => setFormData(prev => ({...prev, creditLimit: e.target.value}))}
                placeholder="100000"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCustomer} className="bg-green-600 hover:bg-green-700">
                Add Customer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transaction - {selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="transaction-type">Transaction Type</Label>
              <select
                id="transaction-type"
                value={transactionData.type}
                onChange={(e) => setTransactionData(prev => ({...prev, type: e.target.value as any}))}
                className="w-full p-2 border rounded-md"
              >
                <option value="payment">Payment Received</option>
                <option value="purchase">Purchase on Credit</option>
                <option value="credit_adjustment">Credit Adjustment</option>
              </select>
            </div>
            <div>
              <Label htmlFor="transaction-amount">Amount (₹) *</Label>
              <Input
                id="transaction-amount"
                type="number"
                value={transactionData.amount}
                onChange={(e) => setTransactionData(prev => ({...prev, amount: e.target.value}))}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="transaction-description">Description *</Label>
              <Textarea
                id="transaction-description"
                value={transactionData.description}
                onChange={(e) => setTransactionData(prev => ({...prev, description: e.target.value}))}
                placeholder="Transaction description"
              />
            </div>
            <div>
              <Label htmlFor="payment-method">Payment Method</Label>
              <select
                id="payment-method"
                value={transactionData.paymentMethod}
                onValueChange={(value) => setTransactionData(prev => ({...prev, paymentMethod: value}))}
                className="w-full p-2 border rounded-md"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowTransactionDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTransaction} className="bg-green-600 hover:bg-green-700">
                Add Transaction
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Details Dialog */}
      <CustomerDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        customer={selectedCustomer}
        transactions={transactions}
      />
    </div>
  );
};

export default CustomerLedger;
