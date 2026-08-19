/**
 * Backup, Restore, & Factory Reset Window - Phase 10 Production Hardening
 */

import React, { useState } from 'react';
import { 
  HardDriveDownload, 
  HardDriveUpload, 
  RotateCcw, 
  ShieldCheck, 
  AlertTriangle, 
  FileCheck, 
  CheckCircle2, 
  Download, 
  Upload, 
  RefreshCw, 
  X,
  FileJson,
  Lock,
  Database
} from 'lucide-react';
import { backupRestoreService, BackupPayload } from '../../services/BackupRestoreService';
import { useAuth } from '../../context/AuthContext';

export const BackupRestoreWindow: React.FC = () => {
  const { currentUser, hasPermission } = useAuth();

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Restore State
  const [restorePayload, setRestorePayload] = useState<BackupPayload | null>(null);
  const [restoreSummary, setRestoreSummary] = useState<Record<string, number> | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // Factory Reset State
  const [showResetModal, setShowResetModal] = useState(false);
  const [confirmResetText, setConfirmResetText] = useState('');

  const canBackup = hasPermission('backup:create');
  const canRestore = hasPermission('backup:restore');

  const handleCreateBackup = async () => {
    setIsProcessing(true);
    setStatusMessage({ type: 'info', text: 'Generating comprehensive database backup payload...' });
    try {
      const { payload, jsonString, filename } = await backupRestoreService.createBackup();
      
      // Download Blob File
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage({
        type: 'success',
        text: `Backup successfully generated! File: ${filename} (${payload.recordCount} records, Checksum: ${payload.checksum.substring(0, 12)}...)`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Backup failed: ${err?.message || 'Unknown error'}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await backupRestoreService.validateBackup(content);
      if (!res.isValid || !res.payload) {
        setStatusMessage({ type: 'error', text: res.error || 'Invalid backup file structure.' });
        setIsProcessing(false);
        return;
      }

      setRestorePayload(res.payload);
      setRestoreSummary(res.summary || null);
      setShowRestoreModal(true);
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!restorePayload) return;
    setIsProcessing(true);
    try {
      const result = await backupRestoreService.restoreBackup(restorePayload);
      setShowRestoreModal(false);
      setStatusMessage({
        type: 'success',
        text: `Database successfully restored! Safety backup automatically created: ${result.safetyBackupFilename}`,
      });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Restore failed: ${err?.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFactoryReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmResetText !== 'CONFIRM RESET') {
      setStatusMessage({ type: 'error', text: 'Factory reset canceled: Confirmation string mismatch.' });
      return;
    }

    setIsProcessing(true);
    try {
      await backupRestoreService.performFactoryReset(confirmResetText);
      setShowResetModal(false);
      setConfirmResetText('');
      setStatusMessage({
        type: 'success',
        text: 'Factory reset completed. System records cleared. Safety backup saved to local storage.',
      });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Factory reset failed: ${err?.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc] text-slate-800 text-xs select-none">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Banner */}
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <HardDriveDownload className="w-5 h-5 text-blue-600" />
            <div>
              <h1 className="text-sm font-bold text-slate-900">Database Backup, Restore & Disaster Recovery</h1>
              <p className="text-[11px] text-slate-500">Manage encrypted JSON database snapshots with SHA-256 integrity verification.</p>
            </div>
          </div>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
            statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            statusMessage.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> :
             statusMessage.type === 'error' ? <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> :
             <RefreshCw className="w-4 h-4 text-blue-600 shrink-0 animate-spin" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Create Backup */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Download className="w-4 h-4 text-blue-600" />
                <span>Create Manual System Backup</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Exports all companies, employee records, attendance, payroll runs, payslips, statutory rules, and audit logs into a single structured file.
              </p>
            </div>
            <button
              onClick={handleCreateBackup}
              disabled={!canBackup || isProcessing}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <HardDriveDownload className="w-4 h-4" /> Export Backup File (.json)
            </button>
          </div>

          {/* Card 2: Restore Database */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Restore Database Snapshot</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Restore system data from a previously verified backup file. An automatic safety backup will be generated prior to restoration.
              </p>
            </div>
            <label className={`w-full py-2 ${
              canRestore && !isProcessing ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer' : 'bg-slate-300 cursor-not-allowed'
            } text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors text-center`}>
              <HardDriveUpload className="w-4 h-4" /> Upload & Validate Snapshot
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                disabled={!canRestore || isProcessing}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Safety & Factory Reset Section */}
        <div className="p-4 bg-white border border-rose-200 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-rose-100 pb-2">
            <div className="flex items-center gap-2 text-rose-800 font-bold">
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>System Factory Reset & Clean State</span>
            </div>
            <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 rounded text-[10px] font-bold">
              High Privilege
            </span>
          </div>
          <p className="text-slate-500 text-[11.5px] leading-relaxed">
            Resets operational database records back to clean factory state. Automatically creates a safety backup file before performing reset.
          </p>
          <div className="flex justify-end">
            <button
              onClick={() => setShowResetModal(true)}
              disabled={currentUser?.role !== 'Super Admin'}
              className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-50"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Factory Reset Application
            </button>
          </div>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {showRestoreModal && restorePayload && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" /> Confirm Backup Restoration
              </h3>
              <button onClick={() => setShowRestoreModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-mono text-[11px] space-y-1">
                <div>Backup Version: {restorePayload.version}</div>
                <div>Created Timestamp: {restorePayload.timestamp.replace('T', ' ').split('.')[0]}</div>
                <div>Record Count: {restorePayload.recordCount}</div>
                <div>SHA-256 Checksum: {restorePayload.checksum.substring(0, 24)}...</div>
              </div>

              {restoreSummary && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px]">
                  <div className="font-bold text-slate-700 mb-1">Payload Breakdown:</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-slate-600">
                    {Object.entries(restoreSummary).map(([store, count]) => (
                      <div key={store} className="flex justify-between font-mono">
                        <span>{store}:</span> <strong className="text-slate-900">{count}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-slate-600 text-[11.5px] leading-relaxed">
                An automatic safety backup will be saved locally prior to overwriting database stores.
              </p>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => setShowRestoreModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRestore}
                  disabled={isProcessing}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  {isProcessing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Confirm & Restore
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Factory Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-rose-200 flex items-center justify-between bg-rose-50">
              <h3 className="font-bold text-rose-900 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" /> High-Privilege Factory Reset
              </h3>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFactoryReset} className="p-4 space-y-3.5 text-xs">
              <p className="text-slate-700 leading-relaxed">
                This operation will clear operational records (employees, DTR, payroll runs) back to clean state. An automatic safety backup file will be generated first.
              </p>

              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Type <span className="font-mono text-rose-600 select-all font-extrabold">CONFIRM RESET</span> to proceed:
                </label>
                <input
                  type="text"
                  required
                  value={confirmResetText}
                  onChange={(e) => setConfirmResetText(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-xs outline-none focus:border-rose-500"
                  placeholder="CONFIRM RESET"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirmResetText !== 'CONFIRM RESET' || isProcessing}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-semibold rounded-lg shadow-xs"
                >
                  Execute Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
