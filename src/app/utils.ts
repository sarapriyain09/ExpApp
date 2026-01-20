import type { Loan, PaymentFrequency } from "./types";

export function uid(): string {
  return crypto.randomUUID();
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function monthlyEquivalent(amount: number, freq: PaymentFrequency): number {
  if (!isFinite(amount)) return 0;
  switch (freq) {
    case "weekly":
      return (amount * 52) / 12;
    case "fortnightly":
      return (amount * 26) / 12;
    case "yearly":
      return amount / 12;
    case "monthly":
    default:
      return amount;
  }
}

export function calcEmiMonthly(P?: number, annualRate?: number, n?: number): number | null {
  if (!P || !annualRate || !n) return null;
  if (P <= 0 || n <= 0) return null;
  const r = annualRate / 100 / 12;
  if (r === 0) return round2(P / n);
  const pow = Math.pow(1 + r, n);
  const emi = (P * r * pow) / (pow - 1);
  return round2(emi);
}

export function getLoanMonthlyEmi(loan: Loan): number {
  const base = loan.autoCalcEmi
    ? calcEmiMonthly(loan.principal, loan.annualRate, loan.termMonths) ?? 0
    : loan.emi ?? 0;
  return round2(monthlyEquivalent(base, loan.paymentFrequency));
}

export function sum(nums: number[]): number {
  return round2(nums.reduce((a, b) => a + (isFinite(b) ? b : 0), 0));
}

export function yyyyMm(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
