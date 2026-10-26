import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Trophy } from "lucide-react";
import { PageHeader, Panel, RangeSelect, axisProps, chartTooltipStyle } from "@/components/app/ui-kit";
import { Pill } from "@/components/app/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useData } from "@/lib/store";
import { useDateRange } from "@/lib/date-range";
import { repPerformance } from "@/lib/business";
import { compactKsh, initials, ksh, pct } from "@/lib/format";

export const Route = createFileRoute("/reps/")({
  head: () => ({
    meta: [
      { title: "Sales Representatives — Letpal Enterprises" },
      { name: "description", content: "Representative directory, rankings, sales targets and target achievement." },
      { property: "og:title", content: "Sales Representatives — Letpal Enterprises" },
      { property: "og:description", content: "Rankings, targets and achievement for every sales representative." },
    ],
  }),
  component: RepsPage,
});

const achievementTone = (a: number) => (a >= 1 ? "success" : a >= 0.75 ? "info" : a >= 0.5 ? "warning" : "danger");

function RepsPage() {
  const { orders, reps } = useData();
  const range = useDateRange("mtd");
  const perf = repPerformance(orders, reps, range.from, range.to);
  const chart = perf.map((p) => ({ name: p.rep.name.split(" ")[0], revenue: p.revenue, target: p.target }));
  const leader = perf[0];

  return (
    <>
      <PageHeader title="Sales Representatives" description="Targets are monthly and pro-rated to the selected period. Only completed sales count." actions={<RangeSelect value={range.value} onChange={range.setValue} />} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Revenue vs target" description={range.label} className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} width={56} tickFormatter={(v) => compactKsh(v).replace("KSh ", "")} />
                <Tooltip {...chartTooltipStyle} cursor={{ fill: "var(--muted)" }} formatter={(v: number, n) => [ksh(v), n === "revenue" ? "Revenue" : "Target"]} />
                <Bar dataKey="target" fill="var(--border)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        {leader && (
          <Panel title="Period leader">
            <div className="flex items-center gap-3">
              <Avatar className="size-12"><AvatarFallback className="bg-primary-soft font-semibold text-primary">{initials(leader.rep.name)}</AvatarFallback></Avatar>
              <div>
                <div className="flex items-center gap-1.5 font-semibold"><Trophy className="size-4 text-warning" />{leader.rep.name}</div>
                <div className="text-sm text-muted-foreground">{leader.rep.region}</div>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-xs text-muted-foreground">Revenue</dt><dd className="tabular text-lg font-semibold">{compactKsh(leader.revenue)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Achievement</dt><dd className="tabular text-lg font-semibold">{pct(leader.achievement)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Orders</dt><dd className="tabular font-medium">{leader.orders}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Avg order</dt><dd className="tabular font-medium">{ksh(leader.avgOrder)}</dd></div>
            </dl>
          </Panel>
        )}
      </div>

      <Panel title="Rankings" className="mt-4" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 pl-4">#</TableHead>
                <TableHead>Representative</TableHead>
                <TableHead className="hidden md:table-cell">Region</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="hidden sm:table-cell text-right">Target</TableHead>
                <TableHead className="w-48 pr-4">Achievement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perf.map((p) => (
                <TableRow key={p.rep.id}>
                  <TableCell className="tabular pl-4 font-medium text-muted-foreground">{p.rank}</TableCell>
                  <TableCell>
                    <Link to="/reps/$repId" params={{ repId: p.rep.id }} className="flex items-center gap-2.5 hover:text-primary">
                      <Avatar className="size-8"><AvatarFallback className="bg-muted text-xs">{initials(p.rep.name)}</AvatarFallback></Avatar>
                      <div><div className="font-medium">{p.rep.name}</div><div className="text-xs text-muted-foreground">{p.rep.email}</div></div>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{p.rep.region}</TableCell>
                  <TableCell className="tabular text-right">{p.orders}</TableCell>
                  <TableCell className="tabular text-right font-medium">{ksh(p.revenue)}</TableCell>
                  <TableCell className="tabular hidden sm:table-cell text-right text-muted-foreground">{ksh(p.target)}</TableCell>
                  <TableCell className="pr-4">
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(100, p.achievement * 100)} className="h-1.5 flex-1" />
                      <Pill tone={achievementTone(p.achievement)} className="tabular">{pct(p.achievement)}</Pill>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </>
  );
}
