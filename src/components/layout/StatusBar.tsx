import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Database, 
  Keyboard, 
  Building2, 
  Layers, 
  ShieldCheck, 
  ShieldAlert,
  Sparkles,
  HardDrive,
  Save,
  Check
} from 'lucide-react';
import { useCompanyContext } from '../../context/CompanyContext';
import { portablePersistenceService } from '../../services/PortablePersistenceService';

interface StatusBarProps {
  openWindowsCount: number;
  salaryPrivacy: boolean;
  activeWindowTitle?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  openWindowsCount,
  salaryPrivacy,
  activeWindowTitle,
}) => {
  const { currentCompany, isAllCompanies, dbVersion, activeCompanies } = useCompanyContext();
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [portablePath, setPortablePath] = useState<string>('./payroll_data/payroll_master_db.json');

  useEffect(() => {
    portablePersistenceService.getPortablePath().then((p) => {
      if (p) setPortablePath(p);
    });
  }, []);

  const handleManualSave = async () => {
    setIsSaving(true);
    try {
      const res = await portablePersistenceService.saveToDisk();
      if (res.success) {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2500);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <footer className="h-7 bg-[#f1f5f9] border-t border-slate-200 px-4 flex items-center justify-between text-[11px] text-slate-500 font-medium select-none shrink-0 z-20 shadow-xs">
      {/* Left system status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Local Engine Ready</span>
        </div>

        <div className="h-3 w-px bg-slate-300" />

        {/* Portable storage status & manual trigger */}
        <button
          onClick={handleManualSave}
          disabled={isSaving}
          title={`Portable data saved beside EXE (${portablePath}). Click to force save now.`}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50/80 hover:bg-blue-100/80 text-blue-700 border border-blue-200 transition-colors cursor-pointer"
        >
          {isSaving ? (
            <>
              <Save className="w-3 h-3 animate-spin text-blue-600" />
              <span className="font-semibold">Saving to EXE folder...</span>
            </>
          ) : justSaved ? (
            <>
              <Check className="w-3 h-3 text-emerald-600" />
              <span className="font-semibold text-emerald-700">Data Saved beside EXE</span>
            </>
          ) : (
            <>
              <HardDrive className="w-3 h-3 text-blue-600" />
              <span>Portable Storage: <strong className="text-blue-900">Auto-Saving</strong></span>
            </>
          )}
        </button>

        <div className="h-3 w-px bg-slate-300" />

        <div className="flex items-center gap-1.5 text-slate-700">
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-slate-500 font-normal">Active Scope:</span>
          {isAllCompanies ? (
            <span className="font-semibold text-amber-700 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>All Companies (Consolidated)</span>
            </span>
          ) : currentCompany ? (
            <span className="font-semibold text-slate-800">
              {currentCompany.tradeName || currentCompany.legalName} ({currentCompany.companyCode})
            </span>
          ) : (
            <span className="text-amber-600 italic">No Active Company ({activeCompanies.length} in DB)</span>
          )}
        </div>

        <div className="h-3 w-px bg-slate-300 hidden sm:block" />

        <div className="hidden sm:flex items-center gap-1.5 text-slate-600">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>Open Windows:</span>
          <span className="font-mono font-bold text-slate-800">{openWindowsCount}</span>
          {activeWindowTitle && (
            <span className="text-slate-500 truncate max-w-[200px]">
              • Focused: <strong className="text-slate-700 font-medium">{activeWindowTitle}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Right system info */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-1.5">
          {salaryPrivacy ? (
            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
              <ShieldAlert className="w-3 h-3 text-emerald-600" />
              <span>Privacy Mask ON</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-slate-500 bg-slate-200/60 border border-slate-300 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3 h-3 text-slate-500" />
              <span>Privacy Off</span>
            </span>
          )}
        </div>

        <div className="h-3 w-px bg-slate-300 hidden md:block" />

        <div className="hidden lg:flex items-center gap-1.5 text-slate-600">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span>IndexedDB (v{dbVersion})</span>
        </div>

        <div className="h-3 w-px bg-slate-300 hidden lg:block" />

        <div className="hidden xl:flex items-center gap-2 text-slate-500">
          <Keyboard className="w-3.5 h-3.5 text-slate-400" />
          <span>Shortcuts: <kbd className="font-mono px-1 py-0.2 bg-white border border-slate-300 rounded text-slate-700 font-semibold text-[10px]">Ctrl+K</kbd> Search | <kbd className="font-mono px-1 py-0.2 bg-white border border-slate-300 rounded text-slate-700 font-semibold text-[10px]">Esc</kbd> Dismiss</span>
        </div>

        <div className="h-3 w-px bg-slate-300 hidden xl:block" />

        <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-slate-600">
          <CheckCircle className="w-3 h-3 text-blue-600" />
          <span>Persistent</span>
        </div>
      </div>
    </footer>
  );
};
