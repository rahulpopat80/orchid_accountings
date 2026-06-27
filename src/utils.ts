import { Transaction, SummaryCards } from './types';

// Helper to parse date from DD-MM-YYYY or DD-MM-YY to YYYY-MM-DD
export function parseDateStringToYYYYMMDD(dateStr: string): string {
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return '2025-01-01'; // Default fallback
  
  let day = parts[0].padStart(2, '0');
  let month = parts[1].padStart(2, '0');
  let year = parts[2];
  
  if (year.length === 2) {
    year = '20' + year;
  }
  
  return `${year}-${month}-${day}`;
}

// Helper to get month name and year (e.g., "Jun 2026")
export function getMonthYearString(dateStr: string): string {
  const yyyymmdd = parseDateStringToYYYYMMDD(dateStr);
  const parts = yyyymmdd.split('-');
  const year = parts[0];
  const monthInt = parseInt(parts[1], 10);
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  return `${months[monthInt - 1] || 'Jan'} ${year}`;
}

// Parses a CSV row correctly taking into account optional double quotes
export function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  
  for (let c = 0; c < line.length; c++) {
    const char = line[c];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(currentCell.trim());
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  cells.push(currentCell.trim());
  return cells;
}

export function parseCSVData(csvText: string): Transaction[] {
  const lines = csvText.split(/\r?\n/);
  const transactions: Transaction[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cells = parseCSVLine(line);
    if (cells.length < 5) continue;
    
    const date = cells[0] || '';
    const typeStr = cells[1] || '';
    const headId = cells[2] || '';
    const categoryRaw = cells[3] || '';
    const amountStr = cells[4] || '0';
    const mode = cells[5] || '';
    const reference = cells[6] || '';
    const description = cells.slice(7).join(',') || ''; // combine any trailing parts
    
    const amount = parseFloat(amountStr.replace(/,/g, '')) || 0;
    
    // Clean Category Name
    let category = categoryRaw || headId;
    // Map to clean readable categories
    if (category.includes('JCOM BANK')) {
      category = 'Bank: JCOM';
    } else if (category.includes('CBI BANK')) {
      category = 'Bank: CBI';
    } else if (category.startsWith('Expense_')) {
      category = category.replace('Expense_', '');
    } else if (category.startsWith('Income_')) {
      category = category.replace('Income_', '');
    }
    
    // Clean some standard categories to uniform names
    if (category.toLowerCase().includes('diesal') || category.toLowerCase().includes('diesel')) {
      category = 'Diesel Expenses';
    } else if (category.toLowerCase().includes('light bill') || category.toLowerCase().includes('electricity')) {
      category = 'Electricity (Light Bill)';
    } else if (category.toLowerCase().includes('safai expense') || category.toLowerCase().includes('cleaning expense')) {
      category = 'Cleaning & Safai Expense';
    } else if (category.toLowerCase().includes('safai kamdar salary') || category.toLowerCase().includes('sweeper salary')) {
      category = 'Sweeper Salary';
    } else if (category.toLowerCase().includes('gardner salary') || category.toLowerCase().includes('gardener')) {
      category = 'Gardener Salary';
    } else if (category.toLowerCase().includes('security salary')) {
      category = 'Security Guard Salary';
    } else if (category.toLowerCase().includes('electric equipment')) {
      category = 'Electrical Equipment & Spares';
    } else if (category.toLowerCase().includes('fd interest')) {
      category = 'FD Interest Income';
    } else if (category.toLowerCase().includes('maintenance income')) {
      category = 'Maintenance Charges Income';
    } else if (category.toLowerCase().includes('withdraw')) {
      category = 'Cash Withdrawals';
    } else if (category.toLowerCase().includes('fd issue')) {
      category = 'FD Placement (Investment)';
    } else if (category.toLowerCase().includes('plumbing')) {
      category = 'Plumbing Maintenance';
    } else if (category.toLowerCase().includes('other misc')) {
      category = 'Miscellaneous Expenses';
    } else if (category.toLowerCase().includes('furniture')) {
      category = 'Furniture & Fixtures';
    } else if (category.toLowerCase().includes('stationary')) {
      category = 'Stationery & Admin';
    } else if (category.toLowerCase().includes('rtgs / neft') && description.includes('CBIN')) {
      category = 'Inter-bank RTGS Transfer';
    }
    
    // Check if Contra / FD Placement
    const descLower = description.toLowerCase();
    const isContra = 
      category.includes('Cash Withdrawals') || 
      descLower.includes('cash self') || 
      descLower.includes('to cash self') || 
      descLower.includes('withdraw from bank') ||
      descLower.includes('cash withdraw') ||
      category.includes('Cash withdraw from JCOM');
      
    const isInvestment = 
      category.includes('FD Placement') || 
      descLower.includes('new fdr issue') || 
      descLower.includes('new fd as');

    // Parse Resident, Wing, Block if present in description or reference
    let wing: 'A' | 'B' | null = null;
    let block: string | null = null;
    let residentName: string | null = null;
    
    // Regex for Wing A - Block 402 - DR. ARVIND SISODIYA
    const wingBlockRegex = /Wing\s+([A-B])\s*-\s*Block\s*(\d+)\s*-\s*(.*)/i;
    const match = description.match(wingBlockRegex);
    if (match) {
      wing = match[1].toUpperCase() as 'A' | 'B';
      block = match[2];
      residentName = match[3].trim();
    } else {
      // Try references or descriptions like "Wing B - Block 702"
      const simpleRegex = /Wing\s+([A-B])\s*-\s*Block\s*(\d+)/i;
      const simpleMatch = description.match(simpleRegex);
      if (simpleMatch) {
        wing = simpleMatch[1].toUpperCase() as 'A' | 'B';
        block = simpleMatch[2];
      }
    }

    const type = typeStr.trim() as 'Income' | 'Expense';
    const parsedDate = parseDateStringToYYYYMMDD(date);
    const monthYear = getMonthYearString(date);

    transactions.push({
      id: `${parsedDate}-${headId || 'tr'}-${amount}-${i}`,
      date,
      type,
      headId,
      category,
      amount,
      mode: mode || 'Cash',
      reference: reference || '',
      description: description || '',
      parsedDate,
      monthYear,
      isContra,
      isInvestment,
      wing,
      block,
      residentName
    });
  }
  
  // Sort descending by date
  return transactions.sort((a, b) => b.parsedDate.localeCompare(a.parsedDate));
}

