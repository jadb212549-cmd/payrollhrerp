/**
 * Application Diagnostics & Safe System Logs Window - Phase 11
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileCode, 
  Search, 
  Copy, 
  Trash2, 
  RefreshCw, 
  Check, 
  ShieldCheck, 
  AlertCircle,
  Filter,
  Lock
} from 'lucide-react';
import { diagnosticsService, DiagnosticLogEntry, DiagnosticLogLevel } from '../../services/DiagnosticsService';

export const DiagnosticsLogsWindow: React.FC = () => {
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const reloadLogs = () => {
    setLogs(diagnosticsService.getLogs());
  };

  useEffect(() => {
    reloadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchesLevel = selectedLevel === 'ALL' || l.level === selectedLevel;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || l.message.toLowerCase().includes(q) || l.category.toLowerCase().includes(q);
      return matchesLevel && matchesSearch;
    });
  }, [logs, selectedLevel, searchQuery]);

  const handleCopyReport = () => {
    const report = diagnosticsService.generateDiagnosticReport();
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear system diagnostic logs?')) {
      diagnosticsService.clearLogs();
      reloadLogs();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-800 text-xs overflow-hidden select-none">
      {/* Header Toolbar */}
      <div className="p-3.5 bg-white border-b border-slate-200 shrink-0 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FileCode className="w-5 h-5 text-blue-600" />
            <div>
              <h1 className="text-sm font-bold text-slate-900">Application Safe Diagnostics & Event Logger</h1>
              <p className="text-[11px] text-slate-500">
                System events, migration triggers, update logs, and error traces. (Passwords & salary details auto-sanitized).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReport}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Report!' : 'Copy Diagnostic Report'}</span>
            </button>
            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
              title="Clear Diagnostic Logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <Filter className="w-3 h-3 text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-600">Level:</span>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 outline-none text-xs"
            >
              <option value="ALL">All Levels</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Filter logs by message or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
            />
          </div>
        </div>
      </div>

      {/* Logs Inspector Terminal */}
      <div className="flex-1 p-3 overflow-auto bg-slate-900 font-mono text-[11px] text-slate-200 space-y-1">
        {filteredLogs.map((entry) => (
          <div key={entry.id} className="hover:bg-slate-800/80 p-1.5 rounded transition-colors flex items-start gap-2 border-b border-slate-800/50">
            <span className="text-slate-500 shrink-0 select-all">{entry.timestamp.split('T')[1].substring(0, 8)}</span>
            <span className={`px-1.5 rounded text-[10px] font-bold shrink-0 ${
              entry.level === 'CRITICAL' || entry.level === 'ERROR' ? 'bg-rose-900/80 text-rose-300 border border-rose-700' :
              entry.level === 'WARN' ? 'bg-amber-900/80 text-amber-300 border border-amber-700' :
              'bg-blue-900/80 text-blue-300 border border-blue-700'
            }`}>
              {entry.level}
            </span>
            <span className="text-purple-400 font-bold shrink-0">[{entry.category}]</span>
            <span className="text-slate-200 flex-1 break-all">{entry.message}</span>
          </div>
        ))}

        {filteredLogs.length === 0 && (
          <div className="py-12 text-center text-slate-500 font-sans">
            No diagnostic log entries match current filters.
          </div>
        )}
      </div>
    </div>
  );
};
