import { useState } from "react";
import { Users, Plus, Edit, Trash2, Phone, Mail, MapPin, Search, Filter } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { enqueueChange } from "@/lib/sync";

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  salary: number;
  hireDate: string;
  status: "Active" | "Inactive";
}

const Staff = () => {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { data: searchQuery, updateData: setSearchQuery } = useOfflineStorage<string>("staff_search", "");
  const { data: departmentFilter, updateData: setDepartmentFilter } = useOfflineStorage<string>("staff_departmentFilter", "all");
  const { data: statusFilter, updateData: setStatusFilter } = useOfflineStorage<string>("staff_statusFilter", "all");
  const { data: employees, updateData: setEmployees } = useOfflineStorage<Employee[]>("staff_employees", [
    {
      id: "1",
      name: "Sarah Johnson",
      email: "sarah@luxejewels.com",
      phone: "+1 (555) 123-4567",
      role: "Store Manager",
      department: "Sales",
      salary: 65000,
      hireDate: "2023-01-15",
      status: "Active"
    },
    {
      id: "2",
      name: "Michael Chen",
      email: "michael@luxejewels.com",
      phone: "+1 (555) 234-5678",
      role: "Jewelry Appraiser",
      department: "Quality Control",
      salary: 55000,
      hireDate: "2023-03-20",
      status: "Active"
    },
    {
      id: "3",
      name: "Emily Davis",
      email: "emily@luxejewels.com",
      phone: "+1 (555) 345-6789",
      role: "Sales Associate",
      department: "Sales",
      salary: 45000,
      hireDate: "2023-06-10",
      status: "Active"
    }
  ]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    department: "",
    salary: "",
  });

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.role) {
      return;
    }

    const newEmployee: Employee = {
      id: Date.now().toString(),
      ...formData,
      salary: parseFloat(formData.salary) || 0,
      hireDate: new Date().toISOString().split('T')[0],
      status: "Active",
    };

    setEmployees(prev => [...prev, newEmployee]);
    enqueueChange('employees', 'upsert', {
      id: newEmployee.id,
      name: newEmployee.name,
      email: newEmployee.email,
      phone: newEmployee.phone,
      role: newEmployee.role,
      department: newEmployee.department,
      salary: newEmployee.salary,
      status: newEmployee.status,
      hire_date: newEmployee.hireDate,
      updated_at: new Date().toISOString(),
    });
    
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "",
      department: "",
      salary: "",
    });
    
    setShowAddDialog(false);
    
    toast({
      title: "Employee Added",
      description: `${newEmployee.name} has been added to the team.`
    });
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== id));
    enqueueChange('employees', 'delete', { id });
    toast({
      title: "Employee Removed",
      description: "Employee has been removed from the system.",
      variant: "destructive"
    });
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         employee.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = departmentFilter === "all" || employee.department === departmentFilter;
    const matchesStatus = statusFilter === "all" || employee.status === statusFilter;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const activeEmployees = employees.filter(emp => emp.status === "Active").length;
  const totalSalaries = employees.reduce((sum, emp) => sum + emp.salary, 0);

  return (
    <div className="min-h-screen bg-gradient-elegant">
      
      <header className="bg-gradient-primary shadow-elegant border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground">Staff Management</h1>
              <p className="text-primary-foreground/70 text-sm">Manage your team members</p>
            </div>
            <Button 
              onClick={() => setShowAddDialog(true)}
              className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold transition-smooth"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Total Employees"
            value={employees.length.toString()}
            icon={Users}
            trend="+2 this month"
          />
          <StatsCard
            title="Active Staff"
            value={activeEmployees.toString()}
            icon={Users}
            trend="All active"
          />
          <StatsCard
            title="Monthly Payroll"
            value={`₹${Math.round(totalSalaries / 12).toLocaleString()}`}
            icon={Users}
            trend="Budgeted"
          />
        </section>

        <section>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Employee Directory</h2>
                <p className="text-muted-foreground">Manage your team members and their information</p>
              </div>
            </div>
            
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Quality Control">Quality Control</SelectItem>
                  <SelectItem value="Management">Management</SelectItem>
                  <SelectItem value="Security">Security</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-6">
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No employees found</h3>
                <p className="text-muted-foreground">Try adjusting your search criteria</p>
              </div>
            ) : (
              filteredEmployees.map(employee => (
              <Card key={employee.id} className="bg-card shadow-card border-border/50 hover:shadow-elegant transition-smooth">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-gold rounded-full flex items-center justify-center">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{employee.name}</h3>
                          <p className="text-sm text-muted-foreground">{employee.role}</p>
                        </div>
                        <Badge variant={employee.status === "Active" ? "default" : "secondary"}>
                          {employee.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{employee.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{employee.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{employee.department}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Hired: {new Date(employee.hireDate).toLocaleDateString()}
                        </span>
                        <span className="font-semibold text-foreground">
                          ₹{employee.salary.toLocaleString()}/year
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteEmployee(employee.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              ))
            )}
          </div>
        </section>
      </main>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px] bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add New Employee</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleAddEmployee} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emp-name">Full Name *</Label>
                <Input
                  id="emp-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                  placeholder="e.g., John Smith"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="emp-email">Email *</Label>
                <Input
                  id="emp-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                  placeholder="john@luxejewels.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emp-phone">Phone</Label>
                <Input
                  id="emp-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="emp-role">Role *</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value) => setFormData(prev => ({...prev, role: value}))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Store Manager">Store Manager</SelectItem>
                    <SelectItem value="Sales Associate">Sales Associate</SelectItem>
                    <SelectItem value="Jewelry Appraiser">Jewelry Appraiser</SelectItem>
                    <SelectItem value="Cashier">Cashier</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emp-department">Department</Label>
                <Select 
                  value={formData.department} 
                  onValueChange={(value) => setFormData(prev => ({...prev, department: value}))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Quality Control">Quality Control</SelectItem>
                    <SelectItem value="Management">Management</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="emp-salary">Annual Salary (₹)</Label>
                <Input
                  id="emp-salary"
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData(prev => ({...prev, salary: e.target.value}))}
                  placeholder="e.g., 50000"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-gold hover:bg-gold-dark text-primary transition-smooth"
              >
                Add Employee
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Staff;