import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Field, PageHeader, Panel } from "@/components/app/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useData } from "@/lib/store";
import { RANGES } from "@/lib/date-range";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Letpal Enterprises" },
      { name: "description", content: "Manage your profile, notification preferences and interface settings." },
      { property: "og:title", content: "Settings — Letpal Enterprises" },
      { property: "og:description", content: "Profile, preferences and interface settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, updateSettings } = useData();
  const [p, setP] = useState({ name: settings.name, email: settings.email, phone: settings.phone });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (p.name.trim().length < 2) err.name = "Enter your full name";
    if (!/^\S+@\S+\.\S+$/.test(p.email)) err.email = "Enter a valid email address";
    if (!/^\+?[\d\s]{9,15}$/.test(p.phone)) err.phone = "Enter a valid phone number, e.g. +254 7XX XXX XXX";
    setErrors(err);
    if (Object.keys(err).length) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    updateSettings({ ...p, name: p.name.trim() });
    setSaving(false);
    toast.success("Profile saved");
  };

  const pref = (label: string, desc: string, checked: boolean, onChange: (v: boolean) => void, id: string) => (
    <div className="flex items-start justify-between gap-6 py-4 first:pt-0 last:pb-0">
      <div><Label htmlFor={id} className="text-sm font-medium">{label}</Label><p className="text-xs text-muted-foreground">{desc}</p></div>
      <Switch id={id} checked={checked} onCheckedChange={(v) => { onChange(v); toast.success("Preference updated"); }} />
    </div>
  );

  return (
    <>
      <PageHeader title="Settings" description="Changes apply immediately for this session." />
      <Tabs defaultValue="profile" className="max-w-3xl">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="interface">Interface</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Panel title="Profile" description="Shown in the top bar and on records you create.">
            <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2" noValidate>
              <Field label="Full name" error={errors.name}><Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
              <Field label="Role"><Input value={settings.role} disabled /></Field>
              <Field label="Email" error={errors.email}><Input type="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} /></Field>
              <Field label="Phone" error={errors.phone}><Input value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></Field>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => { setP({ name: settings.name, email: settings.email, phone: settings.phone }); setErrors({}); }}>Reset</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
              </div>
            </form>
          </Panel>
        </TabsContent>
        <TabsContent value="preferences">
          <Panel title="Notifications & defaults">
            <div className="divide-y">
              {pref("Low-stock alerts", "Notify when stock reaches the reorder level.", settings.lowStockAlerts, (v) => updateSettings({ lowStockAlerts: v }), "low")}
              {pref("Pending order alerts", "Notify about orders awaiting completion.", settings.pendingOrderAlerts, (v) => updateSettings({ pendingOrderAlerts: v }), "pend")}
              <div className="flex items-center justify-between gap-6 pt-4">
                <div><Label className="text-sm font-medium">Default dashboard range</Label><p className="text-xs text-muted-foreground">Used when the dashboard first opens.</p></div>
                <Select value={settings.defaultRange} onValueChange={(v) => { updateSettings({ defaultRange: v }); toast.success("Default range updated"); }}>
                  <SelectTrigger className="w-44" aria-label="Default range"><SelectValue /></SelectTrigger>
                  <SelectContent>{RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </Panel>
        </TabsContent>
        <TabsContent value="interface">
          <Panel title="Table density" description="Compact rows fit more records on screen.">
            <RadioGroup value={settings.density} onValueChange={(v) => updateSettings({ density: v as "comfortable" | "compact" })} className="grid gap-3 sm:grid-cols-2">
              {[["comfortable", "Comfortable", "Generous row spacing"], ["compact", "Compact", "Denser tables for power users"]].map(([v, l, d]) => (
                <Label key={v} className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 font-normal has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary-soft">
                  <RadioGroupItem value={v} className="mt-0.5" />
                  <span><span className="block text-sm font-medium">{l}</span><span className="text-xs text-muted-foreground">{d}</span></span>
                </Label>
              ))}
            </RadioGroup>
          </Panel>
        </TabsContent>
      </Tabs>
    </>
  );
}
