import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Boxes, ShoppingBag, Truck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import hero from "@/assets/home-hero.jpg";
import { useData } from "@/lib/store";
import { CATEGORIES } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Letpal Enterprises — Handbags, Bedding & Household Items" },
      { name: "description", content: "Letpal Enterprises drop-ships handbags, clutches, duvets, bed sheets, mattress covers, carpets, mats and household items across Kenya." },
      { property: "og:title", content: "Letpal Enterprises — Handbags, Bedding & Household Items" },
      { property: "og:description", content: "Drop-shipping handbags, bedding, carpets and household items across Kenya." },
    ],
  }),
  component: Home,
});

const features = [
  { icon: Boxes, title: "Inventory & suppliers", text: "Track buffer stock and supplier-fulfilled lines side by side." },
  { icon: ShoppingBag, title: "Sales & orders", text: "Record multi-item sales, payments and delivery status in one place." },
  { icon: Users, title: "Sales representatives", text: "Monthly targets, rankings and achievement for every rep." },
  { icon: BarChart3, title: "Analytics & reports", text: "Revenue trends, product performance and exportable reports." },
];

function Home() {
  const { products } = useData();
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">L</div>
          <span className="font-semibold">Letpal Enterprises</span>
        </div>
        <Button asChild variant="outline" size="sm"><Link to="/dashboard">Open system</Link></Button>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-2 lg:py-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground"><Truck className="size-3.5 text-primary" /> Drop-shipping across Kenya</span>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">Home & fashion essentials, delivered straight from our suppliers.</h1>
          <p className="mt-4 max-w-lg text-muted-foreground">Letpal Enterprises sells handbags, clutches, duvets, bed sheets, mattress covers, carpets, mats and other household items. This system brings sales, inventory and sales-team performance together.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/dashboard">Go to dashboard <ArrowRight className="size-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/products">Browse products</Link></Button>
          </div>
        </div>
        <img src={hero} alt="Linen bedding with a leather handbag and clutch, woven mat on the floor" width={1600} height={1104} className="aspect-[4/3] w-full rounded-xl border object-cover shadow-pop" />
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">What we sell</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link key={c} to="/products" search={{ q: undefined, status: undefined }} className="surface-card group p-4 transition-colors hover:border-primary/40">
              <div className="font-medium group-hover:text-primary">{c}</div>
              <div className="mt-1 text-xs text-muted-foreground">{products.filter((p) => p.category === c).length} products</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Inside the system</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="surface-card p-5">
              <f.icon className="size-5 text-primary" />
              <h3 className="mt-3 font-medium">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-10 border-t py-6 text-center text-xs text-muted-foreground">© 2026 Letpal Enterprises · Demonstration data only</footer>
    </div>
  );
}
