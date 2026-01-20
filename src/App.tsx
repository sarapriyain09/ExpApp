import { useEffect, useMemo, useState } from "react";
import type { Asset, BudgetData, BudgetItem, ExpenseTransaction, Liability, Loan, Snapshot } from "./types";
import { DEFAULT_CURRENCY, calculateEmi, formatMoney, sum, toMonthly } from "./utils";
import { loadState, saveState } from "./storage";
import { supabase } from "./supabaseClient";

const uid = () => crypto.randomUUID();

type TabKey =
  | "budget"
  | "loans"
  | "assets"
  | "liabilities"
  | "networth";

const loanTypes = [
  "Home mortgage",
  "Personal loan",
  "Car loan",
  "Education loan",
  "Credit card",
  "BNPL / short-term credit",
  "Other"
];

const assetCategories = [
  "Cash & bank",
  "Investments",
  "Property",
  "Vehicles",
  "Other assets"
];

const liabilityCategories = [
  "Credit card",
  "Overdraft",
  "Other debt"
];

const months = Array.from({ length: 12 }, (_, index) => index + 1);

const nowDate = () => new Date().toISOString().slice(0, 10);

const defaultLoan = (): Loan => ({
  id: uid(),
  name: "",
  loanType: "",
  lender: "",
  startDate: nowDate(),
  principal: 0,
  annualRate: 0,
  termMonths: 0,
  emi: 0,
  paymentFrequency: "monthly",
  nextDueDate: nowDate(),
  outstandingBalance: 0,
  currency: DEFAULT_CURRENCY,
  autoCalculate: false,
  notes: ""
});

const defaultAsset = (): Asset => ({
  id: uid(),
  name: "",
  category: assetCategories[0],
  value: 0,
  owner: "Self",
  valuationDate: nowDate(),
  currency: DEFAULT_CURRENCY,
  notes: ""
});

const defaultLiability = (): Liability => ({
  id: uid(),
  name: "",
  category: liabilityCategories[0],
  outstanding: 0,
  annualRate: 0,
  dueDate: nowDate(),
  currency: DEFAULT_CURRENCY,
  notes: ""
});

const defaultBudgetItem = (type: "income" | "expense"): BudgetItem => ({
  id: uid(),
  category: type === "income" ? "Salary" : "Household",
  name: "",
  amount: 0,
  frequency: "monthly"
});

const defaultSnapshot = (month: string, assetsTotal: number, liabilitiesTotal: number): Snapshot => ({
  id: uid(),
  month,
  assetsTotal,
  liabilitiesTotal,
  netWorth: assetsTotal - liabilitiesTotal,
  createdAt: new Date().toISOString()
});

const usePersistedState = () => {
  const [state, setState] = useState(loadState());
  const setStatePersist = (
    next: typeof state | ((prev: typeof state) => typeof state)
  ) => {
    setState((prev) => {
      const resolved = typeof next === "function" ? (next as (prev: typeof state) => typeof state)(prev) : next;
      saveState(resolved);
      return resolved;
    });
  };
  const update = (next: typeof state) => {
    setStatePersist(next);
  };
  return { state, update, setState: setStatePersist };
};