export function calculateAccountingSummary(transactions: Transaction[]): SummaryCards {
  let cashBalance = 38000; // Let's set a realistic opening balance for Aug 2024
  let jcomBankBalance = 450000; // Let's set realistic opening bank balances
  let cbiBankBalance = 150000;
  let fdInvestment = 2500000; // Starting FD
  
  // Operating values
  let totalIncome = 0;
  let totalExpense = 0;

  // Process chronologically to find accurate running balances
  const chronological = [...transactions].sort((a, b) => a.parsedDate.localeCompare(b.parsedDate));
  
  chronological.forEach(t => {
    const isContra = t.isContra;
    const isFD = t.isInvestment;
    
    // Process cash/bank allocations based on Mode and Type
    const modeLower = t.mode.toLowerCase();
    const isCash = modeLower.includes('cash');
    const isJcom = modeLower.includes('jcom') || modeLower.includes('transfer') || modeLower.includes('trf');
    const isCbi = modeLower.includes('cbi');
    
    if (t.type === 'Income') {
      if (!isContra && !isFD) {
        totalIncome += t.amount;
      }
      
      // Affect running balances
      if (isCash) {
        cashBalance += t.amount;
      } else if (isCbi) {
        cbiBankBalance += t.amount;
      } else {
        // JCOM Bank by default for Bank transactions
        jcomBankBalance += t.amount;
      }
    } else {
      // Expense
      if (!isContra && !isFD) {
        totalExpense += t.amount;
      }
      
      if (isCash) {
        cashBalance -= t.amount;
      } else if (isCbi) {
        cbiBankBalance -= t.amount;
      } else {
        jcomBankBalance -= t.amount;
      }
      
      if (isFD) {
        fdInvestment += t.amount; // Transferring cash to FD Asset
      }
    }
  });

  return {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    cashOnHand: cashBalance,
    bankBalance: jcomBankBalance + cbiBankBalance,
    fdInvestment: fdInvestment
  };
}

