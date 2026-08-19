/**
 * Payslips & Detailed Calculation Audit Windows - Phase 8
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Receipt, 
  Printer, 
  Download, 
  Layers, 
  Eye, 
  Calendar, 
  User, 
  Building2, 
  CheckCircle2, 
  Lock, 
  Search, 
  RefreshCw, 
  Info, 
  FileText, 
  X, 
  Filter, 
  ShieldCheck, 
  Calculator,
  ChevronRight
} from 'lucide-react';
import { useCompanyContext } from '../../context/CompanyContext';
import { payrollRunRepository } from '../../repositories/PayrollRunRepository';
import { auditService } from '../../services/AuditService';
import { PayrollRun, PayslipRecord, CalculationTraceStep } from '../../db/schema';

export const PayslipsWindow: React.FC<{ salaryPrivacy?: boolean }> = ({ salaryPrivacy = false }) => {
  const { currentCompany, currentCompanyId, isAllCompanies } = useCompanyContext();

  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('all');
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [selectedSlip, setSelectedSlip] = useState<PayslipRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [showTraceModal, setShowTraceModal] = useState(false);
  const [showMasked, setShowMasked] = useState(salaryPrivacy);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const companyScope = isAllCompanies ? null : currentCompanyId;
      const runs = await payrollRunRepository.findRunsByCompany(companyScope);
      const allSlips = await payrollRunRepository.findAllPayslips();

      setPayrollRuns(runs);

      let filteredSlips = allSlips;
      if (!isAllCompanies && currentCompanyId) {
        filteredSlips = filteredSlips.filter(s => s.companyId === currentCompanyId);
      }

      setPayslips(filteredSlips);

      if (runs.length > 0) {
        setSelectedRunId(runs[0].id);
      } else {
        setSelectedRunId('all');
      }

      if (filteredSlips.length > 0) {
        setSelectedSlip(filteredSlips[0]);
      } else {
        setSelectedSlip(null);
      }
    } catch (err) {
      console.error('Failed to load payslips:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAllCompanies, currentCompanyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter payslips by selected batch run and search query
  const displayedPayslips = useMemo(() => {
    return payslips.filter((s) => {
      const matchesRun = selectedRunId === 'all' || s.payrollRunId === selectedRunId;
      const matchesDept = selectedDepartment === 'All' || s.departmentName === selectedDepartment;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || s.employeeName.toLowerCase().includes(q) || s.employeeNumber.toLowerCase().includes(q);
      return matchesRun && matchesDept && matchesSearch;
    });
  }, [payslips, selectedRunId, selectedDepartment, searchQuery]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    payslips.forEach(s => { if (s.departmentName) set.add(s.departmentName); });
    return ['All', ...Array.from(set)];
  }, [payslips]);

  const handleSelectSlip = (slip: PayslipRecord) => {
    setSelectedSlip(slip);
    // Audit log
    auditService.logAction({
      userId: 'admin',
      companyId: slip.companyId || null,
      action: 'SYSTEM',
      entityType: 'Payslip',
      entityId: slip.id,
      description: `Accessed payslip confirmation for ${slip.employeeName} (${slip.employeeNumber})`,
    });
  };

  const handlePrint = () => {
    if (selectedSlip) {
      auditService.logAction({
        userId: 'admin',
        companyId: selectedSlip.companyId || null,
        action: 'EXPORT',
        entityType: 'Payslip',
        entityId: selectedSlip.id,
        description: `Printed payslip document for ${selectedSlip.employeeName}`,
      });
    }
    window.print();
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '₱0.00';
    if (showMasked) return '••••••';
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
  };

  return (
    <div className="flex-1 flex h-full bg-[#f8fafc] text-slate-700 select-none overflow-hidden">
      {/* Left Sidebar / Master Ledger */}
      <div className="w-84 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-200 bg-slate-50 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-blue-600" />
              <span>Payslips ({displayedPayslips.length})</span>
            </span>
            <button
              onClick={loadData}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Filters */}
          <div className="space-y-1.5">
            <select
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-700 outline-none"
            >
              <option value="all">All Payroll Runs</option>
              {payrollRuns.map(r => (
                <option key={r.id} value={r.id}>
                  {r.periodName || r.payrollPeriodId} ({r.status})
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] text-slate-700 outline-none"
              >
                {departments.map(d => (
                  <option key={d} value={d}>Dept: {d}</option>
                ))}
              </select>

              <button
                onClick={() => setShowMasked(!showMasked)}
                className={`px-2 py-1 border rounded-md text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                  showMasked ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Lock className="w-3 h-3" />
                {showMasked ? 'Masked' : 'Revealed'}
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search employee / ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs placeholder-slate-400 outline-none"
              />
            </div>
          </div>
        </div>

        {/* List of Payslips */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {displayedPayslips.map((slip) => {
            const isSelected = selectedSlip?.id === slip.id;
            return (
              <div
                key={slip.id}
                onClick={() => handleSelectSlip(slip)}
                className={`p-3 cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50/90 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-900">{slip.employeeName}</span>
                  <span className="text-[11px] font-mono font-bold text-emerald-700">
                    {formatCurrency(slip.netPay)}
                  </span>
                </div>
                <div className="flex justify-between text-[10.5px] text-slate-500 mt-1 font-mono">
                  <span>{slip.employeeNumber}</span>
                  <span>Gross: {formatCurrency(slip.grossPay)}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-sans truncate">
                  {slip.departmentName} • {slip.positionTitle}
                </div>
              </div>
            );
          })}
          {displayedPayslips.length === 0 && !isLoading && (
            <div className="p-8 text-center text-xs text-slate-400">
              No payslip records found for the selected criteria.
            </div>
          )}
        </div>
      </div>

      {/* Right Detail Pane: Payslip Document Preview */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 bg-[#f8fafc]">
        {selectedSlip ? (
          <div className="max-w-2xl mx-auto w-full space-y-4 text-xs">
            {/* Action Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Official Compensation Voucher
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTraceModal(true)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Calculator className="w-3.5 h-3.5" /> View Calculation Details
                </button>
                <button 
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-md text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" /> Print / PDF
                </button>
              </div>
            </div>

            {/* Printable Payslip Card */}
            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 print:border-none print:shadow-none">
              <div className="flex items-start justify-between border-b border-slate-200 pb-3.5">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {currentCompany ? currentCompany.legalName : 'Enterprise Corporation'}
                  </h2>
                  <div className="text-[11px] text-slate-500">
                    TIN: {showMasked ? '•••-•••-•••' : (currentCompany?.tin || '008-129-450-000')} • Republic of the Philippines
                  </div>
                  <div className="text-[11px] text-blue-700 font-bold mt-1 tracking-wide uppercase">
                    Itemized Compensation & Statutory Voucher
                  </div>
                </div>
                <div className="text-right font-mono text-[11px]">
                  <div className="text-slate-800 font-bold">Cut-off: Aug 01 - Aug 15, 2026</div>
                  <div className="text-slate-500">Snapshot: {selectedSlip.snapshotTimestamp.split('T')[0]}</div>
                </div>
              </div>

              {/* Employee Bio */}
              <div className="grid grid-cols-2 gap-4 text-[11px] bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <div className="text-slate-500">
                    Employee Name: <strong className="text-slate-900 font-sans">{selectedSlip.employeeName}</strong>
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    Employee ID: <strong className="text-slate-900 font-mono">{selectedSlip.employeeNumber}</strong>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-slate-500">
                    Department: <strong className="text-slate-900 font-sans">{selectedSlip.departmentName}</strong>
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    Position: <strong className="text-slate-900 font-sans">{selectedSlip.positionTitle}</strong>
                  </div>
                </div>
              </div>

              {/* Attendance & Hours Worked Metrics */}
              <div className="grid grid-cols-4 gap-2 text-center p-2.5 bg-slate-100/70 border border-slate-200 rounded-xl font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px] font-sans">Days Worked</span>
                  <strong className="text-slate-900">{selectedSlip.daysWorked || 11} Days</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-sans">Regular Hours</span>
                  <strong className="text-slate-900">{((selectedSlip.daysWorked || 11) * 8).toFixed(1)} hrs</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-sans">OT Hours</span>
                  <strong className="text-blue-700">{selectedSlip.overtimeHours || 0} hrs</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-sans">Late / Undertime</span>
                  <strong className="text-rose-600">{selectedSlip.lateMinutes || 0} mins</strong>
                </div>
              </div>

              {/* Earnings & Deductions Breakdown */}
              <div className="grid grid-cols-2 gap-6 text-xs">
                {/* Earnings */}
                <div className="space-y-2">
                  <div className="font-bold text-slate-800 border-b border-slate-200 pb-1.5">Earnings & Additions</div>
                  <div className="flex justify-between text-slate-600 font-mono">
                    <span>Basic Pay:</span> <span>{formatCurrency(selectedSlip.basicPay)}</span>
                  </div>
                  {selectedSlip.overtimePay > 0 && (
                    <div className="flex justify-between text-slate-600 font-mono">
                      <span>Overtime ({selectedSlip.overtimeHours} hrs):</span>
                      <span>{formatCurrency(selectedSlip.overtimePay)}</span>
                    </div>
                  )}
                  {selectedSlip.nightDiffPay > 0 && (
                    <div className="flex justify-between text-slate-600 font-mono">
                      <span>Night Differential ({selectedSlip.nightHours} hrs):</span>
                      <span>{formatCurrency(selectedSlip.nightDiffPay)}</span>
                    </div>
                  )}
                  {selectedSlip.taxableAllowances > 0 && (
                    <div className="flex justify-between text-slate-600 font-mono">
                      <span>Taxable Allowances:</span>
                      <span>{formatCurrency(selectedSlip.taxableAllowances)}</span>
                    </div>
                  )}
                  {selectedSlip.nonTaxableAllowances > 0 && (
                    <div className="flex justify-between text-slate-600 font-mono">
                      <span>Non-Taxable Benefits:</span>
                      <span>{formatCurrency(selectedSlip.nonTaxableAllowances)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1.5 font-mono">
                    <span>Total Gross:</span> <span>{formatCurrency(selectedSlip.grossPay)}</span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="space-y-2">
                  <div className="font-bold text-slate-800 border-b border-slate-200 pb-1.5">Statutory & Deductions</div>
                  {selectedSlip.lateDeduction > 0 && (
                    <div className="flex justify-between text-slate-600 font-mono">
                      <span>Tardiness ({selectedSlip.lateMinutes} mins):</span>
                      <span>{formatCurrency(selectedSlip.lateDeduction)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600 font-mono">
                    <span>SSS Contribution:</span> <span>{formatCurrency(selectedSlip.sssEE)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 font-mono">
                    <span>PhilHealth Premium:</span> <span>{formatCurrency(selectedSlip.philHealthEE)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 font-mono">
                    <span>Pag-IBIG / HDMF:</span> <span>{formatCurrency(selectedSlip.pagIbigEE)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 font-mono">
                    <span>Withholding Tax (BIR):</span> <span>{formatCurrency(selectedSlip.withholdingTax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-rose-600 border-t border-slate-200 pt-1.5 font-mono">
                    <span>Total Deductions:</span> <span>{formatCurrency(selectedSlip.totalDeductions)}</span>
                  </div>
                </div>
              </div>

              {/* Net Payout Banner */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between font-mono">
                <span className="font-bold text-xs text-slate-800 font-sans">Net Take-Home Pay:</span>
                <span className="text-base font-bold text-emerald-700">
                  {formatCurrency(selectedSlip.netPay)}
                </span>
              </div>

              {/* Immutable Applied Rule Versions Snapshot */}
              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-mono flex items-center justify-between">
                <span>Rule Snapshot: {JSON.stringify(selectedSlip.appliedRuleVersions)}</span>
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" /> Historical Snapshot Locked
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs">
            Select a payslip from the left ledger to preview
          </div>
        )}
      </div>

      {/* Calculation Trace Audit Modal */}
      {showTraceModal && selectedSlip && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Historical Calculation Trace — {selectedSlip.employeeName}
                </h3>
              </div>
              <button
                onClick={() => setShowTraceModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-blue-800 text-[11.5px] leading-relaxed">
                This calculation audit trail was sealed during payroll finalization. It contains the exact mathematical formulas, regulatory references, inputs, and parameters applied without re-running calculations.
              </div>

              <div className="space-y-3">
                {(selectedSlip.calculationTrace || []).map((step, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 font-mono">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 font-sans">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <ChevronRight className="w-3.5 h-3.5 text-blue-600" />
                        <span>{step.stepName}</span>
                      </span>
                      <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600 font-mono">
                        Rule: {step.ruleCode} (v{step.ruleVersion})
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 font-sans">
                      {step.description}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10.5px] pt-1">
                      <div>
                        <span className="text-slate-400 block">Formula:</span>
                        <code className="text-blue-700">{step.formula}</code>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block">Result:</span>
                        <strong className="text-emerald-700 text-xs">
                          ₱{typeof step.result === 'number' ? step.result.toFixed(2) : step.result}
                        </strong>
                      </div>
                    </div>

                    {step.inputs && (
                      <div className="pt-1.5 border-t border-slate-200/60 text-[10px] text-slate-500">
                        <span className="font-semibold">Inputs:</span> {JSON.stringify(step.inputs)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowTraceModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const CreatePayrollWindow: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc] text-slate-700">
      <div className="max-w-xl mx-auto space-y-4 text-xs">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-blue-600" />
            <span>Initialize New Payroll Batch Cycle</span>
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Configure cutoff parameters and dispatch to calculation engine.
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
          <p className="text-slate-600 text-xs">
            Use the <strong>Payroll Processing</strong> workbench to select period schedules and execute calculation rules with full audit trace inspection.
          </p>
        </div>
      </div>
    </div>
  );
};
