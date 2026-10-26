import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { OrderStatus, PaymentStatus, StockStatus } from "@/lib/types";

const tone = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-destructive-soft text-destructive",
        info: "bg-info-soft text-info",
        neutral: "bg-muted text-muted-foreground",
      },
    },
  },
);

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

export function Pill({ tone: t, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn(tone({ tone: t }), className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}

const orderMap: Record<OrderStatus, [Tone, string]> = {
  completed: ["success", "Completed"],
  pending: ["warning", "Pending"],
  cancelled: ["neutral", "Cancelled"],
};
const payMap: Record<PaymentStatus, [Tone, string]> = {
  paid: ["success", "Paid"],
  partial: ["info", "Partial"],
  unpaid: ["warning", "Unpaid"],
  refunded: ["neutral", "Refunded"],
};
const stockMap: Record<StockStatus, [Tone, string]> = {
  in: ["success", "In stock"],
  low: ["warning", "Low stock"],
  out: ["danger", "Out of stock"],
  supplier: ["info", "Supplier-fulfilled"],
};

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => <Pill tone={orderMap[status][0]}>{orderMap[status][1]}</Pill>;
export const PaymentBadge = ({ status }: { status: PaymentStatus }) => <Pill tone={payMap[status][0]}>{payMap[status][1]}</Pill>;
export const StockBadge = ({ status }: { status: StockStatus }) => <Pill tone={stockMap[status][0]}>{stockMap[status][1]}</Pill>;
