/**
 * Payroll Rules Management & Simulation Windows - Phase 5
 * Configurable, versioned, auditable, and traceable payroll engine management
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Sliders, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  Play, 
  Plus, 
  Layers, 
  ShieldCheck, 
  HelpCircle,
  FileCode,
  Calendar,
  Building2,
  ArrowRight,
  ArrowUpDown,
  RefreshCw,
  X,
  Copy
} from 'lucide-react';
import { useCompanyContext } from '../../context/CompanyContext';
import { payrollRuleRepository } from '../../repositories/PayrollRuleRepository';
import { ruleResolver } from '../../services/payroll/RuleResolver';
import { ruleSimulationService, SimulationComparisonResult } from '../../services/payroll/RuleSimulationService';
import { FormulaEvaluator } from '../../services/payroll/FormulaEvaluator';
import { PayrollRule, RuleCategory, RuleStatus } from '../../db/schema';

export const PayrollRulesWindow: React.FC = () => {
  const { currentCompany, currentCompanyId, isAllCompanies } = useCompanyContext();

  const [rules, setRules] = useState<PayrollRule[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'rules_list' | 'simulation_sandbox'>('rules_list');

  // Modals / Inspector
  const [inspectingRule, setInspectingRule] = useState<PayrollRule | null>(null);
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [ruleToVersionBump, setRuleToVersionBump] = useState<PayrollRule | null>(null);

  const loadRules = useCallback(async () => {
    setIsLoading(true);
    try {
      await ruleResolver.ensureDefaults();
      const allRules = await payrollRuleRepository.findAll();
      setRules(allRules);
    } catch (err) {
      console.error('Failed to load payroll rules:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (selectedCategory !== 'All' && r.category !== selectedCategory) return false;
      if (selectedStatus !== 'All' && r.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const code = r.ruleCode.toLowerCase();
        const name = r.ruleName.toLowerCase();
        const desc = (r.description || '').toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !desc.includes(q)) return false;
      }
      return true;
    });
  }, [rules, selectedCategory, selectedStatus, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-700 select-none">
      {/* 1. Header Bar */}
      <div className="p-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>Payroll Calculation Rules & Formulas</span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono lowercase">
                engine v5.0 active
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">
              Centralized formula rules, statutory rate tables, and versioned calculation definitions
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-0.5 rounded-lg flex items-center gap-1 border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setActiveTab('rules_list')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTab === 'rules_list'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Rule Registry ({rules.length})
            </button>
            <button
              onClick={() => setActiveTab('simulation_sandbox')}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-all ${
                activeTab === 'simulation_sandbox'
                  ? 'bg-white text-indigo-600 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-indigo-600'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulation Sandbox</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'rules_list' ? (
        <>
          {/* Filter Bar */}
          <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 outline-hidden font-medium"
              >
                <option value="All">All Categories</option>
                <option value="Basic Pay">Basic Pay</option>
                <option value="Overtime">Overtime</option>
                <option value="Night Differential">Night Differential</option>
                <option value="Late">Late / Tardiness</option>
                <option value="Undertime">Undertime</option>
                <option value="SSS">SSS</option>
                <option value="PhilHealth">PhilHealth</option>
                <option value="Pag-IBIG">Pag-IBIG</option>
                <option value="Withholding Tax">Withholding Tax</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 outline-hidden"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                <option value="Approved">Approved</option>
                <option value="Expired">Expired</option>
              </select>
            </div>

            <div className="w-64">
              <input
                type="text"
                placeholder="Search rule code, name, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 placeholder-slate-400 outline-hidden focus:bg-white focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Rules Table */}
          <div className="flex-1 overflow-auto bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10">
                  <th className="py-2.5 px-3">Rule Code & Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Version</th>
                  <th className="py-2.5 px-3">Formula Expression</th>
                  <th className="py-2.5 px-3">Effective Date</th>
                  <th className="py-2.5 px-3">Scope</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 font-mono text-[11.5px]">{rule.ruleCode}</div>
                      <div className="text-[11px] text-slate-600">{rule.ruleName}</div>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10.5px] font-medium text-slate-700">
                        {rule.category}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-bold text-[10.5px]">
                        v{rule.version}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px] text-indigo-950 max-w-xs truncate">
                      <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                        {rule.formula}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      {rule.effectiveDate}
                    </td>

                    <td className="py-2.5 px-3">
                      {rule.companyId ? (
                        <span className="text-amber-700 font-semibold text-[10.5px]">
                          Company Override
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10.5px]">
                          Global Default
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          rule.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : rule.status === 'Draft'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {rule.status}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setInspectingRule(rule)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium"
                          title="Inspect Parameters & Trace"
                        >
                          Inspect
                        </button>
                        <button
                          onClick={() => {
                            setRuleToVersionBump(rule);
                            setIsNewVersionModalOpen(true);
                          }}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[11px] font-semibold flex items-center gap-1"
                          title="Create Version Bump"
                        >
                          <Plus className="w-3 h-3" />
                          <span>v{rule.version + 1}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* 2. Simulation Sandbox Component */
        <SimulationSandbox
          rules={rules}
          onRuleActivated={async () => {
            await loadRules();
            setActiveTab('rules_list');
          }}
        />
      )}

      {/* Inspect Rule Modal */}
      {inspectingRule && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                  {inspectingRule.ruleCode} (Version {inspectingRule.version})
                </h3>
                <p className="text-[11px] text-slate-500">{inspectingRule.ruleName}</p>
              </div>
              <button
                onClick={() => setInspectingRule(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10.5px] font-bold uppercase text-slate-500 block mb-1">Formula Expression</label>
                <div className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-[11.5px] rounded-lg overflow-x-auto">
                  {inspectingRule.formula}
                </div>
              </div>

              <div>
                <label className="text-[10.5px] font-bold uppercase text-slate-500 block mb-1">Configurable Parameters JSON</label>
                <pre className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-800 overflow-x-auto">
                  {JSON.stringify(inspectingRule.parameters, null, 2)}
                </pre>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400">Effective Date:</span> <strong className="text-slate-700">{inspectingRule.effectiveDate}</strong>
                </div>
                <div>
                  <span className="text-slate-400">End Date:</span> <strong className="text-slate-700">{inspectingRule.endDate || 'None (Indefinite)'}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Priority Order:</span> <strong className="text-slate-700">{inspectingRule.priority}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Created By:</span> <strong className="text-slate-700">{inspectingRule.createdBy}</strong>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setInspectingRule(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version Bump Modal */}
      {isNewVersionModalOpen && ruleToVersionBump && (
        <VersionBumpModal
          baseRule={ruleToVersionBump}
          onClose={() => {
            setIsNewVersionModalOpen(false);
            setRuleToVersionBump(null);
          }}
          onActivated={async () => {
            setIsNewVersionModalOpen(false);
            setRuleToVersionBump(null);
            await loadRules();
          }}
        />
      )}
    </div>
  );
};

