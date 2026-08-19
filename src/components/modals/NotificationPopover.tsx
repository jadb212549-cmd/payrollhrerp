import React from 'react';
import { Bell, CheckCircle2, AlertTriangle, Info, Trash2, X } from 'lucide-react';
import { SystemNotification } from '../../types';

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: SystemNotification[];
  onClearAll: () => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  isOpen,
  onClose,
  notifications,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-100">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-xs tracking-wide uppercase text-slate-700">Notifications</span>
          {notifications.length > 0 && (
            <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {notifications.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {notifications.length > 0 && (
            <button
              onClick={onClearAll}
              title="Clear all notifications"
              className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded transition-colors text-xs flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[11px]">Clear</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="py-8 px-4 text-center">
            <Bell className="w-7 h-7 text-slate-300 mx-auto mb-2 opacity-50" />
            <p className="text-xs text-slate-600 font-medium">No new notifications.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">You're all caught up with payroll events.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="p-3 hover:bg-blue-50/50 transition-colors text-left">
              <div className="flex items-start gap-2.5">
                {n.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                {n.type === 'info' && <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-800 truncate">{n.title}</h4>
                    <span className="text-[10px] text-slate-400 shrink-0">{n.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
        <span className="text-[10px] text-slate-400 font-medium">Desktop ERP System Alert Engine</span>
      </div>
    </div>
  );
};
