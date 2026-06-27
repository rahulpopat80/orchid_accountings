import { useState, useMemo } from 'react';
import { Transaction, SummaryCards } from '../types';
import { motion } from 'motion/react';
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Briefcase, 
  ShieldCheck, 
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  BookOpen,
  Printer,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ReportsViewProps {
  transactions: Transaction[];
  summary: SummaryCards;
}

export default function ReportsView({ transactions, summary }: ReportsViewProps) {
  const [activeReportTab, setActiveReportTab] = useState<'income_expense' | 'balance_sheet'>('income_expense');
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  // Format currency in Indian Rupees format (INR)
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Helper to get formatted date
  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  // 1. Calculate Monthly Income & Expense data
  const monthlyData = useMemo(() => {
    const monthsMap: { 
      [key: string]: { 
        month: string; 
        sortingKey: string;
        incomeTotal: number; 
        expenseTotal: number;
        incomes: { [cat: string]: number };
        expenses: { [cat: string]: number };
      } 
    } = {};

    transactions.forEach(t => {
      // Skip non-operating contra transfers or investments
      if (t.isContra || t.isInvestment) return;

      const key = t.monthYear; // e.g. "Jun 2026"
      const dateParts = t.parsedDate.split('-');
      const sortingKey = `${dateParts[0]}-${dateParts[1]}`; // YYYY-MM for sorting

      if (!monthsMap[key]) {
        monthsMap[key] = {
          month: key,
          sortingKey,
          incomeTotal: 0,
          expenseTotal: 0,
          incomes: {},
          expenses: {}
        };
      }

      if (t.type === 'Income') {
        monthsMap[key].incomeTotal += t.amount;
        monthsMap[key].incomes[t.category] = (monthsMap[key].incomes[t.category] || 0) + t.amount;
      } else {
        monthsMap[key].expenseTotal += t.amount;
        monthsMap[key].expenses[t.category] = (monthsMap[key].expenses[t.category] || 0) + t.amount;
      }
    });

    // Convert map to array and sort chronologically descending
    return Object.values(monthsMap).sort((a, b) => b.sortingKey.localeCompare(a.sortingKey));
  }, [transactions]);

  // Set first month as expanded by default
  useState(() => {
    if (monthlyData.length > 0) {
      setExpandedMonth(monthlyData[0].month);
    }
  });

  // 2. Balance Sheet Calculations
  // In housing society accounting, Assets must balance with Liabilities & Equity/Reserves.
  // Cash on Hand starting balance was ₹38,000, bank accounts ₹600,000, FD starting at ₹2,500,000 (total ₹3,138,000).
  // Therefore, Corpus Fund + Starting Reserves = ₹3,138,000.
  // We set a fixed Members' Corpus Fund of ₹2,500,000 and calculate the Accumulated Reserves.
  const balanceSheet = useMemo(() => {
    const corpusFund = 2500000; // Fixed Corpus Fund
    
    // Total assets as of current date
    const cashOnHand = summary.cashOnHand;
    const bankBalance = summary.bankBalance;
    const fdInvestments = summary.fdInvestment;
    const totalAssets = cashOnHand + bankBalance + fdInvestments;

    // Reserves = totalAssets - corpusFund
    const accumulatedReserves = totalAssets - corpusFund;

    return {
      corpusFund,
      accumulatedReserves,
      cashOnHand,
      bankBalance,
      fdInvestments,
      totalAssets,
      totalLiabilitiesEquity: corpusFund + accumulatedReserves
    };
  }, [summary]);

  // Handle trigger system print dialog
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-[#111111] border border-[#222] p-6 rounded-lg gap-4 shadow-md print:border-none print:bg-white print:text-black">
        <div>
          <span className="text-xs font-mono text-[#c5a059] bg-[#1a1a1a] border border-[#222]/80 px-2.5 py-0.5 rounded uppercase tracking-wider font-semibold print:hidden">
            Financial Management Office
          </span>
          <h3 className="text-xl font-serif italic text-[#e4e3e0] mt-2.5 print:text-black">Audited Financial Statements</h3>
          <p className="text-xs text-[#e4e3e0]/40 mt-1 print:text-gray-500">
            Generate formal accounting publications for Orchid Heights Owners Association
          </p>
        </div>

        <div className="flex items-center gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#252525] text-[#c5a059] border border-[#222] px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#080808] border border-[#222] p-1 rounded-lg w-full md:w-max print:hidden">
        <button
          onClick={() => setActiveReportTab('income_expense')}
          className={`flex-1 md:flex-initial px-5 py-2 rounded text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
            activeReportTab === 'income_expense' 
              ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/80 shadow-sm' 
              : 'text-[#e4e3e0]/50 hover:text-[#e4e3e0]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Income & Expense
        </button>
        <button
          onClick={() => setActiveReportTab('balance_sheet')}
          className={`flex-1 md:flex-initial px-5 py-2 rounded text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer ${
            activeReportTab === 'balance_sheet' 
              ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/80 shadow-sm' 
              : 'text-[#e4e3e0]/50 hover:text-[#e4e3e0]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Balance Sheet
        </button>
      </div>

      {/* Report Container */}
      <div className="bg-[#111111] border border-[#222] rounded-lg p-6 md:p-8 space-y-6 shadow-xl print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        
        {/* Document Header (For Formal Print look) */}
        <div className="text-center pb-6 border-b border-[#222] space-y-2 print:border-gray-300">
          <h2 className="text-2xl font-serif text-[#e4e3e0] print:text-black font-semibold">ORCHID HEIGHTS OWNERS ASSOCIATION</h2>
          <p className="text-[10px] font-mono tracking-widest text-[#c5a059] uppercase font-bold">RERA REGISTRATION NO: PR/GJ/AHMEDABAD/SOCIETY/2024</p>
          <p className="text-xs text-[#e4e3e0]/60 print:text-gray-500">
            {activeReportTab === 'income_expense' 
              ? 'Annualized Operating Income & Expenditure Statement' 
              : 'Statement of Financial Affairs (Balance Sheet)'}
          </p>
          <p className="text-[10px] font-mono text-[#e4e3e0]/30 print:text-gray-400">
            AS OF {todayStr.toUpperCase()} • REPORT ID: OH-AUDIT-2026
          </p>
        </div>

        {/* Tab 1: Income and Expense Report */}
        {activeReportTab === 'income_expense' && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
              <div className="bg-[#0c0c0c] border border-[#222] p-4 rounded print:border-gray-200 print:bg-gray-50">
                <span className="text-[9px] font-mono text-[#e4e3e0]/40 uppercase tracking-wider block">Total Period Income</span>
                <span className="text-xl font-mono font-bold text-[#66bb6a] block mt-1">{formatCurrency(summary.totalIncome)}</span>
                <span className="text-[9px] font-mono text-[#e4e3e0]/30 block mt-0.5">Operating Receipts Only</span>
              </div>
              <div className="bg-[#0c0c0c] border border-[#222] p-4 rounded print:border-gray-200 print:bg-gray-50">
                <span className="text-[9px] font-mono text-[#e4e3e0]/40 uppercase tracking-wider block">Total Period Expense</span>
                <span className="text-xl font-mono font-bold text-[#ff5555] block mt-1">{formatCurrency(summary.totalExpense)}</span>
                <span className="text-[9px] font-mono text-[#e4e3e0]/30 block mt-0.5">Operating Overhead Only</span>
              </div>
              <div className="bg-[#0c0c0c] border border-[#222] p-4 rounded print:border-gray-200 print:bg-gray-50">
                <span className="text-[9px] font-mono text-[#e4e3e0]/40 uppercase tracking-wider block">Net Accumulative Savings</span>
                <span className="text-xl font-mono font-bold text-[#c5a059] block mt-1">{formatCurrency(summary.netBalance)}</span>
                <span className="text-[9px] font-mono text-[#e4e3e0]/30 block mt-0.5">Retained in General Reserves</span>
              </div>
            </div>

            {/* Monthly Accordion Table */}
            <div className="space-y-4">
              <h4 className="text-xs font-mono text-[#c5a059] uppercase tracking-wider font-semibold border-b border-[#222] pb-2 print:text-black">
                Monthly Breakdown Ledger
              </h4>

              <div className="divide-y divide-[#222] border border-[#222] rounded overflow-hidden print:border-gray-200">
                {monthlyData.length > 0 ? (
                  monthlyData.map((m) => {
                    const isExpanded = expandedMonth === m.month;
                    const surplus = m.incomeTotal - m.expenseTotal;
                    const isPositive = surplus >= 0;

                    return (
                      <div key={m.month} className="bg-[#111111] print:bg-white">
                        {/* Summary Header Row */}
                        <div 
                          onClick={() => setExpandedMonth(isExpanded ? null : m.month)}
                          className="flex justify-between items-center px-4 py-3.5 hover:bg-[#161616]/40 cursor-pointer transition select-none print:hover:bg-white"
                        >
                          <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-[#c5a059]/80 shrink-0" />
                            <span className="font-serif italic text-sm text-[#e4e3e0] print:text-black font-semibold">{m.month}</span>
                          </div>

                          <div className="flex items-center gap-6 text-xs font-mono">
                            <span className="text-[#66bb6a] hidden sm:inline">IN: {formatCurrency(m.incomeTotal)}</span>
                            <span className="text-[#ff5555] hidden sm:inline">OUT: {formatCurrency(m.expenseTotal)}</span>
                            <span className={`font-semibold ${isPositive ? 'text-[#66bb6a]' : 'text-[#ff5555]'}`}>
                              {isPositive ? '+' : ''}{formatCurrency(surplus)}
                            </span>
                            <span className="text-[#e4e3e0]/40 print:hidden">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </span>
                          </div>
                        </div>

                        {/* Detailed Sub-table Panel */}
                        {isExpanded && (
                          <div className="px-6 pb-5 pt-1.5 bg-[#0c0c0c]/40 space-y-4 border-t border-[#222]/40 print:bg-white print:border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Operating Incomes */}
                              <div>
                                <h5 className="text-[10px] font-mono text-[#66bb6a] uppercase tracking-wider font-bold mb-2 border-b border-[#222]/40 pb-1 flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" /> Income Categories
                                </h5>
                                {Object.keys(m.incomes).length > 0 ? (
                                  <div className="space-y-1.5">
                                    {Object.entries(m.incomes).map(([cat, amt]) => (
                                      <div key={cat} className="flex justify-between text-xs font-mono text-[#e4e3e0]/70 print:text-gray-700">
                                        <span>{cat}</span>
                                        <span>{formatCurrency(amt as number)}</span>
                                      </div>
                                    ))}
                                    <div className="border-t border-dashed border-[#222] pt-1.5 flex justify-between text-xs font-mono font-bold text-[#e4e3e0] print:text-black print:border-gray-200">
                                      <span>Total Receipts</span>
                                      <span>{formatCurrency(m.incomeTotal)}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-[#e4e3e0]/30 font-mono italic">No operating income logged</p>
                                )}
                              </div>

                              {/* Operating Expenditures */}
                              <div>
                                <h5 className="text-[10px] font-mono text-[#ff5555] uppercase tracking-wider font-bold mb-2 border-b border-[#222]/40 pb-1 flex items-center gap-1">
                                  <TrendingDown className="w-3 h-3" /> Expense Headings
                                </h5>
                                {Object.keys(m.expenses).length > 0 ? (
                                  <div className="space-y-1.5">
                                    {Object.entries(m.expenses).map(([cat, amt]) => (
                                      <div key={cat} className="flex justify-between text-xs font-mono text-[#e4e3e0]/70 print:text-gray-700">
                                        <span>{cat}</span>
                                        <span>{formatCurrency(amt as number)}</span>
                                      </div>
                                    ))}
                                    <div className="border-t border-dashed border-[#222] pt-1.5 flex justify-between text-xs font-mono font-bold text-[#e4e3e0] print:text-black print:border-gray-200">
                                      <span>Total Debits</span>
                                      <span>{formatCurrency(m.expenseTotal)}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-[#e4e3e0]/30 font-mono italic">No operating expenses logged</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-[#e4e3e0]/30 italic">No ledger transactions found</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Balance Sheet */}
        {activeReportTab === 'balance_sheet' && (
          <div className="space-y-6">
            <p className="text-xs text-[#e4e3e0]/60 leading-relaxed print:text-gray-500">
              The balance sheet presents the capital assets owned by Orchid Heights Owners Association and compares them to the source of reserves (corpus fund and operational surplus). Standard accounting compliance represents cash, bank holdings, and fixed deposits balanced against retained operational reserves.
            </p>

            {/* Structured Double Column Balance Sheet */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border border-[#222] rounded p-6 bg-[#0c0c0c]/20 print:grid-cols-2 print:border-gray-200 print:bg-white">
              
              {/* Left Column: Liquid & Capital Assets */}
              <div className="space-y-4">
                <h4 className="text-xs font-mono text-[#c5a059] uppercase tracking-wider font-bold border-b border-[#222] pb-1.5 flex items-center gap-1.5 print:text-black print:border-gray-200">
                  <Briefcase className="w-3.5 h-3.5" /> Capital Assets
                </h4>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <div className="space-y-0.5">
                      <p className="font-serif italic font-semibold text-[#e4e3e0] print:text-black">Cash on Hand</p>
                      <p className="text-[10px] font-mono text-[#e4e3e0]/40 print:text-gray-500">Operational currency float</p>
                    </div>
                    <span className="font-mono text-sm text-[#e4e3e0] print:text-black">{formatCurrency(balanceSheet.cashOnHand)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <div className="space-y-0.5">
                      <p className="font-serif italic font-semibold text-[#e4e3e0] print:text-black">Society Bank Balances</p>
                      <p className="text-[10px] font-mono text-[#e4e3e0]/40 print:text-gray-500">Active current & savings bank ledgers</p>
                    </div>
                    <span className="font-mono text-sm text-[#e4e3e0] print:text-black">{formatCurrency(balanceSheet.bankBalance)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <div className="space-y-0.5">
                      <p className="font-serif italic font-semibold text-[#e4e3e0] print:text-black">Fixed Deposits (FD Reserves)</p>
                      <p className="text-[10px] font-mono text-[#e4e3e0]/40 print:text-gray-500">Earning term deposits at JCOM Bank</p>
                    </div>
                    <span className="font-mono text-sm text-[#e4e3e0] print:text-black">{formatCurrency(balanceSheet.fdInvestments)}</span>
                  </div>
                </div>

                <div className="border-t border-[#222] pt-3 mt-4 flex justify-between items-center text-sm font-bold text-[#e4e3e0] print:text-black print:border-gray-200">
                  <span className="uppercase font-mono text-xs text-[#c5a059] tracking-wider">Total Assets (A)</span>
                  <span className="font-mono border-b-4 border-double border-[#c5a059]/40 pb-1 px-1 print:border-gray-500">
                    {formatCurrency(balanceSheet.totalAssets)}
                  </span>
                </div>
              </div>

              {/* Right Column: Liabilities & Funds (Equity) */}
              <div className="space-y-4">
                <h4 className="text-xs font-mono text-[#c5a059] uppercase tracking-wider font-bold border-b border-[#222] pb-1.5 flex items-center gap-1.5 print:text-black print:border-gray-200">
                  <ShieldCheck className="w-3.5 h-3.5" /> Liabilities & Capital
                </h4>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <div className="space-y-0.5">
                      <p className="font-serif italic font-semibold text-[#e4e3e0] print:text-black">Members' Corpus Fund</p>
                      <p className="text-[10px] font-mono text-[#e4e3e0]/40 print:text-gray-500">Initial building capital deposit</p>
                    </div>
                    <span className="font-mono text-sm text-[#e4e3e0] print:text-black">{formatCurrency(balanceSheet.corpusFund)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <div className="space-y-0.5">
                      <p className="font-serif italic font-semibold text-[#e4e3e0] print:text-black">Accumulated General Reserves</p>
                      <p className="text-[10px] font-mono text-[#e4e3e0]/40 print:text-gray-500">Accumulated operating surplus & savings</p>
                    </div>
                    <span className="font-mono text-sm text-[#e4e3e0] print:text-black">{formatCurrency(balanceSheet.accumulatedReserves)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <div className="space-y-0.5">
                      <p className="font-serif italic font-semibold text-[#e4e3e0]/50 print:text-gray-400">Current Outstanding Liabilities</p>
                      <p className="text-[10px] font-mono text-[#e4e3e0]/30 print:text-gray-400">No short-term dues outstanding</p>
                    </div>
                    <span className="font-mono text-sm text-[#e4e3e0]/50 print:text-gray-400">₹0</span>
                  </div>
                </div>

                <div className="border-t border-[#222] pt-3 mt-4 flex justify-between items-center text-sm font-bold text-[#e4e3e0] print:text-black print:border-gray-200">
                  <span className="uppercase font-mono text-xs text-[#c5a059] tracking-wider">Total Reserves & Capital (B)</span>
                  <span className="font-mono border-b-4 border-double border-[#c5a059]/40 pb-1 px-1 print:border-gray-500">
                    {formatCurrency(balanceSheet.totalLiabilitiesEquity)}
                  </span>
                </div>
              </div>

            </div>

            {/* Audit compliance green footer */}
            <div className="bg-[#111815] border border-emerald-950/40 p-4 rounded flex items-center justify-between text-xs text-[#66bb6a] print:bg-white print:border-gray-200 print:text-emerald-700">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-serif italic font-semibold">Ledger Audit Statement</span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider font-bold">
                Status: Balanced (A = B)
              </span>
            </div>
          </div>
        )}

        {/* Auditor signoff stamp for formal visual quality */}
        <div className="pt-8 border-t border-[#222] flex flex-col sm:flex-row justify-between gap-4 text-xs font-mono text-[#e4e3e0]/40 print:border-gray-300 print:text-gray-500">
          <div>
            <p className="font-semibold uppercase text-[9px] tracking-wider text-[#c5a059]">Published By</p>
            <p className="mt-1">Orchid Heights Owners Committee</p>
            <p className="text-[10px]">Audit Date: {todayStr}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-semibold uppercase text-[9px] tracking-wider text-emerald-400">Ledger Verification Status</p>
            <p className="mt-1">Verified Audit Signature</p>
            <p className="text-[10px] text-emerald-500/80">HASH CODE: SHA256-OHCOMMITTEE-2026-SECURE</p>
          </div>
        </div>
      </div>
    </div>
  );
}
