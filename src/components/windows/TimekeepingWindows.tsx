/**
 * Timekeeping Windows - Phase 4 DTR, Attendance Matrix, Overtime & Biometrics
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Clock, 
  TableProperties, 
  Clock8, 
  Hourglass,
  Download, 
  Upload,
  Plus,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Calendar,
  Sparkles,
  Edit2,
  Trash2,
  Eye,
  Check,
  X,
  FileSpreadsheet,
  FileText,
  User,
  Building2,
  Layers,
  ArrowUpDown,
  RefreshCw
} from 'lucide-react';
import { useCompanyContext } from '../../context/CompanyContext';
import { dtrService, DTRSummaryStats, AttendanceMatrixEmployeeRow } from '../../services/DTRService';
import { employeeService } from '../../services/EmployeeService';
import { departmentService } from '../../services/DepartmentService';
import { overtimeRepository } from '../../repositories/OvertimeRepository';
import { DTRRecord, DTRStatus, Employee, Department, OvertimeRequest } from '../../db/schema';

// ==========================================
// 1. DTR MASTER WINDOW (Daily Time Records)
// ==========================================
export const DTRWindow: React.FC = () => {
  const { currentCompany, currentCompanyId, isAllCompanies } = useCompanyContext();

  const [dtrs, setDtrs] = useState<DTRRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [summary, setSummary] = useState<DTRSummaryStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-08-01_2026-08-15');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-08-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-08-15');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('All');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDTR, setEditingDTR] = useState<DTRRecord | null>(null);
  const [viewingDTR, setViewingDTR] = useState<DTRRecord | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Derive Date Range
  const { startDate, endDate } = useMemo(() => {
    if (selectedPeriod === 'custom') {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    const [s, e] = selectedPeriod.split('_');
    return { startDate: s, endDate: e };
  }, [selectedPeriod, customStartDate, customEndDate]);

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const companyScope = isAllCompanies ? null : currentCompanyId;

      const [empRes, depts, dtrList, stats] = await Promise.all([
        employeeService.listEmployees({ companyId: companyScope, status: 'All' }),
        departmentService.listDepartments(companyScope),
        dtrService.listDTRs({
          companyId: companyScope,
          startDate,
          endDate,
          employeeId: selectedEmployeeId !== 'All' ? selectedEmployeeId : undefined,
          status: selectedStatus !== 'All' ? (selectedStatus as DTRStatus) : undefined,
        }),
        dtrService.getSummaryStats({
          companyId: companyScope,
          startDate,
          endDate,
          employeeId: selectedEmployeeId !== 'All' ? selectedEmployeeId : undefined,
        }),
      ]);

      setEmployees(empRes.employees);
      setDepartments(depts);
      setDtrs(dtrList);
      setSummary(stats);
    } catch (err) {
      console.error('Failed to load DTR data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAllCompanies, currentCompanyId, startDate, endDate, selectedEmployeeId, selectedStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Map employee lookups
  const empMap = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const e of employees) {
      map.set(e.id, e);
    }
    return map;
  }, [employees]);

  // Filtered DTR records
  const filteredDTRs = useMemo(() => {
    return dtrs.filter((d) => {
      const emp = empMap.get(d.employeeId);
      if (selectedDeptId !== 'All' && emp?.departmentId !== selectedDeptId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const empNo = emp?.employeeNumber?.toLowerCase() || '';
        const empName = `${emp?.firstName || ''} ${emp?.lastName || ''}`.toLowerCase();
        const remarks = (d.remarks || '').toLowerCase();
        const date = d.date.toLowerCase();
        if (!empNo.includes(q) && !empName.includes(q) && !remarks.includes(q) && !date.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [dtrs, empMap, selectedDeptId, searchQuery]);

  // Seed Demo DTRs Handler
  const handleSeedDemo = async () => {
    if (!currentCompanyId && !isAllCompanies) return;
    const targetCompanyId = currentCompanyId || employees[0]?.companyId;
    if (!targetCompanyId) return;

    await dtrService.seedDemoDTRs(targetCompanyId);
    await loadData();
  };

  // Void/Delete DTR Handler
  const handleDelete = async (dtr: DTRRecord) => {
    const emp = empMap.get(dtr.employeeId);
    const confirm = window.confirm(
      `Are you sure you want to void the DTR log for ${emp ? emp.firstName + ' ' + emp.lastName : 'Employee'} on ${dtr.date}?`
    );
    if (!confirm) return;

    try {
      await dtrService.deleteDTR(dtr.id, 'Voided via DTR Workspace');
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete DTR');
    }
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    const csv = dtrService.generateExportCSV(filteredDTRs, employees);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `dtr_export_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-700 select-none">
      {/* 1. Header Toolbar */}
      <div className="p-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>Daily Time Records (DTR Master)</span>
              {isAllCompanies ? (
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-mono lowercase">
                  all companies
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-mono lowercase">
                  {currentCompany?.companyCode || 'single entity'}
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-500">
              Shift tracking, biometric logs, tardiness and overtime calculation ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {dtrs.length === 0 && !isLoading && (
            <button
              onClick={handleSeedDemo}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Seed Sample Cutoff (Aug 1-15)</span>
            </button>
          )}

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import CSV Punch</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredDTRs.length === 0}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export DTR</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add DTR Entry</span>
          </button>
        </div>
      </div>

      {/* 2. Summary Metric Bento Tiles */}
      {summary && (
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 shrink-0">
          <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Logs</span>
            <span className="text-base font-bold text-slate-900 font-mono">{summary.totalRecords}</span>
          </div>

          <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Present Logs</span>
            <span className="text-base font-bold text-emerald-700 font-mono flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {summary.presentCount}
            </span>
          </div>

          <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Late Incidents</span>
            <span className="text-base font-bold text-amber-700 font-mono">
              {summary.lateCount} <span className="text-xs font-normal text-slate-400">({summary.totalLateMinutes}m)</span>
            </span>
          </div>

          <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Undertime</span>
            <span className="text-base font-bold text-slate-800 font-mono">
              {summary.undertimeCount} <span className="text-xs font-normal text-slate-400">({summary.totalUndertimeMinutes}m)</span>
            </span>
          </div>

          <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Approved OT</span>
            <span className="text-base font-bold text-cyan-700 font-mono">{summary.totalOvertimeHours} hrs</span>
          </div>

          <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Incomplete / Rest</span>
            <span className="text-base font-bold text-slate-700 font-mono">
              {summary.incompleteCount} / {summary.restDayCount}
            </span>
          </div>
        </div>
      )}

      {/* 3. Comprehensive Filter Controls */}
      <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Period Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-medium">Cutoff:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent border-0 font-medium text-slate-800 focus:ring-0 outline-hidden cursor-pointer"
            >
              <option value="2026-08-01_2026-08-15">Aug 01 - Aug 15, 2026</option>
              <option value="2026-08-16_2026-08-31">Aug 16 - Aug 31, 2026</option>
              <option value="2026-07-16_2026-07-31">Jul 16 - Jul 31, 2026</option>
              <option value="2026-07-01_2026-07-15">Jul 01 - Jul 15, 2026</option>
              <option value="custom">Custom Date Range...</option>
            </select>
          </div>

          {selectedPeriod === 'custom' && (
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-transparent border-0 text-slate-800 text-xs font-mono outline-hidden"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-transparent border-0 text-slate-800 text-xs font-mono outline-hidden"
              />
            </div>
          )}

          {/* Employee Filter */}
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:border-blue-500 outline-hidden"
          >
            <option value="All">All Employees ({employees.length})</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.employeeNumber} - {e.lastName}, {e.firstName}
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:border-blue-500 outline-hidden"
          >
            <option value="All">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:border-blue-500 outline-hidden"
          >
            <option value="All">All Log Statuses</option>
            <option value="Present">Present</option>
            <option value="Late">Late</option>
            <option value="Rest Day">Rest Day</option>
            <option value="Regular Holiday">Regular Holiday</option>
            <option value="Special Holiday">Special Holiday</option>
            <option value="On Leave">On Leave</option>
            <option value="Incomplete">Incomplete</option>
            <option value="Absent">Absent</option>
          </select>
        </div>

        {/* Search Box */}
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, emp #, remarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white outline-hidden"
          />
        </div>
      </div>

      {/* 4. DTR Master Table View */}
      <div className="flex-1 overflow-auto bg-white">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mb-2" />
            <span className="text-xs">Loading Daily Time Records...</span>
          </div>
        ) : filteredDTRs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <Clock className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-xs font-bold text-slate-700 uppercase">No Time Logs Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
              No DTR punch records exist matching your active cutoff period or filter criteria.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSeedDemo}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Seed Sample Cutoff (Aug 1-15)</span>
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                Manual Add Entry
              </button>
            </div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10">
                <th className="py-2.5 px-3">Date / Day</th>
                <th className="py-2.5 px-3">Employee</th>
                {isAllCompanies && <th className="py-2.5 px-3 font-mono">Company</th>}
                <th className="py-2.5 px-3 font-mono">Time In</th>
                <th className="py-2.5 px-3 font-mono">Time Out</th>
                <th className="py-2.5 px-3 text-right">Reg. (Hrs)</th>
                <th className="py-2.5 px-3 text-right">Late (Mins)</th>
                <th className="py-2.5 px-3 text-right">Undertime</th>
                <th className="py-2.5 px-3 text-right">OT (Hrs)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Remarks</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11.5px] bg-white">
              {filteredDTRs.map((dtr) => {
                const emp = empMap.get(dtr.employeeId);
                const dayName = new Date(dtr.date).toLocaleDateString('en-US', { weekday: 'short' });

                return (
                  <tr key={dtr.id} className="hover:bg-blue-50/40 transition-colors">
                    {/* Date */}
                    <td className="py-2.5 px-3 font-sans">
                      <div className="font-semibold text-slate-800">{dtr.date}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">{dayName}</div>
                    </td>

                    {/* Employee */}
                    <td className="py-2.5 px-3 font-sans">
                      <div className="font-bold text-slate-900">
                        {emp ? `${emp.lastName}, ${emp.firstName}` : 'Unknown Employee'}
                      </div>
                      <div className="text-[10.5px] text-slate-500 font-mono">{emp?.employeeNumber || dtr.employeeId}</div>
                    </td>

                    {/* Company (if all) */}
                    {isAllCompanies && (
                      <td className="py-2.5 px-3 font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 border text-slate-700 text-[10px] font-bold">
                          {dtr.companyId}
                        </span>
                      </td>
                    )}

                    {/* Time In */}
                    <td className="py-2.5 px-3 text-emerald-700 font-semibold">
                      {dtr.timeIn ? dtr.timeIn : <span className="text-slate-400 font-sans font-normal">—</span>}
                    </td>

                    {/* Time Out */}
                    <td className="py-2.5 px-3 text-blue-700 font-semibold">
                      {dtr.timeOut ? dtr.timeOut : <span className="text-slate-400 font-sans font-normal">—</span>}
                    </td>

                    {/* Regular Hours */}
                    <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                      {dtr.regularHours > 0 ? dtr.regularHours.toFixed(2) : '0.00'}
                    </td>

                    {/* Late */}
                    <td className="py-2.5 px-3 text-right font-bold">
                      {dtr.lateMinutes > 0 ? (
                        <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[11px]">
                          {dtr.lateMinutes}m
                        </span>
                      ) : (
                        <span className="text-slate-300 font-normal font-sans">—</span>
                      )}
                    </td>

                    {/* Undertime */}
                    <td className="py-2.5 px-3 text-right">
                      {dtr.undertimeMinutes > 0 ? (
                        <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 text-[11px] font-bold">
                          {dtr.undertimeMinutes}m
                        </span>
                      ) : (
                        <span className="text-slate-300 font-normal font-sans">—</span>
                      )}
                    </td>

                    {/* OT Hours */}
                    <td className="py-2.5 px-3 text-right font-bold text-cyan-700">
                      {dtr.overtimeHours > 0 ? `${dtr.overtimeHours.toFixed(2)}h` : <span className="text-slate-300 font-normal font-sans">—</span>}
                    </td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-3 text-center font-sans">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-block ${
                          dtr.status === 'Present'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : dtr.status === 'Late'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : dtr.status === 'Rest Day'
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : dtr.status === 'On Leave'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : dtr.status === 'Incomplete'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {dtr.status}
                      </span>
                    </td>

                    {/* Remarks */}
                    <td className="py-2.5 px-3 font-sans text-slate-500 max-w-xs truncate text-[11px]">
                      {dtr.remarks || dtr.supervisorRemarks || '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-center font-sans">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingDTR(dtr)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit DTR Entry"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(dtr)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Void Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 5. Footer Status */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
        <div>
          Showing {filteredDTRs.length} of {dtrs.length} DTR records
        </div>
        <div className="font-mono text-[10.5px]">Cutoff: {startDate} ~ {endDate}</div>
      </div>

      {/* Add / Edit DTR Modal */}
      {(isAddModalOpen || editingDTR) && (
        <DTRFormModal
          isOpen={true}
          editingDTR={editingDTR}
          employees={employees}
          defaultCompanyId={currentCompanyId || employees[0]?.companyId || ''}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingDTR(null);
          }}
          onSaved={async () => {
            setIsAddModalOpen(false);
            setEditingDTR(null);
            await loadData();
          }}
        />
      )}

      {/* CSV Biometric Punch Import Modal */}
      {isImportModalOpen && (
        <DTRImportModal
          isOpen={true}
          companyId={currentCompanyId || employees[0]?.companyId || ''}
          employees={employees}
          onClose={() => setIsImportModalOpen(false)}
          onImported={async () => {
            setIsImportModalOpen(false);
            await loadData();
          }}
        />
      )}
    </div>
  );
};

// ==========================================
// 2. ATTENDANCE MATRIX WINDOW
// ==========================================
export const AttendanceMatrixWindow: React.FC = () => {
  const { currentCompany, currentCompanyId, isAllCompanies } = useCompanyContext();

  const [dateHeaders, setDateHeaders] = useState<string[]>([]);
  const [matrixRows, setMatrixRows] = useState<AttendanceMatrixEmployeeRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('All');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-08-01_2026-08-15');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { startDate, endDate } = useMemo(() => {
    const [s, e] = selectedPeriod.split('_');
    return { startDate: s, endDate: e };
  }, [selectedPeriod]);

  const loadMatrix = useCallback(async () => {
    setIsLoading(true);
    try {
      const companyScope = isAllCompanies ? null : currentCompanyId;
      const [depts, matrix] = await Promise.all([
        departmentService.listDepartments(companyScope),
        dtrService.getAttendanceMatrix(companyScope, startDate, endDate, selectedDeptId),
      ]);
      setDepartments(depts);
      setDateHeaders(matrix.dateHeaders);
      setMatrixRows(matrix.rows);
    } catch (err) {
      console.error('Failed to load matrix:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAllCompanies, currentCompanyId, startDate, endDate, selectedDeptId]);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  const getStatusBadge = (log?: DTRRecord) => {
    if (!log) {
      return <span className="text-slate-300 font-mono text-[10px]">—</span>;
    }
    switch (log.status) {
      case 'Present':
        return (
          <span
            title={`Time In: ${log.timeIn || '—'} | Time Out: ${log.timeOut || '—'} | Reg: ${log.regularHours}h`}
            className="px-1.5 py-0.5 rounded font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 text-[10px] inline-block cursor-default"
          >
            P
          </span>
        );
      case 'Late':
        return (
          <span
            title={`Late by ${log.lateMinutes} mins (In: ${log.timeIn})`}
            className="px-1.5 py-0.5 rounded font-bold text-amber-700 bg-amber-50 border border-amber-200 text-[10px] inline-block cursor-default"
          >
            L
          </span>
        );
      case 'Rest Day':
        return (
          <span title="Rest Day" className="px-1.5 py-0.5 rounded text-slate-500 bg-slate-100 text-[10px] inline-block">
            RD
          </span>
        );
      case 'On Leave':
        return (
          <span title="On Authorized Leave" className="px-1.5 py-0.5 rounded font-bold text-blue-700 bg-blue-50 border border-blue-200 text-[10px] inline-block">
            VL
          </span>
        );
      case 'Incomplete':
        return (
          <span title="Incomplete Log (Missing In or Out)" className="px-1.5 py-0.5 rounded font-bold text-rose-700 bg-rose-50 border border-rose-200 text-[10px] inline-block">
            INC
          </span>
        );
      case 'Regular Holiday':
      case 'Special Holiday':
        return (
          <span title={log.status} className="px-1.5 py-0.5 rounded font-bold text-purple-700 bg-purple-50 border border-purple-200 text-[10px] inline-block">
            HOL
          </span>
        );
      case 'Absent':
        return (
          <span title="Absent" className="px-1.5 py-0.5 rounded font-bold text-rose-600 bg-rose-50 text-[10px] inline-block">
            A
          </span>
        );
      default:
        return <span className="text-slate-400 font-mono text-[10px]">{log.status}</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-700 select-none">
      {/* Header Bar */}
      <div className="p-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <TableProperties className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Attendance Matrix Ledger Grid
            </h2>
            <p className="text-[11px] text-slate-500">
              Cross-employee daily punch status matrix for cut-off validation
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-[11px] text-slate-600"><span className="w-2 h-2 rounded-full bg-emerald-500"/> P: Present</span>
          <span className="flex items-center gap-1 text-[11px] text-slate-600"><span className="w-2 h-2 rounded-full bg-amber-500"/> L: Late</span>
          <span className="flex items-center gap-1 text-[11px] text-slate-600"><span className="w-2 h-2 rounded-full bg-blue-500"/> VL: Leave</span>
          <span className="flex items-center gap-1 text-[11px] text-slate-600"><span className="w-2 h-2 rounded-full bg-slate-400"/> RD: Rest Day</span>
          <span className="flex items-center gap-1 text-[11px] text-slate-600"><span className="w-2 h-2 rounded-full bg-rose-500"/> INC: Incomplete</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent border-0 font-medium text-slate-800 outline-hidden cursor-pointer"
            >
              <option value="2026-08-01_2026-08-15">Aug 01 - Aug 15, 2026</option>
              <option value="2026-08-16_2026-08-31">Aug 16 - Aug 31, 2026</option>
              <option value="2026-07-16_2026-07-31">Jul 16 - Jul 31, 2026</option>
              <option value="2026-07-01_2026-07-15">Jul 01 - Jul 15, 2026</option>
            </select>
          </div>

          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 outline-hidden"
          >
            <option value="All">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Headcount in Scope: <strong className="text-slate-800">{matrixRows.length}</strong>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="flex-1 overflow-auto bg-white">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mb-2" />
            <span className="text-xs">Computing attendance matrix...</span>
          </div>
        ) : matrixRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <TableProperties className="w-8 h-8 text-slate-300 mb-2" />
            <span className="text-xs font-bold text-slate-600">No active employees found for matrix</span>
          </div>
        ) : (
          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[10px] font-bold uppercase sticky top-0 z-10">
                <th className="py-2.5 px-3 text-left min-w-[200px]">Employee Name</th>
                {dateHeaders.map((d) => {
                  const dayNum = parseInt(d.split('-')[2], 10);
                  const dayName = new Date(d).toLocaleDateString('en-US', { weekday: 'narrow' });
                  return (
                    <th key={d} className="py-2 px-1 font-mono min-w-[32px] border-l border-slate-200">
                      <div>{dayNum}</div>
                      <div className="text-[9px] text-slate-400 font-normal">{dayName}</div>
                    </th>
                  );
                })}
                <th className="py-2.5 px-2 text-right min-w-[50px] border-l border-slate-200">Pres.</th>
                <th className="py-2.5 px-2 text-right min-w-[50px]">Late</th>
                <th className="py-2.5 px-2 text-right min-w-[50px]">OT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {matrixRows.map((row) => (
                <tr key={row.employee.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="py-2 px-3 text-left">
                    <div className="font-bold text-slate-900 truncate">
                      {row.employee.lastName}, {row.employee.firstName}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{row.employee.employeeNumber}</div>
                  </td>

                  {dateHeaders.map((d) => (
                    <td key={d} className="py-2 px-1 border-l border-slate-100">
                      {getStatusBadge(row.logsByDate[d])}
                    </td>
                  ))}

                  <td className="py-2 px-2 text-right font-mono font-bold text-emerald-700 border-l border-slate-200">
                    {row.summary.presentDays}
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-amber-700">
                    {row.summary.lateIncidents > 0 ? `${row.summary.lateIncidents}` : '—'}
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-cyan-700">
                    {row.summary.overtimeHours > 0 ? `${row.summary.overtimeHours}h` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 3. OVERTIME AUTHORIZATION WINDOW
// ==========================================
export const OvertimeWindow: React.FC = () => {
  const { currentCompany, currentCompanyId, isAllCompanies } = useCompanyContext();

  const [ots, setOts] = useState<OvertimeRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isFilingModalOpen, setIsFilingModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadOTs = useCallback(async () => {
    setIsLoading(true);
    try {
      const companyScope = isAllCompanies ? null : currentCompanyId;
      const [empRes, allOts] = await Promise.all([
        employeeService.listEmployees({ companyId: companyScope, status: 'All' }),
        companyScope ? overtimeRepository.findByCompany(companyScope) : overtimeRepository.findAll(),
      ]);
      setEmployees(empRes.employees);
      setOts(allOts);
    } catch (err) {
      console.error('Failed to load OTs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAllCompanies, currentCompanyId]);

  useEffect(() => {
    loadOTs();
  }, [loadOTs]);

  const empMap = useMemo(() => {
    return new Map(employees.map((e) => [e.id, e]));
  }, [employees]);

  const handleUpdateStatus = async (ot: OvertimeRequest, newStatus: 'Approved' | 'Rejected') => {
    await overtimeRepository.update({
      ...ot,
      status: newStatus,
      approvedHours: newStatus === 'Approved' ? ot.requestedHours : 0,
      reviewedBy: 'Admin Supervisor',
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await loadOTs();
  };

  const filteredOTs = ots.filter((o) => {
    if (statusFilter !== 'All' && o.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-700 select-none">
      <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Clock8 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Overtime Authorization & Filing
            </h2>
            <p className="text-[11px] text-slate-500">
              Pre-approval workflows, overtime slips, and supervisor review
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsFilingModalOpen(true)}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>File OT Request</span>
        </button>
      </div>

      <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 outline-hidden"
          >
            <option value="All">All Requests ({ots.length})</option>
            <option value="Pending">Pending Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white">
        {filteredOTs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <Clock8 className="w-8 h-8 text-slate-300 mb-2" />
            <span className="text-xs font-bold text-slate-600">No Overtime Requests on Record</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3 text-right">Requested (Hrs)</th>
                <th className="py-2.5 px-3">Justification Reason</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredOTs.map((ot) => {
                const emp = empMap.get(ot.employeeId);
                return (
                  <tr key={ot.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{ot.date}</td>
                    <td className="py-2.5 px-3 font-sans">
                      <div className="font-bold text-slate-900">
                        {emp ? `${emp.lastName}, ${emp.firstName}` : 'Unknown'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{emp?.employeeNumber}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-700">
                      {ot.requestedHours.toFixed(1)} hrs
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 max-w-sm truncate">{ot.reason}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ot.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : ot.status === 'Pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {ot.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {ot.status === 'Pending' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleUpdateStatus(ot, 'Approved')}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10.5px] font-semibold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(ot, 'Rejected')}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10.5px]"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">Reviewed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* File OT Request Modal */}
      {isFilingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              File Overtime Authorization Application
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const empId = (form.elements.namedItem('employeeId') as HTMLSelectElement).value;
                const date = (form.elements.namedItem('date') as HTMLInputElement).value;
                const hours = parseFloat((form.elements.namedItem('hours') as HTMLInputElement).value);
                const reason = (form.elements.namedItem('reason') as HTMLTextAreaElement).value;

                const emp = empMap.get(empId);
                if (!emp) return;

                const newOt: OvertimeRequest = {
                  id: 'ot_' + Date.now().toString(36),
                  companyId: emp.companyId,
                  employeeId: empId,
                  date,
                  requestedHours: hours,
                  reason,
                  status: 'Pending',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                await overtimeRepository.create(newOt);
                setIsFilingModalOpen(false);
                await loadOTs();
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Employee</label>
                <select name="employeeId" required className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg">
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employeeNumber} - {e.lastName}, {e.firstName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">OT Date</label>
                  <input type="date" name="date" required defaultValue="2026-08-05" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Hours Requested</label>
                  <input type="number" step="0.5" min="0.5" max="12" name="hours" required defaultValue="2.0" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Justification Reason</label>
                <textarea name="reason" required rows={3} placeholder="Describe the operational emergency or requirement..." className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFilingModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Submit OT Application
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
// 4. LATE & UNDERTIME SUMMARY WINDOW
// ==========================================
export const LateUndertimeWindow: React.FC = () => {
  const { currentCompany, currentCompanyId, isAllCompanies } = useCompanyContext();
  const [dtrs, setDtrs] = useState<DTRRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    async function load() {
      const companyScope = isAllCompanies ? null : currentCompanyId;
      const [empRes, logs] = await Promise.all([
        employeeService.listEmployees({ companyId: companyScope, status: 'All' }),
        dtrService.listDTRs({ companyId: companyScope, startDate: '2026-08-01', endDate: '2026-08-15' }),
      ]);
      setEmployees(empRes.employees);
      setDtrs(logs.filter((l) => l.lateMinutes > 0 || l.undertimeMinutes > 0));
    }
    load();
  }, [isAllCompanies, currentCompanyId]);

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-700 select-none p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Hourglass className="w-4 h-4 text-amber-600" />
          <span>Tardiness & Undertime Disciplinary Log (Aug 01 - Aug 15, 2026)</span>
        </h2>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex-1">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Employee</th>
              <th className="py-2.5 px-3 font-mono">Time In</th>
              <th className="py-2.5 px-3 font-mono">Time Out</th>
              <th className="py-2.5 px-3 text-right">Late (Mins)</th>
              <th className="py-2.5 px-3 text-right">Undertime (Mins)</th>
              <th className="py-2.5 px-3">Remarks / Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono">
            {dtrs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                  No late or undertime incidents recorded for this cutoff period.
                </td>
              </tr>
            ) : (
              dtrs.map((d) => {
                const emp = empMap.get(d.employeeId);
                return (
                  <tr key={d.id} className="hover:bg-amber-50/40">
                    <td className="py-2.5 px-3 font-sans text-slate-800">{d.date}</td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="font-bold text-slate-900">{emp ? `${emp.lastName}, ${emp.firstName}` : d.employeeId}</span>
                      <span className="text-[10px] text-slate-400 ml-2">[{emp?.employeeNumber}]</span>
                    </td>
                    <td className="py-2.5 px-3 text-emerald-700 font-semibold">{d.timeIn || '—'}</td>
                    <td className="py-2.5 px-3 text-blue-700 font-semibold">{d.timeOut || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-700">
                      {d.lateMinutes > 0 ? `${d.lateMinutes}m` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                      {d.undertimeMinutes > 0 ? `${d.undertimeMinutes}m` : '—'}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-500">{d.remarks || '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==========================================
// 5. MODAL: ADD / EDIT DTR ENTRY
// ==========================================
interface DTRFormModalProps {
  isOpen: boolean;
  editingDTR: DTRRecord | null;
  employees: Employee[];
  defaultCompanyId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const DTRFormModal: React.FC<DTRFormModalProps> = ({
  isOpen,
  editingDTR,
  employees,
  defaultCompanyId,
  onClose,
  onSaved,
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState(editingDTR?.employeeId || employees[0]?.id || '');
  const [date, setDate] = useState(editingDTR?.date || new Date().toISOString().split('T')[0]);
  const [timeIn, setTimeIn] = useState(editingDTR?.timeIn || '08:00');
  const [timeOut, setTimeOut] = useState(editingDTR?.timeOut || '17:00');
  const [status, setStatus] = useState<DTRStatus>(editingDTR?.status || 'Present');
  const [remarks, setRemarks] = useState(editingDTR?.remarks || '');
  const [supervisorRemarks, setSupervisorRemarks] = useState(editingDTR?.supervisorRemarks || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live Metric Calculation
  const metrics = useMemo(() => {
    return dtrService.computeTimeMetrics(timeIn, timeOut);
  }, [timeIn, timeOut]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const emp = employees.find((x) => x.id === selectedEmpId);
    if (!emp) {
      setErrorMsg('Please select a valid employee.');
      return;
    }

    try {
      if (editingDTR) {
        await dtrService.updateDTR(editingDTR.id, {
          timeIn,
          timeOut,
          status,
          remarks,
          supervisorRemarks,
        });
      } else {
        await dtrService.createDTR({
          companyId: emp.companyId || defaultCompanyId,
          employeeId: selectedEmpId,
          date,
          timeIn,
          timeOut,
          status,
          remarks,
          supervisorRemarks,
        });
      }
      await onSaved();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save DTR log');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {editingDTR ? 'Edit Daily Time Record' : 'Add Daily Time Record (DTR)'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Employee *</label>
            <select
              value={selectedEmpId}
              disabled={!!editingDTR}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.employeeNumber} - {e.lastName}, {e.firstName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Date (YYYY-MM-DD) *</label>
              <input
                type="date"
                value={date}
                disabled={!!editingDTR}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Status Classification</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DTRStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
              >
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Rest Day">Rest Day</option>
                <option value="Regular Holiday">Regular Holiday</option>
                <option value="Special Holiday">Special Holiday</option>
                <option value="On Leave">On Leave</option>
                <option value="Incomplete">Incomplete</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Time In</label>
              <input
                type="time"
                value={timeIn}
                onChange={(e) => setTimeIn(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-emerald-800 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Time Out</label>
              <input
                type="time"
                value={timeOut}
                onChange={(e) => setTimeOut(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-blue-800 font-semibold"
              />
            </div>
          </div>

          {/* Computed Duration Preview */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-4 gap-2 text-center text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">Reg. Hrs</span>
              <span className="font-mono font-bold text-slate-800">{metrics.regularHours}h</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">Late</span>
              <span className="font-mono font-bold text-amber-700">{metrics.lateMinutes}m</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">Undertime</span>
              <span className="font-mono font-bold text-rose-700">{metrics.undertimeMinutes}m</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">Overtime</span>
              <span className="font-mono font-bold text-cyan-700">{metrics.overtimeHours}h</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Remarks</label>
            <input
              type="text"
              placeholder="e.g. Official Business, Field assignment..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
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
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs"
            >
              {editingDTR ? 'Update DTR Log' : 'Save DTR Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 6. MODAL: DTR BIOMETRIC PUNCH CSV IMPORT
// ==========================================
interface DTRImportModalProps {
  isOpen: boolean;
  companyId: string;
  employees: Employee[];
  onClose: () => void;
  onImported: () => Promise<void>;
}

const DTRImportModal: React.FC<DTRImportModalProps> = ({
  companyId,
  employees,
  onClose,
  onImported,
}) => {
  const [csvContent, setCsvContent] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<Array<{
    employeeNumber: string;
    date: string;
    timeIn: string;
    timeOut: string;
    remarks?: string;
    status: 'VALID' | 'INVALID';
    error?: string;
  }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const empByNo = useMemo(() => {
    return new Map(employees.map((e) => [e.employeeNumber.trim().toUpperCase(), e]));
  }, [employees]);

  const handleParse = (text: string) => {
    setCsvContent(text);
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) {
      setParsedRows([]);
      return;
    }

    const rows: typeof parsedRows = [];
    const startIndex = lines[0].toLowerCase().includes('employee') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.replace(/"/g, '').trim());
      if (parts.length < 3) continue;

      const empNo = parts[0];
      const date = parts[1];
      const timeIn = parts[2] || '';
      const timeOut = parts[3] || '';
      const remarks = parts[4] || '';

      const emp = empByNo.get(empNo.toUpperCase());
      let status: 'VALID' | 'INVALID' = 'VALID';
      let error = '';

      if (!emp) {
        status = 'INVALID';
        error = `Employee #${empNo} not found in active company.`;
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        status = 'INVALID';
        error = `Invalid date format (expected YYYY-MM-DD): ${date}`;
      }

      rows.push({
        employeeNumber: empNo,
        date,
        timeIn,
        timeOut,
        remarks,
        status,
        error,
      });
    }

    setParsedRows(rows);
  };

  const handleCommit = async () => {
    setIsProcessing(true);
    try {
      const validRows = parsedRows.filter((r) => r.status === 'VALID');
      for (const row of validRows) {
        const emp = empByNo.get(row.employeeNumber.toUpperCase());
        if (!emp) continue;

        try {
          await dtrService.createDTR({
            companyId: emp.companyId,
            employeeId: emp.id,
            date: row.date,
            timeIn: row.timeIn || undefined,
            timeOut: row.timeOut || undefined,
            remarks: row.remarks || 'Biometric CSV Import',
          });
        } catch {
          // Ignore duplicate collision on import
        }
      }

      await onImported();
    } finally {
      setIsProcessing(false);
    }
  };

  const sampleTemplate = `EmployeeNumber,Date,TimeIn,TimeOut,Remarks\n${employees[0]?.employeeNumber || 'EMP-001'},2026-08-16,07:55,17:05,Biometric Log`;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full flex flex-col max-h-[85vh]">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Import Biometric Punch Log (CSV)
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-700">Paste CSV Punch Records or Load Template</label>
              <button
                type="button"
                onClick={() => handleParse(sampleTemplate)}
                className="text-[11px] text-blue-600 hover:underline font-semibold"
              >
                Load Sample Template
              </button>
            </div>
            <textarea
              rows={4}
              value={csvContent}
              onChange={(e) => handleParse(e.target.value)}
              placeholder={`EmployeeNumber,Date,TimeIn,TimeOut,Remarks\n${employees[0]?.employeeNumber || 'EMP-001'},2026-08-16,07:55,17:05,Biometric Log`}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-[11px]"
            />
          </div>

          {parsedRows.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-700 mb-2">
                Parsed Rows Preview ({parsedRows.filter((r) => r.status === 'VALID').length} Valid / {parsedRows.length} Total)
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Emp #</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">In</th>
                      <th className="py-2 px-3">Out</th>
                      <th className="py-2 px-3">Validation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {parsedRows.map((r, i) => (
                      <tr key={i} className={r.status === 'VALID' ? 'hover:bg-slate-50' : 'bg-red-50/50'}>
                        <td className="py-2 px-3 font-semibold">{r.employeeNumber}</td>
                        <td className="py-2 px-3">{r.date}</td>
                        <td className="py-2 px-3 text-emerald-700">{r.timeIn || '—'}</td>
                        <td className="py-2 px-3 text-blue-700">{r.timeOut || '—'}</td>
                        <td className="py-2 px-3 font-sans">
                          {r.status === 'VALID' ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" /> Valid
                            </span>
                          ) : (
                            <span className="text-red-700 font-medium">{r.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={parsedRows.filter((r) => r.status === 'VALID').length === 0 || isProcessing}
            onClick={handleCommit}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            {isProcessing ? 'Importing...' : `Import ${parsedRows.filter((r) => r.status === 'VALID').length} Punch Logs`}
          </button>
        </div>
      </div>
    </div>
  );
};
