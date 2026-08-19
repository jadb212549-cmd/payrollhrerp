import React from 'react';
import { User, Shield, Sliders, Info, LogOut, CheckCircle, UserCog } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface UserMenuPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWindow: (menuItemId: string) => void;
}

export const UserMenuPopover: React.FC<UserMenuPopoverProps> = ({
  isOpen,
  onClose,
  onOpenWindow,
}) => {
  const { currentUser, logout } = useAuth();

  if (!isOpen) return null;

  const initials = currentUser?.displayName
    ? currentUser.displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'AD';

  return (
    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-100">
      <div className="p-3.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-900 truncate">
              {currentUser?.displayName || 'System Administrator'}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {currentUser?.email || 'admin@system.local'}
            </div>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[10px] text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-semibold">
          <span className="flex items-center gap-1">
            <UserCog className="w-3 h-3 text-blue-600" />
            <span>Role: {currentUser?.role || 'Super Admin'}</span>
          </span>
          <span className="text-emerald-700 font-bold">Active</span>
        </div>
      </div>

      <div className="p-1.5 text-xs">
        <button
          onClick={() => {
            onOpenWindow('users_roles');
            onClose();
          }}
          className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700 hover:text-blue-600 flex items-center gap-2.5 transition-colors"
        >
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium">Users & Access Control</span>
        </button>

        <button
          onClick={() => {
            onOpenWindow('backup_restore');
            onClose();
          }}
          className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700 hover:text-blue-600 flex items-center gap-2.5 transition-colors"
        >
          <Sliders className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium">Backup & Restore</span>
        </button>

        <button
          onClick={() => {
            onOpenWindow('audit_logs');
            onClose();
          }}
          className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700 hover:text-blue-600 flex items-center gap-2.5 transition-colors"
        >
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium">Immutable Audit Trail</span>
        </button>

        <button
          onClick={() => {
            onOpenWindow('about_system');
            onClose();
          }}
          className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700 hover:text-blue-600 flex items-center gap-2.5 transition-colors"
        >
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium">About Desktop ERP</span>
        </button>

        <div className="my-1 border-t border-slate-100" />

        <button
          onClick={() => {
            logout();
            onClose();
          }}
          className="w-full text-left px-3 py-2 rounded-md hover:bg-rose-50 text-rose-700 flex items-center gap-2.5 transition-colors font-medium"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-500" />
          <span>Logout ({currentUser?.username})</span>
        </button>
      </div>
    </div>
  );
};
