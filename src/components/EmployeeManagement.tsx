import { useState } from "react";
import { Search, Plus, User, Calendar, DollarSign, Clock, FileText, AlertTriangle, Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useUserStorage } from "@/hooks/useUserStorage";
import { enqueueChange } from "@/lib/sync";
import jsPDF from 'jspdf';

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
  appliedSalaryRules?: string[]; // Array of salary rule IDs that apply to this employee
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
  breakdown?: {
    additions: Array<{ name: string; amount: number }>;
    deductions: Array<{ name: string; amount: number }>;
  };
}

interface SalarySlip {
  id: string;
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  generatedDate: string;
  summary: SalarySummary;
  isProcessed: boolean;
}

export const EmployeeManagement = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("employees");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [showSalaryDialog, setShowSalaryDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // CRITICAL: Use useUserStorage with 'staff_employees' key to sync with Staff page and Supabase
  const { data: rawEmployees, updateData: setEmployees, loaded: employeesLoaded } = useUserStorage<any[]>('staff_employees', [
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

  const { data: attendanceRecords, updateData: setAttendanceRecords } = useUserStorage<AttendanceRecord[]>('attendance_records', []);
  const { data: salarySlips, updateData: setSalarySlips } = useUserStorage<SalarySlip[]>('salary_slips', []);

  // Normalize employee data - handle both 'salary' (from Staff page) and 'baseSalary' (from Payroll)
  const employees: Employee[] = (rawEmployees || []).map((emp: any) => ({
    ...emp,
    // Map 'salary' field to 'baseSalary' for compatibility
    baseSalary: emp.baseSalary ?? emp.salary ?? 0,
    // Ensure all required fields exist
    address: emp.address ?? '',
    emergencyContact: emp.emergencyContact ?? '',
    bankAccount: emp.bankAccount ?? '',
    pfNumber: emp.pfNumber ?? '',
    esiNumber: emp.esiNumber ?? '',
    joinDate: emp.joinDate ?? emp.hireDate ?? new Date().toISOString(),
    // Parse appliedSalaryRules if it's a JSON string from Supabase
    appliedSalaryRules: (() => {
      if (Array.isArray(emp.appliedSalaryRules)) return emp.appliedSalaryRules;
      if (typeof emp.appliedSalaryRules === 'string' && emp.appliedSalaryRules) {
        try {
          return JSON.parse(emp.appliedSalaryRules);
        } catch {
          return [];
        }
      }
      if (typeof emp.applied_salary_rules === 'string' && emp.applied_salary_rules) {
        try {
          return JSON.parse(emp.applied_salary_rules);
        } catch {
          return [];
        }
      }
      return [];
    })(),
  }));

  const { data: salaryRules, updateData: setSalaryRules } = useUserStorage<SalaryRule[]>('salary_rules', [
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
    esiNumber: "",
    appliedSalaryRules: [] as string[]
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

    // FIXED: Calculate actual days in the month (30/31 days, or 28/29 for February)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const workingDays = daysInMonth; // Use actual days in month instead of fixed 26
    const presentDays = monthlyAttendance.filter(r => r.status === 'present').length;
    const lateDays = monthlyAttendance.filter(r => r.status === 'late').length;
    const halfDays = monthlyAttendance.filter(r => r.status === 'half-day').length;

    const additions: Array<{ name: string; amount: number }> = [];
    const deductions: Array<{ name: string; amount: number }> = [];
    let totalDeductions = 0;
    let totalAdditions = 0;

    // CRITICAL: Only apply rules that are selected for this employee
    const employeeRules = employee.appliedSalaryRules || [];
    
    salaryRules.forEach(rule => {
      if (!rule.isActive) return;
      
      // Check if this rule applies to this employee (if no rules selected, apply all for backward compatibility)
      if (employeeRules.length > 0 && !employeeRules.includes(rule.id)) {
        return; // Skip this rule if not selected for this employee
      }

      let amount = 0;
      if (rule.calculation === 'percentage') {
        amount = (employee.baseSalary * rule.value) / 100;
      } else {
        if (rule.name === 'Late Coming Penalty') {
          amount = rule.value * lateDays;
        } else {
          amount = rule.value;
        }
      }

      if (rule.type === 'deduction') {
        totalDeductions += amount;
        deductions.push({ name: rule.name, amount });
      } else {
        totalAdditions += amount;
        additions.push({ name: rule.name, amount });
      }
    });

    // Calculate absence deduction
    const absentDays = workingDays - presentDays - (halfDays * 0.5);
    const absenceDeduction = (employee.baseSalary / workingDays) * absentDays;
    if (absentDays > 0) {
      totalDeductions += absenceDeduction;
      deductions.push({ name: 'Absence Deduction', amount: absenceDeduction });
    }

    // Standard deductions
    const pf = (employee.baseSalary * 12) / 100;
    const esi = employee.baseSalary <= 21000 ? (employee.baseSalary * 0.75) / 100 : 0;
    const professionalTax = employee.baseSalary > 10000 ? 200 : 0;

    if (pf > 0) deductions.push({ name: 'Provident Fund (PF)', amount: pf });
    if (esi > 0) deductions.push({ name: 'ESI', amount: esi });
    if (professionalTax > 0) deductions.push({ name: 'Professional Tax', amount: professionalTax });

    totalDeductions += pf + esi + professionalTax;

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
      professionalTax,
      breakdown: {
        additions,
        deductions
      }
    };
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.email || !newEmployee.role) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get current user ID for data isolation
      const { getCurrentUserId } = await import('@/lib/userStorage');
      const userId = await getCurrentUserId();
      
      if (!userId) {
        toast({
          title: "Authentication Error",
          description: "Please log in to add employees.",
          variant: "destructive"
        });
        return;
      }

      const employee: Employee & { user_id?: string } = {
        ...newEmployee,
        id: Date.now().toString(),
        joinDate: new Date().toISOString(),
        status: "active",
        user_id: userId, // CRITICAL: Include user_id
      };

      // Update local storage
      await setEmployees([...employees, employee]);
      
      // Queue for Supabase sync
      try {
        await enqueueChange('staff', 'upsert', {
          id: employee.id,
          user_id: userId,
          name: employee.name,
          email: employee.email,
          phone: employee.phone,
          role: employee.role,
          department: employee.department,
          salary: employee.baseSalary,
          status: employee.status,
          hire_date: employee.joinDate,
          address: employee.address,
          emergency_contact: employee.emergencyContact,
          bank_account: employee.bankAccount,
          pf_number: employee.pfNumber,
          esi_number: employee.esiNumber,
          applied_salary_rules: JSON.stringify(employee.appliedSalaryRules || []),
          updated_at: new Date().toISOString(),
        });
      } catch (syncError) {
        console.warn('Failed to queue sync, but employee saved locally:', syncError);
      }
      
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
        esiNumber: "",
        appliedSalaryRules: []
      });
      setShowAddDialog(false);
      
      toast({
        title: "Employee Added",
        description: `${employee.name} has been added to the team.`
      });
    } catch (error) {
      console.error('Error adding employee:', error);
      toast({
        title: "Error",
        description: "Failed to add employee. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee || !newEmployee.name || !newEmployee.email || !newEmployee.role) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get current user ID for data isolation
      const { getCurrentUserId } = await import('@/lib/userStorage');
      const userId = await getCurrentUserId();
      
      if (!userId) {
        toast({
          title: "Authentication Error",
          description: "Please log in to update employees.",
          variant: "destructive"
        });
        return;
      }

      const updatedEmployee: Employee & { user_id?: string } = {
        ...editingEmployee,
        ...newEmployee,
        user_id: userId,
      };

      // Update local storage
      const updatedEmployees = employees.map(emp => 
        emp.id === editingEmployee.id ? updatedEmployee : emp
      );
      await setEmployees(updatedEmployees);
      
      // Queue for Supabase sync
      try {
        await enqueueChange('staff', 'upsert', {
          id: updatedEmployee.id,
          user_id: userId,
          name: updatedEmployee.name,
          email: updatedEmployee.email,
          phone: updatedEmployee.phone,
          role: updatedEmployee.role,
          department: updatedEmployee.department,
          salary: updatedEmployee.baseSalary,
          status: updatedEmployee.status,
          hire_date: updatedEmployee.joinDate,
          address: updatedEmployee.address,
          emergency_contact: updatedEmployee.emergencyContact,
          bank_account: updatedEmployee.bankAccount,
          pf_number: updatedEmployee.pfNumber,
          esi_number: updatedEmployee.esiNumber,
          applied_salary_rules: JSON.stringify(updatedEmployee.appliedSalaryRules || []),
          updated_at: new Date().toISOString(),
        });
      } catch (syncError) {
        console.warn('Failed to queue sync, but employee updated locally:', syncError);
      }
      
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
        esiNumber: "",
        appliedSalaryRules: []
      });
      setEditingEmployee(null);
      setShowEditDialog(false);
      
      toast({
        title: "Employee Updated",
        description: `${updatedEmployee.name} has been updated.`
      });
    } catch (error) {
      console.error('Error updating employee:', error);
      toast({
        title: "Error",
        description: "Failed to update employee. Please try again.",
        variant: "destructive"
      });
    }
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

  const generateSalarySlipPDF = (employee: Employee, summary: SalarySummary) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('SALARY SLIP', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`For the month of ${summary.month} ${summary.year}`, 105, 30, { align: 'center' });
    
    // Employee Details
    let yPos = 50;
    doc.setFontSize(14);
    doc.text('Employee Details', 20, yPos);
    yPos += 10;
    doc.setFontSize(11);
    doc.text(`Name: ${employee.name}`, 20, yPos);
    yPos += 7;
    doc.text(`Employee ID: ${employee.id}`, 20, yPos);
    yPos += 7;
    doc.text(`Designation: ${employee.role}`, 20, yPos);
    yPos += 7;
    doc.text(`Department: ${employee.department}`, 20, yPos);
    if (employee.pfNumber) {
      yPos += 7;
      doc.text(`PF Number: ${employee.pfNumber}`, 20, yPos);
    }
    if (employee.esiNumber) {
      yPos += 7;
      doc.text(`ESI Number: ${employee.esiNumber}`, 20, yPos);
    }
    if (employee.bankAccount) {
      yPos += 7;
      doc.text(`Bank Account: ${employee.bankAccount}`, 20, yPos);
    }
    
    // Salary Details
    yPos += 15;
    doc.setFontSize(14);
    doc.text('Salary Details', 20, yPos);
    yPos += 10;
    doc.setFontSize(11);
    
    // Earnings
    doc.setFontSize(12);
    doc.text('EARNINGS', 20, yPos);
    yPos += 8;
    doc.setFontSize(11);
    doc.text(`Basic Salary`, 20, yPos);
    doc.text(`₹${summary.baseSalary.toLocaleString()}`, 180, yPos, { align: 'right' });
    yPos += 7;
    
    if (summary.breakdown?.additions && summary.breakdown.additions.length > 0) {
      summary.breakdown.additions.forEach(item => {
        doc.text(item.name, 25, yPos);
        doc.text(`₹${item.amount.toLocaleString()}`, 180, yPos, { align: 'right' });
        yPos += 7;
      });
    }
    
    doc.setFontSize(12);
    doc.text('Total Earnings', 20, yPos);
    const totalEarnings = summary.baseSalary + summary.totalAdditions;
    doc.text(`₹${totalEarnings.toLocaleString()}`, 180, yPos, { align: 'right' });
    
    // Deductions
    yPos += 15;
    doc.setFontSize(12);
    doc.text('DEDUCTIONS', 20, yPos);
    yPos += 8;
    doc.setFontSize(11);
    
    if (summary.breakdown?.deductions && summary.breakdown.deductions.length > 0) {
      summary.breakdown.deductions.forEach(item => {
        doc.text(item.name, 25, yPos);
        doc.text(`₹${item.amount.toLocaleString()}`, 180, yPos, { align: 'right' });
        yPos += 7;
      });
    }
    
    doc.setFontSize(12);
    doc.text('Total Deductions', 20, yPos);
    doc.text(`₹${summary.totalDeductions.toLocaleString()}`, 180, yPos, { align: 'right' });
    
    // Net Salary
    yPos += 15;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('NET SALARY', 20, yPos);
    doc.text(`₹${summary.netSalary.toLocaleString()}`, 180, yPos, { align: 'right' });
    
    // Attendance Summary
    yPos += 15;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('Attendance Summary', 20, yPos);
    yPos += 8;
    doc.setFontSize(11);
    doc.text(`Working Days: ${summary.workingDays}`, 20, yPos);
    yPos += 7;
    doc.text(`Present Days: ${summary.presentDays}`, 20, yPos);
    
    // Footer
    yPos += 15;
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, yPos, { align: 'center' });
    yPos += 5;
    doc.text('This is a computer-generated document.', 105, yPos, { align: 'center' });
    
    // Save PDF
    const fileName = `Salary_Slip_${employee.name.replace(/\s+/g, '_')}_${summary.month}_${summary.year}.pdf`;
    doc.save(fileName);
    
    toast({
      title: "Salary Slip Generated",
      description: `Salary slip for ${employee.name} has been downloaded.`
    });
  };

  const processMonthlySalary = async (month: number, year: number) => {
    try {
      const activeEmployees = employees.filter(emp => emp.status === 'active');
      const newSlips: SalarySlip[] = [];
      
      for (const employee of activeEmployees) {
        // Check if slip already exists
        const existingSlip = salarySlips.find(
          slip => slip.employeeId === employee.id && 
                  slip.month === month && 
                  slip.year === year
        );
        
        if (existingSlip) {
          continue; // Skip if already processed
        }
        
        const summary = calculateSalarySummary(employee, month, year);
        
        const slip: SalarySlip = {
          id: `${employee.id}_${year}_${month}`,
          employeeId: employee.id,
          employeeName: employee.name,
          month,
          year,
          generatedDate: new Date().toISOString(),
          summary,
          isProcessed: true
        };
        
        newSlips.push(slip);
      }
      
      if (newSlips.length === 0) {
        toast({
          title: "Already Processed",
          description: `All employees have been processed for ${new Date(year, month).toLocaleString('default', { month: 'long' })} ${year}.`,
          variant: "default"
        });
        return;
      }
      
      await setSalarySlips([...salarySlips, ...newSlips]);
      
      toast({
        title: "Salary Processing Complete",
        description: `Processed salary for ${newSlips.length} employee(s) for ${new Date(year, month).toLocaleString('default', { month: 'long' })} ${year}.`
      });
    } catch (error) {
      console.error('Error processing monthly salary:', error);
      toast({
        title: "Error",
        description: "Failed to process monthly salary. Please try again.",
        variant: "destructive"
      });
    }
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
                        <TableCell>₹{(employee.baseSalary || 0).toLocaleString()}</TableCell>
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
                              variant="outline"
                              onClick={() => {
                                setEditingEmployee(employee);
                                setNewEmployee({
                                  name: employee.name,
                                  email: employee.email,
                                  phone: employee.phone,
                                  role: employee.role,
                                  department: employee.department,
                                  baseSalary: employee.baseSalary,
                                  address: employee.address,
                                  emergencyContact: employee.emergencyContact,
                                  bankAccount: employee.bankAccount,
                                  pfNumber: employee.pfNumber || '',
                                  esiNumber: employee.esiNumber || '',
                                  appliedSalaryRules: employee.appliedSalaryRules || []
                                });
                                setShowEditDialog(true);
                              }}
                            >
                              Edit
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
              <div className="flex justify-between items-center">
                <CardTitle>Payroll Reports & Salary Slips</CardTitle>
                <Button 
                  onClick={() => processMonthlySalary(selectedMonth, selectedYear)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Process Monthly Salary
                </Button>
              </div>
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
                    <SelectItem value="2025">2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {employees.map(employee => {
                  const summary = calculateSalarySummary(employee, selectedMonth, selectedYear);
                  const existingSlip = salarySlips.find(
                    slip => slip.employeeId === employee.id && 
                            slip.month === selectedMonth && 
                            slip.year === selectedYear
                  );
                  
                  return (
                    <Card key={employee.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{employee.name}</h4>
                            {existingSlip && (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Processed
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{employee.role}</p>
                          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Base Salary: </span>
                              <span className="font-medium">₹{(summary.baseSalary || 0).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Attendance: </span>
                              <span className="font-medium">{summary.presentDays || 0}/{summary.workingDays || 0} days</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Additions: </span>
                              <span className="font-medium text-green-600">+₹{(summary.totalAdditions || 0).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Deductions: </span>
                              <span className="font-medium text-red-600">-₹{(summary.totalDeductions || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right space-y-2 ml-4">
                          <div className="text-2xl font-bold text-primary">
                            ₹{(summary.netSalary || 0).toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">Net Salary</div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => generateSalarySlipPDF(employee, summary)}
                            className="mt-2"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download Slip
                          </Button>
                        </div>
                      </div>
                      
                      {/* Breakdown Details */}
                      {(summary.breakdown?.additions.length > 0 || summary.breakdown?.deductions.length > 0) && (
                        <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-xs">
                          {summary.breakdown.additions.length > 0 && (
                            <div>
                              <div className="font-medium text-green-600 mb-1">Additions:</div>
                              {summary.breakdown.additions.map((item, idx) => (
                                <div key={idx} className="flex justify-between">
                                  <span>{item.name}</span>
                                  <span className="font-medium">+₹{item.amount.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {summary.breakdown.deductions.length > 0 && (
                            <div>
                              <div className="font-medium text-red-600 mb-1">Deductions:</div>
                              {summary.breakdown.deductions.map((item, idx) => (
                                <div key={idx} className="flex justify-between">
                                  <span>{item.name}</span>
                                  <span className="font-medium">-₹{item.amount.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
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
            <DialogDescription>
              Add a new employee to the payroll system with salary rules
            </DialogDescription>
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
            
            {/* Salary Rules Selection */}
            <div className="col-span-2">
              <Label>Applied Salary Rules (Select rules that apply to this employee)</Label>
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {salaryRules.filter(rule => rule.isActive).map((rule) => (
                  <div key={rule.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`rule-${rule.id}`}
                      checked={newEmployee.appliedSalaryRules.includes(rule.id)}
                      onChange={(e) => {
                        const newRules = e.target.checked
                          ? [...newEmployee.appliedSalaryRules, rule.id]
                          : newEmployee.appliedSalaryRules.filter(id => id !== rule.id);
                        setNewEmployee({ ...newEmployee, appliedSalaryRules: newRules });
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor={`rule-${rule.id}`} className="text-sm cursor-pointer flex-1">
                      <span className="font-medium">{rule.name}</span>
                      <span className="text-muted-foreground ml-2">
                        ({rule.type === 'deduction' ? '-' : '+'} 
                        {rule.calculation === 'percentage' ? `${rule.value}%` : `₹${rule.value}`})
                      </span>
                    </label>
                  </div>
                ))}
                {salaryRules.filter(rule => rule.isActive).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No active salary rules. Add rules in the Salary Rules tab first.
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                If no rules are selected, all active rules will apply by default.
              </p>
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

      {/* Edit Employee Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) {
          setEditingEmployee(null);
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
            esiNumber: "",
            appliedSalaryRules: []
          });
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information and salary rules
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={newEmployee.name}
                onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={newEmployee.email}
                onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={newEmployee.phone}
                onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-role">Role *</Label>
              <Input
                id="edit-role"
                value={newEmployee.role}
                onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-department">Department</Label>
              <Input
                id="edit-department"
                value={newEmployee.department}
                onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-baseSalary">Base Salary</Label>
              <Input
                id="edit-baseSalary"
                type="number"
                value={newEmployee.baseSalary}
                onChange={(e) => setNewEmployee({ ...newEmployee, baseSalary: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-address">Address</Label>
              <Textarea
                id="edit-address"
                value={newEmployee.address}
                onChange={(e) => setNewEmployee({ ...newEmployee, address: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-emergencyContact">Emergency Contact</Label>
              <Input
                id="edit-emergencyContact"
                value={newEmployee.emergencyContact}
                onChange={(e) => setNewEmployee({ ...newEmployee, emergencyContact: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-bankAccount">Bank Account</Label>
              <Input
                id="edit-bankAccount"
                value={newEmployee.bankAccount}
                onChange={(e) => setNewEmployee({ ...newEmployee, bankAccount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-pfNumber">PF Number</Label>
              <Input
                id="edit-pfNumber"
                value={newEmployee.pfNumber}
                onChange={(e) => setNewEmployee({ ...newEmployee, pfNumber: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-esiNumber">ESI Number</Label>
              <Input
                id="edit-esiNumber"
                value={newEmployee.esiNumber}
                onChange={(e) => setNewEmployee({ ...newEmployee, esiNumber: e.target.value })}
              />
            </div>
            
            {/* Salary Rules Selection */}
            <div className="col-span-2">
              <Label>Applied Salary Rules (Select rules that apply to this employee)</Label>
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {salaryRules.filter(rule => rule.isActive).map((rule) => (
                  <div key={rule.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`edit-rule-${rule.id}`}
                      checked={newEmployee.appliedSalaryRules.includes(rule.id)}
                      onChange={(e) => {
                        const newRules = e.target.checked
                          ? [...newEmployee.appliedSalaryRules, rule.id]
                          : newEmployee.appliedSalaryRules.filter(id => id !== rule.id);
                        setNewEmployee({ ...newEmployee, appliedSalaryRules: newRules });
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor={`edit-rule-${rule.id}`} className="text-sm cursor-pointer flex-1">
                      <span className="font-medium">{rule.name}</span>
                      <span className="text-muted-foreground ml-2">
                        ({rule.type === 'deduction' ? '-' : '+'} 
                        {rule.calculation === 'percentage' ? `${rule.value}%` : `₹${rule.value}`})
                      </span>
                    </label>
                  </div>
                ))}
                {salaryRules.filter(rule => rule.isActive).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No active salary rules. Add rules in the Salary Rules tab first.
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                If no rules are selected, all active rules will apply by default.
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setEditingEmployee(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateEmployee}>
              Update Employee
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
