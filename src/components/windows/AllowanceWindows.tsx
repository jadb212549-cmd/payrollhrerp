import React, { useState } from 'react';
import { 
  Coins, 
  Plus
} from 'lucide-react';

export const AllowanceListWindow: React.FC = () => {
  const [filterType, setFilterType] = useState('ALL');

  const allowances = [
    { name: 'Rice & Meal Subsidy', type: 'Fixed Monthly', taxability: 'Non-Taxable (De Minimis)', amount: 2000, frequency: 'Semi-Monthly', recipients: 142 },
    { name: 'Transportation Allowance', type: 'Daily Based', taxability: 'Non-Taxable', amount: 150, frequency: 'Per Attendance Day', recipients: 65 },
    { name: 'Communications / Mobile Allowance', type: 'Fixed Monthly', taxability: 'Taxable Component', amount: 1500, frequency: 'Semi-Monthly', recipients: 28 },
    { name: 'Hazard & Night Shift Stipend', type: 'Cutoff Allowance', taxability: 'Taxable Component', amount: 3000, frequency: 'Per Cutoff Schedule', recipients: 45 },
    { name: 'Laundry Allowance', type: 'Fixed Monthly', taxability: 'Non-Taxable (De Minimis)', amount: 400, frequency: 'Semi-Monthly', recipients: 142 },
    { name: 'Medical / Medicine Allowance', type: 'Fixed Monthly', taxability: 'Non-Taxable (De Minimis)', amount: 1000, frequency: 'Monthly', recipients: 142 },
  ];

  const filtered = filterType === 'ALL'
    ? allowances
    : filterType === 'TAXABLE'
    ? allowances.filter((a) => a.taxability.includes('Taxable Component'))
    : allowances.filter((a) => a.taxability.includes('Non-Taxable'));

  return (
    <div className="flex-1 flex flex-col h-full bg-white text-slate-700">
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Allowances & Benefit Grants</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="ml-3 px-2.5 py-1 bg-white border border-slate-300 rounded-md text-xs text-slate-800 focus:border-blue-500 outline-hidden"
          >
            <option value="ALL">All Allowance Types</option>
            <option value="NON_TAXABLE">Non-Taxable / De Minimis Only</option>
            <option value="TAXABLE">Taxable Grants Only</option>
          </select>
        </div>
        <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors">
          <Plus className="w-3.5 h-3.5" /> + Configure Allowance
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10">
              <th className="py-2.5 px-3">Allowance Name</th>
              <th className="py-2.5 px-3">Grant Type</th>
              <th className="py-2.5 px-3">Tax Treatment</th>
              <th className="py-2.5 px-3 text-right">Amount / Grant</th>
              <th className="py-2.5 px-3">Frequency</th>
              <th className="py-2.5 px-3 text-center">Assigned Employees</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filtered.map((a, i) => (
              <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                <td className="py-2.5 px-3 font-semibold text-slate-900">{a.name}</td>
                <td className="py-2.5 px-3 text-slate-700">{a.type}</td>
                <td className="py-2.5 px-3">
                  {a.taxability.includes('Non-Taxable') ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      {a.taxability}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                      {a.taxability}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">₱{a.amount.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-slate-600">{a.frequency}</td>
                <td className="py-2.5 px-3 text-center font-mono text-slate-800 font-bold">{a.recipients} Staff</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
