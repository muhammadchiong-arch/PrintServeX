"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Info, Paperclip } from "lucide-react";
import { useShop } from "@/components/ShopProvider";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/format";
import { prepareQrUpload, savePaymentSettings, saveShop } from "@/lib/admin-actions";
import { contentTypeFor } from "@/lib/files";
import type { PaymentSettings } from "@/lib/payments";
import { SHOP_PUBLIC_BUCKET, UPLOAD_RULES, type Shop } from "@/lib/shop";
import { supabase } from "@/lib/supabase";
import type { StaffData } from "@/lib/staff-data";
import { PageTitle, tableHead } from "./parts";
import { useStaff } from "./StaffStore";

type Tab = "shop" | "payment" | "backup" | "audit";
type BackupFile = { name: string; at: string; size: string; url: string };

// Saved in Supabase (shop_settings). The footer, home page, confirmation and status pages
// show these; they update as soon as you save.
function ShopInfo() {
  const shop = useShop();
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState<Shop>(shop);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Shop) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <form
      className="grid max-w-[744px] grid-cols-2 gap-x-6 gap-y-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        const result = await saveShop(f).catch(() => null);
        setSaving(false);
        if (!result?.ok) {
          toast({ kind: "error", message: result?.error ?? "We couldn't reach the server. Check your connection and try again." });
          return;
        }
        toast({ message: "Shop info saved. Customer pages show it now." });
        router.refresh();
      }}
    >
      <Input size="md" label="Shop name" value={f.name} onChange={set("name")} required />
      <Input size="md" label="Contact number" value={f.phone} onChange={set("phone")} required />
      <Input size="md" label="Street address" value={f.address} onChange={set("address")} placeholder="e.g. 214 Rizal Ave." required />
      <Input size="md" label="Area / city" value={f.area} onChange={set("area")} placeholder="e.g. Sta. Cruz, Manila" />
      <Input size="md" label="Email" type="email" value={f.email} onChange={set("email")} />
      <Input size="md" label="Usual turnaround" value={f.usualTurnaround} onChange={set("usualTurnaround")} placeholder="e.g. within 2 hours" />
      <Input size="md" label="Opening hours (short)" value={f.hours} onChange={set("hours")} placeholder="Mon to Sat, 8:00 AM to 7:00 PM" required />
      <Input size="md" label="Opening hours (long)" value={f.hoursLong} onChange={set("hoursLong")} placeholder="Monday to Saturday, 8:00 AM to 7:00 PM" />
      <div className="col-span-2">
        <Textarea label="Pickup note shown to customers" value={f.pickupNote} onChange={set("pickupNote")} />
      </div>
      <p className="col-span-2 flex items-center gap-2 text-sm text-slate">
        <Info size={16} aria-hidden className="shrink-0" />
        Uploads: {UPLOAD_RULES.fileTypes.join(", ")}, up to {UPLOAD_RULES.maxFileMb} MB per file and {UPLOAD_RULES.maxFilesPerOrder} files per order (set by the storage bucket).
      </p>
      <div className="col-span-2">
        <Button type="submit" size="md" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

