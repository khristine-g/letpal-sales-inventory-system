import { useState } from "react";
import { TODAY } from "./mock-data";

export const RANGES = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "mtd", label: "Month to date", days: 0 },
  { value: "150d", label: "Last 150 days", days: 150 },
] as const;

export function rangeFor(value: string) {
  const to = new Date(TODAY);
  to.setHours(23, 59, 59, 999);
  const r = RANGES.find((x) => x.value === value) ?? RANGES[1];
  const from = new Date(TODAY);
  if (r.value === "mtd") from.setDate(1);
  else from.setDate(from.getDate() - r.days + 1);
  from.setHours(0, 0, 0, 0);
  const span = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(from.getTime() - span);
  return { from, to, prevFrom, prevTo, label: r.label };
}

export function useDateRange(initial = "30d") {
  const [value, setValue] = useState(initial);
  return { value, setValue, ...rangeFor(value) };
}
