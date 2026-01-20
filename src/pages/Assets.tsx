import React, { useState } from "react";
import type { AppState, Asset, AssetCategory, Owner } from "../app/types";
import { uid } from "../app/utils";
import { Layout } from "../components/Layout";
import { Modal } from "../components/Modal";
import { Money } from "../components/Money";
import { SimpleTable } from "../components/SimpleTable";

const cats: AssetCategory[] = ["Cash & bank", "Investments", "Property", "Vehicles", "Other"];
const owners: Owner[] = ["Self", "Spouse", "Joint"];

export function Assets(props: { state: AppState; setState: (s: AppState) => void }) {
  const { state } = props;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);

  function upsert(a: Asset) {
    const exists = state.assets.some((x) => x.id === a.id);
    const assets = exists ? state.assets.map((x) => (x.id === a.id ? a : x)) : [a, ...state.assets];
    props.setState({ ...state, assets });
  }

  function remove(id: string) {
    props.setState({ ...state, assets: state.assets.filter((x) => x.id !== id) });
  }

  return (
    <Layout title="Assets">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xl font-semibold">Assets</div>
          <button
            className="rounded-xl bg-gray-900 px-3 py-2 text-sm text-white"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + Add Asset
          </button>
        </div>

        <SimpleTable headers={["Asset", "Category", "Owner", "Value", "Valuation date", "Actions"]}>
          {state.assets
            .filter((a) => a.currency === state.currency)
            .map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-3 py-2 font-medium">{a.name}</td>
                <td className="px-3 py-2 text-sm">{a.category}</td>
                <td className="px-3 py-2 text-sm">{a.owner}</td>
                <td className="px-3 py-2">
                  <Money value={a.value} currency={a.currency} />
                </td>
                <td className="px-3 py-2 text-sm">
                  {new Date(a.valuationDate).toLocaleDateString()}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      className="rounded-lg border px-2 py-1"
                      onClick={() => {
                        setEditing(a);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button className="rounded-lg border px-2 py-1" onClick={() => remove(a.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          {state.assets.filter((a) => a.currency === state.currency).length === 0 && (
            <tr>
              <td className="px-3 py-4 text-sm text-gray-600" colSpan={6}>
                No assets yet.
              </td>
            </tr>
          )}
        </SimpleTable>

        <AssetModal
          open={open}
          onClose={() => setOpen(false)}
          currency={state.currency}
          initial={editing}
          onSave={(a) => {
            upsert(a);
            setOpen(false);
          }}
        />
      </div>
    </Layout>
  );
}

function AssetModal(props: {
  open: boolean;
  onClose: () => void;
  currency: AppState["currency"];
  initial: Asset | null;
  onSave: (a: Asset) => void;
}) {
  const [name, setName] = useState(props.initial?.name ?? "");
  const [category, setCategory] = useState<AssetCategory>(props.initial?.category ?? "Cash & bank");
  const [owner, setOwner] = useState<Owner>(props.initial?.owner ?? "Self");
  const [value, setValue] = useState<number>(props.initial?.value ?? 0);
  const [valuationDate, setValuationDate] = useState(
    props.initial?.valuationDate ?? new Date().toISOString().slice(0, 10)
  );

  React.useEffect(() => {
    if (!props.open) return;
    const i = props.initial;
    setName(i?.name ?? "");
    setCategory(i?.category ?? "Cash & bank");
    setOwner(i?.owner ?? "Self");
    setValue(i?.value ?? 0);
    setValuationDate(i?.valuationDate ?? new Date().toISOString().slice(0, 10));
  }, [props.open, props.initial]);

  function save() {
    props.onSave({
      id: props.initial?.id ?? uid(),
      name: name.trim() || "Untitled asset",
      category,
      owner,
      value: Number(value) || 0,
      valuationDate,
      currency: props.currency
    });
  }

  return (
    <Modal open={props.open} title={props.initial ? "Edit asset" : "Add asset"} onClose={props.onClose}>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Name">
          <input className="w-full rounded-lg border px-2 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Category">
          <select
            className="w-full rounded-lg border px-2 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value as AssetCategory)}
          >
            {cats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Owner">
          <select
            className="w-full rounded-lg border px-2 py-2"
            value={owner}
            onChange={(e) => setOwner(e.target.value as Owner)}
          >
            {owners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Value">
          <input
            type="number"
            className="w-full rounded-lg border px-2 py-2"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
          />
        </Field>
        <Field label="Valuation date">
          <input
            type="date"
            className="w-full rounded-lg border px-2 py-2"
            value={valuationDate}
            onChange={(e) => setValuationDate(e.target.value)}
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
