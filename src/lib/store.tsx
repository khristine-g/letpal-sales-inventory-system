import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import * as biz from "./business";
import { seedData, TODAY } from "./mock-data";
import type { DataState, OrderStatus, PaymentStatus, Product, Result } from "./types";

/**
 * Local demo store. Every mutation goes through a pure function in business.ts,
 * so these calls can later be swapped for API requests without touching the UI.
 */
export interface Settings {
  name: string;
  email: string;
  phone: string;
  role: string;
  density: "comfortable" | "compact";
  lowStockAlerts: boolean;
  pendingOrderAlerts: boolean;
  defaultRange: string;
}

const defaultSettings: Settings = {
  name: "Khristine Githige",
  email: "admin@letpal.demo",
  phone: "+254 700 000 000",
  role: "Administrator",
  density: "comfortable",
  lowStockAlerts: true,
  pendingOrderAlerts: true,
  defaultRange: "30d",
};

type Ok = { ok: true; message?: string | undefined } | { ok: false; error: string };

interface Ctx extends DataState {
  now: () => Date;
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => void;
  createSale: (d: biz.SaleDraft) => Ok & { number?: string | undefined };
  changeOrderStatus: (id: string, s: OrderStatus) => Ok;
  setPayment: (id: string, p: PaymentStatus) => Ok;
  restock: (id: string, qty: number, note: string) => Ok;
  upsertProduct: (p: Product) => Ok;
  deleteProduct: (id: string) => Ok;
}

const DataContext = createContext<Ctx | null>(null);

// Demo clock: real elapsed time on top of the fixed demo "today".
const bootReal = Date.now();
const now = () => new Date(TODAY.getTime() + (Date.now() - bootReal));

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>(seedData);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const run = useCallback(
    (fn: (s: DataState) => Result): Ok & { number?: string | undefined } => {
      const res = fn(state);
      if (!res.ok) return res;
      setState(res.state);
      return { ok: true, message: res.message, number: res.state.orders[0]?.number };
    },
    [state],
  );

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      now,
      settings,
      updateSettings: (s) => setSettings((prev) => ({ ...prev, ...s })),
      createSale: (d) => run((s) => biz.createSale(s, d, now())),
      changeOrderStatus: (id, st) => run((s) => biz.changeOrderStatus(s, id, st, now())),
      setPayment: (id, p) => run((s) => biz.setPayment(s, id, p)),
      restock: (id, q, n) => run((s) => biz.restock(s, id, q, n, now())),
      upsertProduct: (p) => run((s) => biz.upsertProduct(s, p)),
      deleteProduct: (id) => run((s) => biz.deleteProduct(s, id)),
    }),
    [state, settings, run],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
