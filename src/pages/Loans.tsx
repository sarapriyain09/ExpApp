import React, { useMemo, useState } from "react";
import type { AppState, Loan, LoanType, PaymentFrequency } from "../app/types";
import { calcEmiMonthly, getLoanMonthlyEmi, round2, uid } from "../app/utils";
import { Layout } from "../components/Layout";
import { Modal } from "../components/Modal";
import { Money } from "../components/Money";
import { SimpleTable } from "../components/SimpleTable";

const loanTypes: LoanType[] = [
  "Mortgage",
  "Personal loan",
  "Car loan",
  "Education loan",
  "Credit card",
  "BNPL",
  "Other"
];
const freqs: PaymentFrequency[] = ["monthly", "weekly", "fortnightly", "yearly"];

export function Loans(props: { state: AppState; setState: (s: AppState) => void }) {
  const { state } = props;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);

  const monthlyEmiTotal = useMemo(() => {
    return state.loans
      .filter((l) => l.currency === state.currency)
      .reduce((a, l) => a + getLoanMonthlyEmi(l), 0);
  }, [state.loans, state.currency]);

  function upsertLoan(next: Loan) {
    const exists = state.loans.some((l) => l.id === next.id);
    const loans = exists
      ? state.loans.map((l) => (l.id === next.id ? next : l))
      : [next, ...state.loans];
    props.setState({ ...state, loans });
  }

  function removeLoan(id: string) {
    props.setState({ ...state, loans: state.loans.filter((l) => l.id !== id) });
  }

  return (
    <Layout title="Loans & EMI">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xl font-semibold">Loans</div>
            <div className="text-sm text-gray-600">
              Monthly EMI total:{" "}
              <span className="font-semibold">
                <Money value={round2(monthlyEmiTotal)} currency={state.currency} />
              </span>
            </div>
          </div>
          <button
            className="rounded-xl bg-gray-900 px-3 py-2 text-sm text-white"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + Add Loan
          </button>
        </div>

        <SimpleTable headers={["Loan", "Outstanding", "Monthly EMI", "Next Due", "Actions"]}>
          {state.loans
            .filter((l) => l.currency === state.currency)
            .map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-3 py-2">
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-gray-600">
                    {l.type}
                    {l.lender ? ` • ${l.lender}` : ""}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Money value={l.outstandingBalance} currency={l.currency} />
                </td>
                <td className="px-3 py-2">
                  <Money value={getLoanMonthlyEmi(l)} currency={l.currency} />
                </td>
                <td className="px-3 py-2 text-sm">
                  {l.nextDueDate ? new Date(l.nextDueDate).toLocaleDateString() : "-"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      className="rounded-lg border px-2 py-1"
                      onClick={() => {
                        setEditing(l);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-lg border px-2 py-1"
                      onClick={() => removeLoan(l.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          {state.loans.filter((l) => l.currency === state.currency).length === 0 && (
            <tr>
              <td className="px-3 py-4 text-sm text-gray-600" colSpan={5}>
                No loans yet.
              </td>
            </tr>
          )}
        </SimpleTable>

        <LoanModal
          open={open}
          onClose={() => setOpen(false)}
          currency={state.currency}
          initial={editing}
          onSave={(l) => {
            upsertLoan(l);
            setOpen(false);
          }}
        />
      </div>
    </Layout>
  );
}

function LoanModal(props: {
  open: boolean;
  onClose: () => void;
  currency: AppState["currency"];
  initial: Loan | null;
  onSave: (loan: Loan) => void;
}) {
  const isEdit = !!props.initial;

  const [name, setName] = useState(props.initial?.name ?? "");
  const [type, setType] = useState<LoanType>(props.initial?.type ?? "Personal loan");
  const [lender, setLender] = useState(props.initial?.lender ?? "");
  const [outstanding, setOutstanding] = useState<number>(props.initial?.outstandingBalance ?? 0);
  const [nextDueDate, setNextDueDate] = useState(props.initial?.nextDueDate ?? "");
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>(
    props.initial?.paymentFrequency ?? "monthly"
  );

  const [autoCalc, setAutoCalc] = useState<boolean>(props.initial?.autoCalcEmi ?? false);
  const [principal, setPrincipal] = useState<number>(props.initial?.principal ?? 0);
  const [rate, setRate] = useState<number>(props.initial?.annualRate ?? 0);
  const [termMonths, setTermMonths] = useState<number>(props.initial?.termMonths ?? 0);

  const [emi, setEmi] = useState<number>(props.initial?.emi ?? 0);

  const calcPreview = useMemo(() => calcEmiMonthly(principal, rate, termMonths), [
    principal,
    rate,
    termMonths
  ]);

  React.useEffect(() => {
    if (!props.open) return;
    const i = props.initial;
    setName(i?.name ?? "");
    setType(i?.type ?? "Personal loan");
    setLender(i?.lender ?? "");
    setOutstanding(i?.outstandingBalance ?? 0);
    setNextDueDate(i?.nextDueDate ?? "");
    setPaymentFrequency(i?.paymentFrequency ?? "monthly");
    setAutoCalc(i?.autoCalcEmi ?? false);
    setPrincipal(i?.principal ?? 0);
    setRate(i?.annualRate ?? 0);
    setTermMonths(i?.termMonths ?? 0);
    setEmi(i?.emi ?? 0);
  }, [props.open, props.initial]);

  function save() {
    const loan: Loan = {
      id: props.initial?.id ?? uid(),
      name: name.trim() || "Untitled loan",
      type,
      lender: lender.trim() || undefined,
      currency: props.currency,

      principal: autoCalc ? principal || undefined : props.initial?.principal,
      annualRate: autoCalc ? rate || undefined : props.initial?.annualRate,
      termMonths: autoCalc ? termMonths || undefined : props.initial?.termMonths,

      emi: autoCalc ? undefined : emi || 0,
      paymentFrequency,

      outstandingBalance: Number(outstanding) || 0,
      nextDueDate: nextDueDate || undefined,
      autoCalcEmi: autoCalc
    };
    props.onSave(loan);
  }

  return (
    <Modal open={props.open} title={isEdit ? "Edit loan" : "Add loan"} onClose={props.onClose}>
      <div className="space-y-3">
        <div className="grid gap-2 md:grid-cols-2">
          <Field label="Loan name">
            <input
              className="w-full rounded-lg border px-2 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Type">
            <select
              className="w-full rounded-lg border px-2 py-2"
              value={type}
              onChange={(e) => setType(e.target.value as LoanType)}
            >
              {loanTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lender (optional)">
            <input
              className="w-full rounded-lg border px-2 py-2"
              value={lender}
              onChange={(e) => setLender(e.target.value)}
            />
          </Field>
          <Field label="Outstanding balance">
            <input
              type="number"
              className="w-full rounded-lg border px-2 py-2"
              value={outstanding}
              onChange={(e) => setOutstanding(Number(e.target.value))}
            />
          </Field>
          <Field label="Next due date (optional)">
            <input
              type="date"
              className="w-full rounded-lg border px-2 py-2"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
            />
          </Field>
          <Field label="Payment frequency">
            <select
              className="w-full rounded-lg border px-2 py-2"
              value={paymentFrequency}
              onChange={(e) => setPaymentFrequency(e.target.value as PaymentFrequency)}
            >
              {freqs.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="rounded-xl border bg-gray-50 p-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoCalc}
              onChange={(e) => setAutoCalc(e.target.checked)}
            />
            Auto-calculate EMI (from principal, rate, term)
          </label>

          {autoCalc ? (
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <Field label="Principal (P)">
                <input
                  type="number"
                  className="w-full rounded-lg border px-2 py-2"
                  value={principal}
                  onChange={(e) => setPrincipal(Number(e.target.value))}
                />
              </Field>
              <Field label="APR % (annual)">
                <input
                  type="number"
                  className="w-full rounded-lg border px-2 py-2"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                />
              </Field>
              <Field label="Term (months)">
                <input
                  type="number"
                  className="w-full rounded-lg border px-2 py-2"
                  value={termMonths}
                  onChange={(e) => setTermMonths(Number(e.target.value))}
                />
              </Field>
              <div className="md:col-span-3 text-sm text-gray-700">
                EMI preview (monthly): <span className="font-semibold">{calcPreview ?? 0}</span>
              </div>
            </div>
          ) : (
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <Field label="EMI amount (as entered)">
                <input
                  type="number"
                  className="w-full rounded-lg border px-2 py-2"
                  value={emi}
                  onChange={(e) => setEmi(Number(e.target.value))}
                />
              </Field>
              <div className="self-end text-sm text-gray-700">
                (Will be converted to monthly equivalent using frequency)
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button className="rounded-xl border px-3 py-2 text-sm" onClick={props.onClose}>
            Cancel
          </button>
          <button className="rounded-xl bg-gray-900 px-3 py-2 text-sm text-white" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-gray-600">{props.label}</div>
      {props.children}
    </label>
  );
}
