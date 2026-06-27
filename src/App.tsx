import { useState, useEffect, useMemo } from 'react';
import { INITIAL_CSV_DATA } from './data';
import { Transaction } from './types';
import { parseCSVData, calculateAccountingSummary, convertTransactionsToCSV, parseDateStringToYYYYMMDD, getMonthYearString } from './utils';

import DashboardView from './components/DashboardView';
import LedgerView from './components/LedgerView';
import MaintenanceMapView from './components/MaintenanceMapView';
import CSVHandler from './components/CSVHandler';
import ReportsView from './components/ReportsView';
import InstallPrompt from './components/InstallPrompt';

import { 
  Building2, 
  LayoutDashboard, 
  Layers, 
  Building, 
  RefreshCw, 
  Clock, 
  HelpCircle,
  FileSpreadsheet,
  FileText,
  Users,
  Sun,
  Moon,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ledger' | 'maintenance' | 'reports' | 'sync'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('orchid_heights_transactions_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load transactions from localStorage', e);
      }
    }
    return parseCSVData(INITIAL_CSV_DATA);
  });
  const [systemTime, setSystemTime] = useState(new Date('2026-06-26T20:36:20-07:00'));
  
  // Theme Preference state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  // User Role & Unit state
  const [role, setRole] = useState<'admin' | 'resident'>('admin');
  const [selectedUnit, setSelectedUnit] = useState('Wing A - Block 901');

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      return next;
    });
  };

  const parsedUnit = useMemo(() => {
    const match = selectedUnit.match(/Wing\s+([A-B])\s*-\s*Block\s*(\d+)/i);
    if (match) {
      return { wing: match[1] as 'A' | 'B', block: match[2] };
    }
    return { wing: 'A' as 'A' | 'B', block: '901' };
  }, [selectedUnit]);

  const residentUnits = useMemo(() => {
    return [
      'Wing A - Block 101',
      'Wing A - Block 201',
      'Wing A - Block 402',
      'Wing A - Block 901',
      'Wing B - Block 202',
      'Wing B - Block 404',
      'Wing B - Block 702',
      'Wing B - Block 901'
    ];
  }, []);

  // Save transactions to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('orchid_heights_transactions_data', JSON.stringify(transactions));
  }, [transactions]);

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
    if (confirm('Are you sure you want to clear all transactions and reset the ledger?')) {
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

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'light-theme bg-[#fcfbf9] text-[#22211f]' : 'bg-[#080808] text-[#e4e3e0]'} font-sans flex flex-col md:flex-row antialiased`}>
      {/* Mobile Sticky Header */}
      <header className="md:hidden sticky top-0 z-40 bg-[#111111] border-b border-[#222] text-[#e4e3e0] px-5 py-4 flex items-center justify-between shadow-md print:hidden">
        <div className="flex items-center gap-2.5">
          <svg className="w-6 h-6 text-[#c5a059] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-2 6-6 2 6 1.8 2 5.8 2-5.8 6-1.8-6-2Z" fill="currentColor" fillOpacity="0.15" />
            <circle cx="12" cy="11" r="1.5" fill="currentColor" />
            <path d="M12 17v4" />
            <path d="M9 21h6" />
          </svg>
          <div>
            <h1 className="font-serif italic text-lg text-[#c5a059] leading-none">Orchid Heights</h1>
            <span className="text-[9px] font-mono font-medium text-[#e4e3e0]/40 uppercase tracking-[0.2em] mt-1 inline-block">Accounts</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded bg-[#1a1a1a] hover:bg-[#252525] border border-[#222] text-[#c5a059] transition cursor-pointer"
            title={theme === 'dark' ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded bg-[#1a1a1a] hover:bg-[#252525] border border-[#222] text-[#e4e3e0] transition cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Collapsible Navigation Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden bg-[#111111] border-b border-[#222] overflow-hidden text-[#e4e3e0] flex flex-col print:hidden"
          >
            {/* Nav Links */}
            <nav className="p-4 space-y-1.5">
              <button
                onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all duration-200 ${
                  activeTab === 'dashboard' 
                    ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/80 shadow-md' 
                    : 'text-[#e4e3e0]/60 hover:text-[#e4e3e0] hover:bg-[#1a1a1a]/40'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                Dashboard
              </button>
              
              <button
                onClick={() => { setActiveTab('ledger'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all duration-200 ${
                  activeTab === 'ledger' 
                    ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/80 shadow-md' 
                    : 'text-[#e4e3e0]/60 hover:text-[#e4e3e0] hover:bg-[#1a1a1a]/40'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                Voucher Ledger
              </button>

              <button
                onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all duration-200 ${
                  activeTab === 'reports' 
                    ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/80 shadow-md' 
                    : 'text-[#e4e3e0]/60 hover:text-[#e4e3e0] hover:bg-[#1a1a1a]/40'
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                Financial Reports
              </button>
              
              <button
                onClick={() => { setActiveTab('maintenance'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all duration-200 ${
                  activeTab === 'maintenance' 
                    ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/80 shadow-md' 
                    : 'text-[#e4e3e0]/60 hover:text-[#e4e3e0] hover:bg-[#1a1a1a]/40'
                }`}
              >
                <Building className="w-3.5 h-3.5 shrink-0" />
                Wing Status Map
              </button>
              
              {role === 'admin' && (
                <button
                  onClick={() => { setActiveTab('sync'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all duration-200 ${
                    activeTab === 'sync' 
                      ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/80 shadow-md' 
                      : 'text-[#e4e3e0]/60 hover:text-[#e4e3e0] hover:bg-[#1a1a1a]/40'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                  Spreadsheet Sync
                </button>
              )}
            </nav>

            {/* Role & Units inside Mobile Menu */}
            <div className="p-4 bg-[#0c0c0c]/60 border-t border-b border-[#222] space-y-3">
              <div>
                <label className="block text-[9px] font-mono text-[#e4e3e0]/40 uppercase tracking-widest mb-1.5 font-bold flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#c5a059]" />
                  Access Role
                </label>
                <div className="grid grid-cols-2 gap-1 bg-[#080808] p-1 border border-[#222] rounded">
                  <button
                    onClick={() => {
                      setRole('admin');
                      if (activeTab === 'sync') setActiveTab('dashboard');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`py-1.5 text-[10px] font-mono uppercase tracking-wider font-bold rounded transition cursor-pointer ${
                      role === 'admin' 
                        ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/40 shadow' 
                        : 'text-[#e4e3e0]/40 hover:text-[#e4e3e0]'
                    }`}
                  >
                    Admin
                  </button>
                  <button
                    onClick={() => {
                      setRole('resident');
                      if (activeTab === 'sync') setActiveTab('dashboard');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`py-1.5 text-[10px] font-mono uppercase tracking-wider font-bold rounded transition cursor-pointer ${
                      role === 'resident' 
                        ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/40 shadow' 
                        : 'text-[#e4e3e0]/40 hover:text-[#e4e3e0]'
                    }`}
                  >
                    Resident
                  </button>
                </div>
              </div>

              {role === 'resident' && (
                <div className="space-y-1">
                  <label className="block text-[8px] font-mono text-[#e4e3e0]/40 uppercase tracking-wider font-semibold">Select My Unit:</label>
                  <select
                    value={selectedUnit}
                    onChange={(e) => { setSelectedUnit(e.target.value); setIsMobileMenuOpen(false); }}
                    className="w-full bg-[#080808] border border-[#222] text-[#e4e3e0] text-[11px] px-2 py-1.5 rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#c5a059] cursor-pointer"
                  >
                    {residentUnits.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Time inside Mobile Menu */}
            <div className="p-4 text-[10px] font-mono text-[#e4e3e0]/40 flex justify-between items-center bg-[#0c0c0c]/20">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-[#c5a059]/80 shrink-0" />
                <span>
                  {systemTime.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <span className="text-emerald-500 font-bold">● ONLINE</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Persistent Sidebar Navigation */}
      <aside className="hidden md:flex md:w-64 bg-[#111111] text-[#e4e3e0] shrink-0 border-r border-[#222] flex-col justify-between print:hidden">
        <div className="flex flex-col">
          {/* Brand Header with Theme Switcher */}
          <div className="p-6 border-b border-[#222] flex justify-between items-start">
            <div className="flex items-center gap-3">
              <svg className="w-7 h-7 text-[#c5a059] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-2 6-6 2 6 1.8 2 5.8 2-5.8 6-1.8-6-2Z" fill="currentColor" fillOpacity="0.15" />
                <circle cx="12" cy="11" r="1.5" fill="currentColor" />
                <path d="M12 17v4" />
                <path d="M9 21h6" />
              </svg>
              <div>
                <h1 className="font-serif italic text-xl text-[#c5a059] leading-none">Orchid Heights</h1>
                <span className="text-[10px] font-mono font-medium text-[#e4e3e0]/40 uppercase tracking-[0.2em] mt-2 inline-block">Accounts</span>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded bg-[#1a1a1a] hover:bg-[#252525] border border-[#222] text-[#c5a059] transition cursor-pointer shrink-0"
              title={theme === 'dark' ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Navigation items */}
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all duration-200 ${
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
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all duration-200 ${
                activeTab === 'ledger' 
                  ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/80 shadow-md shadow-black/40' 
                  : 'text-[#e4e3e0]/60 hover:text-[#e4e3e0] hover:bg-[#1a1a1a]/40'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              Voucher Ledger
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all duration-200 ${
                activeTab === 'reports' 
                  ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/80 shadow-md shadow-black/40' 
                  : 'text-[#e4e3e0]/60 hover:text-[#e4e3e0] hover:bg-[#1a1a1a]/40'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              Financial Reports
            </button>
            
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all duration-200 ${
                activeTab === 'maintenance' 
                  ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/80 shadow-md shadow-black/40' 
                  : 'text-[#e4e3e0]/60 hover:text-[#e4e3e0] hover:bg-[#1a1a1a]/40'
              }`}
            >
              <Building className="w-3.5 h-3.5 shrink-0" />
              Wing Status Map
            </button>
            
            {role === 'admin' && (
              <button
                onClick={() => setActiveTab('sync')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider font-semibold transition-all duration-200 ${
                  activeTab === 'sync' 
                    ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/80 shadow-md shadow-black/40' 
                    : 'text-[#e4e3e0]/60 hover:text-[#e4e3e0] hover:bg-[#1a1a1a]/40'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                Spreadsheet Sync
              </button>
            )}
          </nav>
        </div>

        <div>
          {/* Role Selector Widget */}
          <div className="p-4 mx-4 mb-4 rounded bg-[#0c0c0c]/60 border border-[#222]">
            <label className="block text-[9px] font-mono text-[#e4e3e0]/40 uppercase tracking-widest mb-1.5 font-bold flex items-center gap-1">
              <Users className="w-3 h-3 text-[#c5a059]" />
              Access Role
            </label>
            <div className="grid grid-cols-2 gap-1 bg-[#080808] p-1 border border-[#222] rounded">
              <button
                onClick={() => {
                  setRole('admin');
                  if (activeTab === 'sync') setActiveTab('dashboard');
                }}
                className={`py-1 text-[10px] font-mono uppercase tracking-wider font-bold rounded transition cursor-pointer ${
                  role === 'admin' 
                    ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/40 shadow' 
                    : 'text-[#e4e3e0]/40 hover:text-[#e4e3e0]'
                }`}
              >
                Admin
              </button>
              <button
                onClick={() => {
                  setRole('resident');
                  if (activeTab === 'sync') setActiveTab('dashboard');
                }}
                className={`py-1 text-[10px] font-mono uppercase tracking-wider font-bold rounded transition cursor-pointer ${
                  role === 'resident' 
                    ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/40 shadow' 
                    : 'text-[#e4e3e0]/40 hover:text-[#e4e3e0]'
                }`}
              >
                Resident
              </button>
            </div>

            {role === 'resident' && (
              <div className="mt-3.5 space-y-1">
                <label className="block text-[8px] font-mono text-[#e4e3e0]/40 uppercase tracking-wider font-semibold">Select My Unit:</label>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="w-full bg-[#080808] border border-[#222] text-[#e4e3e0] text-[11px] px-2 py-1 rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#c5a059] cursor-pointer"
                >
                  {residentUnits.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

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
        </div>
      </aside>

      {/* Main Container Content */}
      <main className="flex-1 p-6 md:p-8 space-y-8 overflow-x-hidden print:p-0 print:m-0 print:bg-white">
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
                onAddTransaction={handleAddTransaction}
                role={role}
                selectedUnit={selectedUnit}
                parsedUnit={parsedUnit}
              />
            )}

            {activeTab === 'ledger' && (
              <LedgerView
                transactions={transactions}
                onAddTransaction={handleAddTransaction}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onExportCSV={handleExportCSV}
                role={role}
                selectedUnit={selectedUnit}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                transactions={transactions}
                summary={accountingSummary}
              />
            )}

            {activeTab === 'maintenance' && (
              <MaintenanceMapView
                transactions={transactions}
              />
            )}

            {activeTab === 'sync' && role === 'admin' && (
              <CSVHandler
                onDataLoaded={handleDataSync}
                onResetToDefault={handleResetToDefault}
                rowCount={transactions.length}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      <InstallPrompt />
    </div>
  );
}


