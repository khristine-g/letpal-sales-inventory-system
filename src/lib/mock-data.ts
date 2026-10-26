// DEMONSTRATION DATA ONLY — fictional records generated for the Letpal demo.
import type { DataState, Movement, Order, OrderStatus, PaymentMethod, PaymentStatus, Product, Rep } from "./types";

export const TODAY = new Date(2026, 9, 26, 15, 0, 0);

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CATEGORIES = ["Handbags", "Clutches", "Duvets", "Bed Sheets", "Mattress Covers", "Carpets", "Mats", "Household"];

const P = (
  id: number,
  name: string,
  category: string,
  unit: string,
  unitPrice: number,
  costPrice: number,
  stock: number,
  reorderLevel: number,
  fulfillment: "stock" | "supplier" = "stock",
  supplier = "Demo Supplies Ltd",
): Product => ({
  id: `P${String(id).padStart(3, "0")}`,
  sku: `LP-${String(1000 + id)}`,
  name,
  category,
  unit,
  unitPrice,
  costPrice,
  stock: fulfillment === "supplier" ? 0 : stock,
  reorderLevel: fulfillment === "supplier" ? 0 : reorderLevel,
  fulfillment,
  supplier,
});

// Drop-shipping model: most lines ship direct from suppliers; fast movers are held in a small buffer stock.
const products: Product[] = [
  P(1, "Leather Tote Handbag", "Handbags", "pcs", 4500, 3100, 34, 10, "stock", "Demo Leather Works"),
  P(2, "Crossbody Sling Bag", "Handbags", "pcs", 2800, 1900, 0, 0, "supplier", "Demo Leather Works"),
  P(3, "Woven Straw Handbag", "Handbags", "pcs", 2200, 1400, 0, 0, "supplier", "Demo Artisan Co."),
  P(4, "Beaded Evening Clutch", "Clutches", "pcs", 1800, 1100, 6, 8, "stock", "Demo Artisan Co."),
  P(5, "Satin Envelope Clutch", "Clutches", "pcs", 1500, 900, 0, 0, "supplier", "Demo Fashion Imports"),
  P(6, "Microfibre Duvet 6x6", "Duvets", "pcs", 5200, 3800, 22, 8, "stock", "Demo Home Textiles"),
  P(7, "Cotton Duvet Set 7x8", "Duvets", "sets", 7800, 5900, 0, 0, "supplier", "Demo Home Textiles"),
  P(8, "Percale Bed Sheet Set 6x6", "Bed Sheets", "sets", 2400, 1600, 48, 15, "stock", "Demo Home Textiles"),
  P(9, "Flat Cotton Sheets (pair)", "Bed Sheets", "pairs", 1600, 1050, 0, 0, "supplier", "Demo Home Textiles"),
  P(10, "Waterproof Mattress Cover 5x6", "Mattress Covers", "pcs", 1900, 1250, 0, 12, "stock", "Demo Sleep Supplies"),
  P(11, "Quilted Mattress Protector 6x6", "Mattress Covers", "pcs", 2600, 1800, 0, 0, "supplier", "Demo Sleep Supplies"),
  P(12, "Shaggy Carpet 5x8", "Carpets", "pcs", 6500, 4700, 9, 5, "stock", "Demo Rugs Ltd"),
  P(13, "Persian-Style Carpet 6x9", "Carpets", "pcs", 9800, 7400, 0, 0, "supplier", "Demo Rugs Ltd"),
  P(14, "Anti-Slip Door Mat", "Mats", "pcs", 650, 380, 120, 40, "stock", "Demo Rugs Ltd"),
  P(15, "Bathroom Mat Set (3 pc)", "Mats", "sets", 1400, 900, 18, 20, "stock", "Demo Rugs Ltd"),
  P(16, "Blackout Curtains (pair)", "Household", "pairs", 3500, 2400, 0, 0, "supplier", "Demo Home Textiles"),
  P(17, "Cotton Towel Set (4 pc)", "Household", "sets", 2100, 1400, 40, 12, "stock", "Demo Home Textiles"),
  P(18, "Decorative Cushion Covers (4)", "Household", "sets", 1200, 700, 0, 0, "supplier", "Demo Artisan Co."),
];

