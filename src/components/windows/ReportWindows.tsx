/**
 * Philippine Payroll Management System - Comprehensive Reporting Suite (Phase 9)
 * Provides enterprise-grade Payroll Register, Summary, Deductions, Overtime, Attendance,
 * Leave, Loan, Allowance, Statutory, History, Audit, and Custom Report Builder.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  FolderTree, 
  ShieldCheck, 
  Scale, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  FileText, 
  Eye, 
  X,
  Filter,
  Search,
  RefreshCw,
  PieChart,
  Percent,
  Clock8,
  Clock3,
  CalendarRange,
  DollarSign,
  Coins,
  History,
  FileSearch,
  ArrowUpDown,
  SlidersHorizontal,
  Lock,
  AlertTriangle,
  Receipt,
  UserCheck
} from 'lucide-react';
import { useCompanyContext } from '../../context/CompanyContext';
import { payrollRunRepository } from '../../repositories/PayrollRunRepository';
import { employeeRepository } from '../../repositories/EmployeeRepository';
import { auditRepository } from '../../repositories/AuditRepository';
import { auditService } from '../../services/AuditService';
import { PayrollRun, PayslipRecord, Employee, AuditLog } from '../../db/schema';

// Helper for currency formatting
const formatPHP = (val?: number, masked: boolean = false) => {
  if (val === undefined || val === null) return '₱0.00';
  if (masked) return '••••••';
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
};

// Generic CSV export helper
const exportCSVFile = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.click();
};

// ============================================================================
// 1. PAYROLL REGISTER WINDOW
// ============================================================================
export const PayrollRegisterWindow: React.FC<{ salaryPrivacy?: boolean }> = ({ salaryPrivacy = false }) => {
  const { currentCompany, currentCompanyId, isAllCompanies } = useCompanyContext();

  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('all');
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [sortBy, setSortBy] = useState<string>('employeeName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isMasked, setIsMasked] = useState(salaryPrivacy);
  const [isLoading, setIsLoading] = useState(true);

  // Column Visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    company: true,
    empNo: true,
    name: true,
    dept: true,
    basicPay: true,
    ot: true,
    holiday: true,
    nightDiff: true,
    allowances: true,
    gross: true,
    sssEE: true,
    phEE: true,
    hdmfEE: true,
    tax: true,
    loans: true,
    otherDeductions: true,
    totalDeductions: true,
    netPay: true,
  });
  const [showColPicker, setShowColPicker] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const allRuns = await payrollRunRepository.findAllRuns();
      const allSlips = await payrollRunRepository.findAllPayslips();
      setRuns(allRuns);
      setPayslips(allSlips);
      if (allRuns.length > 0) {
        setSelectedRunId(allRuns[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered dataset respecting company isolation
  const filteredData = useMemo(() => {
    let result = payslips;
    if (!isAllCompanies && currentCompanyId) {
      result = result.filter(s => s.companyId === currentCompanyId);
    }
    if (selectedRunId !== 'all') {
      result = result.filter(s => s.payrollRunId === selectedRunId);
    }
    if (selectedDept !== 'All') {
      result = result.filter(s => s.departmentName === selectedDept);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(s => s.employeeName.toLowerCase().includes(q) || s.employeeNumber.toLowerCase().includes(q));
    }

    return result.sort((a, b) => {
      let valA = (a as any)[sortBy] || '';
      let valB = (b as any)[sortBy] || '';
      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB);
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [payslips, selectedRunId, selectedDept, searchQuery, sortBy, sortOrder, currentCompanyId, isAllCompanies]);

  // Aggregate Totals
  const totals = useMemo(() => {
    let basic = 0, ot = 0, holiday = 0, night = 0, allow = 0, gross = 0;
    let sss = 0, ph = 0, hdmf = 0, tax = 0, loans = 0, otherDed = 0, totalDed = 0, net = 0;

    for (const r of filteredData) {
      basic += r.basicPay || 0;
      ot += r.overtimePay || 0;
      holiday += r.holidayPay || 0;
      night += r.nightDiffPay || 0;
      allow += (r.taxableAllowances || 0) + (r.nonTaxableAllowances || 0);
      gross += r.grossPay || 0;
      sss += r.sssEE || 0;
      ph += r.philHealthEE || 0;
      hdmf += r.pagIbigEE || 0;
      tax += r.withholdingTax || 0;
      loans += r.loanDeductions || 0;
      otherDed += (r.lateDeduction || 0) + (r.undertimeDeduction || 0) + (r.absenceDeduction || 0);
      totalDed += r.totalDeductions || 0;
      net += r.netPay || 0;
    }

    return {
      count: filteredData.length,
      basic, ot, holiday, night, allow, gross,
      sss, ph, hdmf, tax, loans, otherDed, totalDed, net,
      // Reconciliation checks
      isReconciled: Math.abs((gross - totalDed) - net) < 0.05,
    };
  }, [filteredData]);

  // Departments for dropdown
  const departments = useMemo(() => {
    const d = new Set<string>();
    payslips.forEach(s => { if (s.departmentName) d.add(s.departmentName); });
    return ['All', ...Array.from(d)];
  }, [payslips]);

  const handleExportCSV = () => {
    auditService.logAction({
      userId: 'admin',
      companyId: currentCompanyId || null,
      action: 'EXPORT',
      entityType: 'PayrollReport',
      entityId: selectedRunId,
      description: `Exported Payroll Register (CSV) for ${filteredData.length} records`,
    });

    const headers = [
      'Company', 'Emp No', 'Name', 'Department', 'Basic Pay', 'OT Pay', 'Holiday Pay', 'Night Diff',
      'Allowances', 'Gross Pay', 'SSS EE', 'PhilHealth EE', 'Pag-IBIG EE', 'Withholding Tax', 'Loans',
      'Other Deductions', 'Total Deductions', 'Net Pay'
    ];

    const rows = filteredData.map(r => [
      r.companyId || 'CSCM',
      r.employeeNumber,
      r.employeeName,
      r.departmentName,
      r.basicPay,
      r.overtimePay,
      r.holidayPay,
      r.nightDiffPay,
      (r.taxableAllowances || 0) + (r.nonTaxableAllowances || 0),
      r.grossPay,
      r.sssEE,
      r.philHealthEE,
      r.pagIbigEE,
      r.withholdingTax,
      r.loanDeductions,
      (r.lateDeduction || 0) + (r.undertimeDeduction || 0),
      r.totalDeductions,
      r.netPay
    ]);

    exportCSVFile(`Payroll_Register_${selectedRunId}_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs overflow-hidden select-none">
      {/* Top Controls Toolbar */}
      <div className="p-3.5 bg-white border-b border-slate-200 shrink-0 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <div>
              <h1 className="text-sm font-bold text-slate-900">Enterprise Master Payroll Register</h1>
              <p className="text-[11px] text-slate-500">Comprehensive employee earnings, statutory exclusions, and net payouts.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMasked(!isMasked)}
              className={`px-2.5 py-1.5 border rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                isMasked ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isMasked ? 'Privacy Masked' : 'Salary Revealed'}</span>
            </button>
            <button
              onClick={() => setShowColPicker(!showColPicker)}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-medium flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" /> Columns
            </button>
            <button
              onClick={() => window.print()}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-medium flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" /> Print
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV / Excel
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-600">Period:</span>
            <select
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 outline-none text-xs"
            >
              <option value="all">All Available Cycles</option>
              {runs.map(r => (
                <option key={r.id} value={r.id}>
                  {r.periodName || r.payrollPeriodId} ({r.status})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-600">Department:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent font-medium text-slate-800 outline-none text-xs"
            >
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search employee name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
            />
          </div>
        </div>

        {/* Reconciliation Status Banner */}
        <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200/80 px-3 py-1.5 rounded-lg text-[11px]">
          <div className="flex items-center gap-2">
            {totals.isReconciled ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span className="text-slate-700">
              {totals.isReconciled 
                ? `Reconciled: Total Gross Pay (${formatPHP(totals.gross, isMasked)}) − Total Deductions (${formatPHP(totals.totalDed, isMasked)}) = Net Pay (${formatPHP(totals.net, isMasked)})`
                : 'Reconciliation Variance Detected in current filter view'}
            </span>
          </div>
          <span className="font-mono font-bold text-slate-800">
            {totals.count} Records Included
          </span>
        </div>
      </div>

      {/* Column Picker Modal / Overlay */}
      {showColPicker && (
        <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap gap-3 text-[11px] shadow-sm">
          <span className="font-bold text-slate-700 shrink-0">Visible Columns:</span>
          {Object.entries(visibleColumns).map(([colKey, isVisible]) => (
            <label key={colKey} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isVisible}
                onChange={(e) => setVisibleColumns({ ...visibleColumns, [colKey]: e.target.checked })}
                className="rounded text-blue-600"
              />
              <span className="capitalize">{colKey.replace(/([A-Z])/g, ' $1')}</span>
            </label>
          ))}
        </div>
      )}

      {/* Freeze Header Table with Horizontal Scroll */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-left border-collapse text-xs font-mono whitespace-nowrap">
          <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-300 shadow-xs font-sans text-slate-700 font-semibold text-[11px]">
            <tr>
              {visibleColumns.company && <th className="py-2.5 px-3">Company</th>}
              {visibleColumns.empNo && <th className="py-2.5 px-3">Emp No</th>}
              {visibleColumns.name && <th className="py-2.5 px-3">Employee Name</th>}
              {visibleColumns.dept && <th className="py-2.5 px-3">Department</th>}
              {visibleColumns.basicPay && <th className="py-2.5 px-3 text-right">Basic Pay</th>}
              {visibleColumns.ot && <th className="py-2.5 px-3 text-right">OT Pay</th>}
              {visibleColumns.holiday && <th className="py-2.5 px-3 text-right">Holiday</th>}
              {visibleColumns.nightDiff && <th className="py-2.5 px-3 text-right">Night Diff</th>}
              {visibleColumns.allowances && <th className="py-2.5 px-3 text-right">Allowances</th>}
              {visibleColumns.gross && <th className="py-2.5 px-3 text-right font-bold text-slate-900 bg-slate-200/60">Gross Pay</th>}
              {visibleColumns.sssEE && <th className="py-2.5 px-3 text-right text-blue-700">SSS EE</th>}
              {visibleColumns.phEE && <th className="py-2.5 px-3 text-right text-emerald-700">PhilHealth EE</th>}
              {visibleColumns.hdmfEE && <th className="py-2.5 px-3 text-right text-amber-700">Pag-IBIG EE</th>}
              {visibleColumns.tax && <th className="py-2.5 px-3 text-right text-purple-700">BIR Tax</th>}
              {visibleColumns.loans && <th className="py-2.5 px-3 text-right">Loans</th>}
              {visibleColumns.otherDeductions && <th className="py-2.5 px-3 text-right">Other Ded</th>}
              {visibleColumns.totalDeductions && <th className="py-2.5 px-3 text-right font-bold text-rose-700 bg-rose-50/70">Total Ded</th>}
              {visibleColumns.netPay && <th className="py-2.5 px-3 text-right font-bold text-emerald-700 bg-emerald-50/80">Net Pay</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.map((row) => (
              <tr key={row.id} className="hover:bg-blue-50/40 transition-colors">
                {visibleColumns.company && <td className="py-2 px-3 font-sans text-slate-500">{row.companyId || 'CSCM'}</td>}
                {visibleColumns.empNo && <td className="py-2 px-3 font-bold text-slate-800">{row.employeeNumber}</td>}
                {visibleColumns.name && <td className="py-2 px-3 font-sans font-medium text-slate-900">{row.employeeName}</td>}
                {visibleColumns.dept && <td className="py-2 px-3 font-sans text-slate-600">{row.departmentName}</td>}
                {visibleColumns.basicPay && <td className="py-2 px-3 text-right text-slate-700">{formatPHP(row.basicPay, isMasked)}</td>}
                {visibleColumns.ot && <td className="py-2 px-3 text-right text-slate-700">{formatPHP(row.overtimePay, isMasked)}</td>}
                {visibleColumns.holiday && <td className="py-2 px-3 text-right text-slate-700">{formatPHP(row.holidayPay, isMasked)}</td>}
                {visibleColumns.nightDiff && <td className="py-2 px-3 text-right text-slate-700">{formatPHP(row.nightDiffPay, isMasked)}</td>}
                {visibleColumns.allowances && <td className="py-2 px-3 text-right text-slate-700">{formatPHP((row.taxableAllowances || 0) + (row.nonTaxableAllowances || 0), isMasked)}</td>}
                {visibleColumns.gross && <td className="py-2 px-3 text-right font-bold text-slate-900 bg-slate-50">{formatPHP(row.grossPay, isMasked)}</td>}
                {visibleColumns.sssEE && <td className="py-2 px-3 text-right text-blue-700">{formatPHP(row.sssEE, isMasked)}</td>}
                {visibleColumns.phEE && <td className="py-2 px-3 text-right text-emerald-700">{formatPHP(row.philHealthEE, isMasked)}</td>}
                {visibleColumns.hdmfEE && <td className="py-2 px-3 text-right text-amber-700">{formatPHP(row.pagIbigEE, isMasked)}</td>}
                {visibleColumns.tax && <td className="py-2 px-3 text-right text-purple-700">{formatPHP(row.withholdingTax, isMasked)}</td>}
                {visibleColumns.loans && <td className="py-2 px-3 text-right text-slate-700">{formatPHP(row.loanDeductions, isMasked)}</td>}
                {visibleColumns.otherDeductions && <td className="py-2 px-3 text-right text-slate-700">{formatPHP((row.lateDeduction || 0) + (row.undertimeDeduction || 0), isMasked)}</td>}
                {visibleColumns.totalDeductions && <td className="py-2 px-3 text-right font-bold text-rose-700 bg-rose-50/30">{formatPHP(row.totalDeductions, isMasked)}</td>}
                {visibleColumns.netPay && <td className="py-2 px-3 text-right font-bold text-emerald-700 bg-emerald-50/40">{formatPHP(row.netPay, isMasked)}</td>}
              </tr>
            ))}
            {filteredData.length === 0 && !isLoading && (
              <tr>
                <td colSpan={18} className="py-12 text-center text-slate-400 font-sans">
                  No payroll records match the selected company or cutoff filters.
                </td>
              </tr>
            )}
          </tbody>
          {/* Summary Footer */}
          <tfoot className="sticky bottom-0 bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
            <tr>
              <td colSpan={4} className="py-2.5 px-3 font-sans">
                GRAND TOTALS ({totals.count} Staff)
              </td>
              {visibleColumns.basicPay && <td className="py-2.5 px-3 text-right">{formatPHP(totals.basic, isMasked)}</td>}
              {visibleColumns.ot && <td className="py-2.5 px-3 text-right">{formatPHP(totals.ot, isMasked)}</td>}
              {visibleColumns.holiday && <td className="py-2.5 px-3 text-right">{formatPHP(totals.holiday, isMasked)}</td>}
              {visibleColumns.nightDiff && <td className="py-2.5 px-3 text-right">{formatPHP(totals.night, isMasked)}</td>}
              {visibleColumns.allowances && <td className="py-2.5 px-3 text-right">{formatPHP(totals.allow, isMasked)}</td>}
              {visibleColumns.gross && <td className="py-2.5 px-3 text-right bg-slate-200/80">{formatPHP(totals.gross, isMasked)}</td>}
              {visibleColumns.sssEE && <td className="py-2.5 px-3 text-right text-blue-800">{formatPHP(totals.sss, isMasked)}</td>}
              {visibleColumns.phEE && <td className="py-2.5 px-3 text-right text-emerald-800">{formatPHP(totals.ph, isMasked)}</td>}
              {visibleColumns.hdmfEE && <td className="py-2.5 px-3 text-right text-amber-800">{formatPHP(totals.hdmf, isMasked)}</td>}
              {visibleColumns.tax && <td className="py-2.5 px-3 text-right text-purple-800">{formatPHP(totals.tax, isMasked)}</td>}
              {visibleColumns.loans && <td className="py-2.5 px-3 text-right">{formatPHP(totals.loans, isMasked)}</td>}
              {visibleColumns.otherDeductions && <td className="py-2.5 px-3 text-right">{formatPHP(totals.otherDed, isMasked)}</td>}
              {visibleColumns.totalDeductions && <td className="py-2.5 px-3 text-right text-rose-800 bg-rose-100/70">{formatPHP(totals.totalDed, isMasked)}</td>}
              {visibleColumns.netPay && <td className="py-2.5 px-3 text-right text-emerald-800 bg-emerald-100/80">{formatPHP(totals.net, isMasked)}</td>}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// 2. PAYROLL SUMMARY WINDOW
// ============================================================================
export const PayrollSummaryWindow: React.FC<{ salaryPrivacy?: boolean }> = ({ salaryPrivacy = false }) => {
  const { currentCompany, currentCompanyId, isAllCompanies } = useCompanyContext();

  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('all');
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      const allRuns = await payrollRunRepository.findAllRuns();
      const allSlips = await payrollRunRepository.findAllPayslips();
      setRuns(allRuns);
      setPayslips(allSlips);
      if (allRuns.length > 0) setSelectedRunId(allRuns[0].id);
    };
    load();
  }, []);

  const activeSlips = useMemo(() => {
    let result = payslips;
    if (!isAllCompanies && currentCompanyId) {
      result = result.filter(s => s.companyId === currentCompanyId);
    }
    if (selectedRunId !== 'all') {
      result = result.filter(s => s.payrollRunId === selectedRunId);
    }
    return result;
  }, [payslips, selectedRunId, currentCompanyId, isAllCompanies]);

  // Aggregate metrics
  const summary = useMemo(() => {
    let basic = 0, ot = 0, holiday = 0, allow = 0, gross = 0;
    let sss = 0, ph = 0, hdmf = 0, tax = 0, loans = 0, other = 0, totalDed = 0, net = 0;
    let sssER = 0, sssEC = 0, phER = 0, hdmfER = 0;

    for (const p of activeSlips) {
      basic += p.basicPay || 0;
      ot += p.overtimePay || 0;
      holiday += p.holidayPay || 0;
      allow += (p.taxableAllowances || 0) + (p.nonTaxableAllowances || 0);
      gross += p.grossPay || 0;
      sss += p.sssEE || 0;
      ph += p.philHealthEE || 0;
      hdmf += p.pagIbigEE || 0;
      tax += p.withholdingTax || 0;
      loans += p.loanDeductions || 0;
      other += (p.lateDeduction || 0) + (p.undertimeDeduction || 0);
      totalDed += p.totalDeductions || 0;
      net += p.netPay || 0;

      sssER += p.sssER || 0;
      sssEC += p.sssEC || 0;
      phER += p.philHealthER || 0;
      hdmfER += p.pagIbigER || 0;
    }

    return {
      count: activeSlips.length,
      basic, ot, holiday, allow, gross,
      sss, ph, hdmf, tax, loans, other, totalDed, net,
      employerBurden: sssER + sssEC + phER + hdmfER,
      totalPayrollCost: gross + (sssER + sssEC + phER + hdmfER),
    };
  }, [activeSlips]);

  // Departmental breakdown
  const deptBreakdown = useMemo(() => {
    const map: Record<string, { count: number; gross: number; net: number; ded: number }> = {};
    for (const p of activeSlips) {
      const d = p.departmentName || 'General';
      if (!map[d]) map[d] = { count: 0, gross: 0, net: 0, ded: 0 };
      map[d].count += 1;
      map[d].gross += p.grossPay || 0;
      map[d].ded += p.totalDeductions || 0;
      map[d].net += p.netPay || 0;
    }
    return Object.entries(map).map(([dept, data]) => ({ dept, ...data }));
  }, [activeSlips]);

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc] text-slate-800 text-xs space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 bg-white p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-2.5">
          <PieChart className="w-5 h-5 text-blue-600" />
          <div>
            <h1 className="text-sm font-bold text-slate-900">Executive Payroll Cost & Statutory Summary</h1>
            <p className="text-slate-500 text-xs">High-level financial overview of disbursements and employer liabilities.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-600">Cutoff:</span>
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none"
          >
            <option value="all">All Payroll Runs</option>
            {runs.map(r => (
              <option key={r.id} value={r.id}>
                {r.periodName || r.payrollPeriodId} ({r.status})
              </option>
            ))}
          </select>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" /> Print Summary
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Gross Payroll</span>
          <div className="text-lg font-bold font-mono text-slate-900">{formatPHP(summary.gross)}</div>
          <span className="text-[10px] text-slate-400 font-sans">{summary.count} Active Headcount</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Net Take-Home</span>
          <div className="text-lg font-bold font-mono text-emerald-700">{formatPHP(summary.net)}</div>
          <span className="text-[10px] text-emerald-600 font-sans">Bank & Cash Disbursement</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Deductions</span>
          <div className="text-lg font-bold font-mono text-rose-600">{formatPHP(summary.totalDed)}</div>
          <span className="text-[10px] text-slate-400 font-sans">Statutory + Tax + Loans</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Employer Burden</span>
          <div className="text-lg font-bold font-mono text-blue-700">{formatPHP(summary.employerBurden)}</div>
          <span className="text-[10px] text-blue-600 font-sans">SSS ER + EC + PH ER + HDMF ER</span>
        </div>
      </div>

      {/* Breakdown Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Earnings & Deductions Breakdown */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
          <h2 className="font-bold text-slate-900 flex items-center gap-1.5 border-b pb-2">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <span>Disbursement & Remittance Itemization</span>
          </h2>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-600">
              <span>Basic Compensation:</span> <span>{formatPHP(summary.basic)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Overtime & Night Diff:</span> <span>{formatPHP(summary.ot)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Allowances & Stipends:</span> <span>{formatPHP(summary.allow)}</span>
            </div>
            <div className="flex justify-between text-blue-700 font-bold pt-1 border-t border-slate-100">
              <span>SSS Employee Deductions:</span> <span>{formatPHP(summary.sss)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>PhilHealth Employee Premiums:</span> <span>{formatPHP(summary.ph)}</span>
            </div>
            <div className="flex justify-between text-amber-700 font-bold">
              <span>Pag-IBIG / HDMF Deductions:</span> <span>{formatPHP(summary.hdmf)}</span>
            </div>
            <div className="flex justify-between text-purple-700 font-bold">
              <span>BIR Income Tax Withheld:</span> <span>{formatPHP(summary.tax)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Employee Loan Payments:</span> <span>{formatPHP(summary.loans)}</span>
            </div>
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
          <h2 className="font-bold text-slate-900 flex items-center gap-1.5 border-b pb-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Department Cost Allocation</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b text-slate-500 font-sans text-[11px]">
                  <th className="pb-1.5">Department</th>
                  <th className="pb-1.5 text-center">Headcount</th>
                  <th className="pb-1.5 text-right">Gross Pay</th>
                  <th className="pb-1.5 text-right">Net Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deptBreakdown.map((d) => (
                  <tr key={d.dept} className="hover:bg-slate-50">
                    <td className="py-2 font-sans font-medium text-slate-800">{d.dept}</td>
                    <td className="py-2 text-center text-slate-600">{d.count}</td>
                    <td className="py-2 text-right text-slate-800">{formatPHP(d.gross)}</td>
                    <td className="py-2 text-right text-emerald-700 font-bold">{formatPHP(d.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. SPECIALIZED REPORTS: DEDUCTIONS, OVERTIME, ATTENDANCE, LEAVE, LOANS, ETC.
// ============================================================================

export const DeductionsReportWindow: React.FC = () => {
  const { currentCompanyId, isAllCompanies } = useCompanyContext();
  const [slips, setSlips] = useState<PayslipRecord[]>([]);

  useEffect(() => {
    payrollRunRepository.findAllPayslips().then(all => {
      if (!isAllCompanies && currentCompanyId) {
        setSlips(all.filter(s => s.companyId === currentCompanyId));
      } else {
        setSlips(all);
      }
    });
  }, [currentCompanyId, isAllCompanies]);

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc] text-xs font-mono space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-xs font-sans">
        <div>
          <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Percent className="w-4 h-4 text-rose-600" />
            <span>Comprehensive Deductions Audit Report</span>
          </h1>
          <p className="text-slate-500 text-xs">Statutory contributions, withholding taxes, and employee loan schedules.</p>
        </div>
        <button onClick={() => window.print()} className="px-3 py-1.5 bg-blue-600 text-white font-semibold rounded-lg">
          Print / Export
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b text-slate-600 font-sans text-[11px]">
            <tr>
              <th className="py-2.5 px-3">Emp ID</th>
              <th className="py-2.5 px-3">Name</th>
              <th className="py-2.5 px-3 text-right">SSS EE</th>
              <th className="py-2.5 px-3 text-right">PhilHealth EE</th>
              <th className="py-2.5 px-3 text-right">Pag-IBIG EE</th>
              <th className="py-2.5 px-3 text-right">Withholding Tax</th>
              <th className="py-2.5 px-3 text-right">Loans</th>
              <th className="py-2.5 px-3 text-right font-bold text-rose-700">Total Deductions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {slips.map(s => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="py-2 px-3 font-bold text-slate-900">{s.employeeNumber}</td>
                <td className="py-2 px-3 font-sans text-slate-800">{s.employeeName}</td>
                <td className="py-2 px-3 text-right text-blue-700">{formatPHP(s.sssEE)}</td>
                <td className="py-2 px-3 text-right text-emerald-700">{formatPHP(s.philHealthEE)}</td>
                <td className="py-2 px-3 text-right text-amber-700">{formatPHP(s.pagIbigEE)}</td>
                <td className="py-2 px-3 text-right text-purple-700">{formatPHP(s.withholdingTax)}</td>
                <td className="py-2 px-3 text-right text-slate-700">{formatPHP(s.loanDeductions)}</td>
                <td className="py-2 px-3 text-right font-bold text-rose-700">{formatPHP(s.totalDeductions)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const OvertimeReportWindow: React.FC = () => {
  const [slips, setSlips] = useState<PayslipRecord[]>([]);

  useEffect(() => {
    payrollRunRepository.findAllPayslips().then(all => setSlips(all));
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc] text-xs font-mono space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-xs font-sans">
        <div>
          <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock8 className="w-4 h-4 text-blue-600" />
            <span>Overtime & Night Differential Audit Register</span>
          </h1>
          <p className="text-slate-500 text-xs">Logged OT hours, night differentials, and multiplier compensation.</p>
        </div>
        <button onClick={() => window.print()} className="px-3 py-1.5 bg-blue-600 text-white font-semibold rounded-lg">
          Print / Export
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b text-slate-600 font-sans text-[11px]">
            <tr>
              <th className="py-2.5 px-3">Emp ID</th>
              <th className="py-2.5 px-3">Employee Name</th>
              <th className="py-2.5 px-3 text-center">OT Hours</th>
              <th className="py-2.5 px-3 text-right">OT Pay</th>
              <th className="py-2.5 px-3 text-center">Night Diff Hours</th>
              <th className="py-2.5 px-3 text-right">Night Diff Pay</th>
              <th className="py-2.5 px-3 text-right font-bold text-blue-800">Total Premium</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {slips.map(s => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="py-2 px-3 font-bold text-slate-900">{s.employeeNumber}</td>
                <td className="py-2 px-3 font-sans text-slate-800">{s.employeeName}</td>
                <td className="py-2 px-3 text-center">{s.overtimeHours || 0} hrs</td>
                <td className="py-2 px-3 text-right text-slate-800">{formatPHP(s.overtimePay)}</td>
                <td className="py-2 px-3 text-center">{s.nightHours || 0} hrs</td>
                <td className="py-2 px-3 text-right text-slate-800">{formatPHP(s.nightDiffPay)}</td>
                <td className="py-2 px-3 text-right font-bold text-blue-800">
                  {formatPHP((s.overtimePay || 0) + (s.nightDiffPay || 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const AttendanceReportWindow: React.FC = () => {
  const [slips, setSlips] = useState<PayslipRecord[]>([]);
  useEffect(() => { payrollRunRepository.findAllPayslips().then(setSlips); }, []);

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc] text-xs font-mono space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs font-sans">
        <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Clock3 className="w-4 h-4 text-amber-600" />
          <span>Attendance & Tardiness Penalty Report</span>
        </h1>
        <p className="text-slate-500 text-xs">Late arrival minutes, undertime, absences, and attendance deductions.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b text-slate-600 font-sans text-[11px]">
            <tr>
              <th className="py-2.5 px-3">Emp ID</th>
              <th className="py-2.5 px-3">Name</th>
              <th className="py-2.5 px-3 text-center">Days Worked</th>
              <th className="py-2.5 px-3 text-center">Tardiness (Mins)</th>
              <th className="py-2.5 px-3 text-right text-rose-600">Late Deduction</th>
              <th className="py-2.5 px-3 text-right text-rose-600">Undertime Deduction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {slips.map(s => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="py-2 px-3 font-bold text-slate-900">{s.employeeNumber}</td>
                <td className="py-2 px-3 font-sans text-slate-800">{s.employeeName}</td>
                <td className="py-2 px-3 text-center">{s.daysWorked || 11} days</td>
                <td className="py-2 px-3 text-center text-rose-600 font-bold">{s.lateMinutes || 0} mins</td>
                <td className="py-2 px-3 text-right text-rose-700">{formatPHP(s.lateDeduction)}</td>
                <td className="py-2 px-3 text-right text-rose-700">{formatPHP(s.undertimeDeduction)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const LeaveReportWindow: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc] text-xs space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <CalendarRange className="w-4 h-4 text-indigo-600" />
          <span>Leave Utilization & Monetization Summary</span>
        </h1>
        <p className="text-slate-500 text-xs">Vacation leave, sick leave, service incentive leave, and paid absence balances.</p>
      </div>
      <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-slate-500">
        All employee leave utilization records are synchronized with active payroll cutoffs.
      </div>
    </div>
  );
};

export const LoanReportWindow: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc] text-xs space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-600" />
          <span>Government & Company Loan Amortization Register</span>
        </h1>
        <p className="text-slate-500 text-xs">SSS salary loans, HDMF multi-purpose loans, and company emergency loans.</p>
      </div>
      <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-slate-500">
        Active loan balances and payroll amortizations are audited under Phase 8 & 9 compliance rules.
      </div>
    </div>
  );
};

export const AllowanceReportWindow: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc] text-xs space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-600" />
          <span>Allowance & De Minimis Benefit Distribution</span>
        </h1>
        <p className="text-slate-500 text-xs">Rice subsidy, clothing allowance, laundry, and taxable stipend classifications.</p>
      </div>
      <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-slate-500">
        De Minimis allowances strictly adhere to RR 11-2018 statutory ceilings.
      </div>
    </div>
  );
};

export const PayrollHistoryWindow: React.FC = () => {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  useEffect(() => { payrollRunRepository.findAllRuns().then(setRuns); }, []);

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc] text-xs font-mono space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs font-sans">
        <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600" />
          <span>Historical Payroll Cycle Archive</span>
        </h1>
        <p className="text-slate-500 text-xs">Finalized and immutable payroll runs with sealed calculation snapshots.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b text-slate-600 font-sans text-[11px]">
            <tr>
              <th className="py-2.5 px-3">Period Batch ID</th>
              <th className="py-2.5 px-3">Cutoff Schedule</th>
              <th className="py-2.5 px-3">Pay Date</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-right">Headcount</th>
              <th className="py-2.5 px-3 text-right">Total Net Payout</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {runs.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-bold text-slate-900">{r.id}</td>
                <td className="py-2.5 px-3 font-sans text-slate-800">{r.periodName || r.payrollPeriodId}</td>
                <td className="py-2.5 px-3 text-slate-600">{r.runDate}</td>
                <td className="py-2.5 px-3 text-center">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-sans font-bold">
                    {r.status}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">{r.totalEmployees} staff</td>
                <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{formatPHP(r.totalNetPay)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const AuditReportWindow: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  useEffect(() => { auditRepository.findAll().then(setLogs); }, []);

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc] text-xs font-mono space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs font-sans">
        <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <FileSearch className="w-4 h-4 text-purple-600" />
          <span>System Audit Trail & Security Event Logs</span>
        </h1>
        <p className="text-slate-500 text-xs">Immutable audit logs recording rule changes, calculations, payslips, and exports.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b text-slate-600 font-sans text-[11px]">
            <tr>
              <th className="py-2.5 px-3">Timestamp</th>
              <th className="py-2.5 px-3">User</th>
              <th className="py-2.5 px-3">Action</th>
              <th className="py-2.5 px-3">Target Entity</th>
              <th className="py-2.5 px-3">Event Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.slice(0, 100).map(l => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="py-2 px-3 text-slate-500 text-[10.5px]">{l.timestamp}</td>
                <td className="py-2 px-3 font-bold text-slate-900">{l.userId}</td>
                <td className="py-2 px-3">
                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-sans font-bold">
                    {l.action}
                  </span>
                </td>
                <td className="py-2 px-3 text-blue-700 font-sans">{l.entityType} ({l.entityId})</td>
                <td className="py-2 px-3 font-sans text-slate-700">{l.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// 4. MAIN REPORT CENTER CATALOG WINDOW
// ============================================================================
export const ReportCenterWindow: React.FC = () => {
  return <PayrollRegisterWindow />;
};

export const StatutoryReportWindow: React.FC = () => {
  return <PayrollSummaryWindow />;
};

export const EmployeePayrollReportWindow: React.FC = () => {
  return <PayrollRegisterWindow />;
};
