import type {
  DataState,
  Movement,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
  Rep,
  Result,
  StockStatus,
} from "./types";

/* ---------- Pure derivations ---------- */

export const orderTotal = (o: Pick<Order, "items">) =>
  o.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);

export function stockStatus(p: Product): StockStatus {
  if (p.fulfillment === "supplier") return "supplier";
  if (p.stock <= 0) return "out";
  if (p.stock <= p.reorderLevel) return "low";
  return "in";
}

export const inRange = (iso: string, from: Date, to: Date) => {
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
};

export const completedIn = (orders: Order[], from: Date, to: Date) =>
  orders.filter((o) => o.status === "completed" && inRange(o.date, from, to));

export const revenue = (orders: Order[]) => orders.reduce((s, o) => s + orderTotal(o), 0);

export function revenueSeries(orders: Order[], from: Date, to: Date) {
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000));
  const bucketDays = days > 120 ? 7 : 1;
  const buckets: { key: number; label: string; revenue: number; orders: number }[] = [];
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  for (let d = new Date(start); d <= to; d.setDate(d.getDate() + bucketDays)) {
    buckets.push({
      key: d.getTime(),
      label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      revenue: 0,
      orders: 0,
    });
  }
  for (const o of completedIn(orders, from, to)) {
    const idx = Math.floor((new Date(o.date).getTime() - start.getTime()) / (86400000 * bucketDays));
    const b = buckets[Math.min(Math.max(idx, 0), buckets.length - 1)]!;
    b.revenue += orderTotal(o);
    b.orders += 1;
  }
  return buckets;
}

