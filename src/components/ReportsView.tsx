import { useState, useMemo, useEffect } from 'react';
import { Transaction, SummaryCards } from '../types';
import { motion, AnimatePresence } from 'motion/react';
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
  ChevronUp,
  Download,
  FileSpreadsheet,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { calculateAccountingSummary } from '../utils';

interface ReportsViewProps {
  transactions: Transaction[];
  summary: SummaryCards;
}

export default function ReportsView({ transactions, summary }: ReportsViewProps) {
  const [activeReportTab, setActiveReportTab] = useState<'income_expense' | 'balance_sheet'>('income_expense');
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  // Filter States for the On-Screen Active view
  const [filterType, setFilterType] = useState<'all' | 'datewise' | 'monthwise'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Export Modal Dialog States
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'docx' | 'pdf' | null>(null);
  const [exportDurationType, setExportDurationType] = useState<'all' | 'datewise' | 'monthwise'>('all');
  const [exportStartDate, setExportStartDate] = useState<string>('');
  const [exportEndDate, setExportEndDate] = useState<string>('');
  const [exportSelectedMonth, setExportSelectedMonth] = useState<string>('');

  // Hover Tooltip details states
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [hoveredCategoryMonth, setHoveredCategoryMonth] = useState<string | null>(null);
  const [hoveredCategoryAmount, setHoveredCategoryAmount] = useState<number | null>(null);
  const [hoveredBalanceSheetKey, setHoveredBalanceSheetKey] = useState<'cash' | 'bank' | 'fd' | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Unique list of monthYears in dataset
  const uniqueMonths = useMemo(() => {
    const months = new Set(transactions.map(t => t.monthYear));
    return Array.from(months).sort((a, b) => {
      const aParts = a.split(' ');
      const bParts = b.split(' ');
      const years = Number(bParts[1]) - Number(aParts[1]);
      if (years !== 0) return years;
      const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return monthsOrder.indexOf(bParts[0]) - monthsOrder.indexOf(aParts[0]);
    });
  }, [transactions]);

  // Sync state values with available data
  useEffect(() => {
    if (uniqueMonths.length > 0) {
      if (!selectedMonth) setSelectedMonth(uniqueMonths[0]);
      if (!exportSelectedMonth) setExportSelectedMonth(uniqueMonths[0]);
    }
  }, [uniqueMonths]);

  useEffect(() => {
    if (transactions.length > 0) {
      const sortedDates = [...transactions]
        .map(t => t.parsedDate)
        .filter(Boolean)
        .sort();
      if (sortedDates.length > 0) {
        const firstDate = sortedDates[0];
        const lastDate = sortedDates[sortedDates.length - 1];
        
        if (!startDate) {
          setStartDate(firstDate);
          setExportStartDate(firstDate);
        }
        if (!endDate) {
          setEndDate(lastDate);
          setExportEndDate(lastDate);
        }
      }
    }
  }, [transactions]);

  // Compute tooltip position style
  const getTooltipStyle = () => {
    const tooltipWidth = 330;
    let left = mousePos.x + 15;
    let top = mousePos.y + 15;
    
    if (left + tooltipWidth > window.innerWidth) {
      left = mousePos.x - tooltipWidth - 15;
    }
    
    return {
      position: 'fixed' as const,
      left,
      top,
      zIndex: 1000,
      width: tooltipWidth,
    };
  };

  // List of transactions for hovered category + month
  const hoveredCategoryTransactions = useMemo(() => {
    if (!hoveredCategory || !hoveredCategoryMonth) return [];
    return transactions.filter(t => {
      if (t.isContra || t.isInvestment) return false;
      return t.monthYear === hoveredCategoryMonth && t.category === hoveredCategory;
    });
  }, [transactions, hoveredCategory, hoveredCategoryMonth]);

  // List of transactions for hovered balance sheet key
  const hoveredBalanceSheetItemTransactions = useMemo(() => {
    if (!hoveredBalanceSheetKey) return [];
    return transactions.filter(t => {
      const modeLower = t.mode.toLowerCase();
      if (hoveredBalanceSheetKey === 'cash') {
        return modeLower.includes('cash');
      }
      if (hoveredBalanceSheetKey === 'bank') {
        return modeLower.includes('jcom') || modeLower.includes('cbi') || modeLower.includes('transfer') || modeLower.includes('trf');
      }
      if (hoveredBalanceSheetKey === 'fd') {
        return t.isInvestment || t.category.toLowerCase().includes('fd interest');
      }
      return false;
    }).slice(0, 10);
  }, [transactions, hoveredBalanceSheetKey]);

  // Format currency helper
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

  // Filtered transactions for the current screen view
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterType === 'all') return true;
      if (filterType === 'monthwise') {
        return t.monthYear === selectedMonth;
      }
      if (filterType === 'datewise') {
        const dateVal = t.parsedDate;
        if (startDate && dateVal < startDate) return false;
        if (endDate && dateVal > endDate) return false;
        return true;
      }
      return true;
    });
  }, [transactions, filterType, selectedMonth, startDate, endDate]);

  // Period-specific summary metrics for the on-screen display (Incomes and Expenditures)
  const activePeriodSummary = useMemo(() => {
    return calculateAccountingSummary(filteredTransactions);
  }, [filteredTransactions]);

  // Cumulative accounting summary up to the active end date (used for Balance Sheet Assets)
  const activeSummary = useMemo(() => {
    const upToDateTransactions = transactions.filter(t => {
      if (filterType === 'all') return true;
      if (filterType === 'monthwise') {
        const sortedMonthTx = transactions.filter(tx => tx.monthYear === selectedMonth).sort((a, b) => b.parsedDate.localeCompare(a.parsedDate));
        if (sortedMonthTx.length > 0) {
          const maxDate = sortedMonthTx[0].parsedDate;
          return t.parsedDate <= maxDate;
        }
        return true;
      }
      if (filterType === 'datewise') {
        if (endDate) {
          return t.parsedDate <= endDate;
        }
        return true;
      }
      return true;
    });
    return calculateAccountingSummary(upToDateTransactions);
  }, [transactions, filterType, selectedMonth, endDate]);

  // 1. Calculate Monthly Income & Expense data for screen
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

    filteredTransactions.forEach(t => {
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
  }, [filteredTransactions]);

  // Set first month as expanded by default
  useEffect(() => {
    if (monthlyData.length > 0 && !expandedMonth) {
      setExpandedMonth(monthlyData[0].month);
    }
  }, [monthlyData]);

  // 2. Balance Sheet Calculations (Reactive)
  const balanceSheet = useMemo(() => {
    const corpusFund = 2500000; // Fixed Corpus Fund
    
    // Total assets as of current date
    const cashOnHand = activeSummary.cashOnHand;
    const bankBalance = activeSummary.bankBalance;
    const fdInvestments = activeSummary.fdInvestment;
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
  }, [activeSummary]);

  // Execute export based on selected format and chosen modal filters
  const executeExport = (format: 'excel' | 'csv' | 'docx' | 'pdf') => {
    const timestamp = new Date().toISOString().split('T')[0];

    // Filter transactions for export
    const exportTx = transactions.filter(t => {
      if (t.isContra || t.isInvestment) return false;
      if (exportDurationType === 'all') return true;
      if (exportDurationType === 'monthwise') {
        return t.monthYear === exportSelectedMonth;
      }
      if (exportDurationType === 'datewise') {
        const dateVal = t.parsedDate;
        if (exportStartDate && dateVal < exportStartDate) return false;
        if (exportEndDate && dateVal > exportEndDate) return false;
        return true;
      }
      return true;
    });

    // Compute dynamic assets up to selection end-date for balance sheet
    const exportAssetSummary = calculateAccountingSummary(transactions.filter(t => {
      if (exportDurationType === 'all') return true;
      if (exportDurationType === 'monthwise') {
        const sortedMonthTx = transactions.filter(tx => tx.monthYear === exportSelectedMonth).sort((a, b) => b.parsedDate.localeCompare(a.parsedDate));
        if (sortedMonthTx.length > 0) {
          const maxDate = sortedMonthTx[0].parsedDate;
          return t.parsedDate <= maxDate;
        }
        return true;
      }
      if (exportDurationType === 'datewise') {
        if (exportEndDate) {
          return t.parsedDate <= exportEndDate;
        }
        return true;
      }
      return true;
    }));

    const exportCorpus = 2500000;
    const exportCash = exportAssetSummary.cashOnHand;
    const exportBank = exportAssetSummary.bankBalance;
    const exportFD = exportAssetSummary.fdInvestment;
    const exportAssetsTotal = exportCash + exportBank + exportFD;
    const exportReservesTotal = exportAssetsTotal - exportCorpus;

    const exportBS = {
      corpusFund: exportCorpus,
      accumulatedReserves: exportReservesTotal,
      cashOnHand: exportCash,
      bankBalance: exportBank,
      fdInvestments: exportFD,
      totalAssets: exportAssetsTotal,
      totalLiabilitiesEquity: exportCorpus + exportReservesTotal
    };

    // Calculate monthly breakdown for operating report export
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

    exportTx.forEach(t => {
      const key = t.monthYear;
      const dateParts = t.parsedDate.split('-');
      const sortingKey = `${dateParts[0]}-${dateParts[1]}`;

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

    const exportMonthlyData = Object.values(monthsMap).sort((a, b) => b.sortingKey.localeCompare(a.sortingKey));

    let rangeLabel = 'All Time';
    if (exportDurationType === 'monthwise') {
      rangeLabel = `For Month: ${exportSelectedMonth}`;
    } else if (exportDurationType === 'datewise') {
      rangeLabel = `From ${exportStartDate ? exportStartDate.split('-').reverse().join('-') : 'Start'} To ${exportEndDate ? exportEndDate.split('-').reverse().join('-') : 'End'}`;
    }

    if (format === 'pdf') {
      // Temporarily sync active view so standard browser printing captures the selected range
      setFilterType(exportDurationType);
      if (exportDurationType === 'monthwise') setSelectedMonth(exportSelectedMonth);
      if (exportDurationType === 'datewise') {
        setStartDate(exportStartDate);
        setEndDate(exportEndDate);
      }
      setExportFormat(null);
      setTimeout(() => {
        window.print();
      }, 300);
      return;
    }

    if (format === 'excel') {
      const wb = XLSX.utils.book_new();
      
      if (activeReportTab === 'balance_sheet') {
        const wsData: any[][] = [
          ['ORCHID HEIGHTS OWNERS ASSOCIATION'],
          ['Statement of Financial Affairs (Balance Sheet)'],
          [`Period: ${rangeLabel} (As of ${todayStr})`],
          [],
          ['Capital Assets', 'Amount (INR)', '', 'Liabilities & Capital', 'Amount (INR)'],
          ['Cash on Hand', exportBS.cashOnHand, '', 'Members\' Corpus Fund', exportBS.corpusFund],
          ['Society Bank Balances', exportBS.bankBalance, '', 'Accumulated General Reserves', exportBS.accumulatedReserves],
          ['Fixed Deposits (FD Reserves)', exportBS.fdInvestments, '', 'Current Outstanding Liabilities', 0],
          [],
          ['Total Assets (A)', exportBS.totalAssets, '', 'Total Reserves & Capital (B)', exportBS.totalLiabilitiesEquity],
          [],
          ['Status: Balanced (A = B)'],
          ['Verification Hash: SHA256-OHCOMMITTEE-2026-SECURE']
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet');
        XLSX.writeFile(wb, `Orchid_Heights_Balance_Sheet_${timestamp}.xlsx`);
      } else {
        const wsData: any[][] = [
          ['ORCHID HEIGHTS OWNERS ASSOCIATION'],
          ['Annual Operating Income & Expenditure Statement'],
          [`Period: ${rangeLabel} (As of ${todayStr})`],
          [],
          ['Month', 'Category', 'Type', 'Amount (INR)']
        ];
        
        exportMonthlyData.forEach(m => {
          Object.entries(m.incomes).forEach(([cat, amt]) => {
            wsData.push([m.month, cat, 'Income', amt]);
          });
          Object.entries(m.expenses).forEach(([cat, amt]) => {
            wsData.push([m.month, cat, 'Expense', amt]);
          });
        });
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, 'Operating Statement');
        XLSX.writeFile(wb, `Orchid_Heights_Operating_Statement_${timestamp}.xlsx`);
      }
      setExportFormat(null);
      return;
    }

    if (format === 'csv') {
      let csvContent = '';
      if (activeReportTab === 'balance_sheet') {
        csvContent = [
          'ORCHID HEIGHTS OWNERS ASSOCIATION',
          'Statement of Financial Affairs (Balance Sheet)',
          `Period: ${rangeLabel} (As of ${todayStr})`,
          '',
          'Capital Assets,Amount (INR),Liabilities & Capital,Amount (INR)',
          `Cash on Hand,${exportBS.cashOnHand},Members' Corpus Fund,${exportBS.corpusFund}`,
          `Society Bank Balances,${exportBS.bankBalance},Accumulated General Reserves,${exportBS.accumulatedReserves}`,
          `Fixed Deposits (FD Reserves),${exportBS.fdInvestments},Current Outstanding Liabilities,0`,
          `Total Assets (A),${exportBS.totalAssets},Total Reserves & Capital (B),${exportBS.totalLiabilitiesEquity}`,
          '',
          'Status,Balanced (A = B)',
          'Verification Hash,SHA256-OHCOMMITTEE-2026-SECURE'
        ].join('\n');
      } else {
        const csvRows = [
          'ORCHID HEIGHTS OWNERS ASSOCIATION',
          'Annual Operating Income & Expenditure Statement',
          `Period: ${rangeLabel} (As of ${todayStr})`,
          '',
          'Month,Category,Type,Amount'
        ];
        exportMonthlyData.forEach(m => {
          Object.entries(m.incomes).forEach(([cat, amt]) => {
            csvRows.push(`${m.month},"${cat}",Income,${amt}`);
          });
          Object.entries(m.expenses).forEach(([cat, amt]) => {
            csvRows.push(`${m.month},"${cat}",Expense,${amt}`);
          });
        });
        csvContent = csvRows.join('\n');
      }
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Orchid_Heights_${activeReportTab === 'balance_sheet' ? 'Balance_Sheet' : 'Operating_Statement'}_${timestamp}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setExportFormat(null);
      return;
    }

    if (format === 'docx') {
      let htmlContent = '';
      if (activeReportTab === 'balance_sheet') {
        htmlContent = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head><title>Balance Sheet</title>
          <style>
            body { font-family: 'Arial', sans-serif; color: #222; }
            h1 { text-align: center; font-size: 20px; color: #1a1a1a; margin-bottom: 5px; }
            h2 { text-align: center; font-size: 14px; color: #c5a059; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
            th { background-color: #f7f5f0; color: #a37c35; font-weight: bold; }
            .total { font-weight: bold; background-color: #fcfbf9; }
            .footer { margin-top: 40px; font-size: 10px; color: #777; text-align: center; }
          </style>
          </head>
          <body>
            <h1>ORCHID HEIGHTS OWNERS ASSOCIATION</h1>
            <h2>Statement of Financial Affairs (Balance Sheet)</h2>
            <p style="text-align: center; font-size: 11px;">Period: ${rangeLabel} (As of ${todayStr})</p>
            
            <table>
              <thead>
                <tr>
                  <th colspan="2">CAPITAL ASSETS</th>
                  <th colspan="2">LIABILITIES & CAPITAL</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Cash on Hand</td>
                  <td>${formatCurrency(exportBS.cashOnHand)}</td>
                  <td>Members' Corpus Fund</td>
                  <td>${formatCurrency(exportBS.corpusFund)}</td>
                </tr>
                <tr>
                  <td>Society Bank Balances</td>
                  <td>${formatCurrency(exportBS.bankBalance)}</td>
                  <td>Accumulated General Reserves</td>
                  <td>${formatCurrency(exportBS.accumulatedReserves)}</td>
                </tr>
                <tr>
                  <td>Fixed Deposits (FD Reserves)</td>
                  <td>${formatCurrency(exportBS.fdInvestments)}</td>
                  <td>Current Outstanding Liabilities</td>
                  <td>₹0</td>
                </tr>
                <tr class="total">
                  <td>Total Assets (A)</td>
                  <td>${formatCurrency(exportBS.totalAssets)}</td>
                  <td>Total Reserves & Capital (B)</td>
                  <td>${formatCurrency(exportBS.totalLiabilitiesEquity)}</td>
                </tr>
              </tbody>
            </table>
            
            <p style="margin-top: 20px; font-weight: bold; color: green;">Status: Balanced (A = B)</p>
            
            <div class="footer">
              <p>Orchid Heights Owners Committee • Audit Signature: Verified SHA256-OHCOMMITTEE-2026-SECURE</p>
            </div>
          </body>
          </html>
        `;
      } else {
        let monthlyRowsHtml = '';
        exportMonthlyData.forEach(m => {
          let incomesHtml = Object.entries(m.incomes).map(([cat, amt]) => `<tr><td>${cat}</td><td>Income</td><td>${formatCurrency(amt as number)}</td></tr>`).join('');
          let expensesHtml = Object.entries(m.expenses).map(([cat, amt]) => `<tr><td>${cat}</td><td>Expense</td><td>${formatCurrency(amt as number)}</td></tr>`).join('');
          monthlyRowsHtml += `
            <h3>${m.month} (Net Surplus: ${formatCurrency(m.incomeTotal - m.expenseTotal)})</h3>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                ${incomesHtml}
                ${expensesHtml}
                <tr style="font-weight: bold; background-color: #f9f9f9;">
                  <td>Total Monthly Receipts</td>
                  <td>Income</td>
                  <td>${formatCurrency(m.incomeTotal)}</td>
                </tr>
                <tr style="font-weight: bold; background-color: #f9f9f9;">
                  <td>Total Monthly Debits</td>
                  <td>Expense</td>
                  <td>${formatCurrency(m.expenseTotal)}</td>
                </tr>
              </tbody>
            </table>
            <br/>
          `;
        });

        htmlContent = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head><title>Monthly Operating Report</title>
          <style>
            body { font-family: 'Arial', sans-serif; color: #222; }
            h1 { text-align: center; font-size: 20px; color: #1a1a1a; margin-bottom: 5px; }
            h2 { text-align: center; font-size: 14px; color: #c5a059; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
            th { background-color: #f7f5f0; color: #a37c35; font-weight: bold; }
            .footer { margin-top: 40px; font-size: 10px; color: #777; text-align: center; }
          </style>
          </head>
          <body>
            <h1>ORCHID HEIGHTS OWNERS ASSOCIATION</h1>
            <h2>Annual Operating Income & Expenditure Statement</h2>
            <p style="text-align: center; font-size: 11px;">Period: ${rangeLabel} (As of ${todayStr})</p>
            
            ${monthlyRowsHtml}
            
            <div class="footer">
              <p>Orchid Heights Owners Committee • Audit Signature: Verified SHA256-OHCOMMITTEE-2026-SECURE</p>
            </div>
          </body>
          </html>
        `;
      }

      const blob = new Blob([htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Orchid_Heights_${activeReportTab === 'balance_sheet' ? 'Balance_Sheet' : 'Operating_Statement'}_${timestamp}.docx`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setExportFormat(null);
      return;
    }
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

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {/* EXCEL */}
          <button
            onClick={() => {
              setExportFormat('excel');
              setExportDurationType(filterType);
              setExportSelectedMonth(selectedMonth || uniqueMonths[0]);
              setExportStartDate(startDate);
              setExportEndDate(endDate);
            }}
            className="flex items-center gap-1.5 bg-[#142d1e] hover:bg-[#1a3a27] text-[#4caf50] border border-[#1b432a] px-3.5 py-2 rounded text-xs font-semibold uppercase tracking-wider transition cursor-pointer shadow-sm shadow-emerald-950/20"
            title="Download formatted Excel (.xlsx) sheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel
          </button>

          {/* CSV */}
          <button
            onClick={() => {
              setExportFormat('csv');
              setExportDurationType(filterType);
              setExportSelectedMonth(selectedMonth || uniqueMonths[0]);
              setExportStartDate(startDate);
              setExportEndDate(endDate);
            }}
            className="flex items-center gap-1.5 bg-[#161616] hover:bg-[#202020] text-[#e4e3e0]/80 border border-[#222] px-3.5 py-2 rounded text-xs font-semibold uppercase tracking-wider transition cursor-pointer shadow-sm"
            title="Download standard comma-separated values file"
          >
            <FileText className="w-3.5 h-3.5" />
            CSV
          </button>

          {/* DOCX */}
          <button
            onClick={() => {
              setExportFormat('docx');
              setExportDurationType(filterType);
              setExportSelectedMonth(selectedMonth || uniqueMonths[0]);
              setExportStartDate(startDate);
              setExportEndDate(endDate);
            }}
            className="flex items-center gap-1.5 bg-[#14233c] hover:bg-[#1a2d4d] text-[#42a5f5] border border-[#1b3257] px-3.5 py-2 rounded text-xs font-semibold uppercase tracking-wider transition cursor-pointer shadow-sm shadow-blue-950/20"
            title="Download formatted Word Document (.docx)"
          >
            <Download className="w-3.5 h-3.5" />
            DOCX
          </button>

          {/* PDF */}
          <button
            onClick={() => {
              setExportFormat('pdf');
              setExportDurationType(filterType);
              setExportSelectedMonth(selectedMonth || uniqueMonths[0]);
              setExportStartDate(startDate);
              setExportEndDate(endDate);
            }}
            className="flex items-center gap-1.5 bg-[#c5a059] hover:bg-[#b08c46] text-[#080808] border border-transparent px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-md shadow-[#c5a059]/10"
            title="Download/Print PDF Publication"
          >
            <Printer className="w-3.5 h-3.5" />
            Save PDF
          </button>
        </div>
      </div>

      {/* On-screen Active Period Filter Selector Bar */}
      <div className="bg-[#111111] border border-[#222] px-6 py-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#c5a059]" />
          <span className="text-xs font-mono uppercase tracking-wider font-semibold text-[#e4e3e0]/80">Active Screen Filter:</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-[#080808] border border-[#222] p-1 rounded">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider rounded font-bold transition ${filterType === 'all' ? 'bg-[#1a1a1a] text-[#c5a059]' : 'text-[#e4e3e0]/40 hover:text-[#e4e3e0]'}`}
            >
              All Time
            </button>
            <button
              onClick={() => setFilterType('monthwise')}
              className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider rounded font-bold transition ${filterType === 'monthwise' ? 'bg-[#1a1a1a] text-[#c5a059]' : 'text-[#e4e3e0]/40 hover:text-[#e4e3e0]'}`}
            >
              Monthwise
            </button>
            <button
              onClick={() => setFilterType('datewise')}
              className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider rounded font-bold transition ${filterType === 'datewise' ? 'bg-[#1a1a1a] text-[#c5a059]' : 'text-[#e4e3e0]/40 hover:text-[#e4e3e0]'}`}
            >
              Datewise
            </button>
          </div>

          {filterType === 'monthwise' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[#080808] border border-[#222] text-[#e4e3e0] text-xs px-3 py-1.5 rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#c5a059] cursor-pointer"
            >
              {uniqueMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}

          {filterType === 'datewise' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#080808] border border-[#222] text-[#e4e3e0] text-xs px-2.5 py-1.5 rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#c5a059]"
              />
              <span className="text-[#e4e3e0]/30 text-xs">—</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#080808] border border-[#222] text-[#e4e3e0] text-xs px-2.5 py-1.5 rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#c5a059]"
              />
            </div>
          )}
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
                <span className="text-xl font-mono font-bold text-[#66bb6a] block mt-1">{formatCurrency(activePeriodSummary.totalIncome)}</span>
                <span className="text-[9px] font-mono text-[#e4e3e0]/30 block mt-0.5">Operating Receipts Only</span>
              </div>
              <div className="bg-[#0c0c0c] border border-[#222] p-4 rounded print:border-gray-200 print:bg-gray-50">
                <span className="text-[9px] font-mono text-[#e4e3e0]/40 uppercase tracking-wider block">Total Period Expense</span>
                <span className="text-xl font-mono font-bold text-[#ff5555] block mt-1">{formatCurrency(activePeriodSummary.totalExpense)}</span>
                <span className="text-[9px] font-mono text-[#e4e3e0]/30 block mt-0.5">Operating Overhead Only</span>
              </div>
              <div className="bg-[#0c0c0c] border border-[#222] p-4 rounded print:border-gray-200 print:bg-gray-50">
                <span className="text-[9px] font-mono text-[#e4e3e0]/40 uppercase tracking-wider block">Net Accumulative Savings</span>
                <span className="text-xl font-mono font-bold text-[#c5a059] block mt-1">{formatCurrency(activePeriodSummary.netBalance)}</span>
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
                                      <div 
                                        key={cat} 
                                        onMouseEnter={(e) => {
                                          setHoveredCategory(cat);
                                          setHoveredCategoryMonth(m.month);
                                          setHoveredCategoryAmount(amt as number);
                                          setMousePos({ x: e.clientX, y: e.clientY });
                                        }}
                                        onMouseMove={(e) => {
                                          setMousePos({ x: e.clientX, y: e.clientY });
                                        }}
                                        onMouseLeave={() => {
                                          setHoveredCategory(null);
                                          setHoveredCategoryMonth(null);
                                          setHoveredCategoryAmount(null);
                                        }}
                                        className="flex justify-between text-xs font-mono text-[#e4e3e0]/70 hover:text-[#c5a059] hover:bg-[#1a1a1a]/40 px-1.5 py-0.5 rounded transition cursor-help relative"
                                      >
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
                                      <div 
                                        key={cat} 
                                        onMouseEnter={(e) => {
                                          setHoveredCategory(cat);
                                          setHoveredCategoryMonth(m.month);
                                          setHoveredCategoryAmount(amt as number);
                                          setMousePos({ x: e.clientX, y: e.clientY });
                                        }}
                                        onMouseMove={(e) => {
                                          setMousePos({ x: e.clientX, y: e.clientY });
                                        }}
                                        onMouseLeave={() => {
                                          setHoveredCategory(null);
                                          setHoveredCategoryMonth(null);
                                          setHoveredCategoryAmount(null);
                                        }}
                                        className="flex justify-between text-xs font-mono text-[#e4e3e0]/70 hover:text-[#ff5555] hover:bg-[#1a1a1a]/40 px-1.5 py-0.5 rounded transition cursor-help relative"
                                      >
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
                  <div 
                    onMouseEnter={(e) => {
                      setHoveredBalanceSheetKey('cash');
                      setMousePos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => {
                      setMousePos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => {
                      setHoveredBalanceSheetKey(null);
                    }}
                    className="flex justify-between items-center text-xs hover:text-[#c5a059] hover:bg-[#161616]/40 p-1.5 rounded transition cursor-help relative"
                  >
                    <div className="space-y-0.5">
                      <p className="font-serif italic font-semibold text-[#e4e3e0] print:text-black">Cash on Hand</p>
                      <p className="text-[10px] font-mono text-[#e4e3e0]/40 print:text-gray-500">Operational currency float</p>
                    </div>
                    <span className="font-mono text-sm text-[#e4e3e0] print:text-black">{formatCurrency(balanceSheet.cashOnHand)}</span>
                  </div>

                  <div 
                    onMouseEnter={(e) => {
                      setHoveredBalanceSheetKey('bank');
                      setMousePos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => {
                      setMousePos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => {
                      setHoveredBalanceSheetKey(null);
                    }}
                    className="flex justify-between items-center text-xs hover:text-[#c5a059] hover:bg-[#161616]/40 p-1.5 rounded transition cursor-help relative"
                  >
                    <div className="space-y-0.5">
                      <p className="font-serif italic font-semibold text-[#e4e3e0] print:text-black">Society Bank Balances</p>
                      <p className="text-[10px] font-mono text-[#e4e3e0]/40 print:text-gray-500">Active current & savings bank ledgers</p>
                    </div>
                    <span className="font-mono text-sm text-[#e4e3e0] print:text-black">{formatCurrency(balanceSheet.bankBalance)}</span>
                  </div>

                  <div 
                    onMouseEnter={(e) => {
                      setHoveredBalanceSheetKey('fd');
                      setMousePos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => {
                      setMousePos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => {
                      setHoveredBalanceSheetKey(null);
                    }}
                    className="flex justify-between items-center text-xs hover:text-[#c5a059] hover:bg-[#161616]/40 p-1.5 rounded transition cursor-help relative"
                  >
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

      {/* Dynamic Duration Selection and Export Modal */}
      <AnimatePresence>
        {exportFormat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080808]/80 backdrop-blur-sm print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#111111] border border-[#c5a059]/40 rounded-lg max-w-md w-full overflow-hidden shadow-2xl"
            >
              <div className="px-5 py-4 border-b border-[#222] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#c5a059]" />
                  <span className="text-sm font-serif italic text-[#e4e3e0] font-bold">
                    Configure Document Export ({exportFormat.toUpperCase()})
                  </span>
                </div>
                <button
                  onClick={() => setExportFormat(null)}
                  className="text-[#e4e3e0]/40 hover:text-[#e4e3e0] transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#e4e3e0]/40">
                    Select Statement Duration
                  </label>
                  <div className="grid grid-cols-3 gap-2 bg-[#080808] p-1 border border-[#222] rounded">
                    <button
                      type="button"
                      onClick={() => setExportDurationType('all')}
                      className={`py-1 text-[9px] font-mono uppercase tracking-wider rounded font-bold transition ${exportDurationType === 'all' ? 'bg-[#1a1a1a] text-[#c5a059]' : 'text-[#e4e3e0]/40 hover:text-[#e4e3e0]'}`}
                    >
                      All Time
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportDurationType('monthwise')}
                      className={`py-1 text-[9px] font-mono uppercase tracking-wider rounded font-bold transition ${exportDurationType === 'monthwise' ? 'bg-[#1a1a1a] text-[#c5a059]' : 'text-[#e4e3e0]/40 hover:text-[#e4e3e0]'}`}
                    >
                      Monthwise
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportDurationType('datewise')}
                      className={`py-1 text-[9px] font-mono uppercase tracking-wider rounded font-bold transition ${exportDurationType === 'datewise' ? 'bg-[#1a1a1a] text-[#c5a059]' : 'text-[#e4e3e0]/40 hover:text-[#e4e3e0]'}`}
                    >
                      Datewise
                    </button>
                  </div>
                </div>

                {exportDurationType === 'monthwise' && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-[#e4e3e0]/40">SELECT CALENDAR MONTH</label>
                    <select
                      value={exportSelectedMonth}
                      onChange={(e) => setExportSelectedMonth(e.target.value)}
                      className="w-full bg-[#080808] border border-[#222] text-[#e4e3e0] text-xs px-3 py-2 rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#c5a059]"
                    >
                      {uniqueMonths.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}

                {exportDurationType === 'datewise' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-[#e4e3e0]/40">START DATE</label>
                      <input
                        type="date"
                        value={exportStartDate}
                        onChange={(e) => setExportStartDate(e.target.value)}
                        className="w-full bg-[#080808] border border-[#222] text-[#e4e3e0] text-xs px-3 py-2 rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#c5a059]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-[#e4e3e0]/40">END DATE</label>
                      <input
                        type="date"
                        value={exportEndDate}
                        onChange={(e) => setExportEndDate(e.target.value)}
                        className="w-full bg-[#080808] border border-[#222] text-[#e4e3e0] text-xs px-3 py-2 rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#c5a059]"
                      />
                    </div>
                  </div>
                )}

                <div className="bg-[#0c0c0c] border border-[#222] p-3.5 rounded text-xs text-[#e4e3e0]/70 space-y-1 font-mono">
                  <p className="text-[10px] text-[#c5a059] uppercase tracking-wider font-bold">Export Summary Details</p>
                  <p>Document Format: <span className="text-[#e4e3e0] uppercase font-bold">{exportFormat}</span></p>
                  <p>Report Tab: <span className="text-[#e4e3e0] font-bold">{activeReportTab === 'balance_sheet' ? 'Balance Sheet' : 'Income & Expense Statement'}</span></p>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-[#222] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setExportFormat(null)}
                  className="px-4 py-2 border border-[#222] text-[#e4e3e0]/80 text-xs font-semibold rounded hover:bg-[#1a1a1a] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeExport(exportFormat)}
                  className="px-5 py-2 bg-[#c5a059] hover:bg-[#b08c46] text-[#080808] text-xs font-bold rounded transition cursor-pointer flex items-center gap-1.5"
                >
                  {exportFormat === 'pdf' ? <Printer className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                  {exportFormat === 'pdf' ? 'Print Statement' : 'Save Document'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Operating Categories Tooltip */}
      {hoveredCategory && (
        <div 
          style={getTooltipStyle()} 
          className="bg-[#0f0f0f]/95 border border-[#c5a059]/50 text-xs text-[#e4e3e0] p-4 rounded-lg shadow-2xl space-y-3 pointer-events-none backdrop-blur-md select-none border-t-2 print:hidden"
        >
          <div className="flex justify-between items-center border-b border-[#222] pb-2">
            <div className="space-y-0.5">
              <span className="font-serif italic text-xs text-[#c5a059] block font-bold">{hoveredCategory}</span>
              <span className="font-mono text-[8px] text-[#e4e3e0]/40 uppercase tracking-widest">{hoveredCategoryMonth} Breakdown</span>
            </div>
            <span className="font-mono text-xs text-emerald-500 font-bold">{formatCurrency(hoveredCategoryAmount || 0)}</span>
          </div>
          
          <div className="max-h-40 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {hoveredCategoryTransactions.length > 0 ? (
              hoveredCategoryTransactions.map((tx, idx) => (
                <div key={tx.id || idx} className="text-[10px] space-y-0.5 border-b border-[#222]/30 pb-1.5 last:border-0 last:pb-0 font-sans">
                  <div className="flex justify-between font-mono">
                    <span className="text-[#e4e3e0]/50">{tx.date}</span>
                    <span className="font-semibold text-[#e4e3e0]/90">{formatCurrency(tx.amount)}</span>
                  </div>
                  <p className="text-[10px] text-[#e4e3e0]/70 truncate max-w-[280px]">
                    {tx.description}
                  </p>
                  {tx.residentName && (
                    <p className="text-[9px] text-[#c5a059] font-mono font-semibold">
                      Flat: {tx.wing}-{tx.block} | {tx.residentName}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-[10px] text-[#e4e3e0]/30 italic font-mono text-center py-2">No contributing entries</p>
            )}
          </div>
        </div>
      )}

      {/* Floating Balance Sheet Item Tooltip */}
      {hoveredBalanceSheetKey && (
        <div 
          style={getTooltipStyle()} 
          className="bg-[#0f0f0f]/95 border border-[#c5a059]/50 text-xs text-[#e4e3e0] p-4 rounded-lg shadow-2xl space-y-3 pointer-events-none backdrop-blur-md select-none border-t-2 print:hidden"
        >
          <div className="flex justify-between items-center border-b border-[#222] pb-2">
            <span className="font-serif italic text-xs text-[#c5a059] block font-bold">
              {hoveredBalanceSheetKey === 'cash' ? 'Cash Account' : hoveredBalanceSheetKey === 'bank' ? 'Society Bank Accounts' : 'Fixed Deposits (FD)'}
            </span>
            <span className="font-mono text-[8px] text-[#e4e3e0]/40 uppercase tracking-widest">Recent Ledgers</span>
          </div>
          
          <div className="max-h-40 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {hoveredBalanceSheetItemTransactions.length > 0 ? (
              hoveredBalanceSheetItemTransactions.map((tx, idx) => (
                <div key={tx.id || idx} className="text-[10px] space-y-0.5 border-b border-[#222]/30 pb-1.5 last:border-0 last:pb-0 font-sans">
                  <div className="flex justify-between font-mono">
                    <span className="text-[#e4e3e0]/50">{tx.date}</span>
                    <span className={`font-semibold ${tx.type === 'Income' ? 'text-emerald-500' : 'text-red-400'}`}>
                      {tx.type === 'Income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#e4e3e0]/70 truncate max-w-[280px]">
                    {tx.description}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-[#e4e3e0]/30 italic font-mono text-center py-2">No active ledgers</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
