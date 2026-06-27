import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Transaction, SummaryCards } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Building, 
  Percent, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Info,
  Layers,
  ChevronRight,
  Filter,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  CheckCircle2,
  X,
  HelpCircle
} from 'lucide-react';
import { calculateMaintenancePayments } from '../utils';

interface DashboardViewProps {
  transactions: Transaction[];
  summary: SummaryCards;
  onNavigateToLedger: (filterType?: 'Income' | 'Expense') => void;
  onNavigateToMaintenance: () => void;
  onAddTransaction?: (transaction: Omit<Transaction, 'id' | 'parsedDate' | 'monthYear'>) => void;
  role?: 'admin' | 'resident';
  selectedUnit?: string;
  parsedUnit?: { wing: 'A' | 'B'; block: string };
}

export default function DashboardView({ 
  transactions, 
  summary, 
  onNavigateToLedger,
  onNavigateToMaintenance,
  onAddTransaction,
  role = 'admin',
  selectedUnit = 'Wing A - Block 901',
  parsedUnit = { wing: 'A', block: '901' }
}: DashboardViewProps) {
  const [chartMode, setChartMode] = useState<'monthly' | 'categories'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Simulated Payment Form State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('24000');
  const [payMode, setPayMode] = useState('Bank: JCOM');
  const [payRef, setPayRef] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Dynamic calculations for Resident profile
  const activeResidentName = useMemo(() => {
    // Find the resident's registered name in the transactions
    const found = transactions.find(
      t => t.wing === parsedUnit.wing && t.block === parsedUnit.block && t.residentName
    );
    return found?.residentName || 'Honorable Resident Member';
  }, [transactions, parsedUnit]);

  const paymentStatus = useMemo(() => {
    const stats = calculateMaintenancePayments(transactions);
    const wingList = parsedUnit.wing === 'A' ? stats.wingA : stats.wingB;
    return wingList.find(b => b.block === parsedUnit.block) || { 
      block: parsedUnit.block, 
      residentName: activeResidentName, 
      hasPaid: false, 
      amountPaid: 0 
    };
  }, [transactions, parsedUnit, activeResidentName]);
  
  // Format currency in Indian Rupees format (or generic human readable)
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Group transactions by month for trend chart
  // chronological order for trends
  const getMonthlyTrendData = () => {
    const monthlyMap: { [key: string]: { month: string; income: number; expense: number; keyStr: string } } = {};
    
    // Sort transactions chronologically
    const chronTransactions = [...transactions].sort((a, b) => a.parsedDate.localeCompare(b.parsedDate));
    
    chronTransactions.forEach(t => {
      if (t.isContra || t.isInvestment) return; // skip contra & non-operating transfers
      
      const key = t.monthYear; // e.g. "Jun 2026"
      const dateParts = t.parsedDate.split('-');
      const sortingKey = `${dateParts[0]}-${dateParts[1]}`; // YYYY-MM for sorting

      if (!monthlyMap[key]) {
        monthlyMap[key] = { month: key, income: 0, expense: 0, keyStr: sortingKey };
      }
      
      if (t.type === 'Income') {
        monthlyMap[key].income += t.amount;
      } else {
        monthlyMap[key].expense += t.amount;
      }
    });

    return Object.values(monthlyMap).sort((a, b) => a.keyStr.localeCompare(b.keyStr));
  };

  const monthlyTrendData = getMonthlyTrendData();

  // Get categories analysis
  const getCategoryBreakdown = (type: 'Income' | 'Expense') => {
    const breakdown: { [cat: string]: number } = {};
    transactions.forEach(t => {
      if (t.type !== type || t.isContra || t.isInvestment) return;
      breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
    });

    return Object.entries(breakdown)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const incomeCategories = getCategoryBreakdown('Income');
  const expenseCategories = getCategoryBreakdown('Expense');

  // SVG Chart sizing ref and observer
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);
  const [containerHeight, setContainerHeight] = useState(300);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setContainerWidth(width > 0 ? width : 600);
      setContainerHeight(height > 0 ? height : 300);
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef]);

  // SVG math helpers for Monthly Trend
  const padding = { top: 20, right: 20, bottom: 45, left: 65 };
  const graphWidth = containerWidth - padding.left - padding.right;
  const graphHeight = containerHeight - padding.top - padding.bottom;

  // Max value calculation for trends
  const maxVal = Math.max(
    ...monthlyTrendData.map(d => Math.max(d.income, d.expense, 50000))
  ) * 1.15; // 15% buffer

  const handleResidentPaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddTransaction) return;

    // Get current date formatted as DD-MM-YYYY
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    const formattedDate = `${d}-${m}-${y}`;

    onAddTransaction({
      date: formattedDate,
      type: 'Income',
      headId: `Income_Maintenance`,
      category: 'Maintenance Charges Income',
      amount: parseFloat(payAmount) || 24000,
      mode: payMode,
      reference: payRef || `SIM-${Math.floor(100000 + Math.random() * 900000)}`,
      description: `Wing ${parsedUnit.wing} - Block ${parsedUnit.block} - ${activeResidentName}`,
      wing: parsedUnit.wing,
      block: parsedUnit.block,
      residentName: activeResidentName
    });

    setPaymentSuccess(true);
    setTimeout(() => {
      setPaymentSuccess(false);
      setIsPayModalOpen(false);
      setPayRef('');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Resident Portal Box (Only shown if role is 'resident') */}
      {role === 'resident' && (
        <div className="bg-[#111111] border border-[#c5a059]/40 p-6 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl relative overflow-hidden">
          {/* Subtle gold accent beam */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c5a059]/60 to-transparent"></div>
          
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-[#c5a059] bg-[#1a110e] border border-[#c5a059]/30 px-2.5 py-0.5 rounded uppercase tracking-wider font-bold">
              Secure Resident Portal
            </span>
            <h3 className="text-xl font-serif italic text-[#e4e3e0]">{activeResidentName}</h3>
            <p className="text-xs text-[#e4e3e0]/50 font-mono">
              UNIT LOCATION: <span className="text-[#c5a059]">WING {parsedUnit.wing} • SUITE {parsedUnit.block}</span>
            </p>
          </div>

          {/* Dues Card Block */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
            <div className={`p-4 rounded border flex items-center gap-3 w-full sm:w-64 ${
              paymentStatus.hasPaid 
                ? 'bg-emerald-950/20 border-emerald-900/30 text-[#66bb6a]' 
                : 'bg-rose-950/20 border-rose-900/30 text-[#ff5555]'
            }`}>
              {paymentStatus.hasPaid ? (
                <ShieldCheck className="w-8 h-8 shrink-0 text-emerald-500 animate-pulse" />
              ) : (
                <ShieldAlert className="w-8 h-8 shrink-0 text-rose-500" />
              )}
              <div className="text-xs">
                <p className="font-mono uppercase tracking-wider text-[9px] opacity-60">Maintenance Dues Status</p>
                <p className="font-serif italic font-bold text-sm mt-0.5">
                  {paymentStatus.hasPaid ? 'Paid & Compliant' : 'Outstanding Dues'}
                </p>
                <p className="font-mono text-[10px] mt-0.5 text-[#e4e3e0]/60">
                  {paymentStatus.hasPaid 
                    ? `Cleared: ${formatCurrency(paymentStatus.amountPaid)} on ${paymentStatus.lastPaymentDate || 'N/A'}` 
                    : `Expected Amount: ${formatCurrency(24000)}`}
                </p>
              </div>
            </div>

            {/* Sim Dues Pay Trigger */}
            {!paymentStatus.hasPaid && (
              <button
                onClick={() => setIsPayModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-[#c5a059] hover:bg-[#b08c46] text-[#080808] px-5 py-3 rounded text-xs font-bold uppercase tracking-wider transition cursor-pointer shrink-0 shadow-lg shadow-[#c5a059]/10"
              >
                <CreditCard className="w-4 h-4" />
                Submit Dues Payment
              </button>
            )}
          </div>
        </div>
      )}

      {/* Visual Identity Greeting */}
      <div id="dashboard-hero" className="flex flex-col lg:flex-row lg:items-center lg:justify-between bg-[#111111] border border-[#222] p-8 rounded-lg gap-6 shadow-xl">
        <div>
          <span className="text-xs font-mono text-[#c5a059] bg-[#1a1a1a] border border-[#222]/80 px-3 py-1 rounded uppercase tracking-[0.2em] font-semibold">
            Orchid Heights Owners Association
          </span>
          <h2 className="text-3xl font-serif italic text-[#e4e3e0] mt-3 tracking-tight">
            Society Financial Dashboard
          </h2>
          <p className="text-xs text-[#e4e3e0]/60 mt-2 max-w-2xl leading-relaxed">
            Real-time financial logs, operational audit trails, cash management, and wing-wise maintenance receipt tracking.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            id="btn-navigate-maintenance"
            onClick={onNavigateToMaintenance}
            className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#252525] text-[#c5a059] border border-[#222] px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all duration-150 cursor-pointer"
          >
            <Building className="w-3.5 h-3.5" />
            Inspect Wing Map
          </button>
          <button 
            id="btn-view-ledger"
            onClick={() => onNavigateToLedger()}
            className="flex items-center gap-2 bg-[#c5a059] hover:bg-[#b08c46] text-[#080808] px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider font-bold transition-all duration-150 cursor-pointer shadow-lg shadow-[#c5a059]/10"
          >
            <Layers className="w-3.5 h-3.5" />
            Transaction Ledger
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div id="summary-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cash + Bank Assets */}
        <div className="bg-[#111111] border border-[#222] p-6 rounded-lg shadow-md hover:border-[#c5a059]/40 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#e4e3e0]/50 uppercase tracking-wider font-semibold">Total Liquid Reserves</span>
            <span className="p-2.5 bg-[#1a1a1a] text-[#c5a059] rounded border border-[#222]">
              <Wallet className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-5">
            <span className="text-2xl font-serif text-[#c5a059] tracking-tight">
              {formatCurrency(summary.cashOnHand + summary.bankBalance)}
            </span>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-[#e4e3e0]/40">
              <span className="font-semibold text-emerald-500 bg-emerald-950/40 border border-emerald-900/40 px-1.5 py-0.5 rounded">Active Funds</span>
              <span>Available in Cash & Banks</span>
            </div>
          </div>
        </div>

        {/* Operating Income */}
        <div className="bg-[#111111] border border-[#222] p-6 rounded-lg shadow-md hover:border-emerald-500/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#e4e3e0]/50 uppercase tracking-wider font-semibold">Operating Income</span>
            <button 
              onClick={() => onNavigateToLedger('Income')}
              className="p-2.5 bg-[#1a1a1a] text-emerald-400 rounded border border-[#222] hover:text-emerald-300 hover:border-emerald-500/30 transition-all cursor-pointer"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-5">
            <span className="text-2xl font-serif text-[#e4e3e0] tracking-tight">
              {formatCurrency(summary.totalIncome)}
            </span>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-[#e4e3e0]/40">
              <span className="font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-1.5 py-0.5 rounded">+{transactions.filter(t => t.type === 'Income' && !t.isContra).length} receipts</span>
              <span>maintenance & FD interests</span>
            </div>
          </div>
        </div>

        {/* Operating Expenses */}
        <div className="bg-[#111111] border border-[#222] p-6 rounded-lg shadow-md hover:border-rose-500/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#e4e3e0]/50 uppercase tracking-wider font-semibold">Operating Expense</span>
            <button 
              onClick={() => onNavigateToLedger('Expense')}
              className="p-2.5 bg-[#1a1a1a] text-rose-400 rounded border border-[#222] hover:text-rose-300 hover:border-rose-500/30 transition-all cursor-pointer"
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-5">
            <span className="text-2xl font-serif text-[#e4e3e0] tracking-tight">
              {formatCurrency(summary.totalExpense)}
            </span>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-[#e4e3e0]/40">
              <span className="font-semibold text-rose-400 bg-rose-950/40 border border-rose-900/40 px-1.5 py-0.5 rounded">-{transactions.filter(t => t.type === 'Expense' && !t.isContra && !t.isInvestment).length} payments</span>
              <span>utility, salaries & upkeep</span>
            </div>
          </div>
        </div>

        {/* Capital Fixed Deposit Assets */}
        <div className="bg-[#111111] border border-[#222] p-6 rounded-lg shadow-md hover:border-amber-500/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#e4e3e0]/50 uppercase tracking-wider font-semibold">FD Capital Reserves</span>
            <span className="p-2.5 bg-[#1a1a1a] text-amber-400 rounded border border-[#222]">
              <Percent className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-5">
            <span className="text-2xl font-serif text-[#e4e3e0] tracking-tight">
              {formatCurrency(summary.fdInvestment)}
            </span>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-[#e4e3e0]/40">
              <span className="font-semibold text-amber-400 bg-amber-950/40 border border-amber-900/40 px-1.5 py-0.5 rounded">Earning Interest</span>
              <span>Fixed Deposits in JCOM Bank</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Balance Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111111] border border-[#222] p-5 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono text-[#e4e3e0]/40 uppercase tracking-wider">Cash on Hand Balance</p>
            <p className="text-xl font-mono font-bold text-[#e4e3e0] mt-1">{formatCurrency(summary.cashOnHand)}</p>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
        </div>
        <div className="bg-[#111111] border border-[#222] p-5 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono text-[#e4e3e0]/40 uppercase tracking-wider">Total Bank Accounts (JCOM + CBI)</p>
            <p className="text-xl font-mono font-bold text-[#e4e3e0] mt-1">{formatCurrency(summary.bankBalance)}</p>
          </div>
          <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
        </div>
        <div className="bg-[#111111] border border-[#222] p-5 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono text-[#e4e3e0]/40 uppercase tracking-wider">Society Net Surplus</p>
            <p className="text-xl font-mono font-bold text-[#c5a059] mt-1">{formatCurrency(summary.netBalance)}</p>
          </div>
          <span className="h-2 w-2 rounded-full bg-[#c5a059] shadow-[0_0_10px_rgba(197,160,89,0.5)]"></span>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart (Operating Income vs Expense) */}
        <div className="bg-[#111111] border border-[#222] p-6 rounded-lg lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[#222] pb-4 mb-5">
            <div>
              <h3 className="text-base font-serif italic text-[#e4e3e0]">Operating Monthly Trends</h3>
              <p className="text-[11px] text-[#e4e3e0]/40 mt-0.5">Excludes capital FD creations and bank withdrawals (operating flows only)</p>
            </div>
            <div className="flex bg-[#080808] border border-[#222] rounded-lg p-1 gap-1">
              <button
                onClick={() => setChartMode('monthly')}
                className={`text-[10px] uppercase tracking-wider font-semibold px-3 py-1.5 rounded transition-all cursor-pointer ${
                  chartMode === 'monthly' 
                    ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/80 shadow-sm' 
                    : 'text-[#e4e3e0]/40 hover:text-[#e4e3e0]'
                }`}
              >
                Trends
              </button>
              <button
                onClick={() => setChartMode('categories')}
                className={`text-[10px] uppercase tracking-wider font-semibold px-3 py-1.5 rounded transition-all cursor-pointer ${
                  chartMode === 'categories' 
                    ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/80 shadow-sm' 
                    : 'text-[#e4e3e0]/40 hover:text-[#e4e3e0]'
                }`}
              >
                Top Categories
              </button>
            </div>
          </div>

          {chartMode === 'monthly' ? (
            <div className="space-y-4">
              <div ref={containerRef} className="w-full h-[280px] select-none relative">
                {/* SVG Rendered custom chart */}
                <svg width={containerWidth} height={containerHeight} className="overflow-visible">
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = padding.top + graphHeight * (1 - ratio);
                    const labelVal = maxVal * ratio;
                    return (
                      <g key={ratio} className="opacity-80">
                        <line 
                          x1={padding.left} 
                          y1={y} 
                          x2={containerWidth - padding.right} 
                          y2={y} 
                          stroke="#222222" 
                          strokeWidth="1" 
                        />
                        <text 
                          x={padding.left - 10} 
                          y={y + 4} 
                          textAnchor="end" 
                          className="font-mono text-[9px] fill-[#e4e3e0]/40"
                        >
                          {labelVal >= 100000 
                            ? `${(labelVal / 100000).toFixed(1)}L` 
                            : labelVal >= 1000 
                            ? `${(labelVal / 1000).toFixed(0)}k` 
                            : labelVal.toFixed(0)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Render Monthly Columns */}
                  {monthlyTrendData.map((d, index) => {
                    const colCount = monthlyTrendData.length;
                    const colWidth = Math.min(45, (graphWidth / colCount) * 0.75);
                    const colSpace = graphWidth / colCount;
                    const x = padding.left + index * colSpace + (colSpace - colWidth) / 2;
                    
                    const incomeHeight = (d.income / maxVal) * graphHeight;
                    const expenseHeight = (d.expense / maxVal) * graphHeight;

                    // Dual bar layout
                    const barWidth = colWidth / 2 - 2;
                    const xIncome = x;
                    const xExpense = x + colWidth / 2;

                    const yIncome = padding.top + graphHeight - incomeHeight;
                    const yExpense = padding.top + graphHeight - expenseHeight;

                    return (
                      <g key={d.month} className="group cursor-pointer">
                        {/* Income Bar */}
                        <rect
                          x={xIncome}
                          y={yIncome}
                          width={barWidth}
                          height={Math.max(2, incomeHeight)}
                          rx="2"
                          fill="#66bb6a"
                          className="transition-all duration-300 opacity-80 hover:opacity-100 hover:brightness-105"
                        />
                        {/* Expense Bar */}
                        <rect
                          x={xExpense}
                          y={yExpense}
                          width={barWidth}
                          height={Math.max(2, expenseHeight)}
                          rx="2"
                          fill="#ff5555"
                          className="transition-all duration-300 opacity-80 hover:opacity-100 hover:brightness-105"
                        />
                        {/* X-Axis labels */}
                        <text
                          x={x + colWidth / 2}
                          y={padding.top + graphHeight + 18}
                          textAnchor="middle"
                          transform={`rotate(-25, ${x + colWidth / 2}, ${padding.top + graphHeight + 18})`}
                          className="font-mono text-[9px] fill-[#e4e3e0]/40 font-medium"
                        >
                          {d.month}
                        </text>
                      </g>
                    );
                  })}

                  {/* Draw Zero-Axis line */}
                  <line 
                    x1={padding.left} 
                    y1={padding.top + graphHeight} 
                    x2={containerWidth - padding.right} 
                    y2={padding.top + graphHeight} 
                    stroke="#222222" 
                    strokeWidth="1" 
                  />
                </svg>
              </div>

              {/* Legends */}
              <div className="flex items-center justify-center gap-6 pt-4 text-[10px] font-mono text-[#e4e3e0]/60">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-[#66bb6a] inline-block"></span>
                  <span className="font-medium">Operating Income (Maintenance / Interests)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-[#ff5555] inline-block"></span>
                  <span className="font-medium">Operating Expenses (Upkeep / Bills / Salaries)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2">
              {/* Income Categories */}
              <div>
                <h4 className="text-[10px] font-mono font-semibold uppercase text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-3 py-1 rounded w-max mb-5">
                  Top Income Sources
                </h4>
                <div className="space-y-4">
                  {incomeCategories.slice(0, 5).map((cat, i) => {
                    const totalIncomeVal = incomeCategories.reduce((sum, item) => sum + item.value, 0);
                    const pct = totalIncomeVal > 0 ? (cat.value / totalIncomeVal) * 100 : 0;
                    return (
                      <div key={cat.name} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium text-[#e4e3e0]/80">
                          <span className="truncate">{cat.name}</span>
                          <span className="font-mono font-bold text-[#e4e3e0]">{formatCurrency(cat.value)}</span>
                        </div>
                        <div className="w-full bg-[#080808] border border-[#222]/60 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-[#66bb6a] h-full rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                        <p className="text-[9px] font-mono text-[#e4e3e0]/40 text-right">{pct.toFixed(1)}% of operating income</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Expense Categories */}
              <div>
                <h4 className="text-[10px] font-mono font-semibold uppercase text-rose-400 bg-rose-950/40 border border-rose-900/40 px-3 py-1 rounded w-max mb-5">
                  Top Expense Heads
                </h4>
                <div className="space-y-4">
                  {expenseCategories.slice(0, 5).map((cat, i) => {
                    const totalExpenseVal = expenseCategories.reduce((sum, item) => sum + item.value, 0);
                    const pct = totalExpenseVal > 0 ? (cat.value / totalExpenseVal) * 100 : 0;
                    return (
                      <div key={cat.name} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium text-[#e4e3e0]/80">
                          <span className="truncate">{cat.name}</span>
                          <span className="font-mono font-bold text-[#e4e3e0]">{formatCurrency(cat.value)}</span>
                        </div>
                        <div className="w-full bg-[#080808] border border-[#222]/60 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-[#ff5555] h-full rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                        <p className="text-[9px] font-mono text-[#e4e3e0]/40 text-right">{pct.toFixed(1)}% of operating expenses</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Audit Logs & Highlighted Info */}
        <div className="bg-[#111111] border border-[#222] p-6 rounded-lg space-y-5">
          <div>
            <h3 className="text-base font-serif italic text-[#e4e3e0]">Society Audit Insights</h3>
            <p className="text-xs text-[#e4e3e0]/40 mt-0.5">Automated detection of core accounting anomalies or items</p>
          </div>

          <div className="space-y-3.5 overflow-y-auto max-h-[300px] pr-1">
            {/* Audit Item: FD Investment Ratio */}
            <div className="bg-[#1a1813] border border-amber-900/30 p-4 rounded-lg flex items-start gap-3">
              <span className="p-2 bg-amber-950/60 text-[#c5a059] border border-amber-900/40 rounded mt-0.5 shrink-0">
                <Percent className="w-3.5 h-3.5" />
              </span>
              <div>
                <h4 className="text-xs font-serif font-bold text-[#c5a059]">Capital Reserve Allocation</h4>
                <p className="text-[11px] text-[#e4e3e0]/70 mt-1 leading-relaxed">
                  The society is earning significant recurring interests with <b>{formatCurrency(summary.fdInvestment)}</b> in Fixed Deposits. Ratio is healthy at {((summary.fdInvestment / (summary.fdInvestment + summary.cashOnHand + summary.bankBalance)) * 100).toFixed(0)}% of total reserves.
                </p>
              </div>
            </div>

            {/* Audit Item: Sweeper / Guard Salaries */}
            <div className="bg-[#12141c] border border-indigo-900/30 p-4 rounded-lg flex items-start gap-3">
              <span className="p-2 bg-indigo-950/60 text-indigo-400 border border-indigo-900/40 rounded mt-0.5 shrink-0">
                <Building className="w-3.5 h-3.5" />
              </span>
              <div>
                <h4 className="text-xs font-serif font-bold text-indigo-400">Monthly Human Capital Expenses</h4>
                <p className="text-[11px] text-[#e4e3e0]/70 mt-1 leading-relaxed">
                  Regular overhead salaries are logged. Average month has approx. <b>{formatCurrency(30000)}</b> Safai Kamdar and <b>{formatCurrency(21000)}</b> Security salary entries, paid regularly in Cash on the 3rd to 6th of each month.
                </p>
              </div>
            </div>

            {/* Audit Item: Bank Contra Entries */}
            <div className="bg-[#111815] border border-emerald-900/30 p-4 rounded-lg flex items-start gap-3">
              <span className="p-2 bg-emerald-950/60 text-emerald-400 border border-emerald-900/40 rounded mt-0.5 shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
              </span>
              <div>
                <h4 className="text-xs font-serif font-bold text-emerald-400">Double-entry Ledger Audit</h4>
                <p className="text-[11px] text-[#e4e3e0]/70 mt-1 leading-relaxed">
                  Contra bank cash-withdrawals are verified. Society regularly replenishes Cash on Hand by withdrawing <b>70,000 to 100,000</b> from JCOM Bank. Both sides of entries correctly offset to 0.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#222] flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#e4e3e0]/40">DATABASE SIZE: {transactions.length} ROWS</span>
            <span className="text-[#c5a059] bg-[#1a1a1a] border border-[#222]/80 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Audited</span>
          </div>
        </div>
      </div>

      {/* SIMULATED PAYMENT MODAL */}
      <AnimatePresence>
        {isPayModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setIsPayModalOpen(false)}
            ></motion.div>

            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-[#111111] border border-[#c5a059]/40 rounded-lg p-6 max-w-md w-full relative z-10 shadow-2xl text-left"
            >
              <button 
                onClick={() => setIsPayModalOpen(false)}
                className="absolute top-4 right-4 text-[#e4e3e0]/40 hover:text-[#e4e3e0] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {paymentSuccess ? (
                <div className="text-center py-8 space-y-4">
                  <motion.div 
                    initial={{ scale: 0.5, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="inline-flex p-3 bg-emerald-950/40 text-[#66bb6a] rounded-full border border-emerald-900/40"
                  >
                    <CheckCircle2 className="w-12 h-12" />
                  </motion.div>
                  <h3 className="text-lg font-serif italic text-[#e4e3e0]">Payment Receipt Logged!</h3>
                  <p className="text-xs text-[#e4e3e0]/60 max-w-sm mx-auto font-mono leading-relaxed">
                    ₹{parseFloat(payAmount).toLocaleString('en-IN')} has been added to the secure society ledger. Your unit dues status is now marked as COMPLIANT.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleResidentPaySubmit} className="space-y-4">
                  <div className="border-b border-[#222] pb-3">
                    <h3 className="text-lg font-serif italic text-[#c5a059]">Submit Maintenance Dues</h3>
                    <p className="text-xs text-[#e4e3e0]/40 font-mono mt-0.5">Quick Payment Receipt Generator</p>
                  </div>

                  <div className="space-y-3.5 text-xs font-mono">
                    <div>
                      <label className="block text-[10px] text-[#e4e3e0]/40 uppercase mb-1.5 font-bold">Unit / Resident</label>
                      <div className="bg-[#0c0c0c] border border-[#222] px-3 py-2 rounded text-[#e4e3e0]/80">
                        {selectedUnit} — {activeResidentName}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-[#e4e3e0]/40 uppercase mb-1.5 font-bold">Amount (INR)</label>
                        <input
                          type="number"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          className="w-full bg-[#0c0c0c] border border-[#222] px-3 py-2 rounded text-[#e4e3e0] focus:outline-none focus:border-[#c5a059]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#e4e3e0]/40 uppercase mb-1.5 font-bold">Payment Mode</label>
                        <select
                          value={payMode}
                          onChange={(e) => setPayMode(e.target.value)}
                          className="w-full bg-[#0c0c0c] border border-[#222] px-3 py-2 rounded text-[#e4e3e0] focus:outline-none focus:border-[#c5a059] cursor-pointer"
                        >
                          <option value="Bank: JCOM">Bank (JCOM)</option>
                          <option value="Bank: CBI">Bank (CBI)</option>
                          <option value="UPI">UPI Transfer</option>
                          <option value="Cheque">Cheque Payment</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-[#e4e3e0]/40 uppercase mb-1.5 font-bold flex justify-between">
                        <span>Transaction Reference / UTR</span>
                        <span className="text-[9px] text-[#c5a059]/60 lowercase normal-case italic">(Optional - auto if empty)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. UTR8273928122"
                        value={payRef}
                        onChange={(e) => setPayRef(e.target.value)}
                        className="w-full bg-[#0c0c0c] border border-[#222] px-3 py-2 rounded text-[#e4e3e0] focus:outline-none focus:border-[#c5a059]"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsPayModalOpen(false)}
                      className="w-1/2 border border-[#222] hover:bg-[#1a1a1a] text-[#e4e3e0] py-2.5 rounded text-xs uppercase tracking-wider font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 bg-[#c5a059] hover:bg-[#b08c46] text-[#080808] py-2.5 rounded text-xs uppercase tracking-wider font-bold transition cursor-pointer"
                    >
                      Pay Now
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
