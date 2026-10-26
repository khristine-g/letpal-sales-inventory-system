import { format } from "date-fns";

const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export const ksh = (n: number) => `KSh ${nf.format(Math.round(n))}`;
export const num = (n: number) => nf.format(n);
export const compactKsh = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `KSh ${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `KSh ${(n / 1_000).toFixed(0)}K`;
  return ksh(n);
};
export const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;
export const fmtDate = (iso: string) => format(new Date(iso), "d MMM yyyy");
export const fmtDateTime = (iso: string) => format(new Date(iso), "d MMM yyyy, HH:mm");
export const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
