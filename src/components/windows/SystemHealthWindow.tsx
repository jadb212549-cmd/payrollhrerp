/**
 * System Health Diagnostics & Data Integrity Scanner Window - Phase 11
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  ShieldAlert, 
  Search, 
  Database, 
  HardDrive, 
  FileCheck2,
  Info,
  ShieldCheck
} from 'lucide-react';
import { systemHealthService, HealthCheckItem, HealthStatus, IntegrityIssue } from '../../services/SystemHealthService';

export const SystemHealthWindow: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('HEALTHY');
  const [healthItems, setHealthItems] = useState<HealthCheckItem[]>([]);
  const [integrityIssues, setIntegrityIssues] = useState<IntegrityIssue[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(true);

  const loadHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    try {
      const { overall, items } = await systemHealthService.runHealthCheck();
      setHealthStatus(overall);
      setHealthItems(items);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingHealth(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  const handleRunIntegrityScan = async () => {
    setIsScanning(true);
    try {
      const issues = await systemHealthService.runDataIntegrityScan();
      setIntegrityIssues(issues);
    } catch (err) {
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc] text-slate-800 text-xs select-none">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-blue-600" />
            <div>
              <h1 className="text-sm font-bold text-slate-900">System Health & Data Integrity Diagnostics</h1>
              <p className="text-[11px] text-slate-500">
                Automated database status verification, schema validation, and integrity anomaly scanner.
              </p>
            </div>
          </div>

          <button
            onClick={loadHealth}
            disabled={isCheckingHealth}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold rounded-lg flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} /> Refresh Status
          </button>
        </div>

        {/* Health Status Banner */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-xs ${
          healthStatus === 'HEALTHY' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' :
          healthStatus === 'WARNING' ? 'bg-amber-50/80 border-amber-200 text-amber-900' :
          'bg-rose-50/80 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-xs ${
              healthStatus === 'HEALTHY' ? 'bg-emerald-600' :
              healthStatus === 'WARNING' ? 'bg-amber-600' : 'bg-rose-600'
            }`}>
              {healthStatus === 'HEALTHY' ? <CheckCircle2 className="w-6 h-6" /> :
               healthStatus === 'WARNING' ? <AlertTriangle className="w-6 h-6" /> :
               <XCircle className="w-6 h-6" />}
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight">
                System Status: {healthStatus === 'HEALTHY' ? '🟢 Healthy & Operational' : healthStatus === 'WARNING' ? '🟡 Warning Detected' : '🔴 Error State'}
              </div>
              <p className="text-[11.5px] opacity-80 mt-0.5">
                All core database services, localized storage engines, and security subsystems are online.
              </p>
            </div>
          </div>
        </div>

        {/* Health Component Checklist */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Component Diagnostics Verification Checklist</span>
          </h2>

          <div className="space-y-2">
            {healthItems.map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between font-sans">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-800 text-xs">{item.component}</div>
                  <div className="text-[11px] text-slate-500">{item.message}</div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  item.status === 'HEALTHY' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  item.status === 'WARNING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Data Integrity Scanner Section */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-purple-600" />
                <span>Authorized Data Integrity Anomaly Scanner</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Scans for orphan employees, missing DTR references, duplicate IDs, and broken relationships without deleting data.
              </p>
            </div>

            <button
              onClick={handleRunIntegrityScan}
              disabled={isScanning}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning Data...' : 'Run Integrity Scan'}</span>
            </button>
          </div>

          {/* Scanner Results */}
          {integrityIssues.length > 0 ? (
            <div className="space-y-2">
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Found {integrityIssues.length} potential data integrity anomalies:</span>
              </div>

              {integrityIssues.map((iss) => (
                <div key={iss.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11.5px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      {iss.title} ({iss.entityType} #{iss.recordId})
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      iss.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {iss.severity}
                    </span>
                  </div>
                  <p className="text-slate-600">{iss.details}</p>
                  <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[10.5px] text-blue-800">
                    <strong>Recommended Action:</strong> {iss.recommendedAction}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
              <div className="font-bold text-slate-800 text-xs">No Data Integrity Anomalies Detected</div>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                All employee references, attendance records, payroll runs, and company relationships are intact.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
