import React from "react";

export function Modal(props: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-semibold">{props.title}</div>
          <button
            className="rounded-lg px-2 py-1 hover:bg-gray-100"
            onClick={props.onClose}
          >
            ✕
          </button>
        </div>
        <div className="px-4 py-4">{props.children}</div>
      </div>
    </div>
  );
}
