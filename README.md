# Household Budget + Net Worth Tracker

A local-first household money planner with budget, loans/EMI, assets, liabilities, and net worth snapshots.

## Features

- Budget planner (income, expenses, monthly left over)
- Loans & EMI tracking (manual or auto EMI calculation)
- Assets & liabilities lists
- Net worth dashboard with snapshot history
- Local storage persistence

## Getting started

1. Install dependencies
2. Start the dev server

## Scripts

- `npm run dev` - start dev server
- `npm run build` - build for production
- `npm run preview` - preview production build

## Notes

Data is stored in your browser local storage under the key `expapp.state.v1`.

## Supabase setup (Auth + monthly snapshots)

1. Create a Supabase project.
2. Add env values in `.env`:
	 - `VITE_SUPABASE_URL`
	 - `VITE_SUPABASE_ANON_KEY`
3. Run this SQL in Supabase SQL editor to create the snapshots table and user state table:

```sql
create table if not exists monthly_snapshots (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	month text not null,
	assets_total numeric not null default 0,
	liabilities_total numeric not null default 0,
	net_worth numeric not null default 0,
	budget_income numeric not null default 0,
	budget_expense numeric not null default 0,
	loans_emi numeric not null default 0,
	created_at timestamp with time zone default now(),
	unique (user_id, month)
);

alter table monthly_snapshots enable row level security;

create policy "Users can manage their snapshots" on monthly_snapshots
	for all
	using (auth.uid() = user_id)
	with check (auth.uid() = user_id);

create table if not exists user_state (
	user_id uuid primary key references auth.users(id) on delete cascade,
	state jsonb not null,
	updated_at timestamp with time zone default now()
);

alter table user_state enable row level security;

create policy "Users can manage their state" on user_state
	for all
	using (auth.uid() = user_id)
	with check (auth.uid() = user_id);

create table if not exists expense_transactions (
	id uuid primary key,
	user_id uuid not null references auth.users(id) on delete cascade,
	date date not null,
	category text not null,
	description text not null,
	amount numeric not null default 0,
	created_at timestamp with time zone default now()
);

create index if not exists expense_transactions_user_date_idx
	on expense_transactions (user_id, date desc);

alter table expense_transactions enable row level security;

create policy "Users can manage their transactions" on expense_transactions
	for all
	using (auth.uid() = user_id)
	with check (auth.uid() = user_id);
```

## Install as mobile app (PWA)

When deployed over HTTPS, the app can be installed on mobile:
- Android: tap the browser menu → “Add to Home screen”.
- iOS: share button → “Add to Home Screen”.
