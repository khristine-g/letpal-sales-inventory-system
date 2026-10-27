import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Boxes, ShoppingCart, Users, Wallet } from "lucide-react";
import { Kpi, PageHeader, Panel, RangeSelect, axisProps, chartTooltipStyle } from "@/components/app/ui-kit";
import { OrderStatusBadge, StockBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useData } from "@/lib/store";
import { useDateRange } from "@/lib/date-range";
import { completedIn, orderTotal, productPerformance, repPerformance, revenue, stockStatus } from "@/lib/business";
import { TODAY } from "@/lib/mock-data";
import { compactKsh, fmtDate, ksh, num, pct } from "@/lib/format";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Letpal Enterprises" },
      { name: "description", content: "Sales KPIs, revenue trends, low-stock alerts and representative performance at a glance." },
      { property: "og:title", content: "Dashboard — Letpal Enterprises" },
      { property: "og:description", content: "Sales KPIs, revenue trends, low-stock alerts and representative performance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { orders, products, reps, settings } = useData();
  const range = useDateRange(settings.defaultRange);
  const cur = completedIn(orders, range.from, range.to);
  const prev = completedIn(orders, range.prevFrom, range.prevTo);
  const totalSales = revenue(cur);
  const allInRange = orders.filter((o) => {
    const t = new Date(o.date).getTime();
    return t >= range.from.getTime() && t <= range.to.getTime();
  });
  const prevAll = orders.filter((o) => {
    const t = new Date(o.date).getTime();
    return t >= range.prevFrom.getTime() && t <= range.prevTo.getTime();
  });
  const inStock = products.filter((p) => p.fulfillment === "stock" && p.stock > 0);
  const activeReps = new Set(cur.map((o) => o.repId)).size;
  const lowStock = products.filter((p) => ["low", "out"].includes(stockStatus(p))).sort((a, b) => a.stock / (a.reorderLevel || 1) - b.stock / (b.reorderLevel || 1));
  const repPerf = repPerformance(orders, reps, range.from, range.to);
  const top = productPerformance(orders, products, range.from, range.to).slice(0, 5);

  const monthly = useMemo(() => {
    const out: { label: string; revenue: number; orders: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const from = new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 1);
      const to = new Date(TODAY.getFullYear(), TODAY.getMonth() - i + 1, 0, 23, 59, 59);
      const c = completedIn(orders, from, to);
      out.push({ label: from.toLocaleDateString("en-GB", { month: "short" }), revenue: revenue(c), orders: c.length });
    }
    return out;
  }, [orders]);

  const delta = (a: number, b: number) => (b ? (a - b) / b : undefined);

  return (
    <>
      <PageHeader
        title="Good evening, Stella"
        description={`Overview for ${range.label.toLowerCase()} · ${fmtDate(range.from.toISOString())} – ${fmtDate(range.to.toISOString())}`}
        actions={
          <>
            <RangeSelect value={range.value} onChange={range.setValue} />
            <Button asChild>
              <Link to="/sales" search={{ new: true }}>New sale</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total Sales" value={ksh(totalSales)} delta={delta(totalSales, revenue(prev))} hint="vs previous period" icon={<Wallet className="size-4" />} />
        <Kpi label="Total Orders" value={num(allInRange.length)} delta={delta(allInRange.length, prevAll.length)} hint={`${cur.length} completed`} icon={<ShoppingCart className="size-4" />} />
        <Kpi label="Products in Stock" value={num(inStock.length)} hint={`of ${products.filter((p) => p.fulfillment === "stock").length} stocked · ${lowStock.length} need attention`} icon={<Boxes className="size-4" />} />
        <Kpi label="Active Sales Reps" value={`${activeReps} / ${reps.length}`} hint="with completed sales" icon={<Users className="size-4" />} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Monthly sales revenue" description="Completed sales, last 6 months" className="lg:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} width={60} tickFormatter={(v) => compactKsh(v).replace("KSh ", "")} />
                <Tooltip {...chartTooltipStyle} cursor={{ fill: "var(--muted)" }} formatter={(v: number, n) => (n === "revenue" ? [ksh(v), "Revenue"] : [v, "Orders"])} />
                <Bar dataKey="revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Low-stock alerts" description={`${lowStock.length} products at or below reorder level`} bodyClassName="p-0" actions={<Button asChild variant="ghost" size="sm"><Link to="/products" search={{ status: "low" }}>View</Link></Button>}>
          <ul className="divide-y">
            {lowStock.slice(0, 6).map((p) => (
              <li key={p.id}>
                <Link to="/products" search={{ q: p.sku }} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="tabular text-xs text-muted-foreground">{p.stock} {p.unit} · reorder at {p.reorderLevel}</p>
                  </div>
                  <StockBadge status={stockStatus(p)} />
                </Link>
              </li>
            ))}
            {lowStock.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted-foreground">All stock levels healthy.</li>}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Recent sales" className="lg:col-span-2" bodyClassName="p-0" actions={<Button asChild variant="ghost" size="sm"><Link to="/sales">All orders <ArrowRight className="size-3.5" /></Link></Button>}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Rep</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.slice(0, 7).map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="pl-4">
                      <Link to="/sales" search={{ q: o.number }} className="font-medium hover:text-primary">{o.number}</Link>
                      <div className="text-xs text-muted-foreground">{fmtDate(o.date)}</div>
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate">{o.customer}</TableCell>
                    <TableCell className="hidden md:table-cell">{reps.find((r) => r.id === o.repId)?.name}</TableCell>
                    <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                    <TableCell className="tabular pr-4 text-right font-medium">{ksh(orderTotal(o))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>

        <Panel title="Top sales representatives" description="Revenue vs pro-rated target" actions={<Button asChild variant="ghost" size="sm"><Link to="/reps">All</Link></Button>}>
          <ul className="space-y-4">
            {repPerf.slice(0, 5).map((r) => (
              <li key={r.rep.id}>
                <Link to="/reps/$repId" params={{ repId: r.rep.id }} className="group block">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium group-hover:text-primary">
                      <span className="tabular mr-2 text-xs text-muted-foreground">#{r.rank}</span>
                      {r.rep.name}
                    </span>
                    <span className="tabular text-xs text-muted-foreground">{pct(r.achievement)}</span>
                  </div>
                  <Progress value={Math.min(100, r.achievement * 100)} className="mt-1.5 h-1.5" />
                  <div className="tabular mt-1 text-xs text-muted-foreground">{ksh(r.revenue)} · {r.orders} orders</div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Top-selling products" description={range.label} className="mt-4" bodyClassName="p-0">
        <div className="grid grid-cols-1 divide-y sm:grid-cols-5 sm:divide-x sm:divide-y-0">
          {top.map((t, i) => (
            <div key={t.product.id} className="p-4">
              <div className="text-xs text-muted-foreground">#{i + 1} · {t.product.category}</div>
              <div className="mt-1 truncate text-sm font-medium">{t.product.name}</div>
              <div className="tabular mt-2 text-lg font-semibold">{compactKsh(t.revenue)}</div>
              <div className="tabular text-xs text-muted-foreground">{num(t.units)} {t.product.unit} sold</div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
