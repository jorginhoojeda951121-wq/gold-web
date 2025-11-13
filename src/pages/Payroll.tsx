import { EmployeeManagement } from "@/components/EmployeeManagement";

/**
 * Payroll Management Page
 * 
 * Full employee management system with:
 * - Employee directory with detailed info (PF/ESI numbers, bank accounts)
 * - Attendance tracking (Present/Absent/Late/Half-day)
 * - Custom salary rules (additions & deductions)
 * - Payslip generation with PDF export
 * - FIXED: Uses actual days in month (30/31 or 28/29 for February) instead of 26 days
 * 
 * Salary calculation includes:
 * - HRA (House Rent Allowance)
 * - PF Deduction (12%)
 * - ESI Deduction (0.75% for salary <= ₹21,000)
 * - Professional Tax (₹200 for salary > ₹10,000)
 * - Late coming penalties
 * - Absence deductions based on actual working days
 */
const Payroll = () => {
  return (
    <div className="container mx-auto p-6">
      <EmployeeManagement />
    </div>
  );
};

export default Payroll;

