import React from 'react';
import { 
  CreditCard, 
  CalendarCheck2, 
  Plus
} from 'lucide-react';

export const LoanListWindow: React.FC = () => {
  const loans = [
    { emp: 'Santos, Maria Clara', type: 'SSS Salary Loan', principal: 30000, monthly: 1500, balance: 18000, term: '24 Mos', status: 'Active' },
    { emp: 'Reyes, Juan Carlos', type: 'Pag-IBIG Multi-Purpose', principal: 25000, monthly: 1100, balance: 12400, term: '24 Mos', status: 'Active' },
    { emp: 'Dela Cruz, Andres', type: 'Company Emergency Loan', principal: 10000, monthly: 1000, balance: 4000, term: '10 Mos', status: 'Active' },
    { emp: 'Aquino, Eduardo', type: 'Company Cash Advance', principal: 5000, monthly: 2500, balance: 2500, term: '2 Mos', status: 'Active' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white text-slate-700">
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Active Employee Loans & Advances</span>
        </div>
        <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors">
          <Plus className="w-3.5 h-3.5" /> + New Loan Entry
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10">
              <th className="py-2.5 px-3">Employee</th>
              <th className="py-2.5 px-3">Loan Type</th>
              <th className="py-2.5 px-3 text-right">Principal</th>
              <th className="py-2.5 px-3 text-right">Cutoff Amortization</th>
              <th className="py-2.5 px-3 text-right font-bold text-amber-700">Remaining Balance</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono bg-white">
            {loans.map((l, i) => (
              <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">{l.emp}</td>
                <td className="py-2.5 px-3 font-sans text-blue-700 font-medium">{l.type}</td>
                <td className="py-2.5 px-3 text-right text-slate-700">₱{l.principal.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-right text-slate-700">₱{l.monthly.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-right font-bold text-amber-700">₱{l.balance.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-center font-sans">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    {l.status}
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

export const LoanAmortizationWindow: React.FC = () => {
  const schedule = [
    { period: '2026-08-15', installment: 13, deduction: 750, balance: 18000, status: 'Pending Deduction' },
    { period: '2026-08-31', installment: 14, deduction: 750, balance: 17250, status: 'Scheduled' },
    { period: '2026-09-15', installment: 15, deduction: 750, balance: 16500, status: 'Scheduled' },
    { period: '2026-09-30', installment: 16, deduction: 750, balance: 15750, status: 'Scheduled' },
  ];

  return (
    <div className="flex-1 overflow-auto p-5 bg-[#f8fafc] text-slate-700">
      <div className="mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          <CalendarCheck2 className="w-4 h-4 text-blue-600" />
          <span>Amortization Schedule: SSS Salary Loan (Santos, Maria Clara)</span>
        </h3>
        <p className="text-[11px] text-slate-500 mt-0.5">Loan Reference: SSS-SL-90812 • Total Terms: 24 Cut-offs</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-sans font-bold">
              <th className="py-2.5 px-3">Cut-off Period</th>
              <th className="py-2.5 px-3 text-center">Installment #</th>
              <th className="py-2.5 px-3 text-right">Deduction Amount</th>
              <th className="py-2.5 px-3 text-right">Ending Principal</th>
              <th className="py-2.5 px-3 text-center font-sans">Deduction Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {schedule.map((s, i) => (
              <tr key={i} className="hover:bg-blue-50/50">
                <td className="py-2.5 px-3 text-slate-700">{s.period}</td>
                <td className="py-2.5 px-3 text-center text-slate-500">{s.installment} of 24</td>
                <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">₱{s.deduction.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-right text-slate-800 font-bold">₱{s.balance.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-center font-sans">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                    {s.status}
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