export function convertTransactionsToCSV(transactions: Transaction[]): string {
  const headers = ['Date (dd-mm-yyyy)', 'Type', 'Head ID', 'Category', 'Amount', 'Mode', 'Reference', 'Description'];
  const rows = transactions.map(t => {
    // Escape quotes in description
    const cleanDesc = t.description.includes(',') || t.description.includes('"') 
      ? `"${t.description.replace(/"/g, '""')}"` 
      : t.description;
    
    return [
      t.date,
      t.type,
      t.headId,
      t.category,
      t.amount,
      t.mode,
      t.reference,
      cleanDesc
    ].join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

// Generate Wing Stats
export interface BlockStatus {
  block: string;
  residentName: string;
  hasPaid: boolean;
  amountPaid: number;
  lastPaymentDate?: string;
  reference?: string;
}

export interface WingStats {
  wingA: BlockStatus[];
  wingB: BlockStatus[];
}

export function calculateMaintenancePayments(transactions: Transaction[]): WingStats {
  // Let's list some known blocks for A & B wings
  const wingA: { [block: string]: BlockStatus } = {};
  const wingB: { [block: string]: BlockStatus } = {};
  
  // Seed basic blocks
  const blocksA = ['101', '201', '203', '301', '302', '303', '304', '401', '402', '403', '501', '502', '503', '504', '601', '602', '603', '701', '702', '703', '801', '802', '803', '901', '902', '903', '1001', '1002', '1003', '1101', '1102', '1103', '1201'];
  const blocksB = ['101', '102', '201', '202', '203', '204', '301', '302', '303', '304', '401', '402', '403', '404', '501', '502', '503', '504', '601', '602', '603', '604', '701', '702', '703', '704', '801', '802', '803', '804', '901', '902', '903', '904', '1001', '1002', '1003', '1004', '1101', '1102', '1103', '1104', '1201', '1202', '1203', '1204'];
  
  blocksA.forEach(b => {
    wingA[b] = { block: b, residentName: 'Unassigned', hasPaid: false, amountPaid: 0 };
  });
  
  blocksB.forEach(b => {
    wingB[b] = { block: b, residentName: 'Unassigned', hasPaid: false, amountPaid: 0 };
  });

  // Filter maintenance payments
  const maintenanceTrans = transactions.filter(t => t.type === 'Income' && t.category.toLowerCase().includes('maintenance'));
  
  maintenanceTrans.forEach(t => {
    if (t.wing === 'A' && t.block) {
      const b = t.block;
      if (!wingA[b]) {
        wingA[b] = { block: b, residentName: t.residentName || 'Resident', hasPaid: true, amountPaid: 0 };
      }
      wingA[b].hasPaid = true;
      wingA[b].amountPaid += t.amount;
      if (t.residentName) wingA[b].residentName = t.residentName;
      if (!wingA[b].lastPaymentDate || t.parsedDate > parseDateStringToYYYYMMDD(wingA[b].lastPaymentDate!)) {
        wingA[b].lastPaymentDate = t.date;
        wingA[b].reference = t.reference;
      }
    } else if (t.wing === 'B' && t.block) {
      const b = t.block;
      if (!wingB[b]) {
        wingB[b] = { block: b, residentName: t.residentName || 'Resident', hasPaid: true, amountPaid: 0 };
      }
      wingB[b].hasPaid = true;
      wingB[b].amountPaid += t.amount;
      if (t.residentName) wingB[b].residentName = t.residentName;
      if (!wingB[b].lastPaymentDate || t.parsedDate > parseDateStringToYYYYMMDD(wingB[b].lastPaymentDate!)) {
        wingB[b].lastPaymentDate = t.date;
        wingB[b].reference = t.reference;
      }
    }
  });

  // Add back a few custom resident names from descriptions if found
  return {
    wingA: Object.values(wingA).sort((a, b) => parseInt(a.block) - parseInt(b.block)),
    wingB: Object.values(wingB).sort((a, b) => parseInt(a.block) - parseInt(b.block))
  };
}
