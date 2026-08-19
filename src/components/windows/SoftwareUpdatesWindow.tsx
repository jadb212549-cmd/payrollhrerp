/**
 * Software Updates & Release Management Window - Phase 11 Production Release
 */

import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Layers, 
  Upload, 
  ShieldCheck, 
  Radio, 
  Info,
  Clock,
  X,
  FileCode,
  Tag
} from 'lucide-react';
import { CURRENT_APP_VERSION, ReleaseChannel, ReleaseNote } from '../../config/version';
import { updateService, UpdateCheckResult, UpdateState } from '../../services/UpdateService';
import { useAuth } from '../../context/AuthContext';

export const SoftwareUpdatesWindow: React.FC = () => {
  const { currentUser } = useAuth();

  const [channel, setChannel] = useState<ReleaseChannel>('Stable');
  const [updateState, setUpdateState] = useState<UpdateState>('Idle');
  const [checkResult, setCheckResult] = useState<UpdateCheckResult | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);

  // Admin Publisher Modal
  const [showAdminPublisher, setShowAdminPublisher] = useState(false);
  const [pubVersion, setPubVersion] = useState('1.1.0');
  const [pubBuild, setPubBuild] = useState('110');
  const [pubTitle, setPubTitle] = useState('Enhanced Statutory Multi-Tier Rate Update');
  const [pubSummary, setPubSummary] = useState('Includes updated PhilHealth tiered contribution brackets and bug fixes.');
  const [pubFeatures, setPubFeatures] = useState('PhilHealth 2026 Tiered Matrix\nAutomated Statutory Remittance Generator');
  const [pubIsMandatory, setPubIsMandatory] = useState(false);

  const [publishedNotes, setPublishedNotes] = useState<ReleaseNote[]>([]);

  useEffect(() => {
    setPublishedNotes(updateService.getPublishedUpdates());
  }, []);

  const handleCheckUpdates = async () => {
    setUpdateState('Checking');
    const res = await updateService.checkForUpdates();
    setCheckResult(res);
    setUpdateState(res.hasUpdate ? 'Update Available' : 'Up to Date');
  };

  const handleExecuteUpdate = async () => {
    if (!checkResult?.latestVersion) return;
    setUpdateState('Downloading');
    setProgressPercent(10);

    const res = await updateService.executeUpdateWorkflow(checkResult.latestVersion, (st, pct) => {
      setUpdateState(st);
      setProgressPercent(pct);
    });

    if (res.success) {
      setTimeout(() => {
        alert('Update completed! The application will now reload to apply changes.');
        window.location.reload();
      }, 1000);
    } else {
      alert(`Update failed: ${res.error}`);
    }
  };

  const handlePublishNewRelease = (e: React.FormEvent) => {
    e.preventDefault();
    const newRelease: ReleaseNote = {
      version: pubVersion.trim(),
      buildNumber: parseInt(pubBuild, 10) || 101,
      date: new Date().toISOString().split('T')[0],
      channel,
      title: pubTitle.trim(),
      summary: pubSummary.trim(),
      newFeatures: pubFeatures.split('\n').filter((f) => f.trim().length > 0),
      improvements: ['Performance optimizations'],
      bugFixes: [],
      breakingChanges: [],
      requiredUpdate: pubIsMandatory,
    };

    const success = updateService.publishUpdate(newRelease);
    if (success) {
      alert(`Release v${pubVersion} published successfully on ${channel} channel!`);
      setShowAdminPublisher(false);
      setPublishedNotes(updateService.getPublishedUpdates());
    }
  };

  const isSuperAdmin = currentUser?.role === 'Super Admin';

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-[#f8fafc] text-slate-800 text-xs select-none">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-5 h-5 text-blue-600" />
            <div>
              <h1 className="text-sm font-bold text-slate-900">Software Updates & Release Channel Management</h1>
              <p className="text-[11px] text-slate-500">
                Managed software deployment pipeline with digital package verification and safety backup integration.
              </p>
            </div>
          </div>

          {isSuperAdmin && (
            <button
              onClick={() => setShowAdminPublisher(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Upload className="w-3.5 h-3.5" /> Publish New Release
            </button>
          )}
        </div>

        {/* Current Version Card */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Current Installed Software Version</span>
            </div>
            <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 font-mono font-bold rounded-full text-[10px]">
              {CURRENT_APP_VERSION.releaseChannel} Release
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">Version:</span>
              <strong className="text-slate-900">v{CURRENT_APP_VERSION.version}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Build Number:</span>
              <strong className="text-slate-900">#{CURRENT_APP_VERSION.buildNumber}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Release Date:</span>
              <strong className="text-slate-900">{CURRENT_APP_VERSION.releaseDate}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Target Architecture:</span>
              <strong className="text-slate-900">Tauri Windows Portable (.exe)</strong>
            </div>
          </div>

          {/* GitHub Workflow Banner */}
          <div className="p-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl space-y-2 border border-slate-700 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs">Tauri GitHub Workflow for Portable EXE</span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] rounded-full font-semibold">
                CI/CD Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Automated build pipeline configured at <code className="text-emerald-300 font-mono">.github/workflows/tauri-build.yml</code>. Compiles frontend assets and Rust native code into standalone portable Windows binaries on tag push or manual dispatch.
            </p>
            <div className="flex items-center gap-2 pt-1 font-mono text-[10px] text-slate-400">
              <Tag className="w-3 h-3 text-slate-400" />
              <span>Target: <strong className="text-slate-200">{CURRENT_APP_VERSION.tauriPortableTarget}</strong></span>
            </div>
          </div>

          {/* Release Channel Selector */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-blue-600" /> Update Channel:
            </span>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              {(['Stable', 'Beta', 'Development'] as ReleaseChannel[]).map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setChannel(c);
                    updateService.setChannel(c);
                  }}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors ${
                    channel === c ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Check Update Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleCheckUpdates}
              disabled={updateState === 'Checking' || updateState === 'Downloading'}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${updateState === 'Checking' ? 'animate-spin' : ''}`} />
              <span>{updateState === 'Checking' ? 'Checking Remote Servers...' : 'Check For Software Updates'}</span>
            </button>

            {checkResult?.hasUpdate && updateState === 'Update Available' && (
              <button
                onClick={handleExecuteUpdate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-xs animate-bounce"
              >
                <Download className="w-4 h-4" /> Install v{checkResult.latestVersion?.version} Now
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {(updateState === 'Downloading' || updateState === 'Installing') && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                <span>{updateState === 'Downloading' ? 'Downloading software package...' : 'Verifying package & installing...'}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Update Result Message */}
          {checkResult && (
            <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
              checkResult.hasUpdate ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              {checkResult.hasUpdate ? <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              <span>{checkResult.message}</span>
            </div>
          )}
        </div>

        {/* What Changed in This Release Section */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Software Release History & Change Logs</span>
          </h2>

          <div className="space-y-3">
            {publishedNotes.map((note) => (
              <div key={note.version} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 font-mono text-xs">v{note.version}</span>
                    <span className="text-slate-400 font-mono text-[11px]">({note.date})</span>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded">
                    {note.channel}
                  </span>
                </div>
                <p className="text-slate-600 font-medium">{note.title}</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">{note.summary}</p>

                {note.newFeatures.length > 0 && (
                  <div className="text-[11px]">
                    <strong className="text-emerald-700 block">New Features:</strong>
                    <ul className="list-disc list-inside text-slate-600 space-y-0.5 pl-1">
                      {note.newFeatures.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Admin Release Publisher Modal */}
      {showAdminPublisher && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" /> Authorized Admin Release Publisher
              </h3>
              <button onClick={() => setShowAdminPublisher(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePublishNewRelease} className="p-4 space-y-3 text-xs">
              <div>
                <label className="text-slate-600 font-medium block mb-1">Release Version & Build</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={pubVersion}
                    onChange={(e) => setPubVersion(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg font-mono outline-none"
                    placeholder="e.g. 1.1.0"
                  />
                  <input
                    type="text"
                    required
                    value={pubBuild}
                    onChange={(e) => setPubBuild(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg font-mono outline-none"
                    placeholder="Build e.g. 110"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Release Title</label>
                <input
                  type="text"
                  required
                  value={pubTitle}
                  onChange={(e) => setPubTitle(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">Summary</label>
                <textarea
                  rows={2}
                  value={pubSummary}
                  onChange={(e) => setPubSummary(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium block mb-1">New Features (1 per line)</label>
                <textarea
                  rows={2}
                  value={pubFeatures}
                  onChange={(e) => setPubFeatures(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pubMandatory"
                  checked={pubIsMandatory}
                  onChange={(e) => setPubIsMandatory(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <label htmlFor="pubMandatory" className="text-slate-700 font-semibold cursor-pointer">
                  Mark as Mandatory Update
                </label>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdminPublisher(false)}
                  className="px-3.5 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 text-white font-semibold rounded-lg shadow-xs"
                >
                  Publish Release
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
