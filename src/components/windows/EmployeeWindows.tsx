import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Eye, 
  EyeOff, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle, 
  Building2, 
  Briefcase, 
  Calendar, 
  DollarSign, 
  Shield, 
  FileText, 
  Clock, 
  CreditCard, 
  FolderPlus, 
  ArrowRight, 
  TrendingUp, 
  Check, 
  X, 
  Plus, 
  FileSpreadsheet,
  AlertTriangle,
  History,
  Lock,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { 
  Employee, 
  EmploymentStatus, 
  EmploymentType, 
  PayType, 
  PayFrequency, 
  Gender, 
  CivilStatus,
  Department, 
  Position, 
  EmployeeRateHistory, 
  AuditLog 
} from '../../db/schema';
import { employeeService, CreateEmployeeInput, UpdateEmployeeInput, AdjustRateInput } from '../../services/EmployeeService';
import { departmentService, CreateDepartmentInput } from '../../services/DepartmentService';
import { positionService, CreatePositionInput } from '../../services/PositionService';
import { employeeImportExportService, ImportValidationSummary, ParsedImportRow } from '../../services/EmployeeImportExportService';
import { auditService } from '../../services/AuditService';
import { useCompanyContext } from '../../context/CompanyContext';

// ==========================================
// 1. EMPLOYEE LIST WINDOW
// ==========================================

interface EmployeeListWindowProps {
  salaryPrivacy: boolean;
  onOpenAddEmployee: () => void;
  onOpenEmployeeProfile?: (employee: Employee) => void;
  onOpenImport?: () => void;
  onOpenExport?: () => void;
}

