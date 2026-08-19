import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShieldCheck, 
  Scale, 
  FileText, 
  Sliders, 
  History, 
  PlayCircle, 
  Plus, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  RefreshCw, 
  Info, 
  Check, 
  X, 
  Eye, 
  Building2, 
  FileSpreadsheet, 
  Layers, 
  Lock,
  Calendar,
  DollarSign
} from 'lucide-react';
import { PayrollRule, RuleStatus } from '../../db/schema';
import { payrollRuleRepository } from '../../repositories/PayrollRuleRepository';
import { statutoryEngine, StatutorySimulationComparison } from '../../services/payroll/StatutoryEngine';
import { auditService } from '../../services/AuditService';
import { useCompanyContext } from '../../context/CompanyContext';

export const StatutoryRulesWindow: React.FC = () => {
  const { currentCompany, currentCompanyId, isAllCompanies } = useCompanyContext();

  const [activeTab, setActiveTab] = useState<'sss' | 'philhealth' | 'pagibig' | 'tax' | 'taxable_income' | 'simulation' | 'history'>('sss');
  const [rules, setRules] = useState<PayrollRule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Draft / Edit modal state
  const [editingRule, setEditingRule] = useState<PayrollRule | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // What-If Simulation Sandbox State
  const [simSalary, setSimSalary] = useState<number>(30000);
  const [simFrequency, setSimFrequency] = useState<'Semi-Monthly' | 'Monthly'>('Semi-Monthly');
  const [simOTPay, setSimOTPay] = useState<number>(862.05);
  const [simTaxableAllowance, setSimTaxableAllowance] = useState<number>(0);
  const [simAttendanceDeduction, setSimAttendanceDeduction] = useState<number>(43.10);

  // Draft overrides for simulation
  const [draftSssRate, setDraftSssRate] = useState<number>(4.5);
  const [draftPhRate, setDraftPhRate] = useState<number>(5.0);
  const [draftPagIbigCap, setDraftPagIbigCap] = useState<number>(200);

  const [simResult, setSimResult] = useState<StatutorySimulationComparison | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const loadRules = useCallback(async () => {
    try {
      setIsLoading(true);
      const all = await payrollRuleRepository.findAll();
      setRules(all);
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Failed to load statutory rules.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // Filter statutory rules by category
  const sssRules = useMemo(() => rules.filter(r => r.category === 'SSS'), [rules]);
  const phRules = useMemo(() => rules.filter(r => r.category === 'PhilHealth'), [rules]);
  const pagIbigRules = useMemo(() => rules.filter(r => r.category === 'Pag-IBIG'), [rules]);
  const taxRules = useMemo(() => rules.filter(r => r.category === 'Withholding Tax'), [rules]);

  const activeSss = useMemo(() => sssRules.find(r => r.status === 'Active') || sssRules[0], [sssRules]);
  const activePh = useMemo(() => phRules.find(r => r.status === 'Active') || phRules[0], [phRules]);
  const activePagIbig = useMemo(() => pagIbigRules.find(r => r.status === 'Active') || pagIbigRules[0], [pagIbigRules]);
  const activeTax = useMemo(() => taxRules.find(r => r.status === 'Active') || taxRules[0], [taxRules]);

  // Run Sandbox Simulation
  const handleRunSimulation = useCallback(async () => {
    if (!activeSss || !activePh || !activePagIbig || !activeTax) return;

    try {
      setIsSimulating(true);
      const activeRulesDict: Record<string, PayrollRule> = {
        [activeSss.ruleCode]: activeSss,
        [activePh.ruleCode]: activePh,
        [activePagIbig.ruleCode]: activePagIbig,
        [activeTax.ruleCode]: activeTax,
      };

      const draftRulesDict: Partial<Record<string, PayrollRule>> = {
        [activeSss.ruleCode]: {
          ...activeSss,
          parameters: {
            ...activeSss.parameters,
            eeRate: draftSssRate / 100,
          },
        } as PayrollRule,
        [activePh.ruleCode]: {
          ...activePh,
          parameters: {
            ...activePh.parameters,
            totalRate: draftPhRate / 100,
          },
        } as PayrollRule,
        [activePagIbig.ruleCode]: {
          ...activePagIbig,
          parameters: {
            ...activePagIbig.parameters,
            maxEEContribution: draftPagIbigCap,
            maxERContribution: draftPagIbigCap,
          },
        } as PayrollRule,
      };

      const gross = (simSalary / (simFrequency === 'Semi-Monthly' ? 2 : 1)) + simOTPay + simTaxableAllowance;

      const res = await statutoryEngine.simulateComparison({
        monthlyCompensation: simSalary,
        grossTaxableEarnings: gross,
        attendanceDeductions: simAttendanceDeduction,
        payFrequency: simFrequency,
        activeRules: activeRulesDict,
        draftRules: draftRulesDict,
      });

      setSimResult(res);
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Simulation failed.' });
    } finally {
      setIsSimulating(false);
    }
  }, [activeSss, activePh, activePagIbig, activeTax, simSalary, simFrequency, simOTPay, simTaxableAllowance, simAttendanceDeduction, draftSssRate, draftPhRate, draftPagIbigCap]);

  useEffect(() => {
    if (activeTab === 'simulation' && !simResult && activeSss) {
      handleRunSimulation();
    }
  }, [activeTab, simResult, activeSss, handleRunSimulation]);

  // Handle Lifecycle Status Transitions (Draft -> Review -> Approved -> Active)
  const handleTransitionStatus = async (rule: PayrollRule, nextStatus: RuleStatus) => {
    try {
      const updated: PayrollRule = {
        ...rule,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
        ...(nextStatus === 'Approved' || nextStatus === 'Active' ? { approvedBy: 'HR Compliance Officer', approvedAt: new Date().toISOString() } : {}),
      };

      // If activating this rule, archive other versions of the same ruleCode
      if (nextStatus === 'Active') {
        const others = rules.filter(r => r.ruleCode === rule.ruleCode && r.id !== rule.id && r.status === 'Active');
        for (const o of others) {
          await payrollRuleRepository.update({
            ...o,
            status: 'Expired',
            endDate: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString(),
          });
        }
      }

      await payrollRuleRepository.update(updated);
      await auditService.logAction({
        companyId: currentCompanyId || null,
        userId: 'admin',
        action: 'UPDATE',
        entityType: 'PayrollRule',
        entityId: rule.id,
        description: `Transitioned statutory rule '${rule.ruleName}' (v${rule.version}) status to ${nextStatus}`,
      });

      setNotification({ type: 'success', message: `Rule '${rule.ruleName}' is now ${nextStatus}.` });
      loadRules();
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Failed to update rule status.' });
    }
  };

  // Create New Version Draft
  const handleCreateDraftVersion = async (baseRule: PayrollRule) => {
    try {
      const newVersion = baseRule.version + 1;
      const today = new Date().toISOString().split('T')[0];
      const draft: PayrollRule = {
        ...baseRule,
        id: `rule_${baseRule.category.toLowerCase().replace(/[^a-z0-9]/g, '_')}_v${newVersion}_draft`,
        ruleName: `${baseRule.ruleName} (v${newVersion} Draft)`,
        version: newVersion,
        status: 'Draft',
        effectiveDate: today,
        endDate: '9999-12-31',
        createdBy: 'Admin / HR Officer',
        approvedBy: undefined,
        approvedAt: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await payrollRuleRepository.create(draft);
      await auditService.logAction({
        companyId: currentCompanyId || null,
        userId: 'admin',
        action: 'CREATE',
        entityType: 'PayrollRule',
        entityId: draft.id,
        description: `Created new draft version v${newVersion} for '${baseRule.ruleName}'`,
      });

      setNotification({ type: 'success', message: `Created Draft Version v${newVersion}. You can now configure parameters and simulate changes.` });
      loadRules();
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Failed to create draft version.' });
    }
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '₱0.00';
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs overflow-hidden">
      {/* Header Toolbar */}
      <div className="p-4 bg-white border-b border-slate-200 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900">
                  Philippine Statutory Contributions, Tax & Compliance Engine
                </h1>
                <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200 text-[10.5px]">
                  DOLE & BIR Compliant
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                Versioned, effective-date based statutory rules for SSS, PhilHealth, Pag-IBIG, and TRAIN Withholding Tax.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('simulation')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-lg border border-blue-200 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>What-If Sandbox</span>
            </button>
            <button
              onClick={loadRules}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold rounded-lg border border-slate-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div className={`mt-3 p-2.5 rounded-lg border text-xs flex items-center justify-between ${
            notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
            notification.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' :
            'bg-blue-50 text-blue-800 border-blue-200'
          }`}>
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto pt-3 border-t border-slate-100 mt-3 no-scrollbar">
          {[
            { id: 'sss', label: 'SSS (RA 11199)', icon: ShieldCheck },
            { id: 'philhealth', label: 'PhilHealth (RA 11223)', icon: ShieldCheck },
            { id: 'pagibig', label: 'Pag-IBIG / HDMF (Circular 460)', icon: ShieldCheck },
            { id: 'tax', label: 'BIR Withholding Tax (TRAIN)', icon: Scale },
            { id: 'taxable_income', label: 'Taxable vs Non-Taxable Income', icon: FileSpreadsheet },
            { id: 'simulation', label: 'What-If Simulation Sandbox', icon: Sparkles },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-6">

        {/* ---------------------------------------------------- */}
        {/* TAB 1: SSS TABLE (RA 11199) */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'sss' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Social Security System (SSS) Mandatory Schedule</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Governed by Republic Act No. 11199 (Social Security Act of 2018) & SSS Circular No. 2024-001
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => activeSss && handleCreateDraftVersion(activeSss)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New SSS Version Draft</span>
                  </button>
                </div>
              </div>

              {/* Active SSS Rule Bento Summary */}
              {activeSss && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Active Rule Version</span>
                    <span className="font-mono font-bold text-slate-900 text-base">v{activeSss.version}.0</span>
                    <span className="block text-[10.5px] text-emerald-700 font-semibold mt-0.5">Effective: {activeSss.effectiveDate}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Total Contribution Rate</span>
                    <span className="font-mono font-bold text-blue-700 text-base">14.0%</span>
                    <span className="block text-[10.5px] text-slate-600 mt-0.5">EE: 4.5% | ER: 9.5%</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">MSC Range</span>
                    <span className="font-mono font-bold text-slate-900 text-base">₱4,000 – ₱30,000</span>
                    <span className="block text-[10.5px] text-slate-600 mt-0.5">WISP Threshold: ₱20,000</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">EC Contribution</span>
                    <span className="font-mono font-bold text-slate-900 text-base">₱10 / ₱30</span>
                    <span className="block text-[10.5px] text-slate-600 mt-0.5">Threshold: ₱15,000</span>
                  </div>
                </div>
              )}

              {/* Version History Table */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>Configured SSS Rule Versions & Governance</span>
                </h3>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                        <th className="py-2.5 px-3">Version</th>
                        <th className="py-2.5 px-3">Rule Name & Reference</th>
                        <th className="py-2.5 px-3">Effective Date</th>
                        <th className="py-2.5 px-3">Rates (EE / ER)</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sssRules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">v{rule.version}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{rule.ruleName}</div>
                            <div className="text-[10.5px] text-slate-500 font-mono">{rule.sourceReference || 'RA 11199'}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">{rule.effectiveDate} to {rule.endDate || 'Present'}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">
                            {((Number(rule.parameters.eeRate) || 0.045) * 100).toFixed(1)}% / {((Number(rule.parameters.erRate) || 0.095) * 100).toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                              rule.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              rule.status === 'Draft' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              rule.status === 'For Review' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {rule.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right space-x-1.5">
                            {rule.status === 'Draft' && (
                              <button
                                onClick={() => handleTransitionStatus(rule, 'For Review')}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded font-semibold text-[10.5px]"
                              >
                                Submit for Review
                              </button>
                            )}
                            {rule.status === 'For Review' && (
                              <button
                                onClick={() => handleTransitionStatus(rule, 'Active')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[10.5px]"
                              >
                                Approve & Activate
                              </button>
                            )}
                            {rule.status === 'Active' && (
                              <span className="text-[10.5px] text-emerald-700 font-semibold font-mono">Live in Payroll</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: PHILHEALTH TABLE (RA 11223) */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'philhealth' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>PhilHealth Universal Healthcare Premium Schedule</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Governed by Republic Act No. 11223 (Universal Health Care Act) & PhilHealth Circular No. 2024-0001
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => activePh && handleCreateDraftVersion(activePh)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New PhilHealth Draft Version</span>
                  </button>
                </div>
              </div>

              {/* Active PhilHealth Bento Summary */}
              {activePh && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Active Rule Version</span>
                    <span className="font-mono font-bold text-slate-900 text-base">v{activePh.version}.0</span>
                    <span className="block text-[10.5px] text-emerald-700 font-semibold mt-0.5">Effective: {activePh.effectiveDate}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Premium Rate</span>
                    <span className="font-mono font-bold text-blue-700 text-base">5.0%</span>
                    <span className="block text-[10.5px] text-slate-600 mt-0.5">Equal 50-50 Split</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Income Floor / Ceiling</span>
                    <span className="font-mono font-bold text-slate-900 text-base">₱10,000 / ₱100,000</span>
                    <span className="block text-[10.5px] text-slate-600 mt-0.5">Capped statutory bounds</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Min / Max Premium</span>
                    <span className="font-mono font-bold text-slate-900 text-base">₱500 / ₱5,000</span>
                    <span className="block text-[10.5px] text-slate-600 mt-0.5">EE Max: ₱2,500/mo</span>
                  </div>
                </div>
              )}

              {/* Version History Table */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>Configured PhilHealth Versions & Governance</span>
                </h3>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                        <th className="py-2.5 px-3">Version</th>
                        <th className="py-2.5 px-3">Rule Name & Reference</th>
                        <th className="py-2.5 px-3">Effective Date</th>
                        <th className="py-2.5 px-3">Total Rate</th>
                        <th className="py-2.5 px-3">Income Limits</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {phRules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">v{rule.version}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{rule.ruleName}</div>
                            <div className="text-[10.5px] text-slate-500 font-mono">{rule.sourceReference || 'RA 11223'}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">{rule.effectiveDate} to {rule.endDate || 'Present'}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">
                            {((Number(rule.parameters.totalRate) || 0.05) * 100).toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">
                            ₱{Number(rule.parameters.incomeFloor || 10000).toLocaleString()} – ₱{Number(rule.parameters.incomeCeiling || 100000).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                              rule.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              rule.status === 'Draft' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {rule.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right space-x-1.5">
                            {rule.status === 'Draft' && (
                              <button
                                onClick={() => handleTransitionStatus(rule, 'For Review')}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded font-semibold text-[10.5px]"
                              >
                                Submit for Review
                              </button>
                            )}
                            {rule.status === 'For Review' && (
                              <button
                                onClick={() => handleTransitionStatus(rule, 'Active')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[10.5px]"
                              >
                                Approve & Activate
                              </button>
                            )}
                            {rule.status === 'Active' && (
                              <span className="text-[10.5px] text-emerald-700 font-semibold font-mono">Live in Payroll</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: PAG-IBIG TABLE (CIRCULAR 460) */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'pagibig' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Pag-IBIG / HDMF Mandatory Contribution</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Governed by Republic Act No. 9679 (HDMF Law of 2009) & HDMF Circular No. 460 (₱200 Cap)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => activePagIbig && handleCreateDraftVersion(activePagIbig)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Pag-IBIG Draft Version</span>
                  </button>
                </div>
              </div>

              {/* Active Pag-IBIG Bento Summary */}
              {activePagIbig && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Active Rule Version</span>
                    <span className="font-mono font-bold text-slate-900 text-base">v{activePagIbig.version}.0</span>
                    <span className="block text-[10.5px] text-emerald-700 font-semibold mt-0.5">Effective: {activePagIbig.effectiveDate}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Contribution Rate</span>
                    <span className="font-mono font-bold text-blue-700 text-base">2.0% / 2.0%</span>
                    <span className="block text-[10.5px] text-slate-600 mt-0.5">EE: 2% | ER: 2%</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Statutory Monthly Cap</span>
                    <span className="font-mono font-bold text-slate-900 text-base">₱200.00 / mo</span>
                    <span className="block text-[10.5px] text-slate-600 mt-0.5">Semi-Monthly: ₱100.00</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Circular Reference</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">HDMF Circular 460</span>
                    <span className="block text-[10.5px] text-slate-600 mt-0.5">Effective Feb 2024</span>
                  </div>
                </div>
              )}

              {/* Version History Table */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>Configured Pag-IBIG Versions & Governance</span>
                </h3>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                        <th className="py-2.5 px-3">Version</th>
                        <th className="py-2.5 px-3">Rule Name & Reference</th>
                        <th className="py-2.5 px-3">Effective Date</th>
                        <th className="py-2.5 px-3">Rates (EE / ER)</th>
                        <th className="py-2.5 px-3">Monthly Cap</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagIbigRules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">v{rule.version}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{rule.ruleName}</div>
                            <div className="text-[10.5px] text-slate-500 font-mono">{rule.sourceReference || 'HDMF Circular 460'}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">{rule.effectiveDate} to {rule.endDate || 'Present'}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">
                            {((Number(rule.parameters.eeRate) || 0.02) * 100).toFixed(1)}% / {((Number(rule.parameters.erRate) || 0.02) * 100).toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700">₱{rule.parameters.maxEEContribution || 200}/mo</td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                              rule.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              rule.status === 'Draft' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {rule.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right space-x-1.5">
                            {rule.status === 'Draft' && (
                              <button
                                onClick={() => handleTransitionStatus(rule, 'For Review')}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded font-semibold text-[10.5px]"
                              >
                                Submit for Review
                              </button>
                            )}
                            {rule.status === 'For Review' && (
                              <button
                                onClick={() => handleTransitionStatus(rule, 'Active')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[10.5px]"
                              >
                                Approve & Activate
                              </button>
                            )}
                            {rule.status === 'Active' && (
                              <span className="text-[10.5px] text-emerald-700 font-semibold font-mono">Live in Payroll</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 4: BIR WITHHOLDING TAX TABLE (TRAIN LAW) */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'tax' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-blue-600" />
                    <span>BIR Revised Graduated Withholding Tax Table</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Governed by Republic Act No. 10963 (TRAIN Law) & BIR Revenue Regulations No. 11-2018
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => activeTax && handleCreateDraftVersion(activeTax)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Tax Table Draft Version</span>
                  </button>
                </div>
              </div>

              {/* Semi-Monthly Brackets Matrix */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                  <span>Semi-Monthly Withholding Tax Brackets (Active Table)</span>
                </h3>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                        <th className="py-2.5 px-3">Bracket Tier</th>
                        <th className="py-2.5 px-3">Taxable Compensation Range</th>
                        <th className="py-2.5 px-3">Base Tax</th>
                        <th className="py-2.5 px-3">Excess Rate</th>
                        <th className="py-2.5 px-3">Tax Formula Representation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11.5px]">
                      {(activeTax?.parameters?.semiMonthlyBrackets || []).map((b: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-900">Tier {idx + 1}</td>
                          <td className="py-2 px-3 text-slate-800 font-semibold">
                            ₱{b.min.toLocaleString()} – {b.max > 9999999 ? 'Above' : `₱${b.max.toLocaleString()}`}
                          </td>
                          <td className="py-2 px-3 text-slate-700">₱{Number(b.baseTax).toFixed(2)}</td>
                          <td className="py-2 px-3 text-blue-700 font-bold">{(b.excessRate * 100).toFixed(0)}%</td>
                          <td className="py-2 px-3 text-slate-500 font-sans text-xs">{b.description || `Base + ${(b.excessRate * 100)}% over ₱${b.min}`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 5: TAXABLE VS NON-TAXABLE INCOME RULES */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'taxable_income' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="border-b pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span>Taxable vs Non-Taxable Income & De Minimis Rules</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Taxability classifications pursuant to National Internal Revenue Code (NIRC) & BIR Revenue Regulations
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2.5">
                  <h3 className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Non-Taxable Allowances & De Minimis Benefits</span>
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-700">
                    <li className="flex items-center justify-between bg-white p-2 rounded border border-emerald-100">
                      <span>Rice Subsidy / Allowance</span>
                      <strong className="font-mono text-emerald-800">₱2,000.00 / month</strong>
                    </li>
                    <li className="flex items-center justify-between bg-white p-2 rounded border border-emerald-100">
                      <span>Uniform & Clothing Allowance</span>
                      <strong className="font-mono text-emerald-800">₱6,000.00 / year</strong>
                    </li>
                    <li className="flex items-center justify-between bg-white p-2 rounded border border-emerald-100">
                      <span>Laundry Allowance</span>
                      <strong className="font-mono text-emerald-800">₱300.00 / month</strong>
                    </li>
                    <li className="flex items-center justify-between bg-white p-2 rounded border border-emerald-100">
                      <span>Medical Cash Allowance</span>
                      <strong className="font-mono text-emerald-800">₱1,500.00 / sem</strong>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-2.5">
                  <h3 className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-600" />
                    <span>Fully Taxable Compensation Elements</span>
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-700">
                    <li className="flex items-center justify-between bg-white p-2 rounded border border-amber-100">
                      <span>Basic Pay / Salary</span>
                      <strong className="text-amber-900 font-semibold">100% Taxable</strong>
                    </li>
                    <li className="flex items-center justify-between bg-white p-2 rounded border border-amber-100">
                      <span>Overtime & Night Shift Pay</span>
                      <strong className="text-amber-900 font-semibold">100% Taxable</strong>
                    </li>
                    <li className="flex items-center justify-between bg-white p-2 rounded border border-amber-100">
                      <span>Holiday Premium Pay</span>
                      <strong className="text-amber-900 font-semibold">100% Taxable</strong>
                    </li>
                    <li className="flex items-center justify-between bg-white p-2 rounded border border-amber-100">
                      <span>Performance Bonuses & Commission</span>
                      <strong className="text-amber-900 font-semibold">Taxable above ₱90k</strong>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 6: WHAT-IF SIMULATION SANDBOX */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'simulation' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Statutory Rule Simulation & What-If Sandbox</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Test candidate government rate updates without modifying live production payroll records.
                  </p>
                </div>
                <button
                  onClick={handleRunSimulation}
                  disabled={isSimulating}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition-colors"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>{isSimulating ? 'Evaluating...' : 'Run Simulation'}</span>
                </button>
              </div>

              {/* Simulation Input Controls */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Monthly Base Salary (₱)</label>
                  <input
                    type="number"
                    value={simSalary}
                    onChange={(e) => setSimSalary(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Payroll Frequency</label>
                  <select
                    value={simFrequency}
                    onChange={(e) => setSimFrequency(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-800 bg-white"
                  >
                    <option value="Semi-Monthly">Semi-Monthly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Proposed SSS EE Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={draftSssRate}
                    onChange={(e) => setDraftSssRate(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-blue-700 bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Proposed PhilHealth Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={draftPhRate}
                    onChange={(e) => setDraftPhRate(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-blue-700 bg-white font-bold"
                  />
                </div>
              </div>

              {/* Side-by-Side Comparison Matrix */}
              {simResult && (
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-blue-600" />
                    <span>Side-by-Side Variance Analysis (Active Live Rule vs Proposed Candidate Rule)</span>
                  </h3>

                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left border-collapse font-mono text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] font-sans">
                          <th className="py-2.5 px-3">Statutory Element</th>
                          <th className="py-2.5 px-3">Active Live Result</th>
                          <th className="py-2.5 px-3">Simulated Candidate Result</th>
                          <th className="py-2.5 px-3">Variance Amount</th>
                          <th className="py-2.5 px-3 font-sans">Impact Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-sans font-bold text-slate-900">SSS Employee Share</td>
                          <td className="py-2 px-3 text-slate-800">{formatCurrency(simResult.active.sss.employeeShare)}</td>
                          <td className="py-2 px-3 text-blue-700 font-bold">{formatCurrency(simResult.simulated.sss.employeeShare)}</td>
                          <td className={`py-2 px-3 font-bold ${simResult.variance.sssEE !== 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                            {simResult.variance.sssEE > 0 ? `+${formatCurrency(simResult.variance.sssEE)}` : formatCurrency(simResult.variance.sssEE)}
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-500 text-[11px]">
                            {simResult.variance.sssEE !== 0 ? 'Adjusts employee deduction per cutoff' : 'No change'}
                          </td>
                        </tr>

                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-sans font-bold text-slate-900">PhilHealth Employee Premium</td>
                          <td className="py-2 px-3 text-slate-800">{formatCurrency(simResult.active.philHealth.employeeShare)}</td>
                          <td className="py-2 px-3 text-blue-700 font-bold">{formatCurrency(simResult.simulated.philHealth.employeeShare)}</td>
                          <td className={`py-2 px-3 font-bold ${simResult.variance.philHealthEE !== 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                            {simResult.variance.philHealthEE > 0 ? `+${formatCurrency(simResult.variance.philHealthEE)}` : formatCurrency(simResult.variance.philHealthEE)}
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-500 text-[11px]">
                            {simResult.variance.philHealthEE !== 0 ? 'Adjusts UHC premium split' : 'No change'}
                          </td>
                        </tr>

                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-sans font-bold text-slate-900">Pag-IBIG Employee Contribution</td>
                          <td className="py-2 px-3 text-slate-800">{formatCurrency(simResult.active.pagIbig.employeeShare)}</td>
                          <td className="py-2 px-3 text-blue-700 font-bold">{formatCurrency(simResult.simulated.pagIbig.employeeShare)}</td>
                          <td className={`py-2 px-3 font-bold ${simResult.variance.pagIbigEE !== 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                            {simResult.variance.pagIbigEE > 0 ? `+${formatCurrency(simResult.variance.pagIbigEE)}` : formatCurrency(simResult.variance.pagIbigEE)}
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-500 text-[11px]">
                            {simResult.variance.pagIbigEE !== 0 ? 'Adjusts HDMF contribution' : 'No change'}
                          </td>
                        </tr>

                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-sans font-bold text-slate-900">BIR Withholding Tax</td>
                          <td className="py-2 px-3 text-slate-800">{formatCurrency(simResult.active.tax.withholdingTax)}</td>
                          <td className="py-2 px-3 text-blue-700 font-bold">{formatCurrency(simResult.simulated.tax.withholdingTax)}</td>
                          <td className={`py-2 px-3 font-bold ${simResult.variance.withholdingTax !== 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {simResult.variance.withholdingTax > 0 ? `+${formatCurrency(simResult.variance.withholdingTax)}` : formatCurrency(simResult.variance.withholdingTax)}
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-500 text-[11px]">
                            Tax automatically recalculated from new taxable income
                          </td>
                        </tr>

                        <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                          <td className="py-2.5 px-3 font-sans text-slate-900">Total Net Employee Take-Home Pay Variance</td>
                          <td className="py-2.5 px-3 text-slate-900">{formatCurrency(simResult.active.grossTaxableEarnings - (simResult.active.totalEmployeeStatutoryDeductions + simResult.active.tax.withholdingTax))}</td>
                          <td className="py-2.5 px-3 text-blue-800">{formatCurrency(simResult.simulated.grossTaxableEarnings - (simResult.simulated.totalEmployeeStatutoryDeductions + simResult.simulated.tax.withholdingTax))}</td>
                          <td className="py-2.5 px-3 text-purple-700">
                            {simResult.variance.netEmployeeDeductions !== 0 ? `${formatCurrency(-simResult.variance.netEmployeeDeductions)}` : '₱0.00'}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-700 text-[11px]">
                            Total take-home impact on employee payslip
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
