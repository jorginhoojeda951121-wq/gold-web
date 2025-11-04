import { useState } from "react";
import { Search, Plus, User, Calendar, DollarSign, Clock, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";

interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'half-day';
  workingHours: number;
}

interface SalaryRule {
  id: string;
  name: string;
  type: 'deduction' | 'addition';
  calculation: 'fixed' | 'percentage';
  value: number;
  isActive: boolean;
  description: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  baseSalary: number;
  joinDate: string;
  status: 'active' | 'inactive' | 'on-leave';
  address: string;
  emergencyContact: string;
  bankAccount: string;
  pfNumber?: string;
  esiNumber?: string;
}

interface SalarySummary {
  employeeId: string;
  month: string;
  year: number;
  baseSalary: number;
  workingDays: number;
  presentDays: number;
  totalDeductions: number;
  totalAdditions: number;
  netSalary: number;
  pf: number;
  esi: number;
  professionalTax: number;
}

export const EmployeeManagement = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("employees");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [showSalaryDialog, setShowSalaryDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: employees, updateData: setEmployees } = useOfflineStorage<Employee[]>('employees', [
    {
      id: "1",
      name: "Arjun Singh",
      email: "arjun.singh@example.com",
      phone: "+91 98765 43210",
      role: "Store Manager",
      department: "Operations",
      baseSalary: 45000,
      joinDate: "2023-01-15",
      status: "active",
      address: "Mumbai, Maharashtra",
      emergencyContact: "+91 87654 32109",
      bankAccount: "1234567890",
      pfNumber: "PF123456",
      esiNumber: "ESI789012"
    },
    {
      id: "2",
      name: "Priya Patel",
      email: "priya.patel@example.com",
      phone: "+91 87654 32109",
      role: "Sales Executive",
      department: "Sales",
      baseSalary: 25000,
      joinDate: "2023-03-20",
      status: "active",
      address: "Delhi, NCR",
      emergencyContact: "+91 76543 21098",
      bankAccount: "0987654321"
    }
  ]);

  const { data: attendanceRecords, updateData: setAttendanceRecords } = useOfflineStorage<AttendanceRecord[]>('attendance', []);

  const { data: salaryRules, updateData: setSalaryRules } = useOfflineStorage<SalaryRule[]>('salaryRules', [
    {
      id: "1",
      name: "Provident Fund (PF)",
      type: "deduction",
      calculation: "percentage",
      value: 12,
      isActive: true,
      description: "Employee Provident Fund as per Indian law"
    },
    {
      id: "2",
      name: "ESI",
      type: "deduction",
      calculation: "percentage",
      value: 0.75,
      isActive: true,
      description: "Employee State Insurance"
    },
    {
      id: "3",
      name: "Professional Tax",
      type: "deduction",
      calculation: "fixed",
      value: 200,
      isActive: true,
      description: "Professional Tax as per state law"
    },
    {
      id: "4",
      name: "Late Coming Penalty",
      type: "deduction",
      calculation: "fixed",
      value: 500,
      isActive: true,
      description: "Penalty for late coming (per day)"
    },
    {
      id: "5",
      name: "Performance Bonus",
      type: "addition",
      calculation: "percentage",
      value: 10,
      isActive: false,
      description: "Performance-based bonus"
    }
  ]);

  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    department: "",
    baseSalary: 0,
    address: "",
    emergencyContact: "",
    bankAccount: "",
    pfNumber: "",
    esiNumber: ""
  });

  const [newRule, setNewRule] = useState<Omit<SalaryRule, 'id' | 'isActive'>>({
    name: "",
    type: "deduction",
    calculation: "fixed",
    value: 0,
    description: ""
  });

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateSalarySummary = (employee: Employee, month: number, year: number): SalarySummary => {
    const monthlyAttendance = attendanceRecords.filter(record => {
      const recordDate = new Date(record.date);
      return record.employeeId === employee.id && 
             recordDate.getMonth() === month && 
             recordDate.getFullYear() === year;
    });

    const workingDays = 26; // Standard working days
    const presentDays = monthlyAttendance.filter(r => r.status === 'present').length;
    const lateDays = monthlyAttendance.filter(r => r.status === 'late').length;
    const halfDays = monthlyAttendance.filter(r => r.status === 'half-day').length;

    let totalDeductions = 0;
    let totalAdditions = 0;

    salaryRules.forEach(rule => {
      if (!rule.isActive) return;

      if (rule.type === 'deduction') {
        if (rule.calculation === 'percentage') {
          totalDeductions += (employee.baseSalary * rule.value) / 100;
        } else {
          if (rule.name === 'Late Coming Penalty') {
            totalDeductions += rule.value * lateDays;
          } else {
            totalDeductions += rule.value;
          }
        }
      } else {
        if (rule.calculation === 'percentage') {
          totalAdditions += (employee.baseSalary * rule.value) / 100;
        } else {
          totalAdditions += rule.value;
        }
      }
    });

    // Calculate absence deduction
    const absentDays = workingDays - presentDays - (halfDays * 0.5);
    const absenceDeduction = (employee.baseSalary / workingDays) * absentDays;
    totalDeductions += absenceDeduction;

    const pf = (employee.baseSalary * 12) / 100;
    const esi = employee.baseSalary <= 21000 ? (employee.baseSalary * 0.75) / 100 : 0;
    const professionalTax = employee.baseSalary > 10000 ? 200 : 0;

    const netSalary = employee.baseSalary + totalAdditions - totalDeductions;

    return {
      employeeId: employee.id,
      month: new Date(year, month).toLocaleString('default', { month: 'long' }),
      year,
      baseSalary: employee.baseSalary,
      workingDays,
      presentDays: presentDays + (halfDays * 0.5),
      totalDeductions,
      totalAdditions,
      netSalary,
      pf,
      esi,
      professionalTax
    };
  };

  const handleAddEmployee = () => {
    if (!newEmployee.name || !newEmployee.email || !newEmployee.role) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const employee: Employee = {
      ...newEmployee,
      id: Date.now().toString(),
      joinDate: new Date().toISOString(),
      status: "active"
    };

    setEmployees([...employees, employee]);
    setNewEmployee({
      name: "",
      email: "",
      phone: "",
      role: "",
      department: "",
      baseSalary: 0,
      address: "",
      emergencyContact: "",
      bankAccount: "",
      pfNumber: "",
      esiNumber: ""
    });
    setShowAddDialog(false);

    toast({
      title: "Employee Added",
      description: `${employee.name} has been added to the team.`
    });
  };

  const handleAddRule = () => {
    if (!newRule.name || newRule.value <= 0) {
      toast({
        title: "Invalid Rule",
        description: "Please provide valid rule details.",
        variant: "destructive"
      });
      return;
    }

    const rule: SalaryRule = {
      ...newRule,
      id: Date.now().toString(),
      isActive: true
    };

    setSalaryRules([...salaryRules, rule]);
    setNewRule({
      name: "",
      type: "deduction",
      calculation: "fixed",
      value: 0,
      description: ""
    });

    toast({
      title: "Rule Added",
      description: "Salary rule has been added successfully."
    });
  };

  const toggleRuleStatus = (ruleId: string) => {
    setSalaryRules(salaryRules.map(rule => 
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    ));
  };

  const markAttendance = (employeeId: string, status: AttendanceRecord['status']) => {
    const today = new Date().toISOString().split('T')[0];
    const existingRecord = attendanceRecords.find(r => 
      r.employeeId === employeeId && r.date === today
    );

    if (existingRecord) {
      toast({
        title: "Already Marked",
        description: "Attendance already marked for today.",
        variant: "destructive"
      });
      return;
    }

    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
      employeeId,
      date: today,
      status,
      checkIn: status === 'present' || status === 'late' ? new Date().toTimeString().slice(0, 8) : undefined,
      workingHours: status === 'present' ? 8 : status === 'half-day' ? 4 : 0
    };

    setAttendanceRecords([...attendanceRecords, newRecord]);
    
    toast({
      title: "Attendance Marked",
      description: `Attendance marked as ${status} for today.`
    });
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">Employee Management</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Manage employees, attendance, and payroll with Indian compliance
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="salary">Salary Rules</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Employee Directory</CardTitle>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Base Salary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map(employee => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-primary/10 rounded-full">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{employee.name}</div>
                              <div className="text-sm text-muted-foreground">{employee.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{employee.role}</TableCell>
                        <TableCell>{employee.department}</TableCell>
                        <TableCell>₹{employee.baseSalary.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                            {employee.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setShowSalaryDialog(true);
                              }}
                            >
                              Salary
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => markAttendance(employee.id, 'present')}
                            >
                              Present
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {employees.map(employee => {
                  const today = new Date().toISOString().split('T')[0];
                  const todayRecord = attendanceRecords.find(r => 
                    r.employeeId === employee.id && r.date === today
                  );
                  
                  return (
                    <Card key={employee.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-muted-foreground">{employee.role}</div>
                        </div>
                        {todayRecord && (
                          <Badge variant="default">
                            {todayRecord.status}
                          </Badge>
                        )}
                      </div>
                      {!todayRecord && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => markAttendance(employee.id, 'present')}
                            className="flex-1"
                          >
                            Present
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => markAttendance(employee.id, 'late')}
                          >
                            Late
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => markAttendance(employee.id, 'absent')}
                          >
                            Absent
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary">
          <Card>
            <CardHeader>
              <CardTitle>Salary Rules (Indian Compliance)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Add New Rule */}
                <Card className="p-4 bg-muted/50">
                  <h3 className="font-medium mb-4">Add New Salary Rule</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Input
                      placeholder="Rule name"
                      value={newRule.name}
                      onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    />
                    <Select 
                      value={newRule.type} 
                      onValueChange={(value) => 
                        setNewRule({ ...newRule, type: value as 'deduction' | 'addition' })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deduction">Deduction</SelectItem>
                        <SelectItem value="addition">Addition</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select 
                      value={newRule.calculation} 
                      onValueChange={(value) => 
                        setNewRule({ ...newRule, calculation: value as 'fixed' | 'percentage' })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Value"
                        value={newRule.value}
                        onChange={(e) => setNewRule({ ...newRule, value: Number(e.target.value) })}
                      />
                      <Button onClick={handleAddRule}>Add</Button>
                    </div>
                  </div>
                  <Textarea
                    placeholder="Rule description"
                    value={newRule.description}
                    onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                    className="mt-2"
                  />
                </Card>

                {/* Existing Rules */}
                <div className="space-y-3">
                  {salaryRules.map(rule => (
                    <Card key={rule.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h4 className="font-medium">{rule.name}</h4>
                            <Badge variant={rule.type === 'deduction' ? 'destructive' : 'default'}>
                              {rule.type}
                            </Badge>
                            <Badge variant="outline">
                              {rule.calculation === 'percentage' ? `${rule.value}%` : `₹${rule.value}`}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                        </div>
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={() => toggleRuleStatus(rule.id)}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 flex gap-4">
                <Select 
                  value={selectedMonth.toString()} 
                  onValueChange={(value) => setSelectedMonth(Number(value))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {new Date(2023, i).toLocaleString('default', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={selectedYear.toString()} 
                  onValueChange={(value) => setSelectedYear(Number(value))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {employees.map(employee => {
                  const summary = calculateSalarySummary(employee, selectedMonth, selectedYear);
                  return (
                    <Card key={employee.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{employee.name}</h4>
                          <p className="text-sm text-muted-foreground">{employee.role}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Base: </span>
                            <span>₹{summary.baseSalary.toLocaleString()}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Days: </span>
                            <span>{summary.presentDays}/{summary.workingDays}</span>
                          </div>
                          <div className="text-lg font-bold text-primary">
                            Net: ₹{summary.netSalary.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Employee Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={newEmployee.name}
                onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newEmployee.email}
                onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newEmployee.phone}
                onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="role">Role *</Label>
              <Input
                id="role"
                value={newEmployee.role}
                onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={newEmployee.department}
                onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="baseSalary">Base Salary</Label>
              <Input
                id="baseSalary"
                type="number"
                value={newEmployee.baseSalary}
                onChange={(e) => setNewEmployee({ ...newEmployee, baseSalary: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={newEmployee.address}
                onChange={(e) => setNewEmployee({ ...newEmployee, address: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="emergencyContact">Emergency Contact</Label>
              <Input
                id="emergencyContact"
                value={newEmployee.emergencyContact}
                onChange={(e) => setNewEmployee({ ...newEmployee, emergencyContact: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="bankAccount">Bank Account</Label>
              <Input
                id="bankAccount"
                value={newEmployee.bankAccount}
                onChange={(e) => setNewEmployee({ ...newEmployee, bankAccount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="pfNumber">PF Number</Label>
              <Input
                id="pfNumber"
                value={newEmployee.pfNumber}
                onChange={(e) => setNewEmployee({ ...newEmployee, pfNumber: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="esiNumber">ESI Number</Label>
              <Input
                id="esiNumber"
                value={newEmployee.esiNumber}
                onChange={(e) => setNewEmployee({ ...newEmployee, esiNumber: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEmployee}>
              Add Employee
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