export const EmployeeListWindow: React.FC<EmployeeListWindowProps> = ({
  salaryPrivacy,
  onOpenAddEmployee,
  onOpenEmployeeProfile,
  onOpenImport,
  onOpenExport,
}) => {
  const { currentCompany, currentCompanyId, isAllCompanies, activeCompanies } = useCompanyContext();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<EmploymentStatus | 'All'>('All');
  const [typeFilter, setTypeFilter] = useState<EmploymentType | 'All'>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');
  const [recordStatusFilter, setRecordStatusFilter] = useState<'Active' | 'Inactive' | 'Archived' | 'All'>('Active');
  
  // Multi-selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionModal, setBulkActionModal] = useState<{
    type: 'status' | 'archive' | 'department' | 'position' | null;
    targetValue?: string;
  }>({ type: null });

  // Quick Rate Change Modal
  const [rateModalEmployee, setRateModalEmployee] = useState<Employee | null>(null);
  const [newRateForm, setNewRateForm] = useState<{
    monthlyRate: number;
    dailyRate: number;
    payType: PayType;
    effectiveDate: string;
    reason: string;
  }>({
    monthlyRate: 0,
    dailyRate: 0,
    payType: 'Monthly',
    effectiveDate: new Date().toISOString().split('T')[0],
    reason: 'Annual Merit Increase',
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const companyScope = isAllCompanies ? null : currentCompanyId;

      const [empRes, deptList, posList] = await Promise.all([
        employeeService.listEmployees({
          companyId: companyScope,
          searchTerm,
          employmentStatus: statusFilter,
          employmentType: typeFilter,
          departmentId: deptFilter,
          status: recordStatusFilter,
        }),
        departmentService.listDepartments(companyScope),
        positionService.listPositions(companyScope),
      ]);

      setEmployees(empRes.employees);
      setDepartments(deptList);
      setPositions(posList);
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Failed to load employee records' });
    } finally {
      setIsLoading(false);
    }
  }, [currentCompanyId, isAllCompanies, searchTerm, statusFilter, typeFilter, deptFilter, recordStatusFilter]);

  useEffect(() => {
    loadData();
    setSelectedIds(new Set());
  }, [loadData]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === employees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(employees.map((e) => e.id)));
    }
  };

  const handleSeedSamples = async () => {
    if (!currentCompanyId) return;
    try {
      setIsLoading(true);
      await departmentService.seedDefaultDepartments(currentCompanyId);
      const depts = await departmentService.listDepartments(currentCompanyId);
      await positionService.seedDefaultPositions(currentCompanyId, depts);
      await employeeService.seedSampleEmployees(currentCompanyId);
      setNotification({ type: 'success', message: 'Seeded departments, positions, and sample employees successfully!' });
      await loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Failed to seed sample data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteBulkAction = async () => {
    try {
      const ids: string[] = Array.from(selectedIds);
      if (ids.length === 0) return;

      if (bulkActionModal.type === 'status' && bulkActionModal.targetValue) {
        await employeeService.bulkUpdateStatus(ids, bulkActionModal.targetValue as EmploymentStatus);
        setNotification({ type: 'success', message: `Updated status for ${ids.length} employees.` });
      } else if (bulkActionModal.type === 'archive') {
        await employeeService.bulkArchive(ids);
        setNotification({ type: 'success', message: `Archived ${ids.length} employee records.` });
      } else if (bulkActionModal.type === 'department' && bulkActionModal.targetValue) {
        await employeeService.bulkAssignDepartment(ids, bulkActionModal.targetValue);
        setNotification({ type: 'success', message: `Assigned department for ${ids.length} employees.` });
      } else if (bulkActionModal.type === 'position' && bulkActionModal.targetValue) {
        await employeeService.bulkAssignPosition(ids, bulkActionModal.targetValue);
        setNotification({ type: 'success', message: `Assigned position for ${ids.length} employees.` });
      }

      setBulkActionModal({ type: null });
      setSelectedIds(new Set());
      await loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Bulk operation failed' });
    }
  };

  const handleSaveRateChange = async () => {
    if (!rateModalEmployee) return;
    try {
      await employeeService.adjustEmployeeRate({
        employeeId: rateModalEmployee.id,
        effectiveDate: newRateForm.effectiveDate,
        monthlyRate: newRateForm.payType === 'Monthly' ? newRateForm.monthlyRate : newRateForm.dailyRate * 26,
        dailyRate: newRateForm.payType === 'Daily' ? newRateForm.dailyRate : Math.round(newRateForm.monthlyRate / 26),
        hourlyRate: newRateForm.payType === 'Daily' ? Math.round((newRateForm.dailyRate / 8) * 100) / 100 : Math.round((newRateForm.monthlyRate / 26 / 8) * 100) / 100,
        payType: newRateForm.payType,
        reason: newRateForm.reason,
      });

      setNotification({ type: 'success', message: `Rate adjusted for ${rateModalEmployee.firstName} ${rateModalEmployee.lastName}. Rate history recorded.` });
      setRateModalEmployee(null);
      await loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Rate change failed' });
    }
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '₱0.00';
    if (salaryPrivacy) return '••••••';
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs overflow-hidden">
      {/* Top Banner / Notification */}
      {notification && (
        <div
          className={`px-4 py-2 flex items-center justify-between text-xs font-medium border-b shrink-0 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Control Header & Action Bar */}
      <div className="p-3 bg-white border-b border-slate-200 shrink-0 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">Employee 201 Masterlist</h2>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-200">
                  {employees.length} Records
                </span>
                {isAllCompanies && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded font-semibold border border-amber-300">
                    Consolidated (All Companies)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Scope: <strong className="text-slate-700">{isAllCompanies ? 'All Entities' : currentCompany?.legalName || 'No Company Selected'}</strong>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAddEmployee}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Employee</span>
            </button>

            {onOpenImport && (
              <button
                onClick={onOpenImport}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium border border-slate-300 transition-colors"
                title="Import employees via CSV/Excel template"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Import</span>
              </button>
            )}

            {onOpenExport && (
              <button
                onClick={onOpenExport}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium border border-slate-300 transition-colors"
                title="Export employee records to CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Export</span>
              </button>
            )}

            {employees.length === 0 && currentCompanyId && (
              <button
                onClick={handleSeedSamples}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg font-semibold border border-amber-300 text-xs transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Seed Sample Data</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          {/* Search Box */}
          <div className="relative min-w-[220px] max-w-[280px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search No., Name, Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:border-blue-500 focus:outline-hidden"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-hidden"
          >
            <option value="All">Status: All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Resigned">Resigned</option>
            <option value="Terminated">Terminated</option>
            <option value="Retired">Retired</option>
            <option value="On Leave">On Leave</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-hidden"
          >
            <option value="All">Type: All</option>
            <option value="Regular">Regular</option>
            <option value="Probationary">Probationary</option>
            <option value="Contractual">Contractual</option>
            <option value="Casual">Casual</option>
            <option value="Part-Time">Part-Time</option>
            <option value="Other">Other</option>
          </select>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-hidden"
          >
            <option value="All">Dept: All</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>

          {/* Archived Filter */}
          <select
            value={recordStatusFilter}
            onChange={(e) => setRecordStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-hidden"
          >
            <option value="Active">Active Records</option>
            <option value="Archived">Archived Only</option>
            <option value="All">All Including Archived</option>
          </select>

          {(searchTerm || statusFilter !== 'All' || typeFilter !== 'All' || deptFilter !== 'All' || recordStatusFilter !== 'Active') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('All');
                setTypeFilter('All');
                setDeptFilter('All');
                setRecordStatusFilter('Active');
              }}
              className="text-[11px] text-blue-600 hover:underline px-1.5"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Bar (Visible when 1+ selected) */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex items-center justify-between shrink-0 animate-in fade-in">
          <div className="flex items-center gap-2 font-medium text-blue-900">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <span>{selectedIds.size} employees selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulkActionModal({ type: 'status', targetValue: 'Active' })}
              className="px-2 py-1 bg-white border border-blue-300 text-blue-800 rounded font-semibold hover:bg-blue-100 transition-colors"
            >
              Set Active
            </button>
            <button
              onClick={() => setBulkActionModal({ type: 'status', targetValue: 'On Leave' })}
              className="px-2 py-1 bg-white border border-amber-300 text-amber-800 rounded font-semibold hover:bg-amber-100 transition-colors"
            >
              Set On Leave
            </button>
            <button
              onClick={() => setBulkActionModal({ type: 'archive' })}
              className="px-2 py-1 bg-white border border-red-300 text-red-700 rounded font-semibold hover:bg-red-50 transition-colors"
            >
              Archive
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-2 py-1 text-slate-500 hover:text-slate-700"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="h-full flex items-center justify-center p-8 text-slate-400">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading employee masterlist...</span>
            </div>
          </div>
        ) : employees.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">No Employees Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-0.5">
                {currentCompanyId
                  ? 'No employee records match the current filter or this company has no employees registered yet.'
                  : 'Please select a company to view and manage its employee records.'}
              </p>
            </div>
            {currentCompanyId && (
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={onOpenAddEmployee}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                >
                  + Add First Employee
                </button>
                <button
                  onClick={handleSeedSamples}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium border border-slate-300"
                >
                  Load Sample Employees
                </button>
              </div>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10 select-none">
              <tr>
                <th className="py-2.5 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === employees.length && employees.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="py-2.5 px-3">Emp No.</th>
                {isAllCompanies && <th className="py-2.5 px-3">Company</th>}
                <th className="py-2.5 px-3">Full Legal Name</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Position</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Date Hired</th>
                <th className="py-2.5 px-3">Rate</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {employees.map((emp) => {
                const dept = departments.find((d) => d.id === emp.departmentId);
                const pos = positions.find((p) => p.id === emp.positionId);
                const isSelected = selectedIds.has(emp.id);

                return (
                  <tr
                    key={emp.id}
                    className={`hover:bg-blue-50/50 transition-colors ${
                      isSelected ? 'bg-blue-50/70' : ''
                    } ${emp.status === 'Archived' ? 'opacity-60 bg-slate-50' : ''}`}
                  >
                    <td className="py-2 px-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(emp.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-800">
                      {emp.employeeNumber}
                    </td>
                    {isAllCompanies && (
                      <td className="py-2 px-3">
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-200">
                          {activeCompanies.find((c) => c.id === emp.companyId)?.companyCode || emp.companyId}
                        </span>
                      </td>
                    )}
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-900">
                        {emp.lastName}, {emp.firstName} {emp.middleName ? `${emp.middleName[0]}.` : ''} {emp.suffix || ''}
                      </div>
                      <div className="text-[10.5px] text-slate-400">{emp.email || 'No email provided'}</div>
                    </td>
                    <td className="py-2 px-3">
                      {dept ? (
                        <span className="font-medium text-slate-700">{dept.name} ({dept.code})</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      {pos ? (
                        <span className="text-slate-700">{pos.name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                          emp.employmentStatus === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : emp.employmentStatus === 'On Leave'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : emp.employmentStatus === 'Resigned'
                            ? 'bg-slate-100 text-slate-600 border border-slate-300'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {emp.employmentStatus}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="bg-slate-100 text-slate-700 text-[10.5px] px-2 py-0.5 rounded border border-slate-200 font-medium">
                        {emp.employmentType}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600">
                      {emp.dateHired}
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-mono font-semibold text-slate-800">
                        {emp.payType === 'Monthly'
                          ? `${formatCurrency(emp.monthlyRate)} / mo`
                          : `${formatCurrency(emp.dailyRate)} / day`}
                      </div>
                      <div className="text-[10px] text-slate-400">{emp.payFrequency}</div>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onOpenEmployeeProfile && (
                          <button
                            onClick={() => onOpenEmployeeProfile(emp)}
                            className="p-1.5 rounded hover:bg-blue-100 text-blue-700 transition-colors"
                            title="View Employee 201 Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setRateModalEmployee(emp);
                            setNewRateForm({
                              monthlyRate: emp.monthlyRate || 0,
                              dailyRate: emp.dailyRate || 0,
                              payType: emp.payType || 'Monthly',
                              effectiveDate: new Date().toISOString().split('T')[0],
                              reason: 'Annual Merit Increase',
                            });
                          }}
                          className="p-1.5 rounded hover:bg-emerald-100 text-emerald-700 transition-colors"
                          title="Adjust Salary Rate / View History"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                        </button>
                        {emp.status === 'Archived' ? (
                          <button
                            onClick={async () => {
                              await employeeService.restoreEmployee(emp.id);
                              setNotification({ type: 'success', message: `Restored ${emp.firstName} ${emp.lastName}` });
                              await loadData();
                            }}
                            className="p-1.5 rounded hover:bg-emerald-100 text-emerald-700 transition-colors"
                            title="Restore Archived Employee"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              if (confirm(`Archive employee record for ${emp.firstName} ${emp.lastName} (${emp.employeeNumber})?`)) {
                                await employeeService.archiveEmployee(emp.id, 'User initiated archival');
                                setNotification({ type: 'success', message: `Archived ${emp.firstName} ${emp.lastName}` });
                                await loadData();
                              }
                            }}
                            className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors"
                            title="Archive Employee"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick Rate Change Modal */}
      {rateModalEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Adjust Salary / Rate</h3>
                  <p className="text-[11px] text-slate-500">
                    {rateModalEmployee.firstName} {rateModalEmployee.lastName} ({rateModalEmployee.employeeNumber})
                  </p>
                </div>
              </div>
              <button onClick={() => setRateModalEmployee(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pay Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRateForm({ ...newRateForm, payType: 'Monthly' })}
                    className={`py-1.5 rounded-lg border text-xs font-semibold ${
                      newRateForm.payType === 'Monthly'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Monthly Rate
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRateForm({ ...newRateForm, payType: 'Daily' })}
                    className={`py-1.5 rounded-lg border text-xs font-semibold ${
                      newRateForm.payType === 'Daily'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Daily Rate
                  </button>
                </div>
              </div>

              {newRateForm.payType === 'Monthly' ? (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">New Monthly Rate (PHP)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={newRateForm.monthlyRate}
                    onChange={(e) => setNewRateForm({ ...newRateForm, monthlyRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-sm font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Equivalent Daily: ~₱{Math.round((newRateForm.monthlyRate / 26) * 100) / 100} / day (based on 26 factor)
                  </span>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">New Daily Rate (PHP)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={newRateForm.dailyRate}
                    onChange={(e) => setNewRateForm({ ...newRateForm, dailyRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-sm font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Equivalent Monthly: ~₱{newRateForm.dailyRate * 26} / mo
                  </span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Effective Date</label>
                <input
                  type="date"
                  value={newRateForm.effectiveDate}
                  onChange={(e) => setNewRateForm({ ...newRateForm, effectiveDate: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Reason for Adjustment</label>
                <input
                  type="text"
                  placeholder="e.g. Promotion, Annual Merit Increase, Performance"
                  value={newRateForm.reason}
                  onChange={(e) => setNewRateForm({ ...newRateForm, reason: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRateModalEmployee(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRateChange}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs"
              >
                Save Rate & Log History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Confirmation Modal */}
      {bulkActionModal.type && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2.5 text-slate-900">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold">Confirm Bulk Action</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to apply this bulk change to <strong>{selectedIds.size}</strong> selected employee records?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setBulkActionModal({ type: null })}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulkAction}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
              >
                Confirm & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 2. ADD / EDIT EMPLOYEE WINDOW
// ==========================================

interface AddEmployeeWindowProps {
  salaryPrivacy: boolean;
  employeeIdToEdit?: string;
  onSuccess?: (employee: Employee) => void;
}

export const AddEmployeeWindow: React.FC<AddEmployeeWindowProps> = ({
  salaryPrivacy,
  employeeIdToEdit,
  onSuccess,
}) => {
  const { currentCompany, currentCompanyId, activeCompanies } = useCompanyContext();

  const [activeTab, setActiveTab] = useState<'personal' | 'employment' | 'compensation' | 'statutory' | 'payment'>('personal');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [existingEmployees, setExistingEmployees] = useState<Employee[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateEmployeeInput>({
    companyId: currentCompanyId || '',
    employeeNumber: '',
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    nickname: '',
    birthDate: '',
    gender: 'Male',
    civilStatus: 'Single',
    address: '',
    contactNumber: '',
    email: '',
    dateHired: new Date().toISOString().split('T')[0],
    employmentStatus: 'Active',
    employmentType: 'Regular',
    departmentId: '',
    positionId: '',
    location: '',
    supervisorId: '',
    tin: '',
    sssNumber: '',
    philHealthNumber: '',
    pagIbigNumber: '',
    bankName: 'BDO Unibank',
    bankAccount: '',
    dailyRate: 750,
    monthlyRate: 19500,
    hourlyRate: 93.75,
    payType: 'Monthly',
    payFrequency: 'Semi-Monthly',
  });

  // Sync companyId & load reference data
  useEffect(() => {
    async function loadRefs() {
      const targetCompany = formData.companyId || currentCompanyId;
      if (targetCompany) {
        const [depts, pos, emps] = await Promise.all([
          departmentService.listDepartments(targetCompany),
          positionService.listPositions(targetCompany),
          employeeService.listEmployees({ companyId: targetCompany, status: 'Active' }),
        ]);
        setDepartments(depts);
        setPositions(pos);
        setExistingEmployees(emps.employees);
      }
    }
    loadRefs();
  }, [formData.companyId, currentCompanyId]);

  // If editing, load employee
  useEffect(() => {
    if (employeeIdToEdit) {
      employeeService.getEmployee(employeeIdToEdit).then((emp) => {
        if (emp) {
          setFormData({
            companyId: emp.companyId,
            employeeNumber: emp.employeeNumber,
            firstName: emp.firstName,
            middleName: emp.middleName || '',
            lastName: emp.lastName,
            suffix: emp.suffix || '',
            nickname: emp.nickname || '',
            birthDate: emp.birthDate || '',
            gender: emp.gender || 'Male',
            civilStatus: emp.civilStatus || 'Single',
            address: emp.address || '',
            contactNumber: emp.contactNumber || '',
            email: emp.email || '',
            dateHired: emp.dateHired,
            employmentStatus: emp.employmentStatus,
            employmentType: emp.employmentType,
            departmentId: emp.departmentId || '',
            positionId: emp.positionId || '',
            location: emp.location || '',
            supervisorId: emp.supervisorId || '',
            tin: emp.tin || '',
            sssNumber: emp.sssNumber || '',
            philHealthNumber: emp.philHealthNumber || '',
            pagIbigNumber: emp.pagIbigNumber || '',
            bankName: emp.bankName || '',
            bankAccount: emp.bankAccount || '',
            dailyRate: emp.dailyRate || 0,
            monthlyRate: emp.monthlyRate || 0,
            hourlyRate: emp.hourlyRate || 0,
            payType: emp.payType || 'Monthly',
            payFrequency: emp.payFrequency || 'Semi-Monthly',
          });
        }
      });
    }
  }, [employeeIdToEdit]);

  const handleMonthlyRateChange = (val: number) => {
    const daily = Math.round((val / 26) * 100) / 100;
    const hourly = Math.round((daily / 8) * 100) / 100;
    setFormData((prev) => ({
      ...prev,
      monthlyRate: val,
      dailyRate: daily,
      hourlyRate: hourly,
    }));
  };

  const handleDailyRateChange = (val: number) => {
    const monthly = val * 26;
    const hourly = Math.round((val / 8) * 100) / 100;
    setFormData((prev) => ({
      ...prev,
      dailyRate: val,
      monthlyRate: monthly,
      hourlyRate: hourly,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      setIsSubmitting(true);
      if (employeeIdToEdit) {
        const updated = await employeeService.updateEmployee(employeeIdToEdit, formData);
        if (onSuccess) onSuccess(updated);
      } else {
        const created = await employeeService.createEmployee(formData);
        if (onSuccess) onSuccess(created);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save employee record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-white border-b border-slate-200 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {employeeIdToEdit ? 'Edit Employee Record' : 'Register New Employee'}
            </h2>
            <p className="text-[11px] text-slate-500">
              Target Company: <strong className="text-slate-700">{currentCompany?.legalName || 'Select Company'}</strong>
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          {[
            { id: 'personal', label: '1. Personal Demographics', icon: Users },
            { id: 'employment', label: '2. Employment & Role', icon: Briefcase },
            { id: 'compensation', label: '3. Compensation', icon: DollarSign },
            { id: 'statutory', label: '4. Statutory & Tax', icon: Shield },
            { id: 'payment', label: '5. Payment Details', icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border-b border-red-200 text-red-800 flex items-center gap-2 font-medium shrink-0">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-6">
        {/* Tab 1: Personal Demographics */}
        {activeTab === 'personal' && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 animate-in fade-in">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-blue-600 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Personal Demographics & Identification</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Employee Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EMP-0008"
                  value={formData.employeeNumber}
                  onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Given name"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Middle Name</label>
                <input
                  type="text"
                  placeholder="Middle family name"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Surname"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Suffix</label>
                <input
                  type="text"
                  placeholder="e.g. Jr., III"
                  value={formData.suffix}
                  onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nickname</label>
                <input
                  type="text"
                  placeholder="Preferred name"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Birth Date</label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Civil Status</label>
                <select
                  value={formData.civilStatus}
                  onChange={(e) => setFormData({ ...formData, civilStatus: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Separated">Separated</option>
                  <option value="Divorced">Divorced</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  placeholder="Street, Barangay, City, Province"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Contact Number</label>
                  <input
                    type="text"
                    placeholder="+63 9XX XXX XXXX"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="name@company.ph"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Employment Details */}
        {activeTab === 'employment' && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 animate-in fade-in">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-blue-600 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              <span>Employment Information & Hierarchy</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Date Hired <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.dateHired}
                  onChange={(e) => setFormData({ ...formData, dateHired: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Employment Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.employmentStatus}
                  onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-semibold"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Resigned">Resigned</option>
                  <option value="Terminated">Terminated</option>
                  <option value="Retired">Retired</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Employment Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.employmentType}
                  onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-semibold"
                >
                  <option value="Regular">Regular</option>
                  <option value="Probationary">Probationary</option>
                  <option value="Contractual">Contractual</option>
                  <option value="Casual">Casual</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                >
                  <option value="">-- Unassigned --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Position / Job Title</label>
                <select
                  value={formData.positionId}
                  onChange={(e) => setFormData({ ...formData, positionId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                >
                  <option value="">-- Unassigned --</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Direct Supervisor (Same Company)
                </label>
                <select
                  value={formData.supervisorId}
                  onChange={(e) => setFormData({ ...formData, supervisorId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                >
                  <option value="">-- No Direct Supervisor --</option>
                  {existingEmployees
                    .filter((e) => e.id !== employeeIdToEdit)
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.lastName}, {e.firstName} ({e.employeeNumber})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Assigned Work Location</label>
                <input
                  type="text"
                  placeholder="e.g. Plant A, Head Office, Warehouse"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Compensation */}
        {activeTab === 'compensation' && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 animate-in fade-in">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-blue-600 pb-2 border-b border-slate-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span>Base Salary & Compensation Structure</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Primary Pay Basis</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, payType: 'Monthly' })}
                    className={`py-2 rounded-lg border text-xs font-semibold ${
                      formData.payType === 'Monthly'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Monthly Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, payType: 'Daily' })}
                    className={`py-2 rounded-lg border text-xs font-semibold ${
                      formData.payType === 'Daily'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Daily Paid
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pay Frequency</label>
                <select
                  value={formData.payFrequency}
                  onChange={(e) => setFormData({ ...formData, payFrequency: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-semibold"
                >
                  <option value="Semi-Monthly">Semi-Monthly (15th & 30th)</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Bi-Weekly">Bi-Weekly</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Monthly Rate (PHP)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={formData.monthlyRate}
                  onChange={(e) => handleMonthlyRateChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Daily Rate (PHP)</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={formData.dailyRate}
                  onChange={(e) => handleDailyRateChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Hourly Rate (PHP)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Note: Payroll computation formulas and statutory deductions will be enabled in a later phase.
            </p>
          </div>
        )}

        {/* Tab 4: Statutory & Tax */}
        {activeTab === 'statutory' && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 animate-in fade-in">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-blue-600 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Government & Statutory Identification Numbers</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">BIR Tax Identification Number (TIN)</label>
                <input
                  type="text"
                  placeholder="000-000-000-000"
                  value={formData.tin}
                  onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Social Security System (SSS Number)</label>
                <input
                  type="text"
                  placeholder="00-0000000-0"
                  value={formData.sssNumber}
                  onChange={(e) => setFormData({ ...formData, sssNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">PhilHealth Identification Number (PIN)</label>
                <input
                  type="text"
                  placeholder="00-000000000-0"
                  value={formData.philHealthNumber}
                  onChange={(e) => setFormData({ ...formData, philHealthNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Pag-IBIG / HDMF MID Number</label>
                <input
                  type="text"
                  placeholder="0000-0000-0000"
                  value={formData.pagIbigNumber}
                  onChange={(e) => setFormData({ ...formData, pagIbigNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Payment Details */}
        {activeTab === 'payment' && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 animate-in fade-in">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-blue-600 pb-2 border-b border-slate-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span>Payroll Bank Account & Disbursement Method</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Disbursement Bank</label>
                <select
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                >
                  <option value="BDO Unibank">BDO Unibank</option>
                  <option value="BPI">Bank of the Philippine Islands (BPI)</option>
                  <option value="Metrobank">Metrobank</option>
                  <option value="UnionBank">UnionBank</option>
                  <option value="Security Bank">Security Bank</option>
                  <option value="RCBC">RCBC</option>
                  <option value="LandBank">Land Bank of the Philippines</option>
                  <option value="Cash / Cheque">Cash / Manual Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Bank Account Number</label>
                <input
                  type="text"
                  placeholder="e.g. 109823487192"
                  value={formData.bankAccount}
                  onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="text-[11px] text-slate-400">
            All fields marked with <span className="text-red-500">*</span> are strictly validated.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'personal') setActiveTab('payment');
                else if (activeTab === 'employment') setActiveTab('personal');
                else if (activeTab === 'compensation') setActiveTab('employment');
                else if (activeTab === 'statutory') setActiveTab('compensation');
                else if (activeTab === 'payment') setActiveTab('statutory');
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
            >
              Previous Section
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'personal') setActiveTab('employment');
                else if (activeTab === 'employment') setActiveTab('compensation');
                else if (activeTab === 'compensation') setActiveTab('statutory');
                else if (activeTab === 'statutory') setActiveTab('payment');
              }}
              className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
            >
              Next Section
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : employeeIdToEdit ? 'Save Changes' : 'Complete Registration'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// ==========================================
// 3. EMPLOYEE PROFILE WINDOW (COMPREHENSIVE BENTO)
// ==========================================

interface EmployeeProfileWindowProps {
  employeeId?: string;
  salaryPrivacy: boolean;
  onOpenEdit?: (employee: Employee) => void;
}

export const EmployeeProfileWindow: React.FC<EmployeeProfileWindowProps> = ({
  employeeId,
  salaryPrivacy,
  onOpenEdit,
}) => {
  const { currentCompany } = useCompanyContext();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [supervisor, setSupervisor] = useState<Employee | null>(null);
  const [rateHistory, setRateHistory] = useState<EmployeeRateHistory[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadProfile = useCallback(async () => {
    if (!employeeId) return;
    try {
      setIsLoading(true);
      const emp = await employeeService.getEmployee(employeeId);
      if (emp) {
        setEmployee(emp);
        const [dept, pos, sup, rates, logs] = await Promise.all([
          emp.departmentId ? departmentService.getDepartment(emp.departmentId) : null,
          emp.positionId ? positionService.getPosition(emp.positionId) : null,
          emp.supervisorId ? employeeService.getEmployee(emp.supervisorId) : null,
          employeeService.getEmployeeRateHistory(emp.id),
          auditService.getLogsForEntity('Employee', emp.id),
        ]);
        setDepartment(dept);
        setPosition(pos);
        setSupervisor(sup);
        setRateHistory(rates);
        setAuditLogs(logs);
      }
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-400 bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading 201 Profile...</span>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 bg-[#f8fafc]">
        <AlertCircle className="w-8 h-8 text-slate-400 mb-2" />
        <h3 className="text-sm font-bold text-slate-800">Employee Profile Not Found</h3>
        <p className="text-xs text-slate-500">Please select an employee from the masterlist.</p>
      </div>
    );
  }

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '₱0.00';
    if (salaryPrivacy) return '••••••';
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'personal', label: 'Personal Demographics' },
    { id: 'employment', label: 'Employment Details' },
    { id: 'compensation', label: 'Compensation & Rate History' },
    { id: 'statutory', label: 'Statutory Numbers' },
    { id: 'payment', label: 'Payment Method' },
    { id: 'attendance', label: 'Attendance / DTR (Phase 4)' },
    { id: 'leave', label: 'Leave (Phase 4)' },
    { id: 'loans', label: 'Loans (Phase 5)' },
    { id: 'allowances', label: 'Allowances (Phase 5)' },
    { id: 'payroll', label: 'Payroll History (Phase 5)' },
    { id: 'documents', label: '201 Documents' },
    { id: 'audit', label: 'Audit Trail' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs overflow-hidden">
      {/* Bento Header */}
      <div className="p-4 bg-white border-b border-slate-200 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-base flex items-center justify-center shadow-xs">
              {employee.firstName[0]}
              {employee.lastName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900">
                  {employee.firstName} {employee.middleName ? `${employee.middleName} ` : ''}{employee.lastName} {employee.suffix || ''}
                </h1>
                <span className="bg-blue-50 text-blue-700 font-mono font-bold text-[11px] px-2 py-0.5 rounded border border-blue-200">
                  {employee.employeeNumber}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                    employee.employmentStatus === 'Active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {employee.employmentStatus}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {position?.name || 'Position Unassigned'} • {department?.name || 'Department Unassigned'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenEdit && (
              <button
                onClick={() => onOpenEdit(employee)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold border border-slate-300"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto pt-3 border-t border-slate-100 mt-3 no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === t.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content Canvas */}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-6">
        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in">
            {/* Card 1: Job Summary */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-blue-600 border-b pb-2 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Job Summary</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Department</span>
                  <strong className="text-slate-800">{department ? `${department.name} (${department.code})` : 'Unassigned'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Position</span>
                  <strong className="text-slate-800">{position ? position.name : 'Unassigned'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Employment Type</span>
                  <strong className="text-slate-800">{employee.employmentType}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Direct Supervisor</span>
                  <strong className="text-slate-800">{supervisor ? `${supervisor.firstName} ${supervisor.lastName}` : 'None'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Date Hired</span>
                  <strong className="text-slate-800 font-mono">{employee.dateHired}</strong>
                </div>
              </div>
            </div>

            {/* Card 2: Compensation Snapshot */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-emerald-600 border-b pb-2 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Current Compensation</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Pay Basis</span>
                  <strong className="text-slate-800">{employee.payType} Paid ({employee.payFrequency})</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Monthly Base Rate</span>
                  <strong className="text-slate-900 font-mono text-sm">{formatCurrency(employee.monthlyRate)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Daily Rate</span>
                  <strong className="text-slate-800 font-mono">{formatCurrency(employee.dailyRate)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Hourly Rate</span>
                  <strong className="text-slate-800 font-mono">{formatCurrency(employee.hourlyRate)}</strong>
                </div>
              </div>
            </div>

            {/* Card 3: Contact & Location */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-purple-600 border-b pb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Contact Details</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Email</span>
                  <strong className="text-slate-800">{employee.email || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Contact Number</span>
                  <strong className="text-slate-800">{employee.contactNumber || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Location</span>
                  <strong className="text-slate-800">{employee.location || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Civil Status</span>
                  <strong className="text-slate-800">{employee.civilStatus || 'Single'}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: COMPENSATION & RATE HISTORY */}
        {activeTab === 'compensation' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Salary & Rate Change History</span>
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  {rateHistory.length} Historical Records Logged
                </span>
              </div>

              {rateHistory.length === 0 ? (
                <p className="text-slate-400 italic py-4 text-center">
                  No rate change records logged yet. Rate changes will be preserved here historically.
                </p>
              ) : (
                <table className="w-full text-left border-collapse mt-2">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Effective Date</th>
                      <th className="py-2 px-3">Pay Basis</th>
                      <th className="py-2 px-3">Monthly Rate</th>
                      <th className="py-2 px-3">Daily Rate</th>
                      <th className="py-2 px-3">Hourly Rate</th>
                      <th className="py-2 px-3">Reason for Adjustment</th>
                      <th className="py-2 px-3">Logged Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rateHistory.map((rh) => (
                      <tr key={rh.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{rh.effectiveDate}</td>
                        <td className="py-2 px-3 font-medium text-slate-700">{rh.payType || 'Monthly'}</td>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-800">{formatCurrency(rh.monthlyRate)}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{formatCurrency(rh.dailyRate)}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{formatCurrency(rh.hourlyRate)}</td>
                        <td className="py-2 px-3 text-slate-600">{rh.reason}</td>
                        <td className="py-2 px-3 text-[10.5px] font-mono text-slate-400">{rh.createdAt.split('T')[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB: STATUTORY NUMBERS */}
        {activeTab === 'statutory' && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 animate-in fade-in">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-3">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>Government Mandated Identification</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Tax Identification Number (TIN)</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {salaryPrivacy ? '••••-••••-••••' : employee.tin || 'Not Registered'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">SSS Member Number</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {salaryPrivacy ? '••-•••••••-•' : employee.sssNumber || 'Not Registered'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">PhilHealth Number (PIN)</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {salaryPrivacy ? '••-•••••••••-•' : employee.philHealthNumber || 'Not Registered'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Pag-IBIG / HDMF MID</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {salaryPrivacy ? '••••-••••-••••' : employee.pagIbigNumber || 'Not Registered'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* FUTURE TABS (PHASE 4 & 5 PLACEHOLDERS) */}
        {['attendance', 'leave', 'loans', 'allowances', 'payroll', 'documents'].includes(activeTab) && (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {tabs.find((t) => t.id === activeTab)?.label}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                This module is scheduled for implementation in a future phase. Employee Master Data foundation is fully established.
              </p>
            </div>
            <span className="inline-block bg-slate-100 text-slate-600 text-[10.5px] px-3 py-1 rounded-full font-mono border border-slate-200">
              Future Phase Roadmap Item
            </span>
          </div>
        )}

        {/* TAB: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 animate-in fade-in">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-3">
              <History className="w-4 h-4 text-blue-600" />
              <span>Immutable Employee 201 Audit Trail</span>
            </h3>

            {auditLogs.length === 0 ? (
              <p className="text-slate-400 italic py-4 text-center">No audit records found for this employee.</p>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{log.action}</span>
                        <span className="text-[10px] font-mono text-slate-400">{log.timestamp}</span>
                      </div>
                      <p className="text-slate-600 mt-1">{log.description}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border">
                      {log.userId}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 4. DEPARTMENTS WINDOW
// ==========================================

export const DepartmentsWindow: React.FC = () => {
  const { currentCompany, currentCompanyId } = useCompanyContext();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDept, setNewDept] = useState<CreateDepartmentInput>({
    companyId: currentCompanyId || '',
    code: '',
    name: '',
    description: '',
  });
  const [error, setError] = useState<string | null>(null);

  const loadDepts = useCallback(async () => {
    if (!currentCompanyId) return;
    try {
      setIsLoading(true);
      const list = await departmentService.listDepartments(currentCompanyId);
      setDepartments(list);
    } finally {
      setIsLoading(false);
    }
  }, [currentCompanyId]);

  useEffect(() => {
    loadDepts();
  }, [loadDepts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await departmentService.createDepartment({
        ...newDept,
        companyId: currentCompanyId || '',
      });
      setIsModalOpen(false);
      setNewDept({ companyId: currentCompanyId || '', code: '', name: '', description: '' });
      await loadDepts();
    } catch (err: any) {
      setError(err?.message || 'Failed to create department');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs overflow-hidden">
      <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Department Management</h2>
            <p className="text-[11px] text-slate-500">
              Entity: <strong className="text-slate-700">{currentCompany?.legalName || 'No Company Selected'}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Add Department</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {departments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
            <Building2 className="w-8 h-8 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No Departments Configured</p>
            <p className="text-xs text-slate-500 mt-1">Create departments to organize your company workforce.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {departments.map((d) => (
              <div key={d.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {d.code}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {d.status}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{d.name}</h3>
                <p className="text-xs text-slate-500">{d.description || 'No description provided.'}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Create New Department</h3>
            {error && <div className="p-2 bg-red-50 text-red-700 rounded text-xs">{error}</div>}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Department Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HR, FIN, PROD"
                  value={newDept.code}
                  onChange={(e) => setNewDept({ ...newDept, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Human Resources & Admin"
                  value={newDept.name}
                  onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Department scope and function"
                  value={newDept.description}
                  onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 rounded-lg border text-slate-600">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-semibold">
                Save Department
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 5. POSITIONS WINDOW
// ==========================================

export const PositionsWindow: React.FC = () => {
  const { currentCompany, currentCompanyId } = useCompanyContext();
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPos, setNewPos] = useState<CreatePositionInput>({
    companyId: currentCompanyId || '',
    code: '',
    name: '',
    description: '',
    departmentId: '',
  });
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!currentCompanyId) return;
    const [pos, depts] = await Promise.all([
      positionService.listPositions(currentCompanyId),
      departmentService.listDepartments(currentCompanyId),
    ]);
    setPositions(pos);
    setDepartments(depts);
  }, [currentCompanyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await positionService.createPosition({
        ...newPos,
        companyId: currentCompanyId || '',
      });
      setIsModalOpen(false);
      setNewPos({ companyId: currentCompanyId || '', code: '', name: '', description: '', departmentId: '' });
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to create position');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs overflow-hidden">
      <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Job Positions Masterlist</h2>
            <p className="text-[11px] text-slate-500">
              Entity: <strong className="text-slate-700">{currentCompany?.legalName || 'No Company Selected'}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Add Position</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {positions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
            <Briefcase className="w-8 h-8 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No Positions Configured</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {positions.map((p) => {
              const dept = departments.find((d) => d.id === p.departmentId);
              return (
                <div key={p.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {p.code}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">{dept?.code || 'No Dept'}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{p.name}</h3>
                  <p className="text-xs text-slate-500">{p.description || 'No description provided.'}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Create New Job Position</h3>
            {error && <div className="p-2 bg-red-50 text-red-700 rounded text-xs">{error}</div>}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Position Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HR-MGR, PROD-OP"
                  value={newPos.code}
                  onChange={(e) => setNewPos({ ...newPos, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Position Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Payroll Specialist"
                  value={newPos.name}
                  onChange={(e) => setNewPos({ ...newPos, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Associated Department</label>
                <select
                  value={newPos.departmentId}
                  onChange={(e) => setNewPos({ ...newPos, departmentId: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                >
                  <option value="">-- Select Department --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 rounded-lg border text-slate-600">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-semibold">
                Save Position
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 6. EMPLOYEE IMPORT WINDOW
// ==========================================

export const EmployeeImportWindow: React.FC = () => {
  const { currentCompany, currentCompanyId } = useCompanyContext();
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [validationSummary, setValidationSummary] = useState<ImportValidationSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importCompleted, setImportCompleted] = useState<{ count: number } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setFileContent(text);
      if (currentCompanyId) {
        const rows = employeeImportExportService.parseCSV(text);
        const summary = await employeeImportExportService.validateImportData(rows, currentCompanyId);
        setValidationSummary(summary);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const csv = employeeImportExportService.generateSampleTemplateCSV();
    employeeImportExportService.triggerDownload(csv, 'employee_import_template.csv');
  };

  const handleConfirmImport = async () => {
    if (!validationSummary || !currentCompanyId) return;
    try {
      setIsProcessing(true);
      const validInputs = validationSummary.rows
        .filter((r) => r.isValid && r.normalized)
        .map((r) => r.normalized!);

      const result = await employeeImportExportService.executeImport(validInputs, currentCompanyId);
      setImportCompleted({ count: result.importedCount });
    } catch (err: any) {
      alert(err?.message || 'Import execution failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs overflow-hidden">
      <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Employee Master CSV / File Import</h2>
            <p className="text-[11px] text-slate-500">
              Target Entity: <strong className="text-slate-700">{currentCompany?.legalName || 'No Company Selected'}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold border border-slate-300 flex items-center gap-1.5"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>Download Import Template</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full space-y-4">
        {importCompleted ? (
          <div className="bg-white p-8 rounded-xl border border-emerald-200 text-center space-y-3 shadow-xs animate-in fade-in">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Import Completed Successfully</h3>
            <p className="text-xs text-slate-600">
              <strong>{importCompleted.count}</strong> employee records were created and saved to the database.
            </p>
            <button
              onClick={() => {
                setValidationSummary(null);
                setImportCompleted(null);
                setFileContent('');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold"
            >
              Import More Records
            </button>
          </div>
        ) : (
          <>
            {/* Step 1: Upload */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-blue-600">
                1. Select CSV or Data File
              </h3>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {/* Step 2: Validation Summary & Grid */}
            {validationSummary && (
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-blue-600">
                      2. Pre-Import Validation Results
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {validationSummary.totalRows} Total Rows •{' '}
                      <strong className="text-emerald-600">{validationSummary.validRows} Valid</strong> •{' '}
                      <strong className="text-red-600">{validationSummary.invalidRows} Invalid</strong>
                    </p>
                  </div>

                  <button
                    onClick={handleConfirmImport}
                    disabled={validationSummary.validRows === 0 || isProcessing}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Commit {validationSummary.validRows} Valid Records</span>
                  </button>
                </div>

                {/* Validation Grid */}
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                      <tr>
                        <th className="py-2 px-3">Row</th>
                        <th className="py-2 px-3">Emp No.</th>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Errors / Suggested Fixes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {validationSummary.rows.map((row) => (
                        <tr key={row.rowNumber} className={row.isValid ? 'hover:bg-slate-50' : 'bg-red-50/60'}>
                          <td className="py-2 px-3 font-mono font-bold">{row.rowNumber}</td>
                          <td className="py-2 px-3 font-mono">{row.raw['Employee Number'] || row.raw['employeeNumber'] || '-'}</td>
                          <td className="py-2 px-3">
                            {row.raw['First Name'] || ''} {row.raw['Last Name'] || ''}
                          </td>
                          <td className="py-2 px-3">
                            {row.isValid ? (
                              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold text-[10px]">
                                VALID
                              </span>
                            ) : (
                              <span className="text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded font-semibold text-[10px]">
                                INVALID
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {row.errors.length === 0 ? (
                              <span className="text-slate-400">Ready to import</span>
                            ) : (
                              <div className="space-y-1">
                                {row.errors.map((err, idx) => (
                                  <div key={idx} className="text-[11px] text-red-700">
                                    <strong>{err.field}:</strong> {err.error}{' '}
                                    <span className="text-slate-600 italic">({err.suggestedFix})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 7. EMPLOYEE DOCUMENTS WINDOW (201 REPOSITORY)
// ==========================================

export const EmployeeDocumentsWindow: React.FC = () => {
  const { currentCompany } = useCompanyContext();

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs overflow-hidden">
      <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Employee 201 Document Vault</h2>
            <p className="text-[11px] text-slate-500">
              Entity: <strong className="text-slate-700">{currentCompany?.legalName || 'All Companies'}</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
        <FolderPlus className="w-10 h-10 text-slate-300" />
        <h3 className="text-sm font-bold text-slate-700">201 Document Repository Ready</h3>
        <p className="text-xs text-slate-500 max-w-sm">
          Contracts, BIR 1902/2316 filings, medical certificates, and government clearance attachments.
        </p>
      </div>
    </div>
  );
};
