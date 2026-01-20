import React, { useState } from "react";
import type { AppState, Liability, LiabilityCategory } from "../app/types";
import { uid } from "../app/utils";
import { Layout } from "../components/Layout";
import { Modal } from "../components/Modal";
import { Money } from "../components/Money";
import { SimpleTable } from "../components/SimpleTable";

const cats: LiabilityCategory[] = ["Credit card", "Overdraft", "Other debt", "Loans"];

export function Liabilities(props: { state: AppState; setState: (s: AppState) => void }) {
  const { state } = props;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Liability | null>(null);

  function upsert(l: Liability) {
    const exists = state.liabilities.some((x) => x.id === l.id);
    const liabilities = exists
      ? state.liabilities.map((x) => (x.id === l.id ? l : x))
      : [l, ...state.liabilities];
    props.setState({ ...state, liabilities });
  }

  function remove(id: string) {
    props.setState({ ...state, liabilities: state.liabilities.filter((x) => x.id !== id) });
  }

  return (
    <Layout title="Liabilities">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xl font-semibold">Liabilities (non-loan)</div>
          <button
            className="rounded-xl bg-gray-900 px-3 py-2 text-sm text-white"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + Add Liability
          </button>
        </div>

        <div className="rounded-xl border bg-gray-50 p-3 text-sm text-gray-700">
          Tip: Loans are tracked in <b>Loans & EMI</b>. Add credit cards / overdraft / other debts here.
        </div>

        <SimpleTable headers={["Name", "Category", "Outstanding", "Due date", "Actions"]}>
          {state.liabilities
            .filter((l) => l.currency === state.currency)
            .map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-3 py-2 font-medium">{l.name}</td>
                <td className="px-3 py-2 text-sm">{l.category}</td>
                <td className="px-3 py-2">
                  <Money value={l.outstanding} currency={l.currency} />
                </td>
                <td className="px-3 py-2 text-sm">
                  {l.dueDate ? new Date(l.dueDate).toLocaleDateString() : "-"}
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
                    <button className="rounded-lg border px-2 py-1" onClick={() => remove(l.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          {state.liabilities.filter((l) => l.currency === state.currency).length === 0 && (
            <tr>
              <td className="px-3 py-4 text-sm text-gray-600" colSpan={5}>
                No liabilities yet.
              </td>
            </tr>
          )}
        </SimpleTable>

        <LiabilityModal
          open={open}
          onClose={() => setOpen(false)}
          currency={state.currency}
          initial={editing}
          onSave={(l) => {
            upsert(l);
            setOpen(false);
          }}
        />
      </div>
    </Layout>
  );
}

function LiabilityModal(props: {
  open: boolean;
  onClose: () => void;
  currency: AppState["currency"];
  initial: Liability | null;
  onSave: (l: Liability) => void;
}) {
  const [name, setName] = useState(props.initial?.name ?? "");
  const [category, setCategory] = useState<LiabilityCategory>(props.initial?.category ?? "Credit card");
  const [outstanding, setOutstanding] = useState<number>(props.initial?.outstanding ?? 0);
  const [dueDate, setDueDate] = useState(props.initial?.dueDate ?? "");
  const [annualRate, setAnnualRate] = useState<number>(props.initial?.annualRate ?? 0);

  React.useEffect(() => {
    if (!props.open) return;
    const i = props.initial;
    setName(i?.name ?? "");
    setCategory(i?.category ?? "Credit card");
    setOutstanding(i?.outstanding ?? 0);
    setDueDate(i?.dueDate ?? "");
    setAnnualRate(i?.annualRate ?? 0);
  }, [props.open, props.initial]);

  function save() {
    props.onSave({
      id: props.initial?.id ?? uid(),
      name: name.trim() || "Untitled liability",
      category,
      outstanding: Number(outstanding) || 0,
      dueDate: dueDate || undefined,
      annualRate: annualRate || undefined,
      currency: props.currency
    });
  }

  return (
    <Modal open={props.open} title={props.initial ? "Edit liability" : "Add liability"} onClose={props.onClose}>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Name">
          <input className="w-full rounded-lg border px-2 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Category">
          <select
            className="w-full rounded-lg border px-2 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value as LiabilityCategory)}
          >
            {cats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Outstanding">
          <input
            type="number"
            className="w-full rounded-lg border px-2 py-2"
            value={outstanding}
            onChange={(e) => setOutstanding(Number(e.target.value))}
          />
        </Field>
        <Field label="APR % (optional)">
          <input
            type="number"
            className="w-full rounded-lg border px-2 py-2"
            value={annualRate}
            onChange={(e) => setAnnualRate(Number(e.target.value))}
          />
        </Field>
        <Field label="Due date (optional)">
          <input
            type="date"
            className="w-full rounded-lg border px-2 py-2"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </Field>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <button className="rounded-xl border px-3 py-2 text-sm" onClick={props.onClose}>
          Cancel
        </button>
        <button className="rounded-xl bg-gray-900 px-3 py-2 text-sm text-white" onClick={save}>
          Save
        </button>
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