export default function App() {
  const { state, update, setState } = usePersistedState();
  const [tab, setTab] = useState<TabKey>("budget");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const loans = state.loans;
  const assets = state.assets;
  const liabilities = state.liabilities;
  const expenseTransactions = state.expenseTransactions;

  const loansMonthlyEmi = useMemo(() => {
    return sum(
      loans.map((loan) =>
        loan.autoCalculate ? calculateEmi(loan) : loan.emi || 0
      )
    );
  }, [loans]);

  const assetsTotal = useMemo(
    () => sum(assets.map((asset) => asset.value)),
    [assets]
  );

  const liabilitiesTotal = useMemo(
    () => sum(liabilities.map((item) => item.outstanding)) + sum(loans.map((loan) => loan.outstandingBalance)),
    [liabilities, loans]
  );

  const netWorth = assetsTotal - liabilitiesTotal;

  const budgetMonthlyIncome = sum(state.budget.income.map(toMonthly));
  const budgetMonthlyExpense = sum(state.budget.expenses.map(toMonthly)) + loansMonthlyEmi;
  const budgetLeftOver = budgetMonthlyIncome - budgetMonthlyExpense;

  const handleBudgetChange = (budget: BudgetData) => {
    update({ ...state, budget });
  };

  const addLoan = () => update({ ...state, loans: [defaultLoan(), ...loans] });
  const addAsset = () => update({ ...state, assets: [defaultAsset(), ...assets] });
  const addLiability = () => update({ ...state, liabilities: [defaultLiability(), ...liabilities] });

  const saveSnapshot = () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const existing = state.snapshots.find((item) => item.month === month);
    const snapshot = defaultSnapshot(month, assetsTotal, liabilitiesTotal);
    const updated = existing
      ? state.snapshots.map((item) => (item.month === month ? snapshot : item))
      : [snapshot, ...state.snapshots];
    update({ ...state, snapshots: updated });
    void saveSnapshotToSupabase(snapshot);
  };

  const saveSnapshotToSupabase = async (snapshot: Snapshot) => {
    if (!userId) return;
    const { error } = await supabase
      .from("monthly_snapshots")
      .upsert(
        {
          user_id: userId,
          month: snapshot.month,
          assets_total: snapshot.assetsTotal,
          liabilities_total: snapshot.liabilitiesTotal,
          net_worth: snapshot.netWorth,
          budget_income: budgetMonthlyIncome,
          budget_expense: budgetMonthlyExpense,
          loans_emi: loansMonthlyEmi
        },
        { onConflict: "user_id,month" }
      );
    if (error) {
      setAuthError(error.message);
    }
  };

  const saveTransactionsToSupabase = async (items: ExpenseTransaction[]) => {
    if (!userId) return;
    if (items.length === 0) {
      const { error } = await supabase.from("expense_transactions").delete().eq("user_id", userId);
      if (error) setAuthError(error.message);
      return;
    }
    const payload = items.map((tx) => ({
      id: tx.id,
      user_id: userId,
      date: tx.date,
      category: tx.category,
      description: tx.description,
      amount: tx.amount
    }));
    const { error: upsertError } = await supabase
      .from("expense_transactions")
      .upsert(payload, { onConflict: "id" });
    if (upsertError) {
      setAuthError(upsertError.message);
      return;
    }
    const ids = items.map((tx) => `"${tx.id}"`).join(",");
    const { error: deleteError } = await supabase
      .from("expense_transactions")
      .delete()
      .eq("user_id", userId)
      .not("id", "in", `(${ids})`);
    if (deleteError) setAuthError(deleteError.message);
  };

  const saveStateToSupabase = async (nextState: typeof state) => {
    if (!userId) return;
    const { error } = await supabase
      .from("user_state")
      .upsert(
        {
          user_id: userId,
          state: nextState,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );
    if (error) {
      setAuthError(error.message);
    }
  };

  const loadStateFromSupabase = async (activeUserId: string) => {
    const { data, error } = await supabase
      .from("user_state")
      .select("state")
      .eq("user_id", activeUserId)
      .maybeSingle();
    if (error) {
      setAuthError(error.message);
      return;
    }
    if (data?.state) {
      setState(data.state);
    }
  };

  const loadSnapshotsFromSupabase = async (activeUserId: string) => {
    const { data, error } = await supabase
      .from("monthly_snapshots")
      .select("month, assets_total, liabilities_total, net_worth")
      .eq("user_id", activeUserId)
      .order("month", { ascending: false });
    if (error) {
      setAuthError(error.message);
      return;
    }
    const mapped = (data ?? []).map((row) => ({
      id: uid(),
      month: row.month as string,
      assetsTotal: Number(row.assets_total ?? 0),
      liabilitiesTotal: Number(row.liabilities_total ?? 0),
      netWorth: Number(row.net_worth ?? 0),
      createdAt: new Date().toISOString()
    }));
    setState((prev) => ({ ...prev, snapshots: mapped }));
  };

  const loadTransactionsFromSupabase = async (activeUserId: string) => {
    const { data, error } = await supabase
      .from("expense_transactions")
      .select("id, date, category, description, amount")
      .eq("user_id", activeUserId)
      .order("date", { ascending: false });
    if (error) {
      setAuthError(error.message);
      return;
    }
    const mapped = (data ?? []).map((row) => ({
      id: row.id as string,
      date: row.date as string,
      category: row.category as string,
      description: row.description as string,
      amount: Number(row.amount ?? 0)
    }));
    setState((prev) => ({ ...prev, expenseTransactions: mapped }));
  };

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSessionEmail(data.session?.user.email ?? null);
      const nextUserId = data.session?.user.id ?? null;
      setUserId(nextUserId);
      if (nextUserId) {
        void loadStateFromSupabase(nextUserId);
        void loadSnapshotsFromSupabase(nextUserId);
        void loadTransactionsFromSupabase(nextUserId);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email ?? null);
      const nextUserId = session?.user.id ?? null;
      setUserId(nextUserId);
      setAuthError(null);
      if (nextUserId) {
        void loadStateFromSupabase(nextUserId);
        void loadSnapshotsFromSupabase(nextUserId);
        void loadTransactionsFromSupabase(nextUserId);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    const handle = setTimeout(() => {
      void saveStateToSupabase(state);
    }, 800);
    return () => clearTimeout(handle);
  }, [state, userId]);

  useEffect(() => {
    if (!userId) return;
    const handle = setTimeout(() => {
      void saveTransactionsToSupabase(state.expenseTransactions);
    }, 800);
    return () => clearTimeout(handle);
  }, [state.expenseTransactions, userId]);

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Household Budget + Net Worth</p>
          <h1>Money Planner</h1>
        </div>
        <div className="auth">
          {sessionEmail ? (
            <div className="auth-row">
              <span>{sessionEmail}</span>
              <button className="ghost" onClick={() => supabase.auth.signOut()}>
                Sign out
              </button>
            </div>
          ) : (
            <button onClick={() => setShowAuth((prev) => !prev)}>
              Sign in / Register
            </button>
          )}
        </div>
        <div className="summary">
          <div>
            <span>Net worth</span>
            <strong>{formatMoney(netWorth)}</strong>
          </div>
          <div>
            <span>Monthly EMI</span>
            <strong>{formatMoney(loansMonthlyEmi)}</strong>
          </div>
          <div>
            <span>Left over</span>
            <strong className={budgetLeftOver >= 0 ? "positive" : "negative"}>
              {formatMoney(budgetLeftOver)}
            </strong>
          </div>
        </div>
      </header>

      <nav className="tabs">
        <button className={tab === "budget" ? "active" : ""} onClick={() => setTab("budget")}>Budget Planner</button>
        <button className={tab === "loans" ? "active" : ""} onClick={() => setTab("loans")}>Loans & EMI</button>
        <button className={tab === "assets" ? "active" : ""} onClick={() => setTab("assets")}>Assets</button>
        <button className={tab === "liabilities" ? "active" : ""} onClick={() => setTab("liabilities")}>Liabilities</button>
        <button className={tab === "networth" ? "active" : ""} onClick={() => setTab("networth")}>Net Worth Dashboard</button>
      </nav>

      <main>
        {showAuth && (
          <AuthPanel
            error={authError}
            onClose={() => setShowAuth(false)}
            onError={(message) => setAuthError(message)}
          />
        )}
        {tab === "budget" && (
          <BudgetView
            data={state.budget}
            loansMonthlyEmi={loansMonthlyEmi}
            transactions={expenseTransactions}
            onChange={handleBudgetChange}
            onTransactionsChange={(next) => update({ ...state, expenseTransactions: next })}
          />
        )}
        {tab === "loans" && (
          <LoansView
            loans={loans}
            onChange={(next) => update({ ...state, loans: next })}
            onAdd={addLoan}
          />
        )}
        {tab === "assets" && (
          <AssetsView
            assets={assets}
            onChange={(next) => update({ ...state, assets: next })}
            onAdd={addAsset}
          />
        )}
        {tab === "liabilities" && (
          <LiabilitiesView
            liabilities={liabilities}
            onChange={(next) => update({ ...state, liabilities: next })}
            onAdd={addLiability}
          />
        )}
        {tab === "networth" && (
          <NetWorthView
            assetsTotal={assetsTotal}
            liabilitiesTotal={liabilitiesTotal}
            netWorth={netWorth}
            loansMonthlyEmi={loansMonthlyEmi}
            snapshots={state.snapshots}
            onSaveSnapshot={saveSnapshot}
          />
        )}
      </main>
    </div>
  );
}