export function productPerformance(orders: Order[], products: Product[], from: Date, to: Date) {
  const map = new Map<string, { units: number; revenue: number; profit: number }>();
  for (const o of completedIn(orders, from, to)) {
    for (const i of o.items) {
      const p = products.find((x) => x.id === i.productId);
      const m = map.get(i.productId) ?? { units: 0, revenue: 0, profit: 0 };
      m.units += i.qty;
      m.revenue += i.qty * i.unitPrice;
      m.profit += i.qty * (i.unitPrice - (p?.costPrice ?? 0));
      map.set(i.productId, m);
    }
  }
  return products
    .map((p) => ({ product: p, ...(map.get(p.id) ?? { units: 0, revenue: 0, profit: 0 }) }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function categoryRevenue(orders: Order[], products: Product[], from: Date, to: Date) {
  const map = new Map<string, number>();
  for (const r of productPerformance(orders, products, from, to)) {
    map.set(r.product.category, (map.get(r.product.category) ?? 0) + r.revenue);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

/** Target for a period is the monthly target pro-rated by number of days. */
export function repPerformance(orders: Order[], reps: Rep[], from: Date, to: Date) {
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000));
  return reps
    .map((rep) => {
      const mine = completedIn(orders, from, to).filter((o) => o.repId === rep.id);
      const rev = revenue(mine);
      const target = Math.round((rep.monthlyTarget * days) / 30);
      return {
        rep,
        revenue: rev,
        orders: mine.length,
        target,
        achievement: target ? rev / target : 0,
        avgOrder: mine.length ? rev / mine.length : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

/* ---------- State transitions (frontend demo "backend") ---------- */

export function stockShortfalls(items: OrderItem[], products: Product[]): string[] {
  const need = new Map<string, number>();
  for (const i of items) need.set(i.productId, (need.get(i.productId) ?? 0) + i.qty);
  const errs: string[] = [];
  for (const [id, qty] of need) {
    const p = products.find((x) => x.id === id);
    if (!p) errs.push(`Unknown product ${id}`);
    else if (p.fulfillment === "stock" && p.stock < qty)
      errs.push(`${p.name}: only ${p.stock} ${p.unit} in stock, ${qty} requested`);
  }
  return errs;
}

function applyStock(state: DataState, order: Order, direction: -1 | 1, now: Date): DataState {
  const movements: Movement[] = [];
  let n = state.movements.length;
  const products = state.products.map((p) => {
    if (p.fulfillment !== "stock") return p;
    const qty = order.items.filter((i) => i.productId === p.id).reduce((s, i) => s + i.qty, 0);
    if (!qty) return p;
    movements.push({
      id: `MV-${++n}`,
      productId: p.id,
      date: now.toISOString(),
      type: direction === -1 ? "sale" : "return",
      qty: direction * qty,
      ref: order.number,
      note: direction === 1 ? "Order cancelled — stock restored" : undefined,
    });
    return { ...p, stock: p.stock + direction * qty };
  });
  return { ...state, products, movements: [...movements, ...state.movements] };
}

export interface SaleDraft {
  customer: string;
  repId: string;
  items: OrderItem[];
  status: Exclude<OrderStatus, "cancelled">;
  payment: PaymentStatus;
  method: PaymentMethod;
}

export function nextOrderNumber(orders: Order[], year: number) {
  const max = orders.reduce((m, o) => Math.max(m, Number(o.number.split("-")[2] ?? 0) || 0), 0);
  return `SO-${year}-${String(max + 1).padStart(4, "0")}`;
}

export function createSale(state: DataState, draft: SaleDraft, now: Date): Result {
  if (!draft.customer.trim()) return { ok: false, error: "Customer name is required" };
  if (!state.reps.some((r) => r.id === draft.repId)) return { ok: false, error: "Select a sales representative" };
  const items = draft.items.filter((i) => i.qty > 0);
  if (!items.length) return { ok: false, error: "Add at least one item" };
  if (draft.status === "completed") {
    const errs = stockShortfalls(items, state.products);
    if (errs.length) return { ok: false, error: errs[0] };
  }
  const number = nextOrderNumber(state.orders, now.getFullYear());
  const order: Order = {
    id: number,
    number,
    date: now.toISOString(),
    customer: draft.customer.trim(),
    repId: draft.repId,
    items,
    status: draft.status,
    payment: draft.payment,
    method: draft.method,
  };
  let next: DataState = { ...state, orders: [order, ...state.orders] };
  if (order.status === "completed") next = applyStock(next, order, -1, now);
  return { ok: true, state: next, message: `${number} created` };
}

export function changeOrderStatus(state: DataState, orderId: string, status: OrderStatus, now: Date): Result {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) return { ok: false, error: "Order not found" };
  if (order.status === status) return { ok: true, state };
  if (order.status === "cancelled") return { ok: false, error: "Cancelled orders cannot be reopened" };
  let next = state;
  if (status === "completed") {
    const errs = stockShortfalls(order.items, state.products);
    if (errs.length) return { ok: false, error: errs[0] };
    next = applyStock(state, order, -1, now);
  }
  let payment = order.payment;
  if (status === "cancelled") {
    if (order.status === "completed") next = applyStock(state, order, 1, now);
    payment = order.payment === "paid" || order.payment === "partial" ? "refunded" : "unpaid";
  }
  return {
    ok: true,
    state: { ...next, orders: next.orders.map((o) => (o.id === orderId ? { ...o, status, payment } : o)) },
  };
}

export function setPayment(state: DataState, orderId: string, payment: PaymentStatus): Result {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) return { ok: false, error: "Order not found" };
  if (order.status === "cancelled") return { ok: false, error: "Cannot change payment on a cancelled order" };
  return { ok: true, state: { ...state, orders: state.orders.map((o) => (o.id === orderId ? { ...o, payment } : o)) } };
}

export function restock(state: DataState, productId: string, qty: number, note: string, now: Date): Result {
  const p = state.products.find((x) => x.id === productId);
  if (!p) return { ok: false, error: "Product not found" };
  if (p.fulfillment !== "stock") return { ok: false, error: "Supplier-fulfilled products are not stocked" };
  if (!Number.isInteger(qty) || qty === 0) return { ok: false, error: "Enter a whole, non-zero quantity" };
  if (p.stock + qty < 0) return { ok: false, error: "Adjustment would make stock negative" };
  const mv: Movement = {
    id: `MV-${state.movements.length + 1}`,
    productId,
    date: now.toISOString(),
    type: qty > 0 ? "restock" : "adjustment",
    qty,
    ref: qty > 0 ? "GRN" : "ADJ",
    note: note || undefined,
  };
  return {
    ok: true,
    state: {
      ...state,
      products: state.products.map((x) => (x.id === productId ? { ...x, stock: x.stock + qty } : x)),
      movements: [mv, ...state.movements],
    },
  };
}

export function upsertProduct(state: DataState, product: Product): Result {
  if (state.products.some((p) => p.sku.toLowerCase() === product.sku.toLowerCase() && p.id !== product.id))
    return { ok: false, error: `SKU ${product.sku} already exists` };
  const exists = state.products.some((p) => p.id === product.id);
  const p = product.fulfillment === "supplier" ? { ...product, stock: 0, reorderLevel: 0 } : product;
  return {
    ok: true,
    state: { ...state, products: exists ? state.products.map((x) => (x.id === p.id ? p : x)) : [p, ...state.products] },
  };
}

export function deleteProduct(state: DataState, productId: string): Result {
  if (state.orders.some((o) => o.status === "pending" && o.items.some((i) => i.productId === productId)))
    return { ok: false, error: "This product is on a pending order. Complete or cancel it first." };
  return { ok: true, state: { ...state, products: state.products.filter((p) => p.id !== productId) } };
}

/* ---------- Decision support: forecasting & replenishment ---------- */

/**
 * Forecast uses the average daily units sold (completed orders) over the look-back window.
 * Recommended order = forecast demand for the cover period + reorder level − current stock.
 */
export function replenishmentPlan(products: Product[], orders: Order[], now: Date, lookbackDays = 60, coverDays = 30) {
  const from = new Date(now.getTime() - lookbackDays * 86400000);
  const sold = new Map<string, number>();
  for (const o of completedIn(orders, from, now))
    for (const i of o.items) sold.set(i.productId, (sold.get(i.productId) ?? 0) + i.qty);
  return products
    .map((p) => {
      const daily = (sold.get(p.id) ?? 0) / lookbackDays;
      const forecast = Math.ceil(daily * coverDays);
      const stocked = p.fulfillment === "stock";
      const daysOfCover = stocked ? (daily > 0 ? p.stock / daily : Infinity) : Infinity;
      const recommended = stocked ? Math.max(0, Math.ceil(forecast + p.reorderLevel - p.stock)) : 0;
      const urgency: "critical" | "soon" | "ok" | "supplier" = !stocked
        ? "supplier"
        : daysOfCover < 7 || p.stock <= 0
          ? "critical"
          : daysOfCover < coverDays || p.stock <= p.reorderLevel
            ? "soon"
            : "ok";
      return { product: p, daily, forecast, daysOfCover, recommended, urgency };
    })
    .sort((a, b) => a.daysOfCover - b.daysOfCover);
}