// ==========================================
// SIMULATION SANDBOX COMPONENT
// ==========================================
interface SimulationSandboxProps {
  rules: PayrollRule[];
  onRuleActivated: () => Promise<void>;
}

const SimulationSandbox: React.FC<SimulationSandboxProps> = ({ rules, onRuleActivated }) => {
  const [selectedRuleCode, setSelectedRuleCode] = useState<string>('RULE_REGULAR_OT');
  const [draftFormula, setDraftFormula] = useState<string>('hourlyRate * overtimeHours * regularOTMultiplier');
  const [draftMultiplier, setDraftMultiplier] = useState<number>(1.30); // e.g. test 130% OT
  const [testMonthlyRate, setTestMonthlyRate] = useState<number>(30000);
  const [testOTHours, setTestOTHours] = useState<number>(4);
  const [testNightHours, setTestNightHours] = useState<number>(2);
  const [testLateMinutes, setTestLateMinutes] = useState<number>(15);

  const [comparison, setComparison] = useState<SimulationComparisonResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await ruleSimulationService.runSimulation({
        ruleCode: selectedRuleCode,
        draftFormula,
        draftParameters: {
          regularOTMultiplier: draftMultiplier,
        },
        testMonthlyRate,
        testDaysWorked: 11,
        testOTHours,
        testNightHours,
        testLateMinutes,
        testUndertimeMinutes: 0,
      });
      setComparison(res);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  useEffect(() => {
    handleRunSimulation();
  }, [selectedRuleCode, draftMultiplier, testMonthlyRate, testOTHours]);

  return (
    <div className="flex-1 flex flex-col overflow-auto bg-[#f8fafc] p-4 space-y-4">
      {/* Controls Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Rule Simulation & What-If Scenario Sandbox
            </h3>
          </div>
          <span className="text-[10.5px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium">
            Draft simulation mode: Live payroll is unaffected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Target Payroll Rule</label>
            <select
              value={selectedRuleCode}
              onChange={(e) => setSelectedRuleCode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs"
            >
              <option value="RULE_REGULAR_OT">RULE_REGULAR_OT (Overtime)</option>
              <option value="RULE_NIGHT_DIFF">RULE_NIGHT_DIFF (Night Diff)</option>
              <option value="RULE_LATE_DEDUCTION">RULE_LATE_DEDUCTION (Late)</option>
              <option value="RULE_SSS_CONTRIBUTION">RULE_SSS_CONTRIBUTION (SSS)</option>
              <option value="RULE_PHILHEALTH_CONTRIBUTION">RULE_PHILHEALTH (PhilHealth)</option>
              <option value="RULE_PAGIBIG_CONTRIBUTION">RULE_PAGIBIG (Pag-IBIG)</option>
              <option value="RULE_WITHHOLDING_TAX">RULE_WITHHOLDING_TAX (WHT)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Test Multiplier / Parameter</label>
            <input
              type="number"
              step="0.05"
              value={draftMultiplier}
              onChange={(e) => setDraftMultiplier(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Test Base Salary (Monthly)</label>
            <input
              type="number"
              value={testMonthlyRate}
              onChange={(e) => setTestMonthlyRate(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Test Overtime Hours</label>
            <input
              type="number"
              step="0.5"
              value={testOTHours}
              onChange={(e) => setTestOTHours(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* Comparison Results Card */}
      {comparison && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active Production Rule */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Active Version {comparison.activeRule.version}
              </span>
              <span className="text-[10px] font-mono text-slate-400">Effective: {comparison.activeRule.effectiveDate}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs space-y-1">
              <div className="text-[11px] text-slate-500">Formula:</div>
              <div className="text-slate-800 font-semibold">{comparison.activeRule.formula}</div>
              <div className="text-[11px] text-slate-500 pt-1">Parameters:</div>
              <div className="text-slate-700 text-[10.5px]">{JSON.stringify(comparison.activeRule.parameters)}</div>
            </div>

            <div className="p-4 bg-slate-100 rounded-xl text-center">
              <span className="text-[10.5px] font-bold text-slate-500 uppercase block">Calculated Result</span>
              <span className="text-2xl font-bold font-mono text-slate-900">
                ₱{comparison.activeResult.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Simulated Draft Rule */}
          <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-xs space-y-3 ring-1 ring-indigo-500/10">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
              <span className="text-xs font-bold text-indigo-900 uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Simulated Version {comparison.draftRule.version} (Draft)
              </span>
              <span className="text-[10px] font-mono text-indigo-600 font-semibold">Variance: {comparison.variancePercent > 0 ? `+${comparison.variancePercent}%` : `${comparison.variancePercent}%`}</span>
            </div>

            <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 font-mono text-xs space-y-1">
              <div className="text-[11px] text-indigo-600">Draft Formula:</div>
              <div className="text-indigo-950 font-semibold">{comparison.draftRule.formula}</div>
              <div className="text-[11px] text-indigo-600 pt-1">Draft Parameters:</div>
              <div className="text-indigo-900 text-[10.5px]">{JSON.stringify(comparison.draftRule.parameters)}</div>
            </div>

            <div className="p-4 bg-indigo-50 rounded-xl text-center">
              <span className="text-[10.5px] font-bold text-indigo-700 uppercase block">Simulated Result</span>
              <span className="text-2xl font-bold font-mono text-indigo-700">
                ₱{comparison.simulatedResult.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// MODAL: VERSION BUMP & SAFE ACTIVATION
// ==========================================
interface VersionBumpModalProps {
  baseRule: PayrollRule;
  onClose: () => void;
  onActivated: () => Promise<void>;
}

const VersionBumpModal: React.FC<VersionBumpModalProps> = ({ baseRule, onClose, onActivated }) => {
  const [newFormula, setNewFormula] = useState(baseRule.formula);
  const [newParamsJSON, setNewParamsJSON] = useState(JSON.stringify(baseRule.parameters, null, 2));
  const [effectiveDate, setEffectiveDate] = useState('2027-01-01');
  const [approverName, setApproverName] = useState('Admin Supervisor');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    let parsedParams: Record<string, any> = {};
    try {
      parsedParams = JSON.parse(newParamsJSON);
    } catch {
      setErrorMsg('Invalid JSON format in parameters.');
      return;
    }

    try {
      await ruleSimulationService.activateNewRuleVersion(
        baseRule.ruleCode,
        baseRule.companyId,
        newFormula,
        parsedParams,
        effectiveDate,
        approverName
      );
      await onActivated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Activation failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Create Version {baseRule.version + 1} for {baseRule.ruleCode}
            </h3>
            <p className="text-[11px] text-slate-500">
              Historical payroll will remain pinned to Version {baseRule.version}. New version applies on effective date.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {errorMsg && (
            <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Effective Date (YYYY-MM-DD) *</label>
            <input
              type="date"
              required
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Formula Expression *</label>
            <textarea
              required
              rows={2}
              value={newFormula}
              onChange={(e) => setNewFormula(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Configurable Parameters (JSON) *</label>
            <textarea
              required
              rows={4}
              value={newParamsJSON}
              onChange={(e) => setNewParamsJSON(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Approver Sign-Off</label>
            <input
              type="text"
              required
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs"
            >
              Approve & Activate Version {baseRule.version + 1}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
