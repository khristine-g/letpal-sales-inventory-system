import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, ChevronsUpDown, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RANGES } from "@/lib/date-range";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("surface-card flex flex-col", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
          <div>
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={cn("flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Kpi({ label, value, delta, hint, icon }: { label: string; value: string; delta?: number; hint?: string; icon?: ReactNode }) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        {label}
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
      </div>
      <div className="tabular mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {delta !== undefined && Number.isFinite(delta) && (
          <span className={cn("inline-flex items-center font-medium", up ? "text-success" : "text-destructive")}>
            {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(delta * 100).toFixed(1)}%
          </span>
        )}
        {hint}
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 rounded-full bg-muted p-3 text-muted-foreground">
        <Inbox className="size-5" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SortHeader({ label, active, dir, onClick, className }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground", className)} aria-label={`Sort by ${label}`}>
      {label}
      <ChevronsUpDown className={cn("size-3.5", active ? "opacity-100" : "opacity-40")} />
      <span className="sr-only">{active ? (dir === "asc" ? "ascending" : "descending") : ""}</span>
    </button>
  );
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
      <span className="tabular">
        {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="size-7" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </Button>
        <span className="tabular px-2">
          {page} / {pages}
        </span>
        <Button variant="outline" size="icon" className="size-7" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function RangeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[170px] bg-card" aria-label="Date range">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RANGES.map((r) => (
          <SelectItem key={r.value} value={r.value}>
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}


export const chartTooltipStyle = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
    boxShadow: "var(--shadow-pop)",
  },
  labelStyle: { color: "var(--muted-foreground)", marginBottom: 4 },
};
export const axisProps = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;

export function Field({ label, error, children, className }: { label: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}

