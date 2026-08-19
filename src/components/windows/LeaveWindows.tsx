import React from 'react';
import { 
  CalendarOff, 
  Scale, 
  Plus 
} from 'lucide-react';

export const LeaveRequestsWindow: React.FC = () => {
  const requests = [
    { emp: 'Castillo, Patricia', type: 'Maternity Leave', from: '2026-08-01', to: '2026-11-15', days: 105, status: 'Approved' },
    { emp: 'Dela Cruz, Andres', type: 'Vacation Leave', from: '2026-08-10', to: '2026-08-11', days: 2, status: 'Approved' },
    { emp: 'Villanueva, Kristine', type: 'Sick Leave', from: '2026-08-14', to: '2026-08-14', days: 1, status: 'Approved' },
    { emp: 'Gonzales, Beatrice', type: 'Emergency Leave', from: '2026-08-18', to: '2026-08-19', days: 2, status: 'Pending Manager' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white text-slate-700">
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <CalendarOff className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Filed Leave Applications</span>
        </div>
        <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors">
          <Plus className="w-3.5 h-3.5" /> + File Leave
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10">
              <th className="py-2.5 px-3">Employee Name</th>
              <th className="py-2.5 px-3">Leave Type</th>
              <th className="py-2.5 px-3">From Date</th>
              <th className="py-2.5 px-3">To Date</th>
              <th className="py-2.5 px-3 text-center">Total Days</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {requests.map((r, i) => (
              <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                <td className="py-2.5 px-3 font-semibold text-slate-900">{r.emp}</td>
                <td className="py-2.5 px-3 text-blue-700 font-semibold">{r.type}</td>
                <td className="py-2.5 px-3 font-mono text-slate-600">{r.from}</td>
                <td className="py-2.5 px-3 font-mono text-slate-600">{r.to}</td>
                <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">{r.days}</td>
                <td className="py-2.5 px-3 text-center">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      r.status === 'Approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const LeaveBalancesWindow: React.FC = () => {
  const balances = [
    { emp: 'Santos, Maria Clara', vlAllot: 15, vlUsed: 2, vlBal: 13, slAllot: 15, slUsed: 1, slBal: 14, silBal: 5 },
    { emp: 'Reyes, Juan Carlos', vlAllot: 15, vlUsed: 5, vlBal: 10, slAllot: 15, slUsed: 0, slBal: 15, silBal: 5 },
    { emp: 'Dela Cruz, Andres', vlAllot: 15, vlUsed: 4, vlBal: 11, slAllot: 15, slUsed: 3, slBal: 12, silBal: 5 },
    { emp: 'Mendoza, Gabriel', vlAllot: 15, vlUsed: 1, vlBal: 14, slAllot: 15, slUsed: 0, slBal: 15, silBal: 5 },
  ];

  return (
    <div className="flex-1 overflow-auto p-5 bg-[#f8fafc] text-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <Scale className="w-4 h-4 text-blue-600" />
          <span>Annual Leave Balances & Accruals</span>
        </h3>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
              <th className="py-2.5 px-3">Employee</th>
              <th className="py-2.5 px-3 text-center">VL Used</th>
              <th className="py-2.5 px-3 text-center font-bold text-emerald-700">VL Balance</th>
              <th className="py-2.5 px-3 text-center">SL Used</th>
              <th className="py-2.5 px-3 text-center font-bold text-emerald-700">SL Balance</th>
              <th className="py-2.5 px-3 text-center">SIL Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono">
            {balances.map((b, i) => (
              <tr key={i} className="hover:bg-blue-50/50">
                <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">{b.emp}</td>
                <td className="py-2.5 px-3 text-center text-slate-600">{b.vlUsed}</td>
                <td className="py-2.5 px-3 text-center font-bold text-emerald-700 bg-emerald-50/40">{b.vlBal} days</td>
                <td className="py-2.5 px-3 text-center text-slate-600">{b.slUsed}</td>
                <td className="py-2.5 px-3 text-center font-bold text-emerald-700 bg-emerald-50/40">{b.slBal} days</td>
                <td className="py-2.5 px-3 text-center text-slate-700">{b.silBal} days</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
