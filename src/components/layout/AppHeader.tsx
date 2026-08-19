import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  Search, 
  Bell, 
  Layers,
  Sparkles,
  Check,
  PlusCircle,
  AlertCircle
} from 'lucide-react';
import { SystemNotification } from '../../types';
import { useCompanyContext } from '../../context/CompanyContext';
import { NotificationPopover } from '../modals/NotificationPopover';
import { UserMenuPopover } from '../modals/UserMenuPopover';

interface AppHeaderProps {
  salaryPrivacy: boolean;
  onToggleSalaryPrivacy: () => void;
  onOpenGlobalSearch: () => void;
  onOpenWindow: (menuItemId: string, metadata?: Record<string, unknown>) => void;
  notifications: SystemNotification[];
  onClearNotifications: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  salaryPrivacy,
  onToggleSalaryPrivacy,
  onOpenGlobalSearch,
  onOpenWindow,
  notifications,
  onClearNotifications,
}) => {
  const {
    currentCompany,
    isAllCompanies,
    activeCompanies,
    setCompany,
    setAllCompanies,
    seedDemoCompanies,
    dbVersion
  } = useCompanyContext();

  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const companyDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or Esc
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(e.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCompanyDropdownOpen(false);
        setIsNotificationsOpen(false);
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="h-10 bg-[#1e293b] text-white border-b border-slate-700/90 flex items-center justify-between px-4 select-none text-xs shrink-0 z-30 shadow-xs">
      {/* Left branding */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-6 h-6 rounded bg-blue-600/30 border border-blue-400/30 text-blue-300 font-bold shadow-xs">
          <Layers className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm tracking-tight text-white">
            Multi-Company Payroll Management System
          </span>
          <div className="h-4 w-px bg-slate-600 hidden sm:block" />
          <span className="bg-slate-700/80 text-slate-300 border border-slate-600 text-[10px] px-2 py-0.5 rounded font-mono font-medium hidden md:inline-block">
            Phase 2 • DB v{dbVersion}
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Company Selector (Connected to Real Database Context) */}
        <div className="relative" ref={companyDropdownRef}>
          {activeCompanies.length === 0 ? (
            <button
              onClick={() => {
                setIsCompanyDropdownOpen(!isCompanyDropdownOpen);
                setIsNotificationsOpen(false);
                setIsUserMenuOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded bg-amber-900/60 border border-amber-700/70 text-amber-200 hover:bg-amber-900/80 transition-colors text-xs font-semibold"
              title="No company is configured. Click to register your first business entity."
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>[ No Company Configured ]</span>
              <ChevronDown className="w-3 h-3 text-amber-300 ml-0.5" />
            </button>
          ) : (
            <button
              onClick={() => {
                setIsCompanyDropdownOpen(!isCompanyDropdownOpen);
                setIsNotificationsOpen(false);
                setIsUserMenuOpen(false);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white transition-colors text-xs font-medium ${
                isCompanyDropdownOpen ? 'bg-slate-600 ring-2 ring-blue-500/50' : ''
              }`}
              title="Switch active company or view aggregate mode"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-300" />
              <span className="text-slate-300 text-xs font-normal">Company:</span>
              <span className="font-semibold max-w-[150px] truncate text-white">
                {isAllCompanies ? 'All Companies' : currentCompany?.tradeName || currentCompany?.legalName || 'Select Company'}
              </span>
              {isAllCompanies ? (
                <span className="bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[9px] px-1.5 py-0.5 rounded font-mono">
                  AGGREGATE
                </span>
              ) : currentCompany?.companyCode ? (
                <span className="bg-blue-500/30 border border-blue-400/50 text-blue-200 text-[9px] px-1.5 py-0.5 rounded font-mono">
                  {currentCompany.companyCode}
                </span>
              ) : null}
              <ChevronDown className="w-3 h-3 text-slate-300 ml-0.5" />
            </button>
          )}

          {/* Company Selector Dropdown Menu */}
          {isCompanyDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-72 bg-white text-slate-800 border border-slate-200 rounded-xl shadow-xl z-50 p-2 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
                <span>Select Business Entity</span>
                <span className="font-mono text-slate-500">{activeCompanies.length} Active</span>
              </div>

              {activeCompanies.length === 0 ? (
                <div className="py-3 px-2 text-center space-y-2">
                  <p className="text-xs text-slate-500">No active companies found in database.</p>
                  <button
                    onClick={() => {
                      onOpenWindow('add_company');
                      setIsCompanyDropdownOpen(false);
                    }}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Register Company</span>
                  </button>
                  <button
                    onClick={async () => {
                      await seedDemoCompanies();
                      setIsCompanyDropdownOpen(false);
                    }}
                    className="w-full py-1 text-slate-600 hover:text-slate-800 text-[11px]"
                  >
                    Load Sample Companies (Dev)
                  </button>
                </div>
              ) : (
                <div className="py-1 space-y-0.5 max-h-60 overflow-y-auto">
                  {activeCompanies.map((company) => {
                    const isSelected = !isAllCompanies && currentCompany?.id === company.id;
                    return (
                      <button
                        key={company.id}
                        onClick={() => {
                          setCompany(company);
                          setIsCompanyDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white font-semibold shadow-xs'
                            : 'hover:bg-blue-50/70 text-slate-700'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs truncate font-medium">
                            {company.tradeName || company.legalName}
                          </div>
                          <div className={`text-[10.5px] font-mono ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                            Code: <strong>{company.companyCode}</strong>
                            {company.tin ? ` • ${company.tin}` : ''}
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* All Companies Aggregation Option */}
              {activeCompanies.length > 0 && (
                <div className="pt-1.5 space-y-1">
                  <button
                    onClick={() => {
                      setAllCompanies();
                      setIsCompanyDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors ${
                      isAllCompanies
                        ? 'bg-amber-600 text-white font-semibold'
                        : 'hover:bg-amber-50 text-amber-800'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-medium flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>All Companies</span>
                      </div>
                      <div className={`text-[10px] ${isAllCompanies ? 'text-amber-100' : 'text-slate-500'}`}>
                        Consolidated cross-entity reports
                      </div>
                    </div>
                    {isAllCompanies && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>

                  <button
                    onClick={() => {
                      onOpenWindow('add_company');
                      setIsCompanyDropdownOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 flex items-center gap-1.5 transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Add Another Company</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Salary Privacy Toggle */}
        <button
          onClick={onToggleSalaryPrivacy}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors text-xs ${
            salaryPrivacy
              ? 'bg-green-900/40 text-green-300 border border-green-700/60 hover:bg-green-900/60'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
          }`}
          title={salaryPrivacy ? 'Salary Privacy is ON (Rates are masked)' : 'Salary Privacy is OFF (Rates visible)'}
        >
          {salaryPrivacy ? (
            <EyeOff className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-slate-300" />
          )}
          <span className="text-xs">Privacy:</span>
          <span className={`font-bold text-[11px] uppercase ${salaryPrivacy ? 'text-green-300' : 'text-slate-300'}`}>
            {salaryPrivacy ? 'On' : 'Off'}
          </span>
        </button>

        {/* Global Search Button */}
        <button
          onClick={onOpenGlobalSearch}
          className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors text-xs"
          title="Search all modules (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-xs hidden sm:inline">Search</span>
          <kbd className="text-[9.5px] px-1 py-0.2 bg-slate-800 text-slate-300 rounded font-mono border border-slate-600">
            Ctrl+K
          </kbd>
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsCompanyDropdownOpen(false);
              setIsUserMenuOpen(false);
            }}
            className={`p-1.5 rounded transition-colors relative hover:bg-slate-700 text-slate-200 ${
              isNotificationsOpen ? 'bg-slate-700 text-white' : ''
            }`}
            title="System notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-slate-800" />
            )}
          </button>
          <NotificationPopover
            isOpen={isNotificationsOpen}
            onClose={() => setIsNotificationsOpen(false)}
            notifications={notifications}
            onClearAll={onClearNotifications}
          />
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => {
              setIsUserMenuOpen(!isUserMenuOpen);
              setIsCompanyDropdownOpen(false);
              setIsNotificationsOpen(false);
            }}
            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-700 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white text-[10px] shadow-xs">
              AD
            </div>
            <span className="font-medium text-xs text-slate-100 hidden md:inline">Admin User</span>
            <ChevronDown className="w-3 h-3 text-slate-400 opacity-60" />
          </button>
          <UserMenuPopover
            isOpen={isUserMenuOpen}
            onClose={() => setIsUserMenuOpen(false)}
            onOpenWindow={onOpenWindow}
          />
        </div>
      </div>
    </header>
  );
};
