import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Kpi, PageHeader, Panel, RangeSelect, axisProps, chartTooltipStyle } from "@/components/app/ui-kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useData } from "@/lib/store";
import { useDateRange } from "@/lib/date-range";
import { categoryRevenue, completedIn, inRange, orderTotal, productPerformance, repPerformance, revenue, revenueSeries } from "@/lib/business";
import { compactKsh, ksh, num, pct } from "@/lib/format";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Letpal Enterprises" },
      { name: "description", content: "Revenue trends, product performance and representative comparisons over any date range." },
      { property: "og:title", content: "Analytics — Letpal Enterprises" },
      { property: "og:description", content: "Revenue trends, product performance and rep comparisons." },
    ],
  }),
  component: AnalyticsPage,
});

const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--muted-foreground)"];

function AnalyticsPage() {
  const { orders, products, reps } = useData();
  const range = useDateRange("90d");
  const cur = completedIn(orders, range.from, range.to);
  const prev = completedIn(orders, range.prevFrom, range.prevTo);
  const rev = revenue(cur), prevRev = revenue(prev);
  const perf = productPerformance(orders, products, range.from, range.to);
  const profit = perf.reduce((s, p) => s + p.profit, 0);
  const prevProfit = productPerformance(orders, products, range.prevFrom, range.prevTo).reduce((s, p) => s + p.profit, 0);
  const all = orders.filter((o) => inRange(o.date, range.from, range.to));
  const cancelRate = all.length ? all.filter((o) => o.status === "cancelled").length / all.length : 0;
  const series = useMemo(() => revenueSeries(orders, range.from, range.to), [orders, range.from, range.to]);
  const cats = categoryRevenue(orders, products, range.from, range.to);
  const repData = repPerformance(orders, reps, range.from, range.to);
  const methods = (["M-Pesa", "Cash", "Bank transfer", "Credit"] as const).map((m) => ({ name: m, value: revenue(cur.filter((o) => o.method === m)) }));
  const d = (a: number, b: number) => (b ? (a - b) / b : undefined);

  return (
    <>
      <PageHeader title="Analytics" description={`Completed sales only · compared with the previous ${range.label.toLowerCase().replace("last ", "")}`} actions={<RangeSelect value={range.value} onChange={range.setValue} />} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Revenue" value={compactKsh(rev)} delta={d(rev, prevRev)} hint="vs prior period" />
        <Kpi label="Gross profit" value={compactKsh(profit)} delta={d(profit, prevProfit)} hint={`margin ${pct(rev ? profit / rev : 0, 1)}`} />
        <Kpi label="Avg order value" value={ksh(cur.length ? rev / cur.length : 0)} delta={d(cur.length ? rev / cur.length : 0, prev.length ? prevRev / prev.length : 0)} hint={`${num(cur.length)} orders`} />
        <Kpi label="Cancellation rate" value={pct(cancelRate, 1)} hint={`${all.filter((o) => o.status === "cancelled").length} of ${all.length} orders`} />
      </div>

      <Panel title="Revenue trend" description={series.length > 120 ? "Weekly" : "Daily"} className="mt-4">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ left: 0, right: 8, top: 8 }}>
              <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.18} /><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" {...axisProps} minTickGap={24} />
              <YAxis {...axisProps} width={56} tickFormatter={(v) => compactKsh(v).replace("KSh ", "")} />
              <Tooltip {...chartTooltipStyle} formatter={(v: number, n) => (n === "revenue" ? [ksh(v), "Revenue"] : [v, "Orders"])} />
              <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} fill="url(#ag)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Representative comparison" description="Revenue vs pro-rated target">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={repData.map((r) => ({ name: r.rep.name.split(" ")[0], revenue: r.revenue, target: r.target }))} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis type="number" {...axisProps} tickFormatter={(v) => compactKsh(v).replace("KSh ", "")} />
                <YAxis type="category" dataKey="name" {...axisProps} width={60} />
                <Tooltip {...chartTooltipStyle} cursor={{ fill: "var(--muted)" }} formatter={(v: number, n) => [ksh(v), n === "revenue" ? "Revenue" : "Target"]} />
                <Bar dataKey="target" fill="var(--border)" radius={[0, 4, 4, 0]} barSize={10} />
                <Bar dataKey="revenue" fill="var(--chart-1)" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Revenue by category">
          <div className="grid h-64 grid-cols-1 items-center gap-4 sm:grid-cols-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={cats} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={2} stroke="none">
                  {cats.map((c, i) => <Cell key={c.name} fill={colors[i % colors.length]} />)}
                </Pie>
                <Tooltip {...chartTooltipStyle} formatter={(v: number) => ksh(v)} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="space-y-2 text-sm">
              {cats.map((c, i) => (
                <li key={c.name} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm" style={{ background: colors[i % colors.length] }} />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="tabular text-muted-foreground">{pct(rev ? c.value / rev : 0)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Product performance" className="lg:col-span-2" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead className="pl-4">Product</TableHead><TableHead className="text-right">Units</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Profit</TableHead><TableHead className="pr-4 text-right">Share</TableHead></TableRow></TableHeader>
              <TableBody>
                {perf.slice(0, 10).map((p) => (
                  <TableRow key={p.product.id}>
                    <TableCell className="pl-4"><div className="font-medium">{p.product.name}</div><div className="text-xs text-muted-foreground">{p.product.category}</div></TableCell>
                    <TableCell className="tabular text-right">{num(p.units)}</TableCell>
                    <TableCell className="tabular text-right">{ksh(p.revenue)}</TableCell>
                    <TableCell className="tabular text-right text-success">{ksh(p.profit)}</TableCell>
                    <TableCell className="tabular pr-4 text-right text-muted-foreground">{pct(rev ? p.revenue / rev : 0, 1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
        <Panel title="Payment methods" description="Share of completed revenue">
          <ul className="space-y-4">
            {methods.map((m, i) => (
              <li key={m.name}>
                <div className="flex justify-between text-sm"><span>{m.name}</span><span className="tabular text-muted-foreground">{compactKsh(m.value)}</span></div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${rev ? (m.value / rev) * 100 : 0}%`, background: colors[i] }} /></div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-muted-foreground">Average basket: {(cur.reduce((s, o) => s + o.items.length, 0) / (cur.length || 1)).toFixed(1)} items · largest order {ksh(Math.max(0, ...cur.map(orderTotal)))}</p>
        </Panel>
      </div>
    </>
  );
}
