import { cn } from "@/lib/cn";

export type Column<Row> = {
  key: string;
  header: string;
  // What to show in the cell for one row
  render: (row: Row) => React.ReactNode;
  align?: "left" | "right";
  className?: string;
};

type TableProps<Row> = {
  columns: Column<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  // Shown instead of rows when the list is empty
  empty?: React.ReactNode;
  caption?: string;
  className?: string;
};

// Staff table: 14px text, uppercase gray header, light hover on rows
export function Table<Row>({ columns, rows, getRowKey, empty, caption, className }: TableProps<Row>) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="bg-row-hover">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  "border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-slate",
                  c.align === "right" ? "text-right" : "text-left",
                  c.className,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>{empty}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={getRowKey(row)} className="transition-colors duration-150 hover:bg-row-hover">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "border-b border-border px-4 py-3 align-middle",
                      c.align === "right" && "text-right tabular",
                      c.className,
                    )}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