const BudgetView = ({
  data,
  loansMonthlyEmi,
  transactions,
  onChange,
  onTransactionsChange
}: {
  data: BudgetData;
  loansMonthlyEmi: number;
  transactions: ExpenseTransaction[];
  onChange: (next: BudgetData) => void;
  onTransactionsChange: (next: ExpenseTransaction[]) => void;
}) => {
  const incomeTotal = sum(data.income.map(toMonthly));
  const expenseTotal = sum(data.expenses.map(toMonthly));
  const leftOver = incomeTotal - expenseTotal - loansMonthlyEmi;

  const [txDate, setTxDate] = useState(nowDate());
  const [txCategory, setTxCategory] = useState("Household");
  const [txDescription, setTxDescription] = useState("");
  const [txAmount, setTxAmount] = useState(0);
  const [historyMonth, setHistoryMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const monthKey = (date: string) => date.slice(0, 7);
  const monthOptions = Array.from(
    new Set([
      historyMonth,
      ...transactions.map((tx) => monthKey(tx.date))
    ])
  ).sort((a, b) => (a > b ? -1 : 1));

  const monthlyTransactions = transactions
    .filter((tx) => monthKey(tx.date) === historyMonth)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const monthlyTransactionTotal = sum(monthlyTransactions.map((tx) => tx.amount));

  const updateItem = (
    listKey: keyof BudgetData,
    id: string,
    field: keyof BudgetItem,
    value: string
  ) => {
    const next = data[listKey].map((item) =>
      item.id === id
        ? { ...item, [field]: field === "amount" ? Number(value) : value }
        : item
    );
    onChange({ ...data, [listKey]: next });
  };

  const addItem = (listKey: keyof BudgetData) => {
    const nextItem = defaultBudgetItem(listKey === "income" ? "income" : "expense");
    onChange({ ...data, [listKey]: [nextItem, ...data[listKey]] });
  };

  const removeItem = (listKey: keyof BudgetData, id: string) => {
    onChange({ ...data, [listKey]: data[listKey].filter((item) => item.id !== id) });
  };

  const addTransaction = () => {
    if (!txDescription || txAmount <= 0) return;
    const next: ExpenseTransaction = {
      id: uid(),
      date: txDate,
      category: txCategory,
      description: txDescription,
      amount: Number(txAmount)
    };
    onTransactionsChange([next, ...transactions]);
    setTxDescription("");
    setTxAmount(0);
  };

  const removeTransaction = (id: string) => {
    onTransactionsChange(transactions.filter((tx) => tx.id !== id));
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>Budget Planner</h2>
          <p>Capture monthly income and household expenses.</p>
        </div>
        <div className="totals">
          <div>
            <span>Income</span>
            <strong>{formatMoney(incomeTotal)}</strong>
          </div>
          <div>
            <span>Expenses</span>
            <strong>{formatMoney(expenseTotal)}</strong>
          </div>
          <div>
            <span>EMI total</span>
            <strong>{formatMoney(loansMonthlyEmi)}</strong>
          </div>
          <div>
            <span>Left over</span>
            <strong className={leftOver >= 0 ? "positive" : "negative"}>{formatMoney(leftOver)}</strong>
          </div>
        </div>
      </header>

      <div className="grid two">
        <div className="card">
          <div className="card-header">
            <h3>Income</h3>
            <button onClick={() => addItem("income")}>Add income</button>
          </div>
          {data.income.length === 0 && <p className="muted">Add your first income item.</p>}
          {data.income.map((item) => (
            <div className="row" key={item.id}>
              <input
                placeholder="Source"
                value={item.name}
                onChange={(event) => updateItem("income", item.id, "name", event.target.value)}
              />
              <input
                placeholder="Category"
                value={item.category}
                onChange={(event) => updateItem("income", item.id, "category", event.target.value)}
              />
              <input
                type="number"
                value={item.amount}
                onChange={(event) => updateItem("income", item.id, "amount", event.target.value)}
              />
              <select
                value={item.frequency}
                onChange={(event) => updateItem("income", item.id, "frequency", event.target.value)}
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="annual">Annual</option>
              </select>
              <button className="ghost" onClick={() => removeItem("income", item.id)}>Remove</button>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Expenses</h3>
            <button onClick={() => addItem("expenses")}>Add expense</button>
          </div>
          {data.expenses.length === 0 && <p className="muted">Add your first expense item.</p>}
          {data.expenses.map((item) => (
            <div className="row" key={item.id}>
              <input
                placeholder="Expense"
                value={item.name}
                onChange={(event) => updateItem("expenses", item.id, "name", event.target.value)}
              />
              <input
                placeholder="Category"
                value={item.category}
                onChange={(event) => updateItem("expenses", item.id, "category", event.target.value)}
              />
              <input
                type="number"
                value={item.amount}
                onChange={(event) => updateItem("expenses", item.id, "amount", event.target.value)}
              />
              <select
                value={item.frequency}
                onChange={(event) => updateItem("expenses", item.id, "frequency", event.target.value)}
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="annual">Annual</option>
              </select>
              <button className="ghost" onClick={() => removeItem("expenses", item.id)}>Remove</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3>Monthly expense history</h3>
            <p className="muted">Add individual expenses and review by month.</p>
          </div>
          <div className="history-controls">
            <label>
              Month
              <select value={historyMonth} onChange={(event) => setHistoryMonth(event.target.value)}>
                {monthOptions.map((month) => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </label>
            <div className="history-total">
              <span>Total</span>
              <strong>{formatMoney(monthlyTransactionTotal)}</strong>
            </div>
          </div>
        </div>

        <div className="transaction-form">
          <input type="date" value={txDate} onChange={(event) => setTxDate(event.target.value)} />
          <input
            placeholder="Category"
            value={txCategory}
            onChange={(event) => setTxCategory(event.target.value)}
          />
          <input
            placeholder="Description"
            value={txDescription}
            onChange={(event) => setTxDescription(event.target.value)}
          />
          <input
            type="number"
            value={txAmount}
            onChange={(event) => setTxAmount(Number(event.target.value))}
          />
          <button onClick={addTransaction}>Add expense</button>
        </div>

        {monthlyTransactions.length === 0 && (
          <p className="muted">No expenses recorded for this month.</p>
        )}

        {monthlyTransactions.length > 0 && (
          <div className="transaction-list">
            {monthlyTransactions.map((tx) => (
              <div className="transaction-row" key={tx.id}>
                <div>
                  <strong>{tx.description}</strong>
                  <span className="muted">{tx.category}</span>
                </div>
                <div className="transaction-meta">
                  <span>{tx.date}</span>
                  <strong>{formatMoney(tx.amount)}</strong>
                  <button className="ghost" onClick={() => removeTransaction(tx.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const LoansView = ({
  loans,
  onChange,
  onAdd
}: {
  loans: Loan[];
  onChange: (next: Loan[]) => void;
  onAdd: () => void;
}) => {
  const updateLoan = (id: string, field: keyof Loan, value: string) => {
    onChange(
      loans.map((loan) =>
        loan.id === id
          ? {
              ...loan,
              [field]:
                field === "principal" ||
                field === "annualRate" ||
                field === "termMonths" ||
                field === "emi" ||
                field === "outstandingBalance"
                  ? Number(value)
                  : field === "autoCalculate"
                    ? value === "true"
                    : value
            }
          : loan
      )
    );
  };

  const removeLoan = (id: string) => {
    onChange(loans.filter((loan) => loan.id !== id));
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>Loans & EMI</h2>
          <p>Add loans, track balances, and calculate EMI if needed.</p>
        </div>
        <button onClick={onAdd}>Add loan</button>
      </header>

      {loans.length === 0 && <p className="muted">No loans added yet.</p>}

      {loans.map((loan) => {
        const calculatedEmi = calculateEmi(loan);
        return (
          <div className="card" key={loan.id}>
            <div className="card-header">
              <input
                className="title"
                placeholder="Loan name"
                value={loan.name}
                onChange={(event) => updateLoan(loan.id, "name", event.target.value)}
              />
              <button className="ghost" onClick={() => removeLoan(loan.id)}>Remove</button>
            </div>
            <div className="grid three">
              <label>
                Lender
                <input
                  value={loan.lender}
                  onChange={(event) => updateLoan(loan.id, "lender", event.target.value)}
                />
              </label>
              <label>
                Loan type
                <select
                  value={loan.loanType}
                  onChange={(event) => updateLoan(loan.id, "loanType", event.target.value)}
                >
                  <option value="">Select type</option>
                  {loanTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label>
                Start date
                <input
                  type="date"
                  value={loan.startDate}
                  onChange={(event) => updateLoan(loan.id, "startDate", event.target.value)}
                />
              </label>
              <label>
                Principal
                <input
                  type="number"
                  value={loan.principal}
                  onChange={(event) => updateLoan(loan.id, "principal", event.target.value)}
                />
              </label>
              <label>
                Annual rate %
                <input
                  type="number"
                  step="0.01"
                  value={loan.annualRate}
                  onChange={(event) => updateLoan(loan.id, "annualRate", event.target.value)}
                />
              </label>
              <label>
                Term (months)
                <input
                  type="number"
                  value={loan.termMonths}
                  onChange={(event) => updateLoan(loan.id, "termMonths", event.target.value)}
                />
              </label>
              <label>
                Auto-calc EMI
                <select
                  value={String(loan.autoCalculate)}
                  onChange={(event) => updateLoan(loan.id, "autoCalculate", event.target.value)}
                >
                  <option value="false">Manual</option>
                  <option value="true">Auto</option>
                </select>
              </label>
              <label>
                EMI amount
                <input
                  type="number"
                  value={loan.autoCalculate ? calculatedEmi.toFixed(2) : loan.emi ?? 0}
                  onChange={(event) => updateLoan(loan.id, "emi", event.target.value)}
                  disabled={loan.autoCalculate}
                />
              </label>
              <label>
                Outstanding balance
                <input
                  type="number"
                  value={loan.outstandingBalance}
                  onChange={(event) => updateLoan(loan.id, "outstandingBalance", event.target.value)}
                />
              </label>
              <label>
                Next due date
                <input
                  type="date"
                  value={loan.nextDueDate}
                  onChange={(event) => updateLoan(loan.id, "nextDueDate", event.target.value)}
                />
              </label>
              <label>
                Notes
                <input
                  value={loan.notes}
                  onChange={(event) => updateLoan(loan.id, "notes", event.target.value)}
                />
              </label>
            </div>
          </div>
        );
      })}
    </section>
  );
};

const AssetsView = ({
  assets,
  onChange,
  onAdd
}: {
  assets: Asset[];
  onChange: (next: Asset[]) => void;
  onAdd: () => void;
}) => {
  const updateAsset = (id: string, field: keyof Asset, value: string) => {
    onChange(
      assets.map((asset) =>
        asset.id === id
          ? {
              ...asset,
              [field]: field === "value" ? Number(value) : value
            }
          : asset
      )
    );
  };

  const removeAsset = (id: string) => {
    onChange(assets.filter((asset) => asset.id !== id));
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>Assets</h2>
          <p>Track cash, investments, property, and vehicles.</p>
        </div>
        <button onClick={onAdd}>Add asset</button>
      </header>

      {assets.length === 0 && <p className="muted">No assets added yet.</p>}

      {assets.map((asset) => (
        <div className="card" key={asset.id}>
          <div className="card-header">
            <input
              className="title"
              placeholder="Asset name"
              value={asset.name}
              onChange={(event) => updateAsset(asset.id, "name", event.target.value)}
            />
            <button className="ghost" onClick={() => removeAsset(asset.id)}>Remove</button>
          </div>
          <div className="grid three">
            <label>
              Category
              <select
                value={asset.category}
                onChange={(event) => updateAsset(asset.id, "category", event.target.value)}
              >
                {assetCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>
            <label>
              Value
              <input
                type="number"
                value={asset.value}
                onChange={(event) => updateAsset(asset.id, "value", event.target.value)}
              />
            </label>
            <label>
              Owner
              <select
                value={asset.owner}
                onChange={(event) => updateAsset(asset.id, "owner", event.target.value)}
              >
                <option value="Self">Self</option>
                <option value="Spouse">Spouse</option>
                <option value="Joint">Joint</option>
              </select>
            </label>
            <label>
              Valuation date
              <input
                type="date"
                value={asset.valuationDate}
                onChange={(event) => updateAsset(asset.id, "valuationDate", event.target.value)}
              />
            </label>
            <label>
              Notes
              <input
                value={asset.notes}
                onChange={(event) => updateAsset(asset.id, "notes", event.target.value)}
              />
            </label>
          </div>
        </div>
      ))}
    </section>
  );
};

const LiabilitiesView = ({
  liabilities,
  onChange,
  onAdd
}: {
  liabilities: Liability[];
  onChange: (next: Liability[]) => void;
  onAdd: () => void;
}) => {
  const updateLiability = (id: string, field: keyof Liability, value: string) => {
    onChange(
      liabilities.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === "outstanding" || field === "annualRate" ? Number(value) : value
            }
          : item
      )
    );
  };

  const removeLiability = (id: string) => {
    onChange(liabilities.filter((item) => item.id !== id));
  };

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>Liabilities</h2>
          <p>Credit cards, overdrafts, and other debts.</p>
        </div>
        <button onClick={onAdd}>Add liability</button>
      </header>

      {liabilities.length === 0 && <p className="muted">No liabilities added yet.</p>}

      {liabilities.map((item) => (
        <div className="card" key={item.id}>
          <div className="card-header">
            <input
              className="title"
              placeholder="Liability name"
              value={item.name}
              onChange={(event) => updateLiability(item.id, "name", event.target.value)}
            />
            <button className="ghost" onClick={() => removeLiability(item.id)}>Remove</button>
          </div>
          <div className="grid three">
            <label>
              Category
              <select
                value={item.category}
                onChange={(event) => updateLiability(item.id, "category", event.target.value)}
              >
                {liabilityCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>
            <label>
              Outstanding
              <input
                type="number"
                value={item.outstanding}
                onChange={(event) => updateLiability(item.id, "outstanding", event.target.value)}
              />
            </label>
            <label>
              APR %
              <input
                type="number"
                step="0.01"
                value={item.annualRate ?? 0}
                onChange={(event) => updateLiability(item.id, "annualRate", event.target.value)}
              />
            </label>
            <label>
              Due date
              <input
                type="date"
                value={item.dueDate ?? ""}
                onChange={(event) => updateLiability(item.id, "dueDate", event.target.value)}
              />
            </label>
            <label>
              Notes
              <input
                value={item.notes ?? ""}
                onChange={(event) => updateLiability(item.id, "notes", event.target.value)}
              />
            </label>
          </div>
        </div>
      ))}
    </section>
  );
};

const NetWorthView = ({
  assetsTotal,
  liabilitiesTotal,
  netWorth,
  loansMonthlyEmi,
  snapshots,
  onSaveSnapshot
}: {
  assetsTotal: number;
  liabilitiesTotal: number;
  netWorth: number;
  loansMonthlyEmi: number;
  snapshots: Snapshot[];
  onSaveSnapshot: () => void;
}) => {
  const ratio = assetsTotal > 0 ? liabilitiesTotal / assetsTotal : 0;

  return (
    <section className="panel">
      <header className="panel-header">
        <div>
          <h2>Net Worth Dashboard</h2>
          <p>Track assets, liabilities, and monthly snapshots.</p>
        </div>
        <button onClick={onSaveSnapshot}>Save snapshot</button>
      </header>

      <div className="grid two">
        <div className="card">
          <h3>Summary</h3>
          <div className="summary-grid">
            <div>
              <span>Total assets</span>
              <strong>{formatMoney(assetsTotal)}</strong>
            </div>
            <div>
              <span>Total liabilities</span>
              <strong>{formatMoney(liabilitiesTotal)}</strong>
            </div>
            <div>
              <span>Net worth</span>
              <strong>{formatMoney(netWorth)}</strong>
            </div>
            <div>
              <span>Monthly EMI</span>
              <strong>{formatMoney(loansMonthlyEmi)}</strong>
            </div>
            <div>
              <span>Debt-to-asset ratio</span>
              <strong>{(ratio * 100).toFixed(1)}%</strong>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Net worth trend</h3>
          {snapshots.length === 0 && <p className="muted">Save monthly snapshots to see trend.</p>}
          {snapshots.length > 0 && (
            <div className="snapshot-list">
              {snapshots.map((item) => (
                <div key={item.id} className="snapshot-row">
                  <span>{item.month}</span>
                  <span>{formatMoney(item.netWorth)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Snapshot helper</h3>
        <p className="muted">Tip: Save a snapshot at the end of each month for a clean trend line.</p>
        <div className="month-grid">
          {months.map((month) => (
            <div key={month} className="month-pill">
              {month}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const AuthPanel = ({
  error,
  onClose,
  onError
}: {
  error: string | null;
  onClose: () => void;
  onError: (message: string | null) => void;
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    onError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      onError(error.message);
      return;
    }
    onClose();
  };

  const handleSignUp = async () => {
    setLoading(true);
    onError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      onError(error.message);
      return;
    }
    onClose();
  };

  return (
    <section className="auth-panel">
      <div className="auth-header">
        <div>
          <h3>Sign in or Register</h3>
          <p className="muted">Your data will sync to your account.</p>
        </div>
        <button className="ghost" onClick={onClose}>Close</button>
      </div>
      <div className="auth-form">
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="auth-actions">
          <button onClick={handleSignIn} disabled={loading || !email || !password}>
            Sign in
          </button>
          <button className="ghost" onClick={handleSignUp} disabled={loading || !email || !password}>
            Register
          </button>
        </div>
      </div>
    </section>
  );
};
