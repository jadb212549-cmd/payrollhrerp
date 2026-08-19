/**
 * QA & Payroll Calculation Accuracy Dashboard Window - Phase 12
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Play, 
  RefreshCw, 
  ShieldCheck, 
  Search, 
  Filter, 
  Info, 
  FileCheck, 
  Layers, 
  X,
  Building2,
  Calculator,
  Lock,
  Cpu
} from 'lucide-react';
import { payrollQAService, QASuiteSummary, QATestResult, QATestCategory, QATestStatus } from '../../services/qa/PayrollQAService';
import { CURRENT_APP_VERSION } from '../../config/version';

export const PayrollQADashboardWindow: React.FC = () => {
  const [summary, setSummary] = useState<QASuiteSummary | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingTest, setInspectingTest] = useState<QATestResult | null>(null);

  const runSuite = useCallback(async (catFilter?: QATestCategory) => {
    setIsRunning(true);
    try {
      const res = await payrollQAService.runFullTestSuite(catFilter);
      setSummary(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  }, []);

  useEffect(() => {
    runSuite();
  }, [runSuite]);

  const filteredResults = useMemo(() => {
    if (!summary) return [];
    return summary.results.filter((res) => {
      const matchesCategory = selectedCategory === 'ALL' || res.category === selectedCategory;
      const matchesStatus = selectedStatus === 'ALL' || res.status === selectedStatus;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || res.testName.toLowerCase().includes(q) || res.testId.toLowerCase().includes(q);
      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [summary, selectedCategory, selectedStatus, searchQuery]);

  const overallPass = summary && summary.criticalFailures === 0 && summary.failed === 0;

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc] text-slate-800 text-xs select-none">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="border-b border-slate-200 pb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900">Comprehensive Payroll QA & Calculation Accuracy Suite</h1>
              <p className="text-[11px] text-slate-500">
                Automated statutory formula verification, gross/net accuracy, and company isolation test harness.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => runSuite()}
              disabled={isRunning}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : 'fill-current'}`} />
              <span>{isRunning ? 'Running QA Tests...' : 'Run Full QA Suite'}</span>
            </button>
          </div>
        </div>

        {/* Status Summary Banner */}
        {summary && (
          <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 shadow-xs ${
            overallPass ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-xs ${
                overallPass ? 'bg-emerald-600' : 'bg-rose-600'
              }`}>
                {overallPass ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
              </div>
              <div>
                <div className="font-bold text-sm tracking-tight flex items-center gap-2">
                  <span>{overallPass ? '🟢 ALL CRITICAL QA TESTS PASSED' : '🔴 CRITICAL QA FAILURES DETECTED'}</span>
                </div>
                <p className="text-[11.5px] opacity-80 mt-0.5">
                  App v{CURRENT_APP_VERSION.version} • Engine: {summary.payrollEngineVersion} • DB Schema: v{summary.dbSchemaVersion}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-center font-mono">
              <div className="bg-white/80 px-3 py-1.5 rounded-lg border border-slate-200/60">
                <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">Total Tests</span>
                <strong className="text-slate-800 text-sm">{summary.total}</strong>
              </div>
              <div className="bg-emerald-100/80 px-3 py-1.5 rounded-lg border border-emerald-300/60 text-emerald-800">
                <span className="text-[10px] block uppercase font-sans font-bold">Passed</span>
                <strong className="text-sm">{summary.passed}</strong>
              </div>
              <div className="bg-rose-100/80 px-3 py-1.5 rounded-lg border border-rose-300/60 text-rose-800">
                <span className="text-[10px] block uppercase font-sans font-bold">Failed</span>
                <strong className="text-sm">{summary.failed}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                <Filter className="w-3 h-3 text-slate-400" />
                <span className="text-[11px] font-semibold text-slate-600">Category:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 outline-none text-xs"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Basic Pay">Basic Pay</option>
                  <option value="DTR & Attendance">DTR & Attendance</option>
                  <option value="Overtime & Night Diff">Overtime & Night Diff</option>
                  <option value="Statutory & Tax">Statutory & Tax</option>
                  <option value="Gross & Net Calculation">Gross & Net Calculation</option>
                  <option value="Company Isolation">Company Isolation</option>
                  <option value="Historical Immutability">Historical Immutability</option>
                  <option value="Rounding & Edge Cases">Rounding & Edge Cases</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-600">Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 outline-none text-xs"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PASS">PASS</option>
                  <option value="FAIL">FAIL</option>
                  <option value="WARNING">WARNING</option>
                </select>
              </div>
            </div>

            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search test name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
              />
            </div>
          </div>
        </div>

        {/* Test Results Matrix Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-600" />
              <span>QA Calculation Test Verification Matrix</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">
              Showing {filteredResults.length} test records
            </span>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[10.5px] uppercase font-bold text-slate-500 tracking-wider">
                <th className="py-2.5 px-3">Test ID & Category</th>
                <th className="py-2.5 px-3">Test Name & Scope</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Expected Result</th>
                <th className="py-2.5 px-3">Actual Result</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans text-xs">
              {filteredResults.map((test) => (
                <tr key={test.testId} className="hover:bg-blue-50/40 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="font-mono font-bold text-blue-700 text-[11px]">{test.testId}</div>
                    <div className="text-[10px] text-slate-400">{test.category}</div>
                  </td>

                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    <div>{test.testName}</div>
                    {test.details && <div className="text-[10.5px] text-slate-500 font-normal">{test.details}</div>}
                  </td>

                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      test.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {test.severity}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                    {test.expectedResult}
                  </td>

                  <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-slate-900">
                    {test.actualResult}
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                      test.status === 'PASS' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {test.status === 'PASS' ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-600" />}
                      <span>{test.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
