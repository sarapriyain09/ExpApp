import type { Currency } from "../app/types";

export function Money({ value, currency }: { value: number; currency: Currency }) {
  const fmt = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  });
  return <span>{fmt.format(value || 0)}</span>;
}
