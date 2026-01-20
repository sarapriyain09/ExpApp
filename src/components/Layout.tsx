import React from "react";

export function Layout(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="font-semibold">{props.title}</div>
          <nav className="flex gap-3 text-sm">
            <a className="hover:underline" href="#/">Dashboard</a>
            <a className="hover:underline" href="#/loans">Loans</a>
            <a className="hover:underline" href="#/assets">Assets</a>
            <a className="hover:underline" href="#/liabilities">Liabilities</a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{props.children}</main>
    </div>
  );
}
