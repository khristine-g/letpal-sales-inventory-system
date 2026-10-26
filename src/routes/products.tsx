import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, PackagePlus, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, Field, PageHeader, Pager, Panel, SortHeader } from "@/components/app/ui-kit";
import { Pill, StockBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useData } from "@/lib/store";
import { replenishmentPlan, stockStatus } from "@/lib/business";
import { CATEGORIES } from "@/lib/mock-data";
import { fmtDateTime, ksh, num } from "@/lib/format";
import type { Product } from "@/lib/types";

type Search = { q?: string; status?: string };

export const Route = createFileRoute("/products")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    status: typeof s.status === "string" ? s.status : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Products & Inventory — Letpal Enterprises" },
      { name: "description", content: "Manage products, stock levels, categories and inventory movement history." },
      { property: "og:title", content: "Products & Inventory — Letpal Enterprises" },
      { property: "og:description", content: "Manage products, stock levels and inventory movements." },
    ],
  }),
  component: ProductsPage,
});

type SortKey = "name" | "stock" | "unitPrice" | "category";
const PAGE = 10;

function ProductsPage() {
  const search = Route.useSearch();
  const { products, movements } = useData();
  const [q, setQ] = useState(search.q ?? "");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState(search.status ?? "all");
  const [ful, setFul] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [restocking, setRestocking] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  useEffect(() => {
    setQ(search.q ?? "");
    if (search.status) setStatus(search.status);
  }, [search.q, search.status]);
  useEffect(() => setPage(1), [q, cat, status, ful]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const r = products.filter((p) => {
      const s = stockStatus(p);
      return (
        (!term || p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)) &&
        (cat === "all" || p.category === cat) &&
        (ful === "all" || p.fulfillment === ful) &&
        (status === "all" || (status === "low" ? s === "low" || s === "out" : s === status))
      );
    });
    const m = sort.dir === "asc" ? 1 : -1;
    return r.sort((a, b) => {
      const x = a[sort.key], y = b[sort.key];
      return (typeof x === "number" ? x - (y as number) : String(x).localeCompare(String(y))) * m;
    });
  }, [products, q, cat, status, ful, sort]);

  const toggleSort = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));
  const stocked = products.filter((p) => p.fulfillment === "stock");
  const stockValue = stocked.reduce((s, p) => s + p.stock * p.costPrice, 0);
  const detailProduct = products.find((p) => p.id === detail) ?? null;

  return (
    <>
      <PageHeader
        title="Products & Inventory"
        description={`${products.length} products · ${stocked.length} stock-managed · inventory value ${ksh(stockValue)} at cost`}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" /> Add product
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {CATEGORIES.map((c) => {
          const n = products.filter((p) => p.category === c).length;
          const active = cat === c;
          return (
            <button key={c} type="button" onClick={() => setCat(active ? "all" : c)} className={`surface-card px-3 py-2.5 text-left transition-colors hover:border-primary/40 ${active ? "border-primary ring-1 ring-primary/30" : ""}`} aria-pressed={active}>
              <div className="truncate text-xs text-muted-foreground">{c}</div>
              <div className="tabular text-base font-semibold">{n}</div>
            </button>
          );
        })}
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="movements">Inventory movements</TabsTrigger>
          <TabsTrigger value="forecast">Forecast & replenishment</TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <Panel bodyClassName="p-0">
            <div className="flex flex-col gap-2 border-b p-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or SKU" className="pl-8" aria-label="Search products" />
              </div>
              <FilterSelect label="Category" value={cat} onChange={setCat} options={[["all", "All categories"], ...CATEGORIES.map((c) => [c, c] as [string, string])]} />
              <FilterSelect label="Stock status" value={status} onChange={setStatus} options={[["all", "Any status"], ["in", "In stock"], ["low", "Low / out"], ["out", "Out of stock"], ["supplier", "Supplier-fulfilled"]]} />
              <FilterSelect label="Fulfillment" value={ful} onChange={setFul} options={[["all", "All fulfillment"], ["stock", "Stock-managed"], ["supplier", "Supplier-fulfilled"]]} />
            </div>
            {rows.length === 0 ? (
              <EmptyState title="No products match your filters" description="Try a different search term or clear the filters." action={<Button variant="outline" onClick={() => { setQ(""); setCat("all"); setStatus("all"); setFul("all"); }}>Clear filters</Button>} />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4"><SortHeader label="Product" active={sort.key === "name"} dir={sort.dir} onClick={() => toggleSort("name")} /></TableHead>
                      <TableHead className="hidden md:table-cell"><SortHeader label="Category" active={sort.key === "category"} dir={sort.dir} onClick={() => toggleSort("category")} /></TableHead>
                      <TableHead className="text-right"><SortHeader label="Price" active={sort.key === "unitPrice"} dir={sort.dir} onClick={() => toggleSort("unitPrice")} /></TableHead>
                      <TableHead className="text-right"><SortHeader label="Stock" active={sort.key === "stock"} dir={sort.dir} onClick={() => toggleSort("stock")} /></TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10 pr-4"><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice((page - 1) * PAGE, page * PAGE).map((p) => (
                      <TableRow key={p.id} className="cursor-pointer" onClick={() => setDetail(p.id)}>
                        <TableCell className="pl-4">
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.sku}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{p.category}</TableCell>
                        <TableCell className="tabular text-right">{ksh(p.unitPrice)}</TableCell>
                        <TableCell className="tabular text-right">{p.fulfillment === "stock" ? `${num(p.stock)} ${p.unit}` : "—"}</TableCell>
                        <TableCell><StockBadge status={stockStatus(p)} /></TableCell>
                        <TableCell className="pr-4" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${p.name}`}><MoreHorizontal className="size-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setDetail(p.id)}>View details</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setEditing(p)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem disabled={p.fulfillment !== "stock"} onSelect={() => setRestocking(p)}>Restock / adjust</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onSelect={() => setDeleting(p)}>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <Pager page={page} pageSize={PAGE} total={rows.length} onPage={setPage} />
          </Panel>
        </TabsContent>
        <TabsContent value="forecast">
          <ForecastTable onRestock={(p) => setRestocking(p)} />
        </TabsContent>
        <TabsContent value="movements">
          <MovementTable movements={movements} products={products} />
        </TabsContent>
      </Tabs>

      <ProductSheet product={detailProduct} onClose={() => setDetail(null)} onEdit={(p) => setEditing(p)} onRestock={(p) => setRestocking(p)} />
      <ProductForm value={editing} onClose={() => setEditing(null)} />
      <RestockDialog product={restocking} onClose={() => setRestocking(null)} />
      <DeleteDialog product={deleting} onClose={() => setDeleting(null)} onDeleted={() => setDetail(null)} />
    </>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="md:w-44" aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

const mvTone = { sale: "neutral", restock: "success", return: "info", adjustment: "warning" } as const;

function MovementTable({ movements, products, compact }: { movements: ReturnType<typeof useData>["movements"]; products: Product[]; compact?: boolean }) {
  const [page, setPage] = useState(1);
  const [type, setType] = useState("all");
  const rows = movements.filter((m) => type === "all" || m.type === type);
  return (
    <Panel bodyClassName="p-0">
      {!compact && (
        <div className="flex items-center justify-between border-b p-3">
          <p className="text-sm text-muted-foreground">{rows.length} movements</p>
          <FilterSelect label="Movement type" value={type} onChange={(v) => { setType(v); setPage(1); }} options={[["all", "All types"], ["sale", "Sales"], ["restock", "Restocks"], ["return", "Returns"], ["adjustment", "Adjustments"]]} />
        </div>
      )}
      {rows.length === 0 ? <EmptyState title="No movements recorded" /> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Date</TableHead>
                {!compact && <TableHead>Product</TableHead>}
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="pr-4 text-right">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice((page - 1) * PAGE, page * PAGE).map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="pl-4 text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(m.date)}</TableCell>
                  {!compact && <TableCell>{products.find((p) => p.id === m.productId)?.name ?? "Deleted product"}</TableCell>}
                  <TableCell><Pill tone={mvTone[m.type]} className="capitalize">{m.type}</Pill></TableCell>
                  <TableCell className="text-xs">{m.ref}{m.note && <div className="text-muted-foreground">{m.note}</div>}</TableCell>
                  <TableCell className={`tabular pr-4 text-right font-medium ${m.qty > 0 ? "text-success" : ""}`}>{m.qty > 0 ? "+" : ""}{m.qty}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pager page={page} pageSize={PAGE} total={rows.length} onPage={setPage} />
    </Panel>
  );
}

function ProductSheet({ product, onClose, onEdit, onRestock }: { product: Product | null; onClose: () => void; onEdit: (p: Product) => void; onRestock: (p: Product) => void }) {
  const { movements, products } = useData();
  return (
    <Sheet open={!!product} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {product && (
          <>
            <SheetHeader>
              <SheetTitle>{product.name}</SheetTitle>
              <SheetDescription>{product.sku} · {product.category}</SheetDescription>
            </SheetHeader>
            <div className="mt-4 flex items-center gap-2"><StockBadge status={stockStatus(product)} /></div>
            <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border text-sm">
              {[
                ["Selling price", ksh(product.unitPrice)],
                ["Cost price", ksh(product.costPrice)],
                ["Margin", `${(((product.unitPrice - product.costPrice) / product.unitPrice) * 100).toFixed(1)}%`],
                ["Fulfillment", product.fulfillment === "stock" ? "Stock-managed" : "Supplier-fulfilled"],
                ["On hand", product.fulfillment === "stock" ? `${num(product.stock)} ${product.unit}` : "Ordered on demand"],
                ["Reorder level", product.fulfillment === "stock" ? `${product.reorderLevel} ${product.unit}` : "—"],
                ["Supplier", product.supplier],
                ["Unit", product.unit],
              ].map(([k, v]) => (
                <div key={k} className="bg-card p-3">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="tabular mt-0.5 font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => onEdit(product)}>Edit product</Button>
              {product.fulfillment === "stock" && <Button onClick={() => onRestock(product)}><PackagePlus className="size-4" /> Restock</Button>}
            </div>
            <h3 className="mb-2 mt-6 text-sm font-semibold">Movement history</h3>
            {product.fulfillment === "stock" ? (
              <MovementTable compact movements={movements.filter((m) => m.productId === product.id)} products={products} />
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Supplier-fulfilled products are delivered directly by {product.supplier} and do not affect on-hand stock.</p>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

const blank: Product = { id: "", sku: "", name: "", category: CATEGORIES[0], unit: "pcs", unitPrice: 0, costPrice: 0, stock: 0, reorderLevel: 10, fulfillment: "stock", supplier: "" };

function ProductForm({ value, onClose }: { value: Product | "new" | null; onClose: () => void }) {
  const { upsertProduct, products } = useData();
  const [f, setF] = useState<Product>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (value === "new") setF({ ...blank, sku: `LP-${1000 + products.length + 1}` });
    else if (value) setF(value);
    setErrors({});
  }, [value, products.length]);
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (f.name.trim().length < 3) err.name = "Name must be at least 3 characters";
    if (!/^[A-Z0-9-]{3,}$/i.test(f.sku)) err.sku = "Use letters, numbers and dashes";
    if (!(f.unitPrice > 0)) err.unitPrice = "Enter a selling price above 0";
    if (!(f.costPrice > 0)) err.costPrice = "Enter a cost price above 0";
    else if (f.costPrice > f.unitPrice) err.costPrice = "Cost is higher than selling price";
    if (f.fulfillment === "stock" && (f.stock < 0 || !Number.isInteger(f.stock))) err.stock = "Whole number, 0 or more";
    if (!f.supplier.trim()) err.supplier = "Supplier is required";
    setErrors(err);
    if (Object.keys(err).length) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 350));
    const res = upsertProduct({ ...f, id: f.id || `P${Date.now()}`, name: f.name.trim(), sku: f.sku.toUpperCase() });
    setSaving(false);
    if (!res.ok) return setErrors({ sku: res.error });
    toast.success(value === "new" ? "Product added" : "Product updated");
    onClose();
  };

  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{value === "new" ? "Add product" : "Edit product"}</DialogTitle>
          <DialogDescription>Product details are used across sales, inventory and reports.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4" noValidate>
          <Field className="col-span-2" label="Product name" error={errors.name}><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="SKU" error={errors.sku}><Input value={f.sku} onChange={(e) => set("sku", e.target.value)} /></Field>
          <Field label="Category">
            <Select value={f.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Selling price (KSh)" error={errors.unitPrice}><Input type="number" min={0} value={f.unitPrice || ""} onChange={(e) => set("unitPrice", Number(e.target.value))} /></Field>
          <Field label="Cost price (KSh)" error={errors.costPrice}><Input type="number" min={0} value={f.costPrice || ""} onChange={(e) => set("costPrice", Number(e.target.value))} /></Field>
          <Field className="col-span-2" label="Fulfillment">
            <RadioGroup value={f.fulfillment} onValueChange={(v) => set("fulfillment", v as Product["fulfillment"])} className="grid grid-cols-2 gap-2">
              {[["stock", "Stock-managed", "Held in our store, tracked"], ["supplier", "Supplier-fulfilled", "Delivered by supplier"]].map(([v, l, d]) => (
                <Label key={v} className="flex cursor-pointer items-start gap-2 rounded-md border p-3 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft">
                  <RadioGroupItem value={v} className="mt-0.5" />
                  <span><span className="block text-sm font-medium">{l}</span><span className="text-xs text-muted-foreground">{d}</span></span>
                </Label>
              ))}
            </RadioGroup>
          </Field>
          {f.fulfillment === "stock" && (
            <>
              <Field label="Opening / current stock" error={errors.stock}><Input type="number" min={0} value={f.stock} onChange={(e) => set("stock", Number(e.target.value))} disabled={value !== "new"} /></Field>
              <Field label="Reorder level"><Input type="number" min={0} value={f.reorderLevel} onChange={(e) => set("reorderLevel", Number(e.target.value))} /></Field>
            </>
          )}
          <Field label="Unit"><Input value={f.unit} onChange={(e) => set("unit", e.target.value)} /></Field>
          <Field label="Supplier" error={errors.supplier}><Input value={f.supplier} onChange={(e) => set("supplier", e.target.value)} /></Field>
          {value !== "new" && f.fulfillment === "stock" && <p className="col-span-2 text-xs text-muted-foreground">Stock changes are recorded through Restock / adjust so the movement history stays accurate.</p>}
          <DialogFooter className="col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save product"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RestockDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { restock } = useData();
  const [mode, setMode] = useState<"in" | "adjust">("in");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { setQty(""); setNote(""); setError(""); setMode("in"); }, [product]);
  if (!product) return null;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(qty);
    const signed = mode === "in" ? Math.abs(n) : n;
    if (mode === "adjust" && !note.trim()) return setError("A reason is required for adjustments");
    const res = restock(product.id, signed, note.trim());
    if (!res.ok) return setError(res.error);
    toast.success(`${product.name}: stock now ${product.stock + signed} ${product.unit}`);
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update stock</DialogTitle>
          <DialogDescription>{product.name} · currently {product.stock} {product.unit}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "in" | "adjust")}>
            <TabsList className="w-full"><TabsTrigger value="in" className="flex-1">Receive stock</TabsTrigger><TabsTrigger value="adjust" className="flex-1">Adjustment</TabsTrigger></TabsList>
          </Tabs>
          <Field label={mode === "in" ? "Quantity received" : "Change (use negative to remove)"} error={error}>
            <Input type="number" value={qty} onChange={(e) => { setQty(e.target.value); setError(""); }} autoFocus />
          </Field>
          <Field label={mode === "in" ? "Note (optional)" : "Reason"}>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={mode === "in" ? "e.g. Delivery note #" : "e.g. Damaged in storage"} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ product, onClose, onDeleted }: { product: Product | null; onClose: () => void; onDeleted: () => void }) {
  const { deleteProduct } = useData();
  return (
    <AlertDialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {product?.name}?</AlertDialogTitle>
          <AlertDialogDescription>This removes the product from the catalogue. Past orders keep their records. This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (!product) return;
              const res = deleteProduct(product.id);
              if (!res.ok) toast.error(res.error);
              else { toast.success("Product deleted"); onDeleted(); }
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const urgencyPill = { critical: ["danger", "Reorder now"], soon: ["warning", "Reorder soon"], ok: ["success", "Sufficient"], supplier: ["info", "Supplier ships"] } as const;

function ForecastTable({ onRestock }: { onRestock: (p: Product) => void }) {
  const { products, orders, now } = useData();
  const plan = replenishmentPlan(products, orders, now());
  const toOrder = plan.filter((r) => r.recommended > 0);
  const cost = toOrder.reduce((s, r) => s + r.recommended * r.product.costPrice, 0);
  return (
    <Panel
      title="Forecast & replenishment recommendations"
      description={`Based on average daily sales over the last 60 days, projected 30 days ahead · ${toOrder.length} products to reorder · est. cost ${ksh(cost)}`}
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Product</TableHead>
              <TableHead className="text-right">Avg/day</TableHead>
              <TableHead className="text-right">30-day forecast</TableHead>
              <TableHead className="text-right">On hand</TableHead>
              <TableHead className="text-right">Days of cover</TableHead>
              <TableHead className="text-right">Recommended order</TableHead>
              <TableHead>Advice</TableHead>
              <TableHead className="pr-4"><span className="sr-only">Action</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plan.map((r) => (
              <TableRow key={r.product.id}>
                <TableCell className="pl-4"><div className="font-medium">{r.product.name}</div><div className="text-xs text-muted-foreground">{r.product.category}</div></TableCell>
                <TableCell className="tabular text-right">{r.daily.toFixed(2)}</TableCell>
                <TableCell className="tabular text-right">{r.forecast} {r.product.unit}</TableCell>
                <TableCell className="tabular text-right">{r.product.fulfillment === "stock" ? r.product.stock : "—"}</TableCell>
                <TableCell className="tabular text-right">{Number.isFinite(r.daysOfCover) ? `${Math.floor(r.daysOfCover)} days` : "—"}</TableCell>
                <TableCell className="tabular text-right font-medium">{r.recommended > 0 ? `${r.recommended} ${r.product.unit}` : "—"}</TableCell>
                <TableCell><Pill tone={urgencyPill[r.urgency][0]}>{urgencyPill[r.urgency][1]}</Pill></TableCell>
                <TableCell className="pr-4 text-right">{r.recommended > 0 && <Button size="sm" variant="outline" onClick={() => onRestock(r.product)}>Restock</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Panel>
  );
}
