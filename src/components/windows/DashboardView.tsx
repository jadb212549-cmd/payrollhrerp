import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users2, 
  Clock, 
  Banknote, 
  CreditCard, 
  BarChart3, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight,
  Database,
  Layers,
  Sparkles,
  PlusCircle,
  FolderTree,
  UserPlus
} from 'lucide-react';
import { useCompanyContext } from '../../context/CompanyContext';
import { employeeService } from '../../services/EmployeeService';
import { departmentService } from '../../services/DepartmentService';
import { positionService } from '../../services/PositionService';

interface DashboardViewProps {
  onOpenWindow: (menuItemId: string, metadata?: Record<string, unknown>) => void;
  salaryPrivacy: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenWindow,
  salaryPrivacy,
}) => {
  const {
    currentCompany,
    currentCompanyId,
    isAllCompanies,
    activeCompanies,
    setCompany,
    setAllCompanies,
    seedDemoCompanies,
    dbVersion,
    isLoading
  } = useCompanyContext();

  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [activeEmpCount, setActiveEmpCount] = useState<number>(0);
  const [deptCount, setDeptCount] = useState<number>(0);
  const [posCount, setPosCount] = useState<number>(0);

  useEffect(() => {
    async function loadStats() {
      try {
        const companyScope = isAllCompanies ? null : currentCompanyId;
        const [empRes, depts, positions] = await Promise.all([
          employeeService.listEmployees({ companyId: companyScope, status: 'All' }),
          departmentService.listDepartments(companyScope),
          positionService.listPositions(companyScope),
        ]);
        setEmployeeCount(empRes.total);
        setActiveEmpCount(empRes.employees.filter((e) => e.employmentStatus === 'Active' && e.status === 'Active').length);
        setDeptCount(depts.length);
        setPosCount(positions.length);
      } catch {
        // Safe fallback
      }
    }
    loadStats();
  }, [currentCompanyId, isAllCompanies]);

  // If no companies exist, render the First-Run Experience
  if (!isLoading && activeCompanies.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 text-slate-700 flex items-center justify-center">
        <div className="max-w-2xl w-full mx-auto space-y-6">
          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 font-bold mx-auto flex items-center justify-center shadow-xs">
              <Building2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono font-semibold">
                <Database className="w-3.5 h-3.5" />
                <span>Offline Database Initialized (Schema v{dbVersion})</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Welcome to Multi-Company Payroll
              </h1>
              <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Your database foundation is initialized and ready. To begin, register your first business entity using the setup wizard or load demo data.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => onOpenWindow('add_company')}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Create Your First Company</span>
              </button>
              <button
                onClick={() => seedDemoCompanies()}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-xs flex items-center justify-center gap-2 transition-colors border border-slate-200"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Load Demo Companies (CSCM & JMDM)</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-3 text-left font-mono text-[11px] text-slate-500">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700 block">ONE SHARED ENGINE</span>
                <span>Multi-Tenant Local DB</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700 block">ISOLATED SCOPE</span>
                <span>companyId tenancy</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700 block">AUDIT LOGGING</span>
                <span>Immutable trails</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 text-slate-700">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Banner Card (Bento Grid Header) */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-semibold">
                PHASE 3 EMPLOYEE MASTER DATA
              </span>
              <span className="text-slate-300 text-xs">•</span>
              <span className="text-slate-500 text-xs font-mono font-medium">Schema Version {dbVersion}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">
              Multi-Company Payroll Management System
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Active Context:{' '}
              {isAllCompanies ? (
                <strong className="text-amber-700 font-semibold">All Companies (Cross-Entity Consolidated View)</strong>
              ) : currentCompany ? (
                <>
                  <strong className="text-blue-600 font-semibold">{currentCompany.legalName}</strong>
                  {currentCompany.tradeName && ` (${currentCompany.tradeName})`}
                  <span className="text-slate-400 font-mono ml-2">[{currentCompany.companyCode}]</span>
                </>
              ) : (
                <span className="text-slate-400">No company selected</span>
              )}
            </p>
          </div>

          {/* Quick Stats Bento Pills */}
          <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200 shrink-0 relative z-10">
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">201 Headcount</div>
              <div className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                {activeEmpCount} <span className="text-xs font-normal text-slate-400">/ {employeeCount}</span>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Departments</div>
              <div className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                {deptCount}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Salary Privacy</div>
              <div className={`text-xs font-bold mt-0.5 ${salaryPrivacy ? 'text-emerald-600' : 'text-slate-600'}`}>
                {salaryPrivacy ? 'MASKED (ON)' : 'VISIBLE (OFF)'}
              </div>
            </div>
          </div>
        </div>

        {/* Primary Bento Modules Grid */}
        <div>
          <div className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3 flex items-center justify-between">
            <span>Primary ERP Workspaces</span>
            <span className="text-[11px] text-slate-400 font-normal">Click any card to launch internal window</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {[
              { id: 'employee_list', title: 'Employee 201', icon: Users2, desc: `${employeeCount} Total Records`, color: 'text-blue-600', iconBg: 'bg-blue-50', borderHover: 'hover:border-blue-300' },
              { id: 'company_list', title: 'Companies', icon: Building2, desc: `${activeCompanies.length} Entities`, color: 'text-emerald-600', iconBg: 'bg-emerald-50', borderHover: 'hover:border-emerald-300' },
              { id: 'departments', title: 'Departments', icon: Layers, desc: `${deptCount} Units`, color: 'text-purple-600', iconBg: 'bg-purple-50', borderHover: 'hover:border-purple-300' },
              { id: 'dtr', title: 'Timekeeping', icon: Clock, desc: 'Phase 4 Preview', color: 'text-cyan-600', iconBg: 'bg-cyan-50', borderHover: 'hover:border-cyan-300' },
              { id: 'payroll_periods', title: 'Payroll Cycles', icon: Banknote, desc: 'Phase 5 Preview', color: 'text-amber-600', iconBg: 'bg-amber-50', borderHover: 'hover:border-amber-300' },
              { id: 'report_center', title: 'Report Center', icon: BarChart3, desc: 'Master Reports', color: 'text-rose-600', iconBg: 'bg-rose-50', borderHover: 'hover:border-rose-300' },
            ].map((mod) => {
              const Icon = mod.icon;
              return (
                <button
                  key={mod.id}
                  onClick={() => onOpenWindow(mod.id)}
                  className={`p-4 rounded-xl bg-white border border-slate-200 text-left transition-all group hover:shadow-md ${mod.borderHover}`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-9 h-9 rounded-lg ${mod.iconBg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${mod.color}`} />
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="mt-3">
                    <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {mod.title}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{mod.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2-Column Bento Grid: Registered Business Entities & System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Registered Entities Grid Card */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Registered Business Entities ({activeCompanies.length})
                  </h3>
                </div>
                <button
                  onClick={() => onOpenWindow('company_list')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Manage All Entities →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeCompanies.map((company) => {
                  const isSelected = !isAllCompanies && currentCompany?.id === company.id;
                  return (
                    <div
                      key={company.id}
                      onClick={() => setCompany(company)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-400/20'
                          : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {company.tradeName || company.legalName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                            Code: <strong className="text-blue-700">{company.companyCode}</strong>
                            {company.tin ? ` • TIN: ${company.tin}` : ''}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9.5px] font-bold shrink-0">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Legal Name:</span>
                        <span className="font-semibold text-slate-800 truncate max-w-[160px]">{company.legalName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Cross-Entity Aggregation Mode:</span>
              <button
                onClick={() => setAllCompanies()}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs ${
                  isAllCompanies
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Switch to Aggregate View</span>
              </button>
            </div>
          </div>

          {/* Desktop Engine & System Status Card */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 pb-3.5 border-b border-slate-100 mb-4">
                <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center">
                  <Database className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Database & Master Records
                </h3>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">Database Engine:</span>
                  <span className="font-mono text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> IndexedDB v{dbVersion}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">201 Rate History:</span>
                  <span className="font-mono text-blue-700 font-semibold">Active & Tracked</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">Multi-Tenancy:</span>
                  <span className="font-mono text-slate-800 font-semibold">companyId Scoped</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">Audit Logging:</span>
                  <span className="font-mono text-emerald-700 font-semibold">Active & Immutable</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-blue-800">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Phase 3 Established</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Employee master data, organizational departments, job positions, rate change histories, and CSV validation import engine are active.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
