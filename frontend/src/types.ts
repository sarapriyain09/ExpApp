export type CurrencyCode = "GBP" | "USD" | "EUR";

export type Loan = {
  id: string;
  name: string;
  loanType: string;
  lender: string;
  startDate: string;
  principal: number;
  annualRate: number;
  termMonths: number;
  emi?: number;
  paymentFrequency: "monthly";
  nextDueDate: string;
  outstandingBalance: number;
  currency: CurrencyCode;
  notes?: string;
  autoCalculate: boolean;
};

export type Asset = {
  id: string;
  name: string;
  category: string;
  value: number;
  owner: "Self" | "Spouse" | "Joint";
  valuationDate: string;
  currency: CurrencyCode;
  notes?: string;
};

export type Liability = {
  id: string;
  name: string;
  category: string;
  outstanding: number;
  annualRate?: number;
  dueDate?: string;
  currency: CurrencyCode;
  notes?: string;
};

export type Snapshot = {
  id: string;
  month: string;
  assetsTotal: number;
  liabilitiesTotal: number;
  netWorth: number;
  createdAt: string;
};

export type BudgetItem = {
  id: string;
  category: string;
  name: string;
  amount: number;
  frequency: "monthly" | "weekly" | "annual";
};

export type BudgetData = {
  income: BudgetItem[];
  expenses: BudgetItem[];
};

export type ExpenseTransaction = {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
};
