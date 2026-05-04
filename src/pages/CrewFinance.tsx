import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCrewAuth } from '@/contexts/CrewAuthContext';
import { Wallet, Banknote, History, PiggyBank, Receipt, CreditCard } from 'lucide-react';

import CrewLogin from './CrewLogin';

export default function CrewFinance() {
  const { crewMember, isAuthenticated } = useCrewAuth();

  if (!isAuthenticated) {
    return <CrewLogin />;
  }

  // Mock Data
  const currentSalary = 32000; // Base + Commission
  const advancedTaken = 5000;
  const loanBalance = 12000;
  
  const transactions = [
    { type: 'Advance', amount: 5000, date: '2026-05-01', status: 'Approved' },
    { type: 'Loan Deduction', amount: 2000, date: '2026-04-30', status: 'Deducted' },
    { type: 'Salary Paid', amount: 45000, date: '2026-04-28', status: 'Paid' },
  ];

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-6 bg-emerald-600 rounded-full" />
        <h1 className="text-2xl font-bold text-slate-800">My Financials</h1>
      </div>

      <Card className="bg-slate-900 border-0 text-white shadow-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium text-slate-300 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            Estimated Net Pay
          </CardTitle>
          <div className="mt-2">
            <span className="text-4xl font-black text-white">Rs. {(currentSalary - advancedTaken).toLocaleString()}</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">For the current month (May 2026)</p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-red-50 rounded-full text-red-500">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Advances</p>
              <p className="text-lg font-bold text-slate-800">Rs. {advancedTaken.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-full text-blue-500">
              <PiggyBank className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Loan Balance</p>
              <p className="text-lg font-bold text-slate-800">Rs. {loanBalance.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <History className="w-5 h-5 text-slate-400" />
          Recent Transactions
        </h3>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {transactions.map((tx, idx) => (
            <div key={idx} className="p-4 flex items-center justify-between border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  tx.type === 'Salary Paid' ? 'bg-emerald-100 text-emerald-600' :
                  tx.type === 'Advance' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                }`}>
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{tx.type}</p>
                  <p className="text-xs text-slate-500">{tx.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold text-sm ${
                  tx.type === 'Salary Paid' ? 'text-emerald-600' : 'text-slate-700'
                }`}>
                  {tx.type === 'Salary Paid' ? '+' : '-'} Rs. {tx.amount.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{tx.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
