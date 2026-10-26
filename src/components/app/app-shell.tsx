import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  Boxes,
  FileText,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  ShoppingCart,
  Users,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { useData } from "@/lib/store";
import { stockStatus, orderTotal } from "@/lib/business";
import { initials, ksh, fmtDate } from "@/lib/format";

const nav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Products & Inventory", url: "/products", icon: Boxes },
  { title: "Sales & Orders", url: "/sales", icon: ShoppingCart },
  { title: "Sales Representatives", url: "/reps", icon: Users },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Reports", url: "/reports", icon: FileText },
] as const;

function isActive(path: string, url: string) {
  return url === "/" ? path === "/" : path === url || path.startsWith(url + "/");
}

function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { settings } = useData();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2.5 px-1">
          <div className="grid size-7 shrink-0 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">L</div>
          <div className="leading-tight group-data-[collapsible=icon]:hidden">
            <div className="text-sm font-semibold">Letpal</div>
            <div className="text-[11px] text-muted-foreground">Enterprises</div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(path, item.url)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive(path, "/settings")} tooltip="Settings">
                  <Link to="/settings">
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-1 py-1">
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary-soft text-[11px] font-semibold text-primary">{initials(settings.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <div className="truncate text-xs font-medium">{settings.name}</div>
            <div className="truncate text-[11px] text-muted-foreground">{settings.role}</div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

const crumbNames: Record<string, string> = {
  products: "Products & Inventory",
  sales: "Sales & Orders",
  reps: "Sales Representatives",
  analytics: "Analytics",
  reports: "Reports",
  settings: "Settings",
};

function Crumbs() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { reps } = useData();
  const parts = path.split("/").filter(Boolean);
  if (!parts.length || path === "/dashboard") {
    return <span className="text-sm font-medium">Dashboard</span>;
  }
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden sm:inline-flex">
          <BreadcrumbLink asChild>
            <Link to="/dashboard">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {parts.map((p, i) => {
          const last = i === parts.length - 1;
          const label = crumbNames[p] ?? reps.find((r) => r.id === p)?.name ?? p;
          const href = "/" + parts.slice(0, i + 1).join("/");
          return (
            <span key={href} className="contents">
              <BreadcrumbSeparator className="hidden sm:inline-flex" />
              <BreadcrumbItem>
                {last ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <a href={href}>{label}</a>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const { products, orders, reps } = useData();
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-input"
        aria-label="Search products, orders and representatives"
      >
        <Search className="size-4" />
        <span className="hidden truncate sm:inline">Search products, orders, reps…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] md:inline">⌘K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type to search…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Products">
            {products.map((p) => (
              <CommandItem key={p.id} value={`${p.name} ${p.sku}`} onSelect={() => go(() => navigate({ to: "/products", search: { q: p.sku } }))}>
                <Boxes className="size-4" />
                {p.name}
                <span className="ml-auto text-xs text-muted-foreground">{p.sku}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Orders">
            {orders.slice(0, 40).map((o) => (
              <CommandItem key={o.id} value={`${o.number} ${o.customer}`} onSelect={() => go(() => navigate({ to: "/sales", search: { q: o.number } }))}>
                <ShoppingCart className="size-4" />
                {o.number} · {o.customer}
                <span className="ml-auto text-xs text-muted-foreground">{ksh(orderTotal(o))}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Representatives">
            {reps.map((r) => (
              <CommandItem key={r.id} value={`${r.name} ${r.region}`} onSelect={() => go(() => navigate({ to: "/reps/$repId", params: { repId: r.id } }))}>
                <Users className="size-4" />
                {r.name}
                <span className="ml-auto text-xs text-muted-foreground">{r.region}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

function Notifications() {
  const { products, orders, settings } = useData();
  const [seen, setSeen] = useState(false);
  const items = useMemo(() => {
    const low = settings.lowStockAlerts
      ? products.filter((p) => ["low", "out"].includes(stockStatus(p))).map((p) => ({
          id: p.id,
          icon: AlertTriangle,
          title: `${p.name} ${stockStatus(p) === "out" ? "is out of stock" : "is running low"}`,
          meta: `${p.stock} ${p.unit} left · reorder at ${p.reorderLevel}`,
          to: "/products" as const,
          search: { q: p.sku },
        }))
      : [];
    const pend = settings.pendingOrderAlerts
      ? orders.filter((o) => o.status === "pending").map((o) => ({
          id: o.id,
          icon: Clock,
          title: `${o.number} awaiting completion`,
          meta: `${o.customer} · ${fmtDate(o.date)}`,
          to: "/sales" as const,
          search: { q: o.number },
        }))
      : [];
    return [...low, ...pend];
  }, [products, orders, settings]);
  return (
    <Popover onOpenChange={(o) => o && setSeen(true)}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications, ${items.length} items`}>
          <Bell className="size-4" />
          {!seen && items.length > 0 && <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive ring-2 ring-background" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          <span className="text-xs text-muted-foreground">{items.length} active</span>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up.</p>}
          {items.map((n) => (
            <Link key={n.id} to={n.to} search={n.search} className="flex gap-3 border-b px-4 py-3 last:border-0 hover:bg-muted/60">
              <n.icon className="mt-0.5 size-4 shrink-0 text-warning" />
              <div className="min-w-0">
                <p className="text-sm leading-snug">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.meta}</p>
              </div>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function UserMenu() {
  const { settings } = useData();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-1.5" aria-label="Open profile menu">
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary-soft text-[11px] font-semibold text-primary">{initials(settings.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="text-sm font-medium">{settings.name}</div>
          <div className="text-xs font-normal text-muted-foreground">{settings.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings className="size-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toast.info("Sign-out will be available once authentication is connected.")}>
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { settings } = useData();
  const path = useRouterState({ select: (r) => r.location.pathname });
  if (path === "/") return <>{children}</>;
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="bg-background">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur">
            <SidebarTrigger aria-label="Toggle sidebar" />
            <Separator orientation="vertical" className="h-5" />
            <div className="hidden min-w-0 md:block">
              <Crumbs />
            </div>
            <div className="flex flex-1 justify-end gap-1 md:ml-4">
              <GlobalSearch />
              <Notifications />
              <UserMenu />
            </div>
          </header>
          <main data-density={settings.density} className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-6 lg:px-8">
            {children}
          </main>
          <footer className="border-t px-6 py-3 text-center text-[11px] text-muted-foreground">
            Letpal Enterprises · Integrated Sales, Inventory & Performance Analytics · Demonstration data only
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
