import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader, Panel, RangeSelect } from "@/components/app/ui-kit";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useData } from "@/lib/store";
import { useDateRange } from "@/lib/date-range";
import { inRange, orderTotal, productPerformance, repPerformance, stockStatus } from "@/lib/business";
import { downloadCsv, fmtDate, ksh, pct } from "@/lib/format";
import { CATEGORIES } from "@/lib/mock-data";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Letpal Enterprises" },
      { name: "description", content: "Filterable sales, inventory and representative reports with CSV export and print." },
      { property: "og:title", content: "Reports — Letpal Enterprises" },
      { property: "og:description", content: "Sales, inventory and representative reports with export." },
    ],
  }),
  component: ReportsPage,
});

type Kind = "sales" | "inventory" | "reps";

function ReportsPage() {
  const { orders, products, reps } = useData();
  const range = useDateRange("30d");
  const [kind, setKind] = useState<Kind>("sales");
  const [status, setStatus] = useState("all");
  const [cat, setCat] = useState("all");

  const report = useMemo(() => {
    if (kind === "sales") {
      const rows = orders.filter((o) => inRange(o.date, range.from, range.to) && (status === "all" || o.status === status));
      return {
        head: ["Order", "Date", "Customer", "Representative", "Status", "Payment", "Total (KSh)"],
        align: [0, 0, 0, 0, 0, 0, 1],
        rows: rows.map((o) => [o.number, fmtDate(o.date), o.customer, reps.find((r) => r.id === o.repId)?.name ?? "", o.status, o.payment, orderTotal(o)]),
        foot: ["Total", "", `${rows.length} orders`, "", "", "", rows.reduce((s, o) => s + orderTotal(o), 0)],
      };
    }
    if (kind === "inventory") {
      const perf = productPerformance(orders, products, range.from, range.to);
      const rows = perf.filter((p) => cat === "all" || p.product.category === cat);
      return {
        head: ["SKU", "Product", "Category", "Fulfillment", "On hand", "Status", "Units sold", "Revenue (KSh)"],
        align: [0, 0, 0, 0, 1, 0, 1, 1],
        rows: rows.map((p) => [p.product.sku, p.product.name, p.product.category, p.product.fulfillment === "stock" ? "Stock" : "Supplier", p.product.fulfillment === "stock" ? p.product.stock : "—", stockStatus(p.product), p.units, p.revenue]),
        foot: ["Total", `${rows.length} products`, "", "", "", "", rows.reduce((s, p) => s + p.units, 0), rows.reduce((s, p) => s + p.revenue, 0)],
      };
    }
    const perf = repPerformance(orders, reps, range.from, range.to);
    return {
      head: ["Rank", "Representative", "Region", "Orders", "Revenue (KSh)", "Target (KSh)", "Achievement"],
      align: [0, 0, 0, 1, 1, 1, 1],
      rows: perf.map((p) => [p.rank, p.rep.name, p.rep.region, p.orders, p.revenue, p.target, pct(p.achievement)]),
      foot: ["", "Total", "", perf.reduce((s, p) => s + p.orders, 0), perf.reduce((s, p) => s + p.revenue, 0), perf.reduce((s, p) => s + p.target, 0), ""],
    };
  }, [kind, orders, products, reps, range.from, range.to, status, cat]);

  const show = (v: string | number, i: number) => (typeof v === "number" && report.head[i].includes("KSh") ? ksh(v).replace("KSh ", "") : String(v));
  const exportCsv = () => {
    downloadCsv(`letpal-${kind}-report-${range.value}.csv`, [report.head, ...report.rows, report.foot]);
    toast.success("Report exported as CSV");
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description="Generate a report, review it below, then export or print."
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()}><Printer className="size-4" /> Print</Button>
            <Button onClick={exportCsv} disabled={!report.rows.length}><Download className="size-4" /> Export CSV</Button>
          </>
        }
      />
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)}>
          <TabsList>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="reps">Representatives</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap gap-2 md:ml-auto">
          <RangeSelect value={range.value} onChange={range.setValue} />
          {kind === "sales" && (
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40 bg-card" aria-label="Order status"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
            </Select>
          )}
          {kind === "inventory" && (
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="w-48 bg-card" aria-label="Category"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All categories</SelectItem>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
      </div>
      <Panel title={`${kind === "sales" ? "Sales" : kind === "inventory" ? "Inventory" : "Representative performance"} report`} description={`${fmtDate(range.from.toISOString())} – ${fmtDate(range.to.toISOString())} · ${report.rows.length} rows`} bodyClassName="p-0">
        {report.rows.length === 0 ? <EmptyState title="No data for these filters" description="Widen the date range or change the filters." /> : (
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>{report.head.map((h, i) => <TableHead key={h} className={`${i === 0 ? "pl-4" : ""} ${i === report.head.length - 1 ? "pr-4" : ""} ${report.align[i] ? "text-right" : ""}`}>{h}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {report.rows.map((r, ri) => (
                  <TableRow key={ri}>{r.map((c, i) => <TableCell key={i} className={`${i === 0 ? "pl-4" : ""} ${i === r.length - 1 ? "pr-4" : ""} ${report.align[i] ? "tabular text-right" : ""}`}>{show(c, i)}</TableCell>)}</TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>{report.foot.map((c, i) => <TableCell key={i} className={`${i === 0 ? "pl-4" : ""} ${i === report.foot.length - 1 ? "pr-4" : ""} ${report.align[i] ? "tabular text-right" : ""} font-semibold`}>{show(c, i)}</TableCell>)}</TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </Panel>
    </>
  );
}
