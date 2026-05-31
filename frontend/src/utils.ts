import type { BudgetItem, CurrencyCode, Loan } from "./types";

export const DEFAULT_CURRENCY: CurrencyCode = "GBP";

export const formatMoney = (value: number, currency: CurrencyCode = "GBP") =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(value || 0);

export const toMonthly = (item: BudgetItem) => {
  if (item.frequency === "monthly") return item.amount;
  if (item.frequency === "weekly") return item.amount * 52 / 12;
  return item.amount / 12;
};

export const calculateEmi = (loan: Loan) => {
  const principal = loan.principal;
  const monthlyRate = loan.annualRate / 100 / 12;
  const n = loan.termMonths;
  if (principal <= 0 || monthlyRate <= 0 || n <= 0) return 0;
  const factor = Math.pow(1 + monthlyRate, n);
  return (principal * monthlyRate * factor) / (factor - 1);
};

export const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
