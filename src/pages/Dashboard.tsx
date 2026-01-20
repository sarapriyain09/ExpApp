import React, { useMemo } from "react";
import type { AppState, Snapshot } from "../app/types";
import { getLoanMonthlyEmi, sum, uid, yyyyMm } from "../app/utils";
import { Money } from "../components/Money";

export function Dashboard(props: {
  state: AppState;
  setState: (s: AppState) => void;
}) {
  const { state } = props;

  const assetsTotal = useMemo(
    () => sum(state.assets.filter((a) => a.currency === state.currency).map((a) => a.value)),
    [state.assets, state.currency]
  );

  const liabilitiesTotal = useMemo(() => {
    const baseLiabs = sum(
      state.liabilities
        .filter((l) => l.currency === state.currency)
        .map((l) => l.outstanding)
    );
    const loansOutstanding = sum(
      state.loans
        .filter((l) => l.currency === state.currency)
        .map((l) => l.outstandingBalance)
    );
    return sum([baseLiabs, loansOutstanding]);
  }, [state.liabilities, state.loans, state.currency]);

  const netWorth = useMemo(() => sum([assetsTotal, -liabilitiesTotal]), [assetsTotal, liabilitiesTotal]);

  const monthlyEmiTotal = useMemo(() => {
    return sum(
      state.loans
        .filter((l) => l.currency === state.currency)
        .map((l) => getLoanMonthlyEmi(l))
    );
  }, [state.loans, state.currency]);

  function saveSnapshot() {
    const now = new Date();
    const snap: Snapshot = {
      id: uid(),
      month: yyyyMm(now),
      currency: state.currency,
      assetsTotal,
      liabilitiesTotal,
      netWorth,
      createdAt: now.toISOString()
    };

    const filtered = state.snapshots.filter(
      (s) => !(s.month === snap.month && s.currency === snap.currency)
    );
    props.setState({ ...state, snapshots: [snap, ...filtered] });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xl font-semibold">Net Worth Dashboard</div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Currency</label>
          <select
            className="rounded-lg border bg-white px-2 py-1"
            value={state.currency}
            onChange={(e) => props.setState({ ...state, currency: e.target.value as AppState["currency"] })}
          >
            <option value="GBP">GBP (£)</option>
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
            <option value="INR">INR (₹)</option>
          </select>
          <button
            className="rounded-xl bg-gray-900 px-3 py-2 text-sm text-white"
            onClick={saveSnapshot}
          >
            Save this month snapshot
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card title="Total Assets">
          <Money value={assetsTotal} currency={state.currency} />
        </Card>
        <Card title="Total Liabilities">
          <Money value={liabilitiesTotal} currency={state.currency} />
        </Card>
        <Card title="Net Worth">
          <Money value={netWorth} currency={state.currency} />
        </Card>
        <Card title="Monthly EMI Total">
          <Money value={monthlyEmiTotal} currency={state.currency} />
        </Card>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-2 font-semibold">Snapshots</div>
        {state.snapshots.length === 0 ? (
          <div className="text-sm text-gray-600">
            No snapshots yet. Click “Save this month snapshot”.
          </div>
        ) : (
          <div className="space-y-2">
            {state.snapshots
              .filter((s) => s.currency === state.currency)
              .slice(0, 12)
              .map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
                  <div className="text-sm">
                    <div className="font-medium">{s.month}</div>
                    <div className="text-gray-600">
                      Saved: {new Date(s.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm">
                    Net worth:{" "}
                    <span className="font-semibold">
                      <Money value={s.netWorth} currency={s.currency} />
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Card(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-600">{props.title}</div>
      <div className="mt-1 text-lg font-semibold">{props.children}</div>
    </div>
  );
}
