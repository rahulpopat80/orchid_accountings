import { useState, useEffect, useMemo } from 'react';
import { INITIAL_CSV_DATA } from './data';
import { Transaction } from './types';
import { parseCSVData, calculateAccountingSummary, convertTransactionsToCSV, parseDateStringToYYYYMMDD, getMonthYearString } from './utils';

import DashboardView from './components/DashboardView';
import LedgerView from './components/LedgerView';
import MaintenanceMapView from './components/MaintenanceMapView';
import CSVHandler from './components/CSVHandler';

import { 
  Building2, 
  LayoutDashboard, 
  Layers, 
  Building, 
  RefreshCw, 
  Clock, 
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ledger' | 'maintenance' | 'sync'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [systemTime, setSystemTime] = useState(new Date('2026-06-26T20:36:20-07:00'));

  // Load initial dataset on mount
  useEffect(() => {
    const data = parseCSVData(INITIAL_CSV_DATA);
    setTransactions(data);
  }, []);

  // Simple system clock updates
  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(prev => new Date(prev.getTime() + 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto calculate summaries
  const accountingSummary = useMemo(() => {
    return calculateAccountingSummary(transactions);
  }, [transactions]);

  // Load dynamic CSV text
  const handleDataSync = (csvText: string) => {
    const parsed = parseCSVData(csvText);
    setTransactions(parsed);
  };

  // Reset default database
  const handleResetToDefault = () => {
    if (confirm('Are you sure you want to revert all changes to the original official Orchid Heights ledger?')) {
      const data = parseCSVData(INITIAL_CSV_DATA);
      setTransactions(data);
    }
  };

  // Add transaction helper
  const handleAddTransaction = (newTx: Omit<Transaction, 'id' | 'parsedDate' | 'monthYear'>) => {
    const parsedDate = parseDateStringToYYYYMMDD(newTx.date);
    const monthYear = getMonthYearString(newTx.date);
    
    // Create new unique transaction with custom parsed values
    const finalTx: Transaction = {
      ...newTx,
      id: `${parsedDate}-${newTx.headId}-${newTx.amount}-${Date.now()}`,
      parsedDate,
      monthYear
    };

    setTransactions(prev => [finalTx, ...prev].sort((a, b) => b.parsedDate.localeCompare(a.parsedDate)));
  };

  // Edit transaction helper
  const handleEditTransaction = (updatedTx: Transaction) => {
    const parsedDate = parseDateStringToYYYYMMDD(updatedTx.date);
    const monthYear = getMonthYearString(updatedTx.date);
    
    const finalTx: Transaction = {
      ...updatedTx,
      parsedDate,
      monthYear
    };

    setTransactions(prev => prev.map(t => t.id === updatedTx.id ? finalTx : t).sort((a, b) => b.parsedDate.localeCompare(a.parsedDate)));
  };

  // Delete transaction helper
  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // CSV download helper
  const handleExportCSV = () => {
    const csvContent = convertTransactionsToCSV(transactions);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Format date for file name
    const timestamp = systemTime.toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `Orchid_Heights_Accounts_Report_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Navigation callbacks
  const handleNavigateToLedger = (filterType?: 'Income' | 'Expense') => {
    setActiveTab('ledger');
  };

  const handleNavigateToMaintenance = () => {
    setActiveTab('maintenance');
  };

  return (
    <div className="min-h-screen bg-[#080808] text-[#e4e3e0] font-sans flex flex-col md:flex-row antialiased">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#111111] text-[#e4e3e0] shrink-0 border-b md:border-b-0 md:border-r border-[#222] flex flex-col">
        {/* Brand Header */}
        <div className="p-8 border-b border-[#222]">
          <h1 className="font-serif italic text-2xl text-[#c5a059] leading-none">Orchid Heights</h1>
          <span className="text-[10px] font-mono font-medium text-[#e4e3e0]/40 uppercase tracking-[0.2em] mt-2.5 inline-block">Accountings</span>
        </div>

        {/* Navigation items */}
        <nav className="flex-grow p-4 space-y-1.5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all duration-200 ${
              activeTab === 'dashboard' 
                ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/80 shadow-md shadow-black/40' 
                : 'text-[#e4e3e0]/60 hover:text-[#e4e3e0] hover:bg-[#1a1a1a]/40'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
            Dashboard
          </button>
          
          <button
            onClick={() => setActiveTab('ledger')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all duration-200 ${
              activeTab === 'ledger' 
                ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/80 shadow-md shadow-black/40' 
                : 'text-[#e4e3e0]/60 hover:text-[#e4e3e0] hover:bg-[#1a1a1a]/40'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            Voucher Ledger
          </button>
          
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all duration-200 ${
              activeTab === 'maintenance' 
                ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/80 shadow-md shadow-black/40' 
                : 'text-[#e4e3e0]/60 hover:text-[#e4e3e0] hover:bg-[#1a1a1a]/40'
            }`}
          >
            <Building className="w-3.5 h-3.5 shrink-0" />
            Wing Status Map
          </button>
          
          <button
            onClick={() => setActiveTab('sync')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all duration-200 ${
              activeTab === 'sync' 
                ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/80 shadow-md shadow-black/40' 
                : 'text-[#e4e3e0]/60 hover:text-[#e4e3e0] hover:bg-[#1a1a1a]/40'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            Spreadsheet Sync
          </button>
        </nav>

        {/* Footer info & clock */}
        <div className="p-6 border-t border-[#222] bg-[#0c0c0c]/40 text-[11px] font-mono text-[#e4e3e0]/40 space-y-2.5">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#c5a059]/80 shrink-0" />
            <span>
              {systemTime.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })} {systemTime.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              })}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span>SERVER: SECURE_RUN</span>
            <span className="text-emerald-500 font-bold">● ONLINE</span>
          </div>
        </div>
      </aside>

      {/* Main Container Content */}
      <main className="flex-1 p-6 md:p-8 space-y-8 overflow-x-hidden">
        {/* Dynamic component routing with animations */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <DashboardView
                transactions={transactions}
                summary={accountingSummary}
                onNavigateToLedger={handleNavigateToLedger}
                onNavigateToMaintenance={handleNavigateToMaintenance}
              />
            )}

            {activeTab === 'ledger' && (
              <LedgerView
                transactions={transactions}
                onAddTransaction={handleAddTransaction}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onExportCSV={handleExportCSV}
              />
            )}

            {activeTab === 'maintenance' && (
              <MaintenanceMapView
                transactions={transactions}
              />
            )}

            {activeTab === 'sync' && (
              <CSVHandler
                onDataLoaded={handleDataSync}
                onResetToDefault={handleResetToDefault}
                rowCount={transactions.length}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

