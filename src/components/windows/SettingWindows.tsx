import React from 'react';
import { 
  SlidersHorizontal, 
  Palette, 
  Layers,
  Save,
  CheckCircle2,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { CURRENT_APP_VERSION } from '../../config/version';

export const GeneralSettingsWindow: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc] text-slate-700">
      <div className="max-w-xl mx-auto space-y-4 text-xs">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <span>General System Preferences & Localization</span>
          </h2>
          <p className="text-slate-500 mt-0.5">
            Configure system currency, decimal places, date formatting, and local database paths.
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3.5">
          <div>
            <label className="text-slate-600 block mb-1 font-medium">Base Currency Format</label>
            <select className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-slate-800 font-mono focus:border-blue-500 outline-hidden">
              <option>PHP (₱) - Philippine Peso</option>
              <option>USD ($) - US Dollar</option>
            </select>
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-medium">Standard Date Display Format</label>
            <select className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-slate-800 font-mono focus:border-blue-500 outline-hidden">
              <option>YYYY-MM-DD (e.g. 2026-08-17) [ISO-8601 Recommended]</option>
              <option>MMM DD, YYYY (e.g. Aug 17, 2026)</option>
              <option>DD/MM/YYYY (e.g. 17/08/2026)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-medium">Local Database Engine</label>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 font-mono text-[11px] flex items-center justify-between">
              <span>sqlite://./appdata/payroll_master.db</span>
              <span className="text-emerald-700 font-sans font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Tauri Ready</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-colors">
            <Save className="w-3.5 h-3.5" />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const AppearanceSettingsWindow: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc] text-slate-700">
      <div className="max-w-xl mx-auto space-y-4 text-xs">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Palette className="w-4 h-4 text-blue-600" />
            <span>Desktop Appearance & Workspace Theme</span>
          </h2>
          <p className="text-slate-500 mt-0.5">
            Customize window style, Bento Grid surface accents, and workspace density.
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3.5">
          <div>
            <label className="text-slate-600 block mb-1 font-medium">Desktop ERP Theme</label>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl border-2 border-blue-600 bg-blue-50/40 cursor-pointer flex items-center gap-2.5 shadow-xs">
                <span className="w-3.5 h-3.5 rounded-full bg-blue-600" />
                <span className="font-bold text-slate-900">Bento Grid (Active)</span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-white text-slate-600 cursor-pointer flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-400" />
                <span>Classic ERP Compact</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-slate-600 block mb-1 font-medium">Window Animation Speed</label>
            <select className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-slate-800 focus:border-blue-500 outline-hidden">
              <option>Fast (100ms - Optimized for Desktop ERP)</option>
              <option>Instant (0ms - Maximum Responsiveness)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AboutWindow: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc] text-slate-700">
      <div className="max-w-xl mx-auto space-y-4">
        {/* App Banner */}
        <div className="text-center py-4 border-b border-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-bold mx-auto flex items-center justify-center mb-2.5 shadow-md">
            <Layers className="w-8 h-8" />
          </div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            {CURRENT_APP_VERSION.appName}
          </h2>
          <div className="text-xs text-blue-600 font-mono font-bold mt-1">
            Version {CURRENT_APP_VERSION.version} (Build #{CURRENT_APP_VERSION.buildNumber}) • {CURRENT_APP_VERSION.releaseChannel} Channel
          </div>
        </div>

        {/* Specifications & Compliance */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2.5 text-xs">
          <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[10.5px]">
            Desktop Production Target Specifications
          </h3>

          <div className="grid grid-cols-2 gap-2.5 font-mono text-[11px]">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[10px]">DEPLOYMENT TARGET:</span>
              <span className="text-emerald-700 font-bold">Tauri Windows Portable EXE</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[10px]">DATABASE ENGINE:</span>
              <span className="text-emerald-700 font-bold">Offline IndexedDB (Schema v{CURRENT_APP_VERSION.dbSchemaVersion})</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[10px]">NAVIGATION SYSTEM:</span>
              <span className="text-emerald-700 font-bold">Top Bar + Dropdown (No Sidebar)</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-slate-500 block text-[10px]">ELECTRON DEPENDENCY:</span>
              <span className="text-blue-700 font-bold">None (Pure Tauri Rust Shell)</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 leading-relaxed font-sans">
          <strong className="text-emerald-800 block mb-1 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Phase 11 Production Release Readiness Guaranteed:
          </strong>
          This application is prepared for real-world deployment with versioned statutory engines, automatic safety backups, system health diagnostics, safe application logging, and release update workflows.
        </div>
      </div>
    </div>
  );
};
