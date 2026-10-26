import { describe, expect, it } from "vitest";
import { changeOrderStatus, createSale, deleteProduct, orderTotal, replenishmentPlan, repPerformance, restock } from "@/lib/business";
import type { DataState } from "@/lib/types";

const now = new Date(2026, 9, 26, 12);
const base = (): DataState => ({
  products: [
    { id: "A", sku: "A1", name: "Cement", category: "c", unit: "bags", unitPrice: 800, costPrice: 600, stock: 10, reorderLevel: 2, fulfillment: "stock", supplier: "s" },
    { id: "B", sku: "B1", name: "Sand", category: "c", unit: "t", unitPrice: 3000, costPrice: 2000, stock: 0, reorderLevel: 0, fulfillment: "supplier", supplier: "s" },
  ],
  reps: [{ id: "R", name: "Rep", email: "", phone: "", region: "", monthlyTarget: 30000, joined: "" }],
  orders: [],
  movements: [],
});
const draft = { customer: "X", repId: "R", payment: "paid" as const, method: "Cash" as const };

describe("sales and inventory rules", () => {
  it("completed sale deducts stock only for stock-managed products", () => {
    const r = createSale(base(), { ...draft, status: "completed", items: [{ productId: "A", qty: 4, unitPrice: 800 }, { productId: "B", qty: 2, unitPrice: 3000 }] }, now);
    expect(r.ok && r.state.products.map((p) => p.stock)).toEqual([6, 0]);
  });
  it("rejects a completed sale exceeding stock", () => {
    const r = createSale(base(), { ...draft, status: "completed", items: [{ productId: "A", qty: 11, unitPrice: 800 }] }, now);
    expect(r.ok).toBe(false);
  });
  it("pending sale does not touch stock until completed", () => {
    const r = createSale(base(), { ...draft, status: "pending", items: [{ productId: "A", qty: 3, unitPrice: 800 }] }, now);
    if (!r.ok) throw new Error();
    expect(r.state.products[0].stock).toBe(10);
    const c = changeOrderStatus(r.state, r.state.orders[0].id, "completed", now);
    expect(c.ok && c.state.products[0].stock).toBe(7);
  });
  it("cancelling a completed sale restores stock and refunds payment", () => {
    const r = createSale(base(), { ...draft, status: "completed", items: [{ productId: "A", qty: 5, unitPrice: 800 }] }, now);
    if (!r.ok) throw new Error();
    const c = changeOrderStatus(r.state, r.state.orders[0].id, "cancelled", now);
    if (!c.ok) throw new Error();
    expect(c.state.products[0].stock).toBe(10);
    expect(c.state.orders[0].payment).toBe("refunded");
  });
  it("cancelled orders are excluded from rep revenue", () => {
    const r = createSale(base(), { ...draft, status: "completed", items: [{ productId: "A", qty: 5, unitPrice: 800 }] }, now);
    if (!r.ok) throw new Error();
    const c = changeOrderStatus(r.state, r.state.orders[0].id, "cancelled", now);
    if (!c.ok) throw new Error();
    const from = new Date(2026, 9, 1);
    expect(repPerformance(c.state.orders, c.state.reps, from, new Date(2026, 9, 31))[0].revenue).toBe(0);
    expect(orderTotal(c.state.orders[0])).toBe(4000);
  });
  it("restock cannot make stock negative", () => {
    expect(restock(base(), "A", -11, "x", now).ok).toBe(false);
  });
  it("blocks deleting a product on a pending order", () => {
    const r = createSale(base(), { ...draft, status: "pending", items: [{ productId: "A", qty: 1, unitPrice: 800 }] }, now);
    if (!r.ok) throw new Error();
    expect(deleteProduct(r.state, "A").ok).toBe(false);
  });
});

describe("replenishment recommendations", () => {
  it("recommends forecast + reorder level − stock from 60-day sales", () => {
    const s = base();
    s.orders = [{ id: "o", number: "SO-2026-0001", date: new Date(2026, 9, 20).toISOString(), customer: "x", repId: "R", status: "completed", payment: "paid", method: "Cash", items: [{ productId: "A", qty: 12, unitPrice: 800 }] }];
    const plan = replenishmentPlan(s.products, s.orders, now);
    const a = plan.find((p) => p.product.id === "A")!;
    expect(a.forecast).toBe(6); // 12/60*30
    expect(a.recommended).toBe(0); // 6 + 2 − 10 < 0
    expect(plan.find((p) => p.product.id === "B")!.recommended).toBe(0); // supplier-fulfilled never reordered
  });
});
