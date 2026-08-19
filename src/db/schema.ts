export type CompanyStatus = 'Active' | 'Inactive' | 'Archived';

export interface Company {
  id: string;
  companyCode: string;
  legalName: string;
  tradeName?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  contactNumber?: string;
  email?: string;
  website?: string;
  tin?: string;
  rdoCode?: string;
  businessRegistrationNumber?: string;
  sssEmployerNumber?: string;
  philHealthEmployerNumber?: string;
  pagIbigEmployerNumber?: string;
  status: CompanyStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export type EmploymentStatus = 'Active' | 'Inactive' | 'Resigned' | 'Terminated' | 'Retired' | 'On Leave';
export type EmploymentType = 'Regular' | 'Probationary' | 'Contractual' | 'Casual' | 'Part-Time' | 'Other';
export type PayType = 'Daily' | 'Monthly' | 'Hourly';
export type PayFrequency = 'Semi-Monthly' | 'Monthly' | 'Weekly' | 'Bi-Weekly';
export type Gender = 'Male' | 'Female' | 'Other' | 'Prefer not to say';
export type CivilStatus = 'Single' | 'Married' | 'Widowed' | 'Separated' | 'Divorced';

export interface Employee {
  id: string;
  companyId: string;
  employeeNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  nickname?: string;
  birthDate?: string;
  gender?: Gender;
  civilStatus?: CivilStatus;
  address?: string;
  contactNumber?: string;
  email?: string;
  dateHired: string;
  employmentStatus: EmploymentStatus;
  employmentType: EmploymentType;
  departmentId?: string;
  positionId?: string;
  location?: string;
  supervisorId?: string;
  tin?: string;
  sssNumber?: string;
  philHealthNumber?: string;
  pagIbigNumber?: string;
  bankName?: string;
  bankAccount?: string;
  dailyRate?: number;
  monthlyRate?: number;
  hourlyRate?: number;
  payType?: PayType;
  payFrequency?: PayFrequency;
  status: 'Active' | 'Inactive' | 'Archived';
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface Department {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  status: 'Active' | 'Inactive' | 'Archived';
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  departmentId?: string;
  status: 'Active' | 'Inactive' | 'Archived';
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeRateHistory {
  id: string;
  employeeId: string;
  companyId: string;
  effectiveDate: string;
  dailyRate?: number;
  monthlyRate?: number;
  hourlyRate?: number;
  payType?: PayType;
  reason: string;
  approvedBy?: string;
  createdAt: string;
}

// --- Phase 4 Timekeeping Types ---
export type DTRStatus = 
  | 'Present' 
  | 'Late' 
  | 'Absent' 
  | 'Rest Day' 
  | 'Regular Holiday' 
  | 'Special Holiday' 
  | 'On Leave' 
  | 'Half Day' 
  | 'Incomplete' 
  | 'Excused';

export interface DTRRecord {
  id: string;
  companyId: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  timeIn?: string; // HH:mm or formatted
  timeOut?: string; // HH:mm or formatted
  breakStart?: string;
  breakEnd?: string;
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  lateMinutes: number;
  undertimeMinutes: number;
  status: DTRStatus;
  shiftSchedule?: string;
  remarks?: string;
  supervisorRemarks?: string;
  createdAt: string;
  updatedAt: string;
}

export type OvertimeStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface OvertimeRequest {
  id: string;
  companyId: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  requestedHours: number;
  approvedHours?: number;
  reason: string;
  status: OvertimeStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  supervisorRemarks?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Phase 5 Configurable & Versioned Payroll Engine Types ---
export type RuleCategory = 
  | 'Basic Pay'
  | 'Overtime'
  | 'Holiday'
  | 'Night Differential'
  | 'Late'
  | 'Undertime'
  | 'Leave'
  | 'Allowance'
  | 'Loan'
  | 'SSS'
  | 'PhilHealth'
  | 'Pag-IBIG'
  | 'Withholding Tax'
  | 'Other Deduction'
  | '13th Month';

export type RuleStatus = 'Draft' | 'For Review' | 'Approved' | 'Active' | 'Expired' | 'Archived';

export interface PayrollRule {
  id: string;
  companyId: string | null; // null for global default rules, or specific companyId
  ruleCode: string; // e.g. 'RULE_REGULAR_OT', 'RULE_SSS_CONTRIBUTION', 'RULE_PHILHEALTH_CONTRIBUTION', 'RULE_PAGIBIG_CONTRIBUTION', 'RULE_WITHHOLDING_TAX'
  ruleName: string;
  category: RuleCategory;
  description: string;
  formula: string; // mathematical/logical expression using standardized variables
  parameters: Record<string, number | string | boolean | any>;
  sourceReference?: string; // e.g. 'Republic Act No. 11199', 'PhilHealth Circular 2024-0001', 'HDMF Circular 460', 'BIR RR 11-2018'
  effectiveDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD (optional or '9999-12-31')
  version: number; // 1, 2, 3...
  priority: number; // execution order
  status: RuleStatus;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalculationTraceStep {
  stepName: string;
  ruleCode: string;
  ruleVersion: number;
  formula: string;
  inputs: Record<string, number | string>;
  parameters: Record<string, any>;
  result: number;
  description: string;
  timestamp: string;
}

export interface PayrollPeriod {
  id: string;
  companyId: string;
  periodCode: string; // e.g. '2026-08-A'
  name: string; // e.g. 'August 1-15, 2026 Semi-Monthly'
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  payoutDate: string; // YYYY-MM-DD
  cutoffType: 'Semi-Monthly' | 'Monthly' | 'Weekly' | 'Bi-Weekly' | 'Special';
  status: 'Open' | 'Processing' | 'Calculated' | 'Finalized' | 'Paid' | 'Closed';
  createdAt: string;
  updatedAt: string;
}

export interface PayslipLineItem {
  code: string;
  name: string;
  category: 'Earning' | 'Deduction' | 'Statutory' | 'Tax' | 'Reimbursement';
  amount: number;
  isTaxable: boolean;
  ruleCode?: string;
  ruleVersion?: number;
  explanation?: string;
}

export interface PayslipRecord {
  id: string;
  payrollRunId: string;
  payrollPeriodId: string;
  companyId: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  departmentName: string;
  positionTitle: string;
  
  // Rate & Attendance snapshot
  rateBasis: string;
  monthlyRate: number;
  dailyRate: number;
  hourlyRate: number;
  daysWorked: number;
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  lateMinutes: number;
  undertimeMinutes: number;
  absentDays: number;
  
  // Earnings
  basicPay: number;
  overtimePay: number;
  nightDiffPay: number;
  holidayPay: number;
  taxableAllowances: number;
  nonTaxableAllowances: number;
  grossPay: number;
  
  // Deductions
  lateDeduction: number;
  undertimeDeduction: number;
  absentDeduction: number;
  absenceDeduction?: number;
  sssEE: number;
  sssER: number;
  sssEC: number;
  philHealthEE: number;
  philHealthER: number;
  pagIbigEE: number;
  pagIbigER: number;
  withholdingTax: number;
  loanDeductions: number;
  otherDeductions: number;
  totalDeductions: number;
  
  // Net
  netPay: number;
  
  // Line item breakdown & audit snapshot
  lineItems: PayslipLineItem[];
  appliedRuleVersions: Record<string, number>; // ruleCode -> version
  calculationTrace: CalculationTraceStep[];
  snapshotTimestamp: string;
  status: 'Calculated' | 'Approved' | 'Finalized' | 'Voided';
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRun {
  id: string;
  companyId: string;
  periodId: string;
  periodName?: string;
  payrollPeriodId?: string;
  runDate: string;
  runBy: string;
  totalEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  totalSssEE: number;
  totalSssER: number;
  totalPhilHealthEE: number;
  totalPhilHealthER: number;
  totalPagIbigEE: number;
  totalPagIbigER: number;
  totalWithholdingTax: number;
  status: 'Draft' | 'Calculated' | 'Finalized';
  finalizedAt?: string;
  finalizedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserStatus = 'Active' | 'Inactive' | 'Deactivated';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  role: 'Super Admin' | 'Company Admin' | 'Payroll Admin' | 'HR' | 'Timekeeper' | 'Reviewer' | 'Approver' | 'Viewer';
  companyAccess: string[]; // ['*'] for All Companies or list of company IDs
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface UserCompany {
  id: string;
  userId: string;
  companyId: string;
  roleId: string;
  createdAt: string;
}

export type AuditAction = 'CREATE' | 'UPDATE' | 'ARCHIVE' | 'RESTORE' | 'DELETE' | 'SYSTEM' | 'MIGRATION' | 'RATE_CHANGE' | 'BULK_UPDATE' | 'IMPORT' | 'EXPORT' | 'CALCULATE' | 'APPROVE' | 'FINALIZE' | 'REOPEN';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  companyId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  description: string;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface ApplicationSettings {
  id: string;
  theme: string;
  language: string;
  dateFormat: string;
  currency: string;
  startupCompanyId?: string | null;
  salaryPrivacy: boolean;
  compactMode: boolean;
  updatedAt: string;
}

export interface SchemaMigration {
  version: number;
  name: string;
  appliedAt: string;
}
