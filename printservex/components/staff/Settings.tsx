"use client";

import { useState } from "react";
import { Download, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/format";
import { SHOP, UPLOAD_RULES } from "@/lib/shop";
import { PageTitle, tableHead } from "./parts";
import type { StaffData } from "@/lib/staff-data";
import { useStaff } from "./StaffStore";

type Tab = "shop" | "backup" | "audit";
type BackupFile = { name: string; at: string; size: string; url: string };

function ShopInfo() {
  const toast = useToast();
  const [f, setF] = useState({
    name: SHOP.name,
    phone: SHOP.phone,
    address: `${SHOP.address}, ${SHOP.area}`,
    email: SHOP.email,
    hours: SHOP.hours,
    maxMb: String(UPLOAD_RULES.maxFileMb),
    note: SHOP.pickupNote,
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <form
      className="grid max-w-[744px] grid-cols-2 gap-x-6 gap-y-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        toast({ message: "Changed on this page only. Saving shop info to the database comes in the next step." });
      }}
    >
      <p className="col-span-2 flex items-center gap-2 rounded-lg border border-dashed border-[#b9c6da] px-3 py-2 text-sm text-slate">
        <Info size={16} aria-hidden className="shrink-0" />
        The customer pages read these from lib/shop.ts for now. They will come from here once settings are saved in Supabase.
      </p>
      <Input size="md" label="Shop name" value={f.name} onChange={set("name")} required />
      <Input size="md" label="Contact number" value={f.phone} onChange={set("phone")} required />
      <Input size="md" label="Address" value={f.address} onChange={set("address")} required />
      <Input size="md" label="Email" type="email" value={f.email} onChange={set("email")} />
      <Input size="md" label="Opening hours" value={f.hours} onChange={set("hours")} required />
      <Input size="md" label="Max file size (MB)" type="number" min={1} max={50} value={f.maxMb} onChange={set("maxMb")} required />
      <div className="col-span-2">
        <Textarea label="Pickup note shown to customers" value={f.note} onChange={set("note")} />
      </div>
      <div className="col-span-2">
        <Button type="submit" size="md">
          Save changes
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
    const data: StaffData = { orders: staff.orders, inventory: staff.inventory, users: staff.users, activity: staff.activity };
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
export function Settings() {
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
            { value: "backup", label: "Backup & restore" },
            { value: "audit", label: "Audit log" },
          ]}
        />
        {tab === "shop" && <ShopInfo />}
        {tab === "backup" && <BackupRestore />}
        {tab === "audit" && <AuditLog />}
      </div>
    </>
  );
}
