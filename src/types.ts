export interface Transaction {
  id: string;
  date: string; // dd-mm-yyyy
  type: 'Income' | 'Expense';
  headId: string;
  category: string;
  amount: number;
  mode: string;
  reference: string;
  description: string;
  // Parsed fields
  parsedDate: string; // YYYY-MM-DD for easy sorting
  monthYear: string; // MMM YYYY for grouping
  isContra?: boolean; // Transfer between bank & cash
  isInvestment?: boolean; // FD issue
  wing?: 'A' | 'B' | null;
  block?: string | null;
  residentName?: string | null;
}

export interface SummaryCards {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  cashOnHand: number;
  bankBalance: number;
  fdInvestment: number;
}
