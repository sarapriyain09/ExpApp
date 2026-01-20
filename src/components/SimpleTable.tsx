import React from "react";

export function SimpleTable(props: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-auto rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {props.headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{props.children}</tbody>
      </table>
    </div>
  );
}