// Settings → Payment (supabase/014_payments.sql). Customers see these in Step 4 of the order form.
// The QR must be the shop's real GCash QR code (GCash app → Receive → QR code → Download).
function PaymentSetup({ initial }: { initial: PaymentSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (patch: Partial<PaymentSettings>) => setF((old) => ({ ...old, ...patch }));

  // The picture goes straight to Storage with a one-time link; it's used once you press Save
  const uploadQr = async (file: File) => {
    setUploading(true);
    try {
      const ticket = await prepareQrUpload(file.name, file.size);
      if (!ticket.ok) return toast({ kind: "error", message: ticket.error });
      const { error } = await supabase.storage
        .from(SHOP_PUBLIC_BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: contentTypeFor(file.name) });
      if (error) return toast({ kind: "error", message: "The QR code couldn't be uploaded. Try again." });
      set({ qrPath: ticket.path, qrUrl: URL.createObjectURL(file) });
      toast({ message: "QR code uploaded. Press Save changes to use it." });
    } catch {
      toast({ kind: "error", message: "We couldn't reach the server. Check your connection and try again." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      className="flex max-w-[744px] flex-col gap-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        if (saving || uploading) return;
        setSaving(true);
        const result = await savePaymentSettings({
          cashEnabled: f.cashEnabled,
          gcashEnabled: f.gcashEnabled,
          qrPath: f.qrPath,
          accountName: f.accountName,
          instructions: f.instructions,
          receiptRequired: f.receiptRequired,
        }).catch(() => null);
        setSaving(false);
        if (!result?.ok) {
          toast({ kind: "error", message: result?.error ?? "We couldn't reach the server. Check your connection and try again." });
          return;
        }
        toast({ message: "Payment settings saved. The order form uses them now." });
        router.refresh();
      }}
    >
      <Checkbox checked={f.cashEnabled} onChange={(v) => set({ cashEnabled: v })}>
        <b>Cash on Pickup</b> · customers pay at the counter when they collect the order
      </Checkbox>
      <Checkbox checked={f.gcashEnabled} onChange={(v) => set({ gcashEnabled: v })}>
        <b>GCash</b> · customers scan the shop&apos;s QR code, then staff confirm the payment in the GCash app
      </Checkbox>

      <div className="grid grid-cols-[224px_minmax(0,1fr)] gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">GCash QR code</span>
          {f.qrUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- the shop's own QR picture from Storage
            <img src={f.qrUrl} alt="The shop's GCash QR code" className="size-56 rounded-lg border border-border bg-white object-contain p-2" />
          ) : (
            <div className="flex size-56 items-center justify-center rounded-lg border border-dashed border-[#b9c6da] p-4 text-center text-xs text-slate">
              No QR code yet. GCash stays off for customers until you upload one.
            </div>
          )}
          <label className="flex min-h-11 cursor-pointer items-center gap-2 self-start rounded-lg border border-dashed border-[#b9c6da] px-3 py-2 text-sm font-semibold text-blue transition-colors duration-150 hover:bg-blue-tint has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue">
            <input
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadQr(file);
              }}
            />
            <Paperclip size={16} aria-hidden />
            {uploading ? "Uploading…" : f.qrUrl ? "Replace QR code" : "Upload QR code"}
          </label>
          <span className="text-xs text-slate">PNG or JPG, up to 2 MB</span>
        </div>
        <div className="flex flex-col gap-4">
          <Input
            size="md"
            label="GCash account name"
            value={f.accountName}
            onChange={(e) => set({ accountName: e.target.value })}
            maxLength={80}
            placeholder="e.g. PrintServeX Printing"
            hint="Customers check this name before paying."
          />
          <Textarea
            label="Extra payment note (optional)"
            value={f.instructions}
            onChange={(e) => set({ instructions: e.target.value })}
            maxLength={500}
            placeholder="e.g. Send the exact amount. Payments are checked during shop hours."
          />
          <Checkbox checked={f.receiptRequired} onChange={(v) => set({ receiptRequired: v })}>
            Customers must upload a screenshot of their GCash receipt (the reference number is always required)
          </Checkbox>
        </div>
      </div>

      <p className="flex items-start gap-2 text-sm text-slate">
        <Info size={16} aria-hidden className="mt-0.5 shrink-0" />
        GCash orders show as &quot;Pending verification&quot; until staff confirm them. Orders with a price to be confirmed can only be paid at
        pickup.
      </p>
      <div>
        <Button type="submit" size="md" disabled={saving || uploading}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function BackupRestore() {
  const staff = useStaff();
  const toast = useToast();
  const [made, setMade] = useState<BackupFile[]>([]);

  // Business rule: a backup has orders, customers, staff accounts, inventory and the audit log,
  // but not the uploaded files. It's a copy to keep; restoring is done in Supabase (below).
  const createBackup = () => {
    const now = new Date();
    const data: StaffData = { orders: staff.orders, inventory: staff.inventory, users: staff.users, activity: staff.activity, paper: staff.paper };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    // e.g. 202610011142 (Philippine time)
    const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .format(now)
      .replace(/\D/g, "");
    const backup: BackupFile = { name: `psx-backup-${stamp}.json`, at: now.toISOString(), size: `${(blob.size / 1024).toFixed(1)} KB`, url: URL.createObjectURL(blob) };
    setMade([backup, ...made]);
    const a = document.createElement("a");
    a.href = backup.url;
    a.download = backup.name;
    a.click();
    void staff.logBackup(`Manual · ${backup.size}`);
    toast({ message: `Backup created · ${backup.size}` });
  };

  return (
    <div className="grid grid-cols-2 gap-4 p-6">
      <div className="flex flex-col gap-2 rounded-xl border border-border p-5">
        <h2 className="text-base">Back up now</h2>
        <p className="text-sm text-slate">
          Saves orders, customers, staff accounts, inventory and the audit log as a file. Uploaded print files are not included.
        </p>
        <Button size="md" className="mt-2 self-start" onClick={createBackup}>
          Create backup
        </Button>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border p-5">
        <h2 className="text-base">Restore</h2>
        <p className="text-sm text-slate">
          The data lives in Supabase, which keeps its own daily backups. To go back to an earlier day, open Supabase → Database → Backups.
        </p>
      </div>

      {made.length > 0 && (
        <div className="col-span-2 overflow-hidden rounded-xl border border-border">
          <h3 className="bg-row-hover px-4 py-2.5 font-sans text-xs font-semibold uppercase tracking-[0.04em] text-slate">Backups made this session</h3>
          {made.map((b) => (
            <div key={b.name} className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-sm">
              <span className="flex-1 font-medium">{b.name}</span>
              <span className="text-slate">
                {formatDateTime(b.at)} · {b.size}
              </span>
              <a href={b.url} download={b.name} className="flex items-center gap-1 font-semibold text-blue hover:underline">
                <Download size={14} aria-hidden />
                Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditLog() {
  const { activity } = useStaff();
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">Audit log</caption>
      <thead className={tableHead}>
        <tr>
          <th scope="col" className="w-[170px] px-4 py-2.5">Time</th>
          <th scope="col" className="w-[160px] px-4 py-2.5">User</th>
          <th scope="col" className="w-[200px] px-4 py-2.5">Action</th>
          <th scope="col" className="px-4 py-2.5">Details</th>
        </tr>
      </thead>
      <tbody>
        {activity.map((a, i) => (
          <tr key={`${a.at}-${i}`} className="border-t border-border">
            <td className="px-4 py-2.5 text-slate">{formatDateTime(a.at)}</td>
            <td className="px-4 py-2.5">{a.who}</td>
            <td className="px-4 py-2.5 font-medium">{a.action}</td>
            <td className="px-4 py-2.5 text-slate">{a.details}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// S12
export function Settings({ payment }: { payment: PaymentSettings }) {
  const [tab, setTab] = useState<Tab>("shop");
  return (
    <>
      <PageTitle>Settings</PageTitle>
      <div className="overflow-hidden rounded-xl bg-surface shadow-card">
        <Tabs
          label="Settings sections"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "shop", label: "Shop info" },
            { value: "payment", label: "Payment" },
            { value: "backup", label: "Backup & restore" },
            { value: "audit", label: "Audit log" },
          ]}
        />
        {tab === "shop" && <ShopInfo />}
        {tab === "payment" && <PaymentSetup initial={payment} />}
        {tab === "backup" && <BackupRestore />}
        {tab === "audit" && <AuditLog />}
      </div>
    </>
  );
}
