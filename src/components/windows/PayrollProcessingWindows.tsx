/**
 * Payroll Processing & Calculation Trace Windows - Phase 5
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calculator, 
  Play, 
  CheckCircle2, 
  FileText, 
  Eye, 
  Layers, 
  Lock, 
  Unlock,
  Sparkles, 
  Clock, 
  AlertCircle, 
  Calendar,
  Building2,
  DollarSign,
  Download,
  X,
  RefreshCw,
  Search,
  Check
} from 'lucide-react';
import { useCompanyContext } from '../../context/CompanyContext';
import { useAuth } from '../../context/AuthContext';
import { auditService } from '../../services/AuditService';
import { payrollEngine } from '../../services/payroll/PayrollEngine';
import { payrollPeriodRepository } from '../../repositories/PayrollPeriodRepository';
import { payrollRunRepository } from '../../repositories/PayrollRunRepository';
import { employeeService } from '../../services/EmployeeService';
import { PayrollPeriod, PayrollRun, PayslipRecord, Employee } from '../../db/schema';

// ==========================================
// 1. PAYROLL PROCESSING WINDOW
// ==========================================
export const PayrollProcessingWindow: React.FC<{ salaryPrivacy?: boolean }> = ({ salaryPrivacy = false }) => {
  const { currentCompany, currentCompanyId, isAllCompanies } = useCompanyContext();

  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [activeRun, setActiveRun] = useState<PayrollRun | null>(null);
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Trace Inspector Modal
  const [inspectingPayslip, setInspectingPayslip] = useState<PayslipRecord | null>(null);

  // Load Periods and Employees
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const companyScope = isAllCompanies ? null : currentCompanyId;

      // Bootstrap default period if none exists
      let allPeriods = await payrollPeriodRepository.findByCompany(companyScope);
      if (allPeriods.length === 0) {
        const defaultPeriod: PayrollPeriod = {
          id: 'period_2026_08_a',
          companyId: currentCompanyId || 'comp_main',
          periodCode: '2026-08-A',
          name: 'August 01 - August 15, 2026 (Semi-Monthly)',
          startDate: '2026-08-01',
          endDate: '2026-08-15',
          payoutDate: '2026-08-20',
          cutoffType: 'Semi-Monthly',
          status: 'Open',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await payrollPeriodRepository.create(defaultPeriod);
        allPeriods = [defaultPeriod];
      }

      setPeriods(allPeriods);
      const activePeriod = allPeriods[0];
      setSelectedPeriodId(activePeriod.id);

      const empRes = await employeeService.listEmployees({ companyId: companyScope, status: 'Active' });
      setEmployees(empRes.employees);

      // Check if existing calculated run exists
      const existingRuns = await payrollRunRepository.findRunsByCompany(companyScope);
      const matchRun = existingRuns.find((r) => r.periodId === activePeriod.id);
      if (matchRun) {
        setActiveRun(matchRun);
        const slips = await payrollRunRepository.findPayslipsByRun(matchRun.id);
        setPayslips(slips);
      } else {
        setActiveRun(null);
        setPayslips([]);
      }
    } catch (err) {
      console.error('Failed to load payroll processing:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAllCompanies, currentCompanyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Execute Calculation Engine
  const handleExecuteCalculation = async () => {
    const targetPeriod = periods.find((p) => p.id === selectedPeriodId);
    if (!targetPeriod) return;

    setIsCalculating(true);
    try {
      const companyScope = isAllCompanies ? (employees[0]?.companyId || 'comp_main') : currentCompanyId!;
      const result = await payrollEngine.processCompanyPayrollRun(companyScope, targetPeriod, 'Admin Master');
      setActiveRun(result.run);
      setPayslips(result.payslips);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Calculation error');
    } finally {
      setIsCalculating(false);
    }
  };

  const { currentUser, hasPermission } = useAuth();
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  // Finalize Batch
  const handleFinalizeBatch = async () => {
    if (!activeRun) return;
    if (!hasPermission('payroll:finalize')) {
      alert('Access Denied: You do not have permission to finalize payroll.');
      return;
    }

    const confirm = window.confirm(
      'Are you sure you want to finalize this payroll batch? This locks the calculation traces and rules snapshot permanently.'
    );
    if (!confirm) return;

    const updatedRun: PayrollRun = {
      ...activeRun,
      status: 'Finalized',
      finalizedAt: new Date().toISOString(),
      finalizedBy: currentUser?.displayName || 'Admin Master',
      updatedAt: new Date().toISOString(),
    };

    await payrollRunRepository.updateRun(updatedRun);
    setActiveRun(updatedRun);

    auditService.logAction({
      userId: currentUser?.username || 'admin',
      companyId: activeRun.companyId,
      action: 'FINALIZE',
      entityType: 'PayrollRun',
      entityId: activeRun.id,
      description: `Finalized payroll batch ${activeRun.id} for period ${activeRun.periodId}`,
    });

    alert('Payroll batch finalized successfully. Immutable audit snapshots locked.');
  };

  // Reopen Batch
  const handleReopenBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRun || !reopenReason.trim()) return;

    if (!hasPermission('payroll:reopen')) {
      alert('Access Denied: You do not have permission to reopen finalized payroll.');
      return;
    }

    const updatedRun: PayrollRun = {
      ...activeRun,
      status: 'Calculated',
      updatedAt: new Date().toISOString(),
    };

    await payrollRunRepository.updateRun(updatedRun);
    setActiveRun(updatedRun);

    auditService.logAction({
      userId: currentUser?.username || 'admin',
      companyId: activeRun.companyId,
      action: 'REOPEN',
      entityType: 'PayrollRun',
      entityId: activeRun.id,
      description: `REOPENED finalized payroll batch ${activeRun.id}. Reason: ${reopenReason.trim()}`,
      metadata: { reopenedBy: currentUser?.username, reopenReason: reopenReason.trim(), reopenedAt: new Date().toISOString() },
    });

    setShowReopenModal(false);
    setReopenReason('');
    alert('Payroll batch reopened successfully. Reopen event recorded in audit logs.');
  };

  const filteredSlips = useMemo(() => {
    return payslips.filter((s) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = s.employeeName.toLowerCase();
        const empNo = s.employeeNumber.toLowerCase();
        if (!name.includes(q) && !empNo.includes(q)) return false;
      }
      return true;
    });
  }, [payslips, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-700 select-none">
      {/* 1. Header Toolbar */}
      <div className="p-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>Payroll Calculation & Processing Workbench</span>
              {activeRun?.status === 'Finalized' && (
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono lowercase flex items-center gap-1">
                  <Lock className="w-3 h-3" /> finalized batch
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-500">
              Execute centralized payroll formula engine with live step-by-step audit trace inspection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeRun && activeRun.status !== 'Finalized' && (
            <button
              onClick={handleFinalizeBatch}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Finalize Payroll Batch</span>
            </button>
          )}

          {activeRun && activeRun.status === 'Finalized' && (
            <button
              onClick={() => setShowReopenModal(true)}
              className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Unlock className="w-3.5 h-3.5 text-amber-600" />
              <span>Reopen Finalized Batch</span>
            </button>
          )}

          <button
            onClick={handleExecuteCalculation}
            disabled={isCalculating || activeRun?.status === 'Finalized'}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
          >
            {isCalculating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isCalculating ? 'Computing Payroll...' : 'Execute Calculation Engine'}</span>
          </button>
        </div>
      </div>

      {/* 2. Cutoff Period & Company Selector */}
      <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-medium">Payroll Period:</span>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="bg-transparent border-0 font-bold text-slate-900 outline-hidden cursor-pointer"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="w-64">
          <input
            type="text"
            placeholder="Filter employee or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 placeholder-slate-400 outline-hidden focus:bg-white"
          />
        </div>
      </div>

      {/* 3. Summary KPI Bento Tiles */}
      {activeRun && (
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 shrink-0">
          <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Headcount</span>
            <span className="text-base font-bold text-slate-900 font-mono">{activeRun.totalEmployees}</span>
          </div>

          <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Gross Pay</span>
            <span className="text-base font-bold text-emerald-700 font-mono">
              {salaryPrivacy ? '••••••' : `₱${activeRun.totalGrossPay.toLocaleString()}`}
            </span>
          </div>

          <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Deductions</span>
            <span className="text-base font-bold text-rose-700 font-mono">
              {salaryPrivacy ? '••••••' : `₱${activeRun.totalDeductions.toLocaleString()}`}
            </span>
          </div>

          <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Net Take-Home Pay</span>
            <span className="text-base font-bold text-blue-700 font-mono">
              {salaryPrivacy ? '••••••' : `₱${activeRun.totalNetPay.toLocaleString()}`}
            </span>
          </div>

          <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">SSS (EE/ER)</span>
            <span className="text-xs font-bold text-slate-800 font-mono">
              ₱{activeRun.totalSssEE.toLocaleString()} / ₱{activeRun.totalSssER.toLocaleString()}
            </span>
          </div>

          <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">PhilHealth / Pag-IBIG</span>
            <span className="text-xs font-bold text-slate-800 font-mono">
              ₱{activeRun.totalPhilHealthEE.toLocaleString()} / ₱{activeRun.totalPagIbigEE.toLocaleString()}
            </span>
          </div>

          <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">BIR Tax Withheld</span>
            <span className="text-base font-bold text-purple-700 font-mono">
              ₱{activeRun.totalWithholdingTax.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* 4. Calculated Payslips Table */}
      <div className="flex-1 overflow-auto bg-white">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mb-2" />
            <span className="text-xs">Loading payroll records...</span>
          </div>
        ) : payslips.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <Calculator className="w-10 h-10 text-slate-300 mb-2" />
            <h3 className="text-xs font-bold text-slate-700 uppercase">Ready for Calculation</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
              Click &quot;Execute Calculation Engine&quot; above to process semi-monthly payroll across all active employees.
            </p>
            <button
              onClick={handleExecuteCalculation}
              disabled={isCalculating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Execute Calculation Engine</span>
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10 font-mono">
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3 text-right">Basic Pay</th>
                <th className="py-2.5 px-3 text-right">Overtime</th>
                <th className="py-2.5 px-3 text-right">Gross Pay</th>
                <th className="py-2.5 px-3 text-right">Late/UT</th>
                <th className="py-2.5 px-3 text-right">SSS (EE)</th>
                <th className="py-2.5 px-3 text-right">PhilHealth</th>
                <th className="py-2.5 px-3 text-right">Pag-IBIG</th>
                <th className="py-2.5 px-3 text-right">Tax (WHT)</th>
                <th className="py-2.5 px-3 text-right font-bold text-blue-800">Net Pay</th>
                <th className="py-2.5 px-3 text-center">Audit Trace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11.5px] bg-white">
              {filteredSlips.map((slip) => (
                <tr key={slip.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="py-2.5 px-3 font-sans">
                    <div className="font-bold text-slate-900">{slip.employeeName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{slip.employeeNumber}</div>
                  </td>

                  <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                    {salaryPrivacy ? '••••••' : `₱${slip.basicPay.toFixed(2)}`}
                  </td>

                  <td className="py-2.5 px-3 text-right text-cyan-700 font-bold">
                    {slip.overtimePay > 0 ? (salaryPrivacy ? '••••' : `₱${slip.overtimePay.toFixed(2)}`) : '—'}
                  </td>

                  <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                    {salaryPrivacy ? '••••••' : `₱${slip.grossPay.toFixed(2)}`}
                  </td>

                  <td className="py-2.5 px-3 text-right text-amber-700">
                    {slip.lateDeduction + slip.undertimeDeduction > 0
                      ? `₱${(slip.lateDeduction + slip.undertimeDeduction).toFixed(2)}`
                      : '—'}
                  </td>

                  <td className="py-2.5 px-3 text-right text-slate-700">
                    ₱{slip.sssEE.toFixed(2)}
                  </td>

                  <td className="py-2.5 px-3 text-right text-slate-700">
                    ₱{slip.philHealthEE.toFixed(2)}
                  </td>

                  <td className="py-2.5 px-3 text-right text-slate-700">
                    ₱{slip.pagIbigEE.toFixed(2)}
                  </td>

                  <td className="py-2.5 px-3 text-right text-purple-700 font-semibold">
                    {slip.withholdingTax > 0 ? `₱${slip.withholdingTax.toFixed(2)}` : '₱0.00'}
                  </td>

                  <td className="py-2.5 px-3 text-right font-bold text-blue-700 text-xs">
                    {salaryPrivacy ? '••••••' : `₱${slip.netPay.toFixed(2)}`}
                  </td>

                  <td className="py-2.5 px-3 text-center font-sans">
                    <button
                      onClick={() => setInspectingPayslip(slip)}
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[10.5px] font-bold inline-flex items-center gap-1 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Trace</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Calculation Trace Modal */}
      {inspectingPayslip && (
        <CalculationTraceModal
          payslip={inspectingPayslip}
          salaryPrivacy={salaryPrivacy}
          onClose={() => setInspectingPayslip(null)}
        />
      )}

      {/* Reopen Batch Modal */}
      {showReopenModal && activeRun && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-amber-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-amber-200 flex items-center justify-between bg-amber-50">
              <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                <Unlock className="w-4 h-4 text-amber-600" /> Authorized Payroll Reopen
              </h3>
              <button onClick={() => setShowReopenModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReopenBatch} className="p-4 space-y-3.5 text-xs">
              <p className="text-slate-700 leading-relaxed">
                Reopening a finalized payroll batch unlocks calculation traces and enables edits. A mandatory audit log entry will record your user account, timestamp, and explanation.
              </p>

              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Reason for Reopening Batch <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  required
                  rows={3}
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-amber-500"
                  placeholder="Provide audit justification (e.g. Approved salary rate adjustment for 2 employees)"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReopenModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  Reopen Payroll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// CALCULATION TRACE INSPECTOR MODAL
// ==========================================
interface CalculationTraceModalProps {
  payslip: PayslipRecord;
  salaryPrivacy: boolean;
  onClose: () => void;
}

const CalculationTraceModal: React.FC<CalculationTraceModalProps> = ({ payslip, salaryPrivacy, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Step-by-Step Calculation Trace Inspector
              </h3>
              <p className="text-[11px] text-slate-500">
                {payslip.employeeName} ({payslip.employeeNumber}) — Net Pay: ₱{payslip.netPay.toLocaleString()}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Calculation Trace Steps */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            Every step below records the exact rule code, rule version, evaluated mathematical formula, dynamic inputs, and parameters frozen at calculation time.
          </div>

          <div className="space-y-3">
            {payslip.calculationTrace.map((trace, idx) => (
              <div key={idx} className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 font-bold font-mono text-[10px] flex items-center justify-center border border-indigo-200">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-900 text-xs">{trace.stepName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                      {trace.ruleCode} (v{trace.ruleVersion})
                    </span>
                    <span className="font-mono font-bold text-emerald-700 text-xs">
                      = ₱{trace.result.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="font-mono text-[11px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-slate-400">Formula:</span> {trace.formula}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[9.5px]">Inputs:</span>
                    <pre className="text-slate-700 font-mono">{JSON.stringify(trace.inputs, null, 2)}</pre>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase block text-[9.5px]">Parameters:</span>
                    <pre className="text-slate-700 font-mono">{JSON.stringify(trace.parameters, null, 2)}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. PAYROLL PERIODS WINDOW
// ==========================================
export const PayrollPeriodsWindow: React.FC<{ salaryPrivacy?: boolean }> = () => {
  const { currentCompany, currentCompanyId, isAllCompanies } = useCompanyContext();
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);

  const load = useCallback(async () => {
    const list = await payrollPeriodRepository.findByCompany(isAllCompanies ? null : currentCompanyId);
    setPeriods(list);
  }, [isAllCompanies, currentCompanyId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-700 select-none p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>Cutoff Periods & Payroll Schedule Master</span>
        </h2>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex-1">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
              <th className="py-2.5 px-3">Period Code & Name</th>
              <th className="py-2.5 px-3">Cutoff Window</th>
              <th className="py-2.5 px-3">Payout Date</th>
              <th className="py-2.5 px-3">Frequency</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {periods.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3">
                  <div className="font-bold text-slate-900">{p.name}</div>
                  <div className="text-[10px] font-mono text-slate-400">{p.periodCode}</div>
                </td>
                <td className="py-2.5 px-3 font-mono">
                  {p.startDate} to {p.endDate}
                </td>
                <td className="py-2.5 px-3 font-mono font-semibold text-emerald-700">
                  {p.payoutDate}
                </td>
                <td className="py-2.5 px-3">{p.cutoffType}</td>
                <td className="py-2.5 px-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
