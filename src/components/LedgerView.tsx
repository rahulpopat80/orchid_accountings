import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  ArrowUp, 
  ArrowDown, 
  FileText,
  Filter,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LedgerViewProps {
  transactions: Transaction[];
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'parsedDate' | 'monthYear'>) => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onExportCSV: () => void;
}

export default function LedgerView({
  transactions,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onExportCSV
}: LedgerViewProps) {
  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Income' | 'Expense'>('All');
  const [modeFilter, setModeFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form Fields State
  const [date, setDate] = useState('');
  const [type, setType] = useState<'Income' | 'Expense'>('Expense');
  const [headId, setHeadId] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('Cash');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');

  // Extract unique filters based on current data
  const uniqueCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  const uniqueModes = useMemo(() => {
    const modes = new Set(transactions.map(t => t.mode));
    return Array.from(modes).sort();
  }, [transactions]);

  // Clean form fields
  const resetForm = () => {
    // Default to current date in dd-mm-yyyy format
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    setDate(`${d}-${m}-${y}`);
    
    setType('Expense');
    setHeadId('');
    setCategory(uniqueCategories[0] || 'Other');
    setCustomCategory('');
    setAmount('');
    setMode('Cash');
    setReference('');
    setDescription('');
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleOpenEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setDate(t.date);
    setType(t.type);
    setHeadId(t.headId);
    
    if (uniqueCategories.includes(t.category)) {
      setCategory(t.category);
      setCustomCategory('');
    } else {
      setCategory('Custom');
      setCustomCategory(t.category);
    }
    
    setAmount(t.amount.toString());
    setMode(t.mode);
    setReference(t.reference);
    setDescription(t.description);
    setIsEditOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = category === 'Custom' ? customCategory.trim() : category;
    
    if (!date || !amount || !finalCategory) {
      alert('Please fill out all required fields.');
      return;
    }

    const payload = {
      date,
      type,
      headId: headId || `${type}_${finalCategory}`,
      category: finalCategory,
      amount: parseFloat(amount) || 0,
      mode,
      reference,
      description
    };

    if (isAddOpen) {
      onAddTransaction(payload);
      setIsAddOpen(false);
    } else if (isEditOpen && editingTransaction) {
      onEditTransaction({
        ...editingTransaction,
        ...payload,
        parsedDate: '', // will be computed on save
        monthYear: ''   // will be computed on save
      });
      setIsEditOpen(false);
    }
    
    resetForm();
  };

  // Filter logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // search term matches category, mode, reference, description, or resident name
      const searchStr = `${t.category} ${t.mode} ${t.reference} ${t.description} ${t.residentName || ''} ${t.date}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'All' || t.type === typeFilter;
      const matchesMode = modeFilter === 'All' || t.mode === modeFilter;
      const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;

      return matchesSearch && matchesType && matchesMode && matchesCategory;
    });
  }, [transactions, searchTerm, typeFilter, modeFilter, categoryFilter]);

  // Pagination Math
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // Currency Formatter
  const formatVal = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters panel */}
      <div className="bg-[#111111] border border-[#222] p-6 rounded-lg space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#e4e3e0]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search category, mode, block reference, resident name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#080808] border border-[#222] text-[#e4e3e0] pl-10 pr-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#c5a059] transition"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            {/* Type selector buttons */}
            <div className="flex bg-[#080808] border border-[#222] p-1 rounded-lg">
              <button
                onClick={() => { setTypeFilter('All'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition ${typeFilter === 'All' ? 'bg-[#1a1a1a] text-[#c5a059] border border-[#222]/80 shadow-sm' : 'text-[#e4e3e0]/50 hover:text-[#e4e3e0]'}`}
              >
                All
              </button>
              <button
                onClick={() => { setTypeFilter('Income'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition flex items-center gap-1.5 ${typeFilter === 'Income' ? 'bg-[#1a1a1a] text-[#66bb6a] border border-[#222]/80 shadow-sm' : 'text-[#e4e3e0]/50 hover:text-[#e4e3e0]'}`}
              >
                <ArrowUp className="w-3 h-3 text-[#66bb6a]" /> Income
              </button>
              <button
                onClick={() => { setTypeFilter('Expense'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition flex items-center gap-1.5 ${typeFilter === 'Expense' ? 'bg-[#1a1a1a] text-[#ff5555] border border-[#222]/80 shadow-sm' : 'text-[#e4e3e0]/50 hover:text-[#e4e3e0]'}`}
              >
                <ArrowDown className="w-3 h-3 text-[#ff5555]" /> Expense
              </button>
            </div>

            {/* Mode filter */}
            <select
              value={modeFilter}
              onChange={(e) => { setModeFilter(e.target.value); setCurrentPage(1); }}
              className="bg-[#080808] border border-[#222] text-[#e4e3e0] px-3.5 py-2.5 rounded-lg text-xs font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#c5a059] cursor-pointer"
            >
              <option value="All">ALL MODES</option>
              {uniqueModes.map(m => (
                <option key={m} value={m}>{m.toUpperCase()}</option>
              ))}
            </select>

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="bg-[#080808] border border-[#222] text-[#e4e3e0] px-3.5 py-2.5 rounded-lg text-xs font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-[#c5a059] max-w-[200px] truncate cursor-pointer"
            >
              <option value="All">ALL CATEGORIES</option>
              {uniqueCategories.map(c => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </select>

            {/* Excel CSV export */}
            <button
              onClick={onExportCSV}
              className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#252525] text-[#c5a059] border border-[#222] px-3.5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>

            {/* Add manually */}
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 bg-[#c5a059] hover:bg-[#b08c46] text-[#080808] px-3.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-lg shadow-[#c5a059]/10"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Voucher
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-[#111111] border border-[#222] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#161616] border-b border-[#222] font-mono text-[10px] text-[#e4e3e0]/40 uppercase tracking-widest">
                <th className="py-4 px-6 font-semibold">Date</th>
                <th className="py-4 px-4 font-semibold">Type</th>
                <th className="py-4 px-5 font-semibold">Category</th>
                <th className="py-4 px-5 font-semibold">Mode</th>
                <th className="py-4 px-4 font-semibold">Reference</th>
                <th className="py-4 px-6 font-semibold">Description</th>
                <th className="py-4 px-6 font-semibold text-right">Amount</th>
                <th className="py-4 px-6 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]/55">
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((t, index) => {
                  const isInc = t.type === 'Income';
                  return (
                    <motion.tr 
                      key={t.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.12, delay: index * 0.008 }}
                      className="hover:bg-[#161616]/40 text-xs transition-colors group border-b border-[#222]/20"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-6 font-mono text-[#e4e3e0]/60 whitespace-nowrap">
                        {t.date}
                      </td>

                      {/* Type Indicator */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${isInc ? 'bg-[#66bb6a]/15 text-[#66bb6a] border border-[#66bb6a]/30' : 'bg-[#ff5555]/15 text-[#ff5555] border border-[#ff5555]/30'}`}>
                          {isInc ? (
                            <ArrowUp className="w-2.5 h-2.5" />
                          ) : (
                            <ArrowDown className="w-2.5 h-2.5" />
                          )}
                          {t.type}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-5 font-serif text-[#e4e3e0] text-xs truncate max-w-[150px]">
                        {t.category}
                      </td>

                      {/* Mode */}
                      <td className="py-3.5 px-5 text-[#e4e3e0]/60 font-mono text-[10px] tracking-wider uppercase">
                        {t.mode}
                      </td>

                      {/* Ref */}
                      <td className="py-3.5 px-4 font-mono text-[#e4e3e0]/50">
                        {t.reference || '—'}
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-6 text-[#e4e3e0]/60 max-w-[280px] truncate" title={t.description}>
                        {t.description || '—'}
                      </td>

                      {/* Amount */}
                      <td className={`py-3.5 px-6 font-mono font-medium text-right ${isInc ? 'text-[#66bb6a]' : 'text-[#e4e3e0]'}`}>
                        {formatVal(t.amount)}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-6 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 opacity-50 group-hover:opacity-100 transition duration-150">
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="p-1.5 hover:bg-[#1a1a1a] text-[#e4e3e0]/60 hover:text-[#c5a059] rounded border border-transparent hover:border-[#222] transition cursor-pointer"
                            title="Edit Transaction"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this voucher entry permanently?')) {
                                onDeleteTransaction(t.id);
                              }
                            }}
                            className="p-1.5 hover:bg-[#1a1a1a] text-[#e4e3e0]/60 hover:text-rose-400 rounded border border-transparent hover:border-[#222] transition cursor-pointer"
                            title="Delete Voucher"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-[#e4e3e0]/40">
                    <FileText className="w-8 h-8 mx-auto stroke-1 text-[#c5a059]/60" />
                    <p className="mt-3 text-xs">No matching transactions found. Try resetting filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center justify-between border-t border-[#222] px-6 py-4 bg-[#0c0c0c]/80">
          <span className="text-[10px] text-[#e4e3e0]/40 font-mono uppercase tracking-wider">
            SHOWING {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} OF {filteredTransactions.length} ENTRIES
          </span>
          <div className="flex gap-1">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="p-1.5 rounded border border-[#222] bg-[#111111] hover:bg-[#1a1a1a] disabled:opacity-30 disabled:hover:bg-[#111111] text-[#e4e3e0] transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3.5 py-1.5 text-xs font-mono text-[#e4e3e0]/80 bg-[#111111] border border-[#222] rounded">
              PAGE {currentPage} OF {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded border border-[#222] bg-[#111111] hover:bg-[#1a1a1a] disabled:opacity-30 disabled:hover:bg-[#111111] text-[#e4e3e0] transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Manual Voucher Creation & Editing Modal */}
      <AnimatePresence>
        {(isAddOpen || isEditOpen) && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              className="bg-[#111111] border border-[#222] w-full max-w-xl rounded-lg shadow-2xl overflow-hidden"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#222]">
                <div>
                  <h3 className="font-serif italic text-lg text-[#e4e3e0]">
                    {isAddOpen ? 'Add Financial Voucher' : 'Edit Accounting Voucher'}
                  </h3>
                  <p className="text-xs text-[#e4e3e0]/40 mt-1">
                    Generate standard accounting vouchers for Orchid Heights
                  </p>
                </div>
                <button 
                  onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
                  className="p-1.5 hover:bg-[#1a1a1a] text-[#e4e3e0]/40 hover:text-[#e4e3e0] rounded transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Voucher Type */}
                  <div>
                    <label className="block text-[10px] font-mono font-semibold uppercase tracking-wider text-[#e4e3e0]/40 mb-1.5">Voucher Type *</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as 'Income' | 'Expense')}
                      className="w-full bg-[#080808] border border-[#222] text-[#e4e3e0] px-3.5 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#c5a059]"
                    >
                      <option value="Expense">Expense (Payment Voucher)</option>
                      <option value="Income">Income (Receipt Voucher)</option>
                    </select>
                  </div>

                  {/* Date (dd-mm-yyyy) */}
                  <div>
                    <label className="block text-[10px] font-mono font-semibold uppercase tracking-wider text-[#e4e3e0]/40 mb-1.5">Voucher Date *</label>
                    <input
                      type="text"
                      placeholder="e.g., 03-06-2026"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full bg-[#080808] border border-[#222] text-[#e4e3e0] px-3.5 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#c5a059]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Category Selection */}
                  <div>
                    <label className="block text-[10px] font-mono font-semibold uppercase tracking-wider text-[#e4e3e0]/40 mb-1.5">Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#080808] border border-[#222] text-[#e4e3e0] px-3.5 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#c5a059]"
                    >
                      {uniqueCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="Custom">+ Write custom category</option>
                    </select>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-[10px] font-mono font-semibold uppercase tracking-wider text-[#e4e3e0]/40 mb-1.5">Voucher Amount (₹) *</label>
                    <input
                      type="number"
                      placeholder="e.g. 5000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      min="0.1"
                      step="any"
                      className="w-full bg-[#080808] border border-[#222] text-[#e4e3e0] px-3.5 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#c5a059]"
                    />
                  </div>
                </div>

                {/* Custom category input if selected */}
                {category === 'Custom' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-1"
                  >
                    <label className="block text-[10px] font-mono font-semibold uppercase tracking-wider text-[#c5a059] mb-1">Custom Category Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Lift Cable Upgrades"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      required
                      className="w-full bg-[#080808] border border-[#c5a059]/40 text-[#e4e3e0] px-3.5 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#c5a059]"
                    />
                  </motion.div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Mode of Payment */}
                  <div>
                    <label className="block text-[10px] font-mono font-semibold uppercase tracking-wider text-[#e4e3e0]/40 mb-1.5">Payment Mode *</label>
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                      className="w-full bg-[#080808] border border-[#222] text-[#e4e3e0] px-3.5 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#c5a059]"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank: JCOM">Bank: JCOM</option>
                      <option value="Bank: CBI">Bank: CBI</option>
                      <option value="TRANSFER">TRANSFER</option>
                    </select>
                  </div>

                  {/* Reference No */}
                  <div>
                    <label className="block text-[10px] font-mono font-semibold uppercase tracking-wider text-[#e4e3e0]/40 mb-1.5">Cheque / Ref No.</label>
                    <input
                      type="text"
                      placeholder="e.g. 38595"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full bg-[#080808] border border-[#222] text-[#e4e3e0] px-3.5 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#c5a059]"
                    />
                  </div>
                </div>

                {/* Head ID */}
                <div>
                  <label className="block text-[10px] font-mono font-semibold uppercase tracking-wider text-[#e4e3e0]/40 mb-1.5">Accounting Ledger Head ID</label>
                  <input
                    type="text"
                    placeholder="e.g. Expense_Lift Maintenance (Leave empty for auto-assign)"
                    value={headId}
                    onChange={(e) => setHeadId(e.target.value)}
                    className="w-full bg-[#080808] border border-[#222] text-[#e4e3e0]/80 px-3.5 py-2 rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#c5a059] font-mono"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-mono font-semibold uppercase tracking-wider text-[#e4e3e0]/40 mb-1.5">Transaction Description *</label>
                  <textarea
                    placeholder="Provide audit description (e.g., Wing B - Block 901 - RAMJIBHAI BHIKHABHAI MAKWANA)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    required
                    className="w-full bg-[#080808] border border-[#222] text-[#e4e3e0] px-3.5 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#c5a059]"
                  />
                </div>

                {/* Submit row */}
                <div className="pt-4 border-t border-[#222] flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
                    className="px-4 py-2 border border-[#222] text-[#e4e3e0]/80 text-sm font-semibold rounded hover:bg-[#1a1a1a] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#c5a059] hover:bg-[#b08c46] text-[#080808] text-sm font-bold rounded transition cursor-pointer"
                  >
                    {isAddOpen ? 'Add Transaction' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
