"use client";

import { useState } from "react";
import { Download, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/format";
import { SHOP, UPLOAD_RULES } from "@/lib/shop";
import { PageTitle, tableHead } from "./parts";
import { staffNow, useStaff, type StaffData } from "./StaffStore";

type Tab = "shop" | "backup" | "audit";
type BackupFile = { name: string; at: string; size: string; url: string };

// A restore file must contain these lists, or it's not a PrintServeX backup
function isBackup(x: unknown): x is StaffData {
  const d = x as Partial<StaffData> | null;
  return Boolean(d && Array.isArray(d.orders) && Array.isArray(d.inventory) && Array.isArray(d.users) && Array.isArray(d.activity));
}

function ShopInfo() {
  const { log } = useStaff();
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
        log("Shop info changed", f.name);
        toast({ message: "Shop info saved." });
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
  const [file, setFile] = useState<File | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Business rule: a backup has orders, customers, prices and inventory, but not the uploaded files
  const createBackup = () => {
    const now = staffNow();
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
    staff.log("Backup created", `Manual · ${backup.size}`);
    toast({ message: `Backup created · ${backup.size}` });
  };

  const restore = async () => {
    setConfirming(false);
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isBackup(parsed)) throw new Error("wrong shape");
      staff.replaceAll(parsed);
      staff.log("Backup restored", file.name);
      toast({ message: `Restored from ${file.name}.` });
      setFile(null);
    } catch {
      toast({ kind: "error", message: `${file.name} isn't a PrintServeX backup. Nothing was changed.` });
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4 p-6">
      <div className="flex flex-col gap-2 rounded-xl border border-border p-5">
        <h2 className="text-base">Back up now</h2>
        <p className="text-sm text-slate">Saves orders, customers, staff accounts, inventory and the audit log as a file. Uploaded print files are not included.</p>
        <Button size="md" className="mt-2 self-start" onClick={createBackup}>
          Create backup
        </Button>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border p-5">
        <h2 className="text-base">Restore</h2>
        <p className="text-sm text-slate">Replaces all current data with the backup. Sign out every other staff member first.</p>
        <label className="mt-2 flex flex-col gap-1.5 text-sm font-medium">
          Backup file
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm file:mr-3 file:h-9 file:cursor-pointer file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:font-semibold file:text-navy"
          />
        </label>
        {/* Disabled until a file is chosen */}
        <Button size="md" variant="danger" className="self-start" disabled={!file} onClick={() => setConfirming(true)}>
          Restore backup
        </Button>
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

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Replace all data?"
        description={`Everything in the portal will be replaced with ${file?.name ?? "the backup"}. Changes made since that backup will be lost.`}
        footer={
          <>
            <Button size="md" variant="secondary" onClick={() => setConfirming(false)}>
              Keep current data
            </Button>
            <Button size="md" variant="danger" onClick={restore}>
              Restore backup
            </Button>
          </>
        }
      />
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
