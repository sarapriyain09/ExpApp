import type { AppState } from "./types";

const KEY = "household_finance_v1";

export const defaultState: AppState = {
  currency: "GBP",
  loans: [],
  assets: [],
  liabilities: [],
  snapshots: []
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as AppState;
    return { ...defaultState, ...parsed };
  } catch {
    return defaultState;
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}
