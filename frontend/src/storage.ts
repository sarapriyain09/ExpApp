import type { Asset, BudgetData, ExpenseTransaction, Liability, Loan, Snapshot } from "./types";

export type AppState = {
  loans: Loan[];
  assets: Asset[];
  liabilities: Liability[];
  budget: BudgetData;
  expenseTransactions: ExpenseTransaction[];
  snapshots: Snapshot[];
};

const STORAGE_KEY = "expapp.state.v1";

const emptyState: AppState = {
  loans: [],
  assets: [],
  liabilities: [],
  budget: {
    income: [],
    expenses: []
  },
  expenseTransactions: [],
  snapshots: []
};

export const loadState = (): AppState => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyState;
  try {
    const data = JSON.parse(raw) as AppState;
    return {
      ...emptyState,
      ...data
    };
  } catch {
    return emptyState;
  }
};

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
