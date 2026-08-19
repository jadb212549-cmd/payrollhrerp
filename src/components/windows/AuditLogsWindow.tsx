/**
 * Immutable Audit Trail Center Window - Phase 10 Production Hardening
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FileSearch, 
  Search, 
  RefreshCw, 
  Filter, 
  ShieldCheck, 
  Eye, 
  X, 
  Calendar, 
  User as UserIcon, 
  Building2,
  Lock
} from 'lucide-react';
import { auditService } from '../../services/AuditService';
import { AuditLog } from '../../db/schema';
import { useAuth } from '../../context/AuthContext';

export const AuditLogsWindow: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedEntity, setSelectedEntity] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const allLogs = await auditService.getLogs();
      setLogs(allLogs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchesAction = selectedAction === 'ALL' || l.action === selectedAction;
      const matchesEntity = selectedEntity === 'ALL' || l.entityType === selectedEntity;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        l.userId.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.entityId.toLowerCase().includes(q) ||
        (l.companyId && l.companyId.toLowerCase().includes(q));
      return matchesAction && matchesEntity && matchesSearch;
    });
  }, [logs, selectedAction, selectedEntity, searchQuery]);

  const uniqueEntities = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.entityType));
    return Array.from(set);
  }, [logs]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs overflow-hidden select-none">
      {/* Header Bar */}
      <div className="p-3.5 bg-white border-b border-slate-200 shrink-0 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FileSearch className="w-5 h-5 text-blue-600" />
            <div>
              <h1 className="text-sm font-bold text-slate-900">Immutable Audit Trail Center</h1>
              <p className="text-[11px] text-slate-500">
                Sealed system event logs, access tracking, state transitions, and administrative operations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Read-Only & Tamper-Proof
            </span>
            <button
              onClick={loadData}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              title="Refresh Audit Logs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <Filter className="w-3 h-3 text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-600">Action:</span>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 outline-none text-xs"
            >
              <option value="ALL">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="ARCHIVE">ARCHIVE</option>
              <option value="CALCULATE">CALCULATE</option>
              <option value="APPROVE">APPROVE</option>
              <option value="FINALIZE">FINALIZE</option>
              <option value="REOPEN">REOPEN</option>
              <option value="SYSTEM">SYSTEM</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-600">Entity:</span>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 outline-none text-xs"
            >
              <option value="ALL">All Entities</option>
              {uniqueEntities.map((ent) => (
                <option key={ent} value={ent}>{ent}</option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Filter by user, company ID, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-left border-collapse text-xs font-sans">
          <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-300 font-semibold text-slate-700">
            <tr>
              <th className="py-2.5 px-3 font-mono">Timestamp</th>
              <th className="py-2.5 px-3">User</th>
              <th className="py-2.5 px-3">Company</th>
              <th className="py-2.5 px-3 text-center">Action</th>
              <th className="py-2.5 px-3">Entity Type</th>
              <th className="py-2.5 px-3">Event Summary</th>
              <th className="py-2.5 px-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-blue-50/40 transition-colors">
                <td className="py-2 px-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                  {log.timestamp.replace('T', ' ').split('.')[0]}
                </td>
                <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap">{log.userId}</td>
                <td className="py-2 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                  {log.companyId || 'Global'}
                </td>
                <td className="py-2 px-3 text-center whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                    log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                    log.action === 'FINALIZE' || log.action === 'APPROVE' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                    log.action === 'REOPEN' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                    'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">{log.entityType}</td>
                <td className="py-2 px-3 text-slate-700 truncate max-w-xs">{log.description}</td>
                <td className="py-2 px-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                    title="View Full Inspector"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && !isLoading && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No matching audit entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Log Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> Immutable Event Entry #{selectedLog.id.substring(0, 8)}
              </h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">Timestamp:</span>
                  <strong className="text-slate-900">{selectedLog.timestamp}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">User Account:</span>
                  <strong className="text-slate-900">{selectedLog.userId}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Company Context:</span>
                  <strong className="text-slate-900">{selectedLog.companyId || 'Global / System'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Action Target:</span>
                  <strong className="text-slate-900">{selectedLog.action} • {selectedLog.entityType}</strong>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Description</label>
                <div className="p-2.5 bg-slate-100 rounded-lg text-slate-800 leading-relaxed">
                  {selectedLog.description}
                </div>
              </div>

              {(selectedLog.previousValue || selectedLog.newValue) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Previous State</label>
                    <pre className="p-2.5 bg-slate-900 text-slate-200 rounded-lg font-mono text-[10px] overflow-x-auto max-h-36">
                      {JSON.stringify(selectedLog.previousValue || {}, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">New State</label>
                    <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[10px] overflow-x-auto max-h-36">
                      {JSON.stringify(selectedLog.newValue || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