const reps: Rep[] = [
  { id: "R1", name: "Grace Wanjiru", email: "grace.w@letpal.demo", phone: "+254 700 000 101", region: "Nairobi CBD", monthlyTarget: 1_200_000, joined: "2023-02-01" },
  { id: "R2", name: "Brian Otieno", email: "brian.o@letpal.demo", phone: "+254 700 000 102", region: "Kisumu", monthlyTarget: 900_000, joined: "2023-07-15" },
  { id: "R3", name: "Faith Chebet", email: "faith.c@letpal.demo", phone: "+254 700 000 103", region: "Eldoret", monthlyTarget: 800_000, joined: "2024-01-10" },
  { id: "R4", name: "Kevin Mwangi", email: "kevin.m@letpal.demo", phone: "+254 700 000 104", region: "Thika", monthlyTarget: 850_000, joined: "2022-11-03" },
  { id: "R5", name: "Amina Hassan", email: "amina.h@letpal.demo", phone: "+254 700 000 105", region: "Mombasa", monthlyTarget: 1_000_000, joined: "2024-05-20" },
  { id: "R6", name: "Daniel Kiprop", email: "daniel.k@letpal.demo", phone: "+254 700 000 106", region: "Nakuru", monthlyTarget: 700_000, joined: "2025-03-01" },
];

const customers = [
  "Demo Boutique Kilimani", "Sample Interiors Westlands", "Test Airbnb Hosts Ltd", "Example Homes Ruiru",
  "Online Customer (Instagram)", "Demo Guesthouse Naivasha", "Sample Fashion Hub", "Online Customer (WhatsApp)",
  "Test Decor Studio", "Demo Hotel Supplies", "Sample Gift Shop", "Walk-in Customer",
];

function generate(): DataState {
  const r = rng(20261026);
  const pick = <T,>(a: T[]): T => a[Math.floor(r() * a.length)]!;
  const raw: Omit<Order, "id" | "number">[] = [];
  const repWeight = ["R1", "R1", "R2", "R3", "R4", "R4", "R5", "R5", "R6"];
  for (let i = 0; i < 320; i++) {
    const daysAgo = Math.floor(r() * 185);
    const d = new Date(TODAY);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(8 + Math.floor(r() * 9), Math.floor(r() * 60), 0, 0);
    const n = 1 + Math.floor(r() * 3);
    const used = new Set<string>();
    const items = [];
    for (let k = 0; k < n; k++) {
      const p = pick(products);
      if (used.has(p.id)) continue;
      used.add(p.id);
      const big = p.unitPrice < 2000;
      items.push({ productId: p.id, qty: 1 + Math.floor(r() * (big ? 8 : 3)), unitPrice: p.unitPrice });
    }
    const roll = r();
    const status: OrderStatus = daysAgo < 6 && roll < 0.35 ? "pending" : roll > 0.93 ? "cancelled" : "completed";
    const method: PaymentMethod = pick(["M-Pesa", "M-Pesa", "M-Pesa", "Cash", "Bank transfer", "Credit"]);
    let payment: PaymentStatus = "paid";
    if (status === "pending") payment = r() < 0.3 ? "partial" : "unpaid";
    if (status === "cancelled") payment = r() < 0.5 ? "refunded" : "unpaid";
    if (status === "completed" && method === "Credit") payment = r() < 0.5 ? "partial" : "unpaid";
    raw.push({ date: d.toISOString(), customer: pick(customers), repId: pick(repWeight), items, status, payment, method });
  }
  raw.sort((a, b) => a.date.localeCompare(b.date));
  const orders: Order[] = raw
    .map((o, i) => {
      const number = `SO-2026-${String(i + 1).padStart(4, "0")}`;
      return { ...o, id: number, number };
    })
    .reverse();

  // Movement history consistent with completed orders + periodic restocks.
  const movements: Movement[] = [];
  let m = 0;
  for (const o of [...orders].reverse()) {
    if (o.status !== "completed") continue;
    for (const it of o.items) {
      const p = products.find((x) => x.id === it.productId)!;
      if (p.fulfillment !== "stock") continue;
      movements.push({ id: `MV-${++m}`, productId: p.id, date: o.date, type: "sale", qty: -it.qty, ref: o.number });
    }
  }
  for (const p of products.filter((x) => x.fulfillment === "stock")) {
    for (let w = 140; w > 0; w -= 21 + Math.floor(r() * 10)) {
      const d = new Date(TODAY);
      d.setDate(d.getDate() - w);
      d.setHours(7, 30, 0, 0);
      movements.push({ id: `MV-${++m}`, productId: p.id, date: d.toISOString(), type: "restock", qty: p.reorderLevel * 2, ref: `GRN-${1000 + m}`, note: `Delivery from ${p.supplier}` });
    }
  }
  movements.sort((a, b) => b.date.localeCompare(a.date));
  return { products, reps, orders, movements };
}

export const seedData: DataState = generate();
