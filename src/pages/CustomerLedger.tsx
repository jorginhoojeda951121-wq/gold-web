import { useState, useEffect, useCallback } from "react";
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
import { useUserStorage } from "@/hooks/useUserStorage";
import { CustomerDetailsDialog } from "@/components/CustomerDetailsDialog";
import { upsertDirect } from "@/lib/supabaseDirect";
import { getUserData } from "@/lib/userStorage";
import { getSupabase } from "@/lib/supabase";

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

  // CRITICAL: Use useUserStorage for user-scoped data isolation
  const { data: customers, updateData: setCustomers } = useUserStorage<Customer[]>('customers', []);

  // CRITICAL: Use useUserStorage for user-scoped data isolation
  const { data: transactions, updateData: setTransactions } = useUserStorage<Transaction[]>('customer_transactions', [
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

  // Load customers and transactions from user-scoped storage
  const loadCustomerData = useCallback(async () => {
    try {
      const [customersData, transactionsData] = await Promise.all([
        getUserData<Customer[]>('customers') || [],
        getUserData<Transaction[]>('customer_transactions') || [],
      ]);
      
      setCustomers(customersData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading customer data:', error);
    }
  }, [setCustomers, setTransactions]);

  // Load data on mount and when user changes
  useEffect(() => {
    loadCustomerData();
    
    // Listen for auth state changes to reload data when user changes
    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Clear user ID cache when user changes to ensure fresh data load
      const { clearUserIdCache } = await import('@/lib/userStorage');
      clearUserIdCache();
      
      // Reload data when user changes (login/logout)
      if (session?.user?.id) {
        // Small delay to ensure cache is cleared and new user ID is fetched
        setTimeout(() => {
          loadCustomerData();
        }, 100);
      } else {
        // User logged out, clear data
        setCustomers([]);
        setTransactions([]);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [loadCustomerData, setCustomers, setTransactions]);

  // Reload data when window gains focus or becomes visible (in case sync happened)
  useEffect(() => {
    const handleFocus = () => {
      loadCustomerData();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadCustomerData();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadCustomerData]);

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

  const handleAddCustomer = async () => {
    if (!formData.name || !formData.phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in customer name and phone number.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get current user ID
      const { getCurrentUserId, getUserData, setUserData } = await import('@/lib/userStorage');
      const userId = await getCurrentUserId();
      
      if (!userId) {
        toast({
          title: "Error",
          description: "User not logged in. Please log in again.",
          variant: "destructive"
        });
        return;
      }

      const newCustomer: Customer & { user_id?: string } = {
        id: Date.now().toString(),
        ...formData,
        creditLimit: parseFloat(formData.creditLimit) || 0,
        currentBalance: 0,
        totalPurchases: 0,
        lastPurchaseDate: "",
        status: 'active',
        user_id: userId, // CRITICAL: Include user_id for data isolation
      };

      // Save to user-scoped storage
      const customersData = (await getUserData<any[]>('customers')) || [];
      customersData.push(newCustomer);
      await setUserData('customers', customersData);
      
      // Update state
      setCustomers(prev => [...prev, newCustomer]);

      // Insert directly into Supabase
      await upsertDirect('customers', {
        id: newCustomer.id,
        user_id: userId, // CRITICAL: Include user_id for data isolation
        name: newCustomer.name,
        email: newCustomer.email,
        phone: newCustomer.phone,
        address: newCustomer.address,
        currentBalance: newCustomer.currentBalance, // camelCase
        totalPurchases: newCustomer.totalPurchases, // camelCase
        lastPurchaseDate: newCustomer.lastPurchaseDate || null, // camelCase
        status: newCustomer.status,
        creditLimit: newCustomer.creditLimit, // camelCase
      });
    } catch (error) {
      console.error('Error adding customer:', error);
      toast({
        title: "Error",
        description: "Failed to add customer. Please try again.",
        variant: "destructive"
      });
      return;
    }

    const customerName = formData.name;
    setFormData({ name: "", phone: "", email: "", address: "", creditLimit: "" });
    setShowAddDialog(false);
    
    toast({
      title: "Customer Added",
      description: `${customerName} has been added to the ledger.`
    });
  };

  const handleAddTransaction = async () => {
    if (!selectedCustomer || !transactionData.amount || !transactionData.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all transaction details.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get current user ID
      const { getCurrentUserId, getUserData, setUserData } = await import('@/lib/userStorage');
      const userId = await getCurrentUserId();
      
      if (!userId) {
        toast({
          title: "Error",
          description: "User not logged in. Please log in again.",
          variant: "destructive"
        });
        return;
      }

      const amount = parseFloat(transactionData.amount);
      const transactionType = transactionData.type;
      
      // Calculate balance before transaction
      const balanceBefore = selectedCustomer.currentBalance || 0;
      
      // Calculate balance after transaction
      // Purchase: balance increases (customer owes more) - add positive amount
      // Payment: balance decreases (customer pays) - subtract amount (add negative)
      const balanceAfter = transactionType === 'payment' 
        ? balanceBefore - amount  // Payment reduces what customer owes
        : balanceBefore + amount; // Purchase increases what customer owes
      
      // Store transaction amount: positive for purchases, negative for payments
      const transactionAmount = transactionType === 'payment' ? -amount : amount;
      
      const newTransaction: Transaction & { user_id?: string } = {
        id: Date.now().toString(),
        customerId: selectedCustomer.id,
        type: transactionType,
        amount: transactionAmount, // Negative for payments, positive for purchases
        description: transactionData.description,
        date: new Date().toISOString(),
        paymentMethod: transactionData.paymentMethod,
        user_id: userId, // CRITICAL: Include user_id for data isolation
      };

      // Save to user-scoped storage
      const transactionsData = (await getUserData<any[]>('customer_transactions')) || [];
      transactionsData.push(newTransaction);
      await setUserData('customer_transactions', transactionsData);
      
      // Update state
      setTransactions(prev => [...prev, newTransaction]);

      // Insert transaction directly into Supabase
      await upsertDirect('customer_transactions', {
        id: newTransaction.id,
        user_id: userId, // CRITICAL: Include user_id for data isolation
        customerId: newTransaction.customerId, // camelCase, not snake_case
        type: newTransaction.type,
        amount: newTransaction.amount,
        description: newTransaction.description,
        date: newTransaction.date,
        invoiceId: newTransaction.invoiceId ?? null, // camelCase, not snake_case
        paymentMethod: newTransaction.paymentMethod ?? null, // camelCase, not snake_case
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter,
      });
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({
        title: "Error",
        description: "Failed to add transaction. Please try again.",
        variant: "destructive"
      });
      return;
    }

    // Update customer balance and totals, then push customer
    // Use the calculated balanceAfter from above
    const updatedCustomers = customers.map(customer => 
      customer.id === selectedCustomer.id
        ? {
            ...customer,
            currentBalance: balanceAfter, // Use the correctly calculated balance
            totalPurchases: transactionType === 'purchase' 
              ? (customer.totalPurchases || 0) + amount 
              : (customer.totalPurchases || 0),
            lastPurchaseDate: transactionType === 'purchase' 
              ? new Date().toISOString().split('T')[0]
              : (customer.lastPurchaseDate || new Date().toISOString().split('T')[0])
          }
        : customer
    );
    setCustomers(updatedCustomers);

    // After local update, enqueue latest customer snapshot - use camelCase format
    const updatedCustomer = updatedCustomers.find(c => c.id === selectedCustomer.id);
    if (updatedCustomer) {
      await upsertDirect('customers', {
        id: updatedCustomer.id,
        name: updatedCustomer.name,
        email: updatedCustomer.email,
        phone: updatedCustomer.phone,
        address: updatedCustomer.address,
        creditLimit: updatedCustomer.creditLimit, // camelCase
        currentBalance: updatedCustomer.currentBalance || 0, // camelCase
        totalPurchases: updatedCustomer.totalPurchases || 0, // camelCase
        lastPurchaseDate: updatedCustomer.lastPurchaseDate || null, // camelCase
        status: updatedCustomer.status,
      });
    }

    setTransactionData({ type: 'payment', amount: "", description: "", paymentMethod: "Cash" });
    setShowTransactionDialog(false);
    
    toast({
      title: "Transaction Added",
      description: `${transactionData.type} transaction has been recorded.`
    });
  };

  const totalCreditOutstanding = customers.reduce((sum, customer) => sum + (parseFloat(String(customer.currentBalance ?? 0)) || 0), 0);
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
                <p className="text-2xl font-bold">₹{(isNaN(totalCreditOutstanding) ? 0 : totalCreditOutstanding).toLocaleString()}</p>
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
                  placeholder="+91 8910921128"
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
                onChange={(e) => setTransactionData(prev => ({...prev, paymentMethod: e.target.value}))}
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
