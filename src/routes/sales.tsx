import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, Field, Kpi, PageHeader, Pager, Panel, RangeSelect, SortHeader } from "@/components/app/ui-kit";
import { OrderStatusBadge, PaymentBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useData } from "@/lib/store";
import { useDateRange } from "@/lib/date-range";
import { inRange, orderTotal, stockShortfalls } from "@/lib/business";
import { fmtDate, fmtDateTime, ksh, num } from "@/lib/format";
import type { OrderItem, OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/types";

type Search = { q?: string; new?: boolean };

export const Route = createFileRoute("/sales")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    new: s.new === true || s.new === "true" ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sales & Orders — Letpal Enterprises" },
      { name: "description", content: "Record multi-item sales, track order and payment status, and review transactions." },
      { property: "og:title", content: "Sales & Orders — Letpal Enterprises" },
      { property: "og:description", content: "Record sales and track orders and payments." },
    ],
  }),
  component: SalesPage,
});

const PAGE = 12;

function SalesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/sales" });
  const { orders, reps } = useData();
  const range = useDateRange("90d");
  const [q, setQ] = useState(search.q ?? "");
  const [status, setStatus] = useState("all");
  const [pay, setPay] = useState("all");
  const [sort, setSort] = useState<{ key: "date" | "total"; dir: "asc" | "desc" }>({ key: "date", dir: "desc" });
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(!!search.new);

  useEffect(() => setQ(search.q ?? ""), [search.q]);
  useEffect(() => { if (search.new) setCreating(true); }, [search.new]);
  useEffect(() => setPage(1), [q, status, pay, range.value]);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    const exact = orders.find((o) => o.number.toLowerCase() === t);
    const r = orders.filter((o) =>
      (exact ? o === exact : inRange(o.date, range.from, range.to)) &&
      (!t || o.number.toLowerCase().includes(t) || o.customer.toLowerCase().includes(t) || (reps.find((x) => x.id === o.repId)?.name.toLowerCase().includes(t) ?? false)) &&
      (status === "all" || o.status === status) &&
      (pay === "all" || o.payment === pay),
    );
    const m = sort.dir === "asc" ? 1 : -1;
    return r.sort((a, b) => (sort.key === "date" ? a.date.localeCompare(b.date) : orderTotal(a) - orderTotal(b)) * m);
  }, [orders, reps, q, status, pay, sort, range.from, range.to]);

  const inR = orders.filter((o) => inRange(o.date, range.from, range.to));
  const sum = (s: OrderStatus) => inR.filter((o) => o.status === s).reduce((a, o) => a + orderTotal(o), 0);
  const outstanding = inR.filter((o) => o.status !== "cancelled" && (o.payment === "unpaid" || o.payment === "partial"));
  const toggle = (key: "date" | "total") => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));

  return (
    <>
      <PageHeader
        title="Sales & Orders"
        description="Completed sales count towards revenue and stock. Pending orders reserve nothing until completed."
        actions={
          <>
            <RangeSelect value={range.value} onChange={range.setValue} />
            <Button onClick={() => setCreating(true)}><Plus className="size-4" /> New sale</Button>
          </>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Completed revenue" value={ksh(sum("completed"))} hint={`${inR.filter((o) => o.status === "completed").length} orders`} />
        <Kpi label="Pending value" value={ksh(sum("pending"))} hint={`${inR.filter((o) => o.status === "pending").length} awaiting completion`} />
        <Kpi label="Cancelled" value={ksh(sum("cancelled"))} hint={`${inR.filter((o) => o.status === "cancelled").length} orders · excluded from revenue`} />
        <Kpi label="Outstanding payments" value={num(outstanding.length)} hint="unpaid or partial" />
      </div>

      <Panel bodyClassName="p-0">
        <div className="flex flex-col gap-2 border-b p-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order #, customer or rep" className="pl-8" aria-label="Search orders" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="md:w-40" aria-label="Order status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={pay} onValueChange={setPay}>
            <SelectTrigger className="md:w-40" aria-label="Payment status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All payments</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {rows.length === 0 ? (
          <EmptyState title="No orders found" description="Adjust the date range or filters, or record a new sale." action={<Button onClick={() => setCreating(true)}>New sale</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Order</TableHead>
                  <TableHead><SortHeader label="Date" active={sort.key === "date"} dir={sort.dir} onClick={() => toggle("date")} /></TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden lg:table-cell">Rep</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Payment</TableHead>
                  <TableHead className="pr-4 text-right"><SortHeader label="Total" active={sort.key === "total"} dir={sort.dir} onClick={() => toggle("total")} /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice((page - 1) * PAGE, page * PAGE).map((o) => (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => setOpenId(o.id)}>
                    <TableCell className="pl-4 font-medium">{o.number}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(o.date)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{o.customer}</TableCell>
                    <TableCell className="hidden lg:table-cell">{reps.find((r) => r.id === o.repId)?.name}</TableCell>
                    <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                    <TableCell className="hidden md:table-cell"><PaymentBadge status={o.payment} /></TableCell>
                    <TableCell className="tabular pr-4 text-right font-medium">{ksh(orderTotal(o))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <Pager page={page} pageSize={PAGE} total={rows.length} onPage={setPage} />
      </Panel>

      <OrderSheet id={openId} onClose={() => setOpenId(null)} />
      <NewSaleDialog
        open={creating}
        onClose={() => { setCreating(false); if (search.new) navigate({ search: {} }); }}
        onCreated={(n) => { setQ(n); }}
      />
    </>
  );
}

function OrderSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { orders, products, reps, changeOrderStatus, setPayment } = useData();
  const [confirm, setConfirm] = useState(false);
  const o = orders.find((x) => x.id === id);
  const act = (r: { ok: boolean; error?: string }, msg: string) => (r.ok ? toast.success(msg) : toast.error((r as { error: string }).error));
  return (
    <Sheet open={!!o} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {o && (
          <>
            <SheetHeader>
              <SheetTitle>{o.number}</SheetTitle>
              <SheetDescription>{fmtDateTime(o.date)} · {o.customer}</SheetDescription>
            </SheetHeader>
            <div className="mt-4 flex flex-wrap gap-2"><OrderStatusBadge status={o.status} /><PaymentBadge status={o.payment} /></div>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">Representative</dt><dd className="font-medium">{reps.find((r) => r.id === o.repId)?.name}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Method</dt><dd className="font-medium">{o.method}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Items</dt><dd className="font-medium">{o.items.length}</dd></div>
            </dl>
            <div className="mt-4 overflow-hidden rounded-lg border">
              <Table>
                <TableHeader><TableRow><TableHead className="pl-3">Item</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="pr-3 text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {o.items.map((i) => {
                    const p = products.find((x) => x.id === i.productId);
                    return (
                      <TableRow key={i.productId}>
                        <TableCell className="pl-3">
                          {p?.name ?? "Deleted product"}
                          <div className="tabular text-xs text-muted-foreground">{ksh(i.unitPrice)} each{p?.fulfillment === "supplier" && " · supplier-fulfilled"}</div>
                        </TableCell>
                        <TableCell className="tabular text-right">{i.qty}</TableCell>
                        <TableCell className="tabular pr-3 text-right">{ksh(i.qty * i.unitPrice)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter><TableRow><TableCell className="pl-3" colSpan={2}>Total</TableCell><TableCell className="tabular pr-3 text-right font-semibold">{ksh(orderTotal(o))}</TableCell></TableRow></TableFooter>
              </Table>
            </div>
            {o.status !== "cancelled" && (
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-semibold">Actions</h3>
                <div className="flex flex-wrap gap-2">
                  {o.status === "pending" && <Button onClick={() => act(changeOrderStatus(o.id, "completed"), `${o.number} completed — stock updated`)}>Mark completed</Button>}
                  <Select value={o.payment} onValueChange={(v) => act(setPayment(o.id, v as PaymentStatus), "Payment status updated")}>
                    <SelectTrigger className="w-40" aria-label="Payment status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="text-destructive" onClick={() => setConfirm(true)}>Cancel order</Button>
                </div>
              </div>
            )}
            <AlertDialog open={confirm} onOpenChange={setConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel {o.number}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {o.status === "completed" ? "Stock for stock-managed items will be restored and any payment marked refunded. " : ""}
                    The order will be excluded from revenue. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep order</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => act(changeOrderStatus(o.id, "cancelled"), `${o.number} cancelled`)}>Cancel order</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

type Line = { key: number; productId: string; qty: number };

function NewSaleDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (n: string) => void }) {
  const { products, reps, createSale } = useData();
  const [customer, setCustomer] = useState("");
  const [repId, setRepId] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("M-Pesa");
  const [status, setStatus] = useState<"completed" | "pending">("completed");
  const [payment, setPaymentS] = useState<PaymentStatus>("paid");
  const [lines, setLines] = useState<Line[]>([{ key: 1, productId: "", qty: 1 }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setCustomer(""); setRepId(""); setMethod("M-Pesa"); setStatus("completed"); setPaymentS("paid"); setLines([{ key: 1, productId: "", qty: 1 }]); setErrors({}); }
  }, [open]);

  const items: OrderItem[] = lines.filter((l) => l.productId).map((l) => ({ productId: l.productId, qty: l.qty, unitPrice: products.find((p) => p.id === l.productId)!.unitPrice }));
  const total = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const shortfalls = status === "completed" ? stockShortfalls(items, products) : [];
  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!customer.trim()) err.customer = "Enter the customer name";
    if (!repId) err.rep = "Choose a representative";
    if (!items.length) err.items = "Add at least one product";
    if (lines.some((l) => l.productId && !(l.qty > 0 && Number.isInteger(l.qty)))) err.items = "Quantities must be whole numbers above 0";
    setErrors(err);
    if (Object.keys(err).length || shortfalls.length) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    const res = createSale({ customer, repId, items, status, payment, method });
    setSaving(false);
    if (!res.ok) return setErrors({ items: res.error });
    toast.success(`${res.number} recorded`, { description: `${ksh(total)} · ${status === "completed" ? "stock updated" : "pending"}` });
    onCreated(res.number ?? "");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New sale</DialogTitle>
          <DialogDescription>Add one or more products. Completed sales deduct stock immediately.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer" error={errors.customer}><Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer or business name" /></Field>
            <Field label="Sales representative" error={errors.rep}>
              <Select value={repId} onValueChange={setRepId}>
                <SelectTrigger><SelectValue placeholder="Select representative" /></SelectTrigger>
                <SelectContent>{reps.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} · {r.region}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium">Items</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setLines((ls) => [...ls, { key: Date.now(), productId: "", qty: 1 }])}><Plus className="size-3.5" /> Add item</Button>
            </div>
            <div className="space-y-2">
              {lines.map((l) => {
                const p = products.find((x) => x.id === l.productId);
                return (
                  <div key={l.key} className="grid grid-cols-[1fr_80px_auto] items-start gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_90px_120px_auto]">
                    <div>
                      <Select value={l.productId} onValueChange={(v) => update(l.key, { productId: v })}>
                        <SelectTrigger aria-label="Product"><SelectValue placeholder="Choose product" /></SelectTrigger>
                        <SelectContent>
                          {products.map((x) => (
                            <SelectItem key={x.id} value={x.id} disabled={lines.some((o) => o.key !== l.key && o.productId === x.id)}>
                              {x.name} — {x.fulfillment === "stock" ? `${x.stock} in stock` : "supplier"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {p && <p className="tabular mt-1 px-1 text-xs text-muted-foreground">{ksh(p.unitPrice)} / {p.unit.replace(/s$/, "")}</p>}
                    </div>
                    <Input type="number" min={1} value={l.qty} onChange={(e) => update(l.key, { qty: Number(e.target.value) })} aria-label="Quantity" />
                    <div className="tabular hidden h-9 items-center justify-end text-sm font-medium sm:flex">{p ? ksh(p.unitPrice * l.qty) : "—"}</div>
                    <Button type="button" variant="ghost" size="icon" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Remove item"><Trash2 className="size-4" /></Button>
                  </div>
                );
              })}
            </div>
            {errors.items && <p className="mt-2 text-xs text-destructive" role="alert">{errors.items}</p>}
            {shortfalls.length > 0 && (
              <Alert variant="destructive" className="mt-3">
                <AlertDescription>
                  {shortfalls.map((s) => <div key={s}>{s}</div>)}
                  <div className="mt-1 text-xs">Reduce the quantity or save as a pending order.</div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Order status">
              <Select value={status} onValueChange={(v) => { setStatus(v as "completed" | "pending"); if (v === "pending" && payment === "paid") setPaymentS("unpaid"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="completed">Completed</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Payment method">
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(["M-Pesa", "Cash", "Bank transfer", "Credit"] as const).map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Payment status">
              <Select value={payment} onValueChange={(v) => setPaymentS(v as PaymentStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="paid">Paid</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem></SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
            <span className="text-sm text-muted-foreground">{items.length} item{items.length === 1 ? "" : "s"}</span>
            <span className="tabular text-lg font-semibold">{ksh(total)}</span>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || shortfalls.length > 0}>{saving ? "Recording…" : "Record sale"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
