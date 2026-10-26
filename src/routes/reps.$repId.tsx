import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { Kpi, PageHeader, Panel, axisProps, chartTooltipStyle } from "@/components/app/ui-kit";
import { OrderStatusBadge } from "@/components/app/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useData } from "@/lib/store";
import { seedData, TODAY } from "@/lib/mock-data";
import { completedIn, orderTotal, productPerformance, repPerformance, revenue } from "@/lib/business";
import { compactKsh, fmtDate, initials, ksh, pct } from "@/lib/format";

export const Route = createFileRoute("/reps/$repId")({
  loader: ({ params }) => {
    const rep = seedData.reps.find((r) => r.id === params.repId);
    if (!rep) throw notFound();
    return { name: rep.name };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Representative"} — Letpal Enterprises` },
      { name: "description", content: "Individual sales performance, target achievement and recent orders." },
      { property: "og:title", content: `${loaderData?.name ?? "Representative"} — Letpal Enterprises` },
      { property: "og:description", content: "Individual sales representative performance profile." },
    ],
  }),
  component: RepProfile,
});

function RepProfile() {
  const { repId } = Route.useParams();
  const { reps, orders, products } = useData();
  const rep = reps.find((r) => r.id === repId)!;
  const mine = orders.filter((o) => o.repId === repId);

  const monthFrom = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
  const monthTo = new Date(TODAY);
  monthTo.setHours(23, 59, 59);
  const all = repPerformance(orders, reps, monthFrom, monthTo);
  const me = all.find((p) => p.rep.id === repId)!;

  const history = Array.from({ length: 6 }, (_, k) => {
    const i = 5 - k;
    const from = new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 1);
    const to = new Date(TODAY.getFullYear(), TODAY.getMonth() - i + 1, 0, 23, 59, 59);
    return { label: from.toLocaleDateString("en-GB", { month: "short" }), revenue: revenue(completedIn(mine, from, to)) };
  });
  const top = productPerformance(mine, products, new Date(2000, 0, 1), monthTo).filter((p) => p.units > 0).slice(0, 5);
  const lifetime = revenue(mine.filter((o) => o.status === "completed"));

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2"><Link to="/reps"><ArrowLeft className="size-4" /> All representatives</Link></Button>
      <PageHeader title={rep.name} description={`Rank #${me.rank} of ${reps.length} this month`} />
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <Avatar className="size-10"><AvatarFallback className="bg-primary-soft font-semibold text-primary">{initials(rep.name)}</AvatarFallback></Avatar>
        <span className="flex items-center gap-1.5"><MapPin className="size-4" />{rep.region}</span>
        <a href={`mailto:${rep.email}`} className="flex items-center gap-1.5 hover:text-primary"><Mail className="size-4" />{rep.email}</a>
        <span className="flex items-center gap-1.5"><Phone className="size-4" />{rep.phone}</span>
        <span>Joined {fmtDate(rep.joined)}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Month-to-date revenue" value={ksh(me.revenue)} hint={`${me.orders} completed orders`} />
        <Kpi label="Monthly target" value={ksh(rep.monthlyTarget)} hint={`pro-rated ${ksh(me.target)}`} />
        <Kpi label="Target achievement" value={pct(me.achievement)} hint="month to date" />
        <Kpi label="Lifetime revenue" value={compactKsh(lifetime)} hint={`${mine.length} orders total`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Monthly revenue" description="Dashed line shows monthly target" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ left: 0, right: 8, top: 8 }}>
                <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.2} /><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} width={56} tickFormatter={(v) => compactKsh(v).replace("KSh ", "")} />
                <Tooltip {...chartTooltipStyle} formatter={(v: number) => [ksh(v), "Revenue"]} />
                <ReferenceLine y={rep.monthlyTarget} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
                <Area dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} fill="url(#rg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Top products sold">
          <ul className="space-y-3">
            {top.map((t) => (
              <li key={t.product.id}>
                <div className="flex justify-between text-sm"><span className="truncate">{t.product.name}</span><span className="tabular text-muted-foreground">{compactKsh(t.revenue)}</span></div>
                <Progress value={(t.revenue / (top[0]?.revenue || 1)) * 100} className="mt-1 h-1" />
              </li>
            ))}
            {top.length === 0 && <li className="text-sm text-muted-foreground">No completed sales yet.</li>}
          </ul>
        </Panel>
      </div>

      <Panel title="Recent orders" className="mt-4" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead className="pl-4">Order</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Status</TableHead><TableHead className="pr-4 text-right">Total</TableHead></TableRow></TableHeader>
            <TableBody>
              {mine.slice(0, 10).map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="pl-4"><Link to="/sales" search={{ q: o.number }} className="font-medium hover:text-primary">{o.number}</Link></TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(o.date)}</TableCell>
                  <TableCell>{o.customer}</TableCell>
                  <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                  <TableCell className="tabular pr-4 text-right">{ksh(orderTotal(o))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </>
  );
}
