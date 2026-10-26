export type Fulfillment = "stock" | "supplier";
export type OrderStatus = "completed" | "pending" | "cancelled";
export type PaymentStatus = "paid" | "unpaid" | "partial" | "refunded";
export type PaymentMethod = "M-Pesa" | "Cash" | "Bank transfer" | "Credit";
export type MovementType = "sale" | "restock" | "return" | "adjustment";
export type StockStatus = "in" | "low" | "out" | "supplier";

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  unitPrice: number;
  costPrice: number;
  stock: number;
  reorderLevel: number;
  fulfillment: Fulfillment;
  supplier: string;
}

export interface OrderItem {
  productId: string;
  qty: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  number: string;
  date: string; // ISO
  customer: string;
  repId: string;
  items: OrderItem[];
  status: OrderStatus;
  payment: PaymentStatus;
  method: PaymentMethod;
}

export interface Rep {
  id: string;
  name: string;
  email: string;
  phone: string;
  region: string;
  monthlyTarget: number;
  joined: string;
}

export interface Movement {
  id: string;
  productId: string;
  date: string;
  type: MovementType;
  qty: number; // signed
  ref: string;
  note?: string | undefined;
}

export interface DataState {
  products: Product[];
  orders: Order[];
  reps: Rep[];
  movements: Movement[];
}

export type Result = { ok: true; state: DataState; message?: string | undefined } | { ok: false; error: string };
