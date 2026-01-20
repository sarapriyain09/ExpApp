export type Currency = "GBP" | "EUR" | "USD" | "INR";

export type PaymentFrequency = "monthly" | "weekly" | "fortnightly" | "yearly";

export type LoanType =
  | "Mortgage"
  | "Personal loan"
  | "Car loan"
  | "Education loan"
  | "Credit card"
  | "BNPL"
  | "Other";

export type Owner = "Self" | "Spouse" | "Joint";

export type AssetCategory =
  | "Cash & bank"
  | "Investments"
  | "Property"
  | "Vehicles"
  | "Other";

export type LiabilityCategory =
  | "Loans"
  | "Credit card"
  | "Overdraft"
  | "Other debt";

export type Loan = {
  id: string;
  name: string;
  type: LoanType;
  lender?: string;
  currency: Currency;

  principal?: number;
  annualRate?: number;
  termMonths?: number;

  emi?: number;
  paymentFrequency: PaymentFrequency;

  outstandingBalance: number;
  nextDueDate?: string;
  startDate?: string;
  notes?: string;

  autoCalcEmi: boolean;
};

export type Asset = {
  id: string;
  name: string;
  category: AssetCategory;
  value: number;
  owner: Owner;
  valuationDate: string;
  currency: Currency;
  notes?: string;
};

export type Liability = {
  id: string;
  name: string;
  category: LiabilityCategory;
  outstanding: number;
  annualRate?: number;
  dueDate?: string;
  currency: Currency;
  notes?: string;
};

export type Snapshot = {
  id: string;
  month: string;
  currency: Currency;
  assetsTotal: number;
  liabilitiesTotal: number;
  netWorth: number;
  createdAt: string;
};

export type AppState = {
  currency: Currency;
  loans: Loan[];
  assets: Asset[];
  liabilities: Liability[];
  snapshots: Snapshot[];
};
