"use client";

import { useState } from "react";
import { CircleCheck, CircleSlash, Copy, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { Role, StaffUser } from "@/lib/staff-types";
import { addStaff, resetStaffPassword } from "@/lib/staff-actions";
import { PageTitle, tableHead } from "./parts";
import { useStaff } from "./StaffStore";

// Shows a temporary password once, with a copy button
function TempPassword({ value }: { value: string }) {
  const toast = useToast();
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-bg px-4 py-3">
      <code className="font-mono text-lg font-semibold">{value}</code>
      <Button
        size="md"
        variant="secondary"
        onClick={() =>
          navigator.clipboard.writeText(value).then(
            () => toast({ message: "Password copied." }),
            () => toast({ kind: "error", message: "Couldn't copy. Write it down instead." }),
          )
        }
      >
        <Copy size={16} aria-hidden />
        Copy
      </Button>
    </div>
  );
}

function AddStaffModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { users, refresh } = useStaff();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<Role>("Staff");
  const [tried, setTried] = useState(false);
  const [password, setPassword] = useState<string | null>(null);

  const suggested = name.trim().toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean).join(".");
  const user = username.trim() || suggested;
  const errors = {
    name: name.trim().length >= 2 ? undefined : "Enter the full name.",
    username: !/^[a-z0-9._]{3,30}$/.test(user) ? "Use 3 to 30 lowercase letters, numbers or dots." : users.some((u) => u.username === user) ? "This username is taken." : undefined,
  };

  const close = () => {
    setName("");
    setUsername("");
    setRole("Staff");
    setTried(false);
    setPassword(null);
    onClose();
  };

  if (password) {
    return (
      <Modal open={open} onClose={close} title={`${name.trim()} added`} description="Give them this temporary password. It's shown only once, and they must change it when they first sign in." footer={<Button size="md" onClick={close}>Done</Button>}>
        <TempPassword value={password} />
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add staff"
      footer={
        <>
          <Button size="md" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            size="md"
            disabled={saving}
            onClick={async () => {
              setTried(true);
              if (errors.name || errors.username) return;
              setSaving(true);
              // The account and its temporary password are made on the server
              const result = await addStaff({ name: name.trim(), username: user, role }).catch(() => null);
              setSaving(false);
              if (!result?.ok) {
                toast({ kind: "error", message: result?.error ?? "We couldn't reach the server. Try again." });
                return;
              }
              setPassword(result.password);
              refresh();
            }}
          >
            Add staff
          </Button>
        </>
      }
    >
      <Input size="md" label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jerome Lacson" error={tried ? errors.name : undefined} />
      <Input size="md" label="Username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} placeholder={suggested || "jerome.lacson"} error={tried ? errors.username : undefined} />
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Role</legend>
        <div className="flex gap-4 text-sm">
          {(["Staff", "Admin"] as const).map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="size-4 accent-blue" />
              {r}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-slate">A temporary password is shown once after saving. They must change it on first sign in.</p>
    </Modal>
  );
}

// S11
export function Users() {
  const { users, me, setUserActive } = useStaff();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [reset, setReset] = useState<{ user: StaffUser; password: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null); // the account being saved

  return (
    <>
      <PageTitle
        actions={
          <Button size="md" onClick={() => setAdding(true)}>
            <UserPlus size={16} aria-hidden />
            Add staff
          </Button>
        }
      >
        Users
      </PageTitle>

      <div className="overflow-hidden rounded-xl bg-surface shadow-card">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Staff accounts</caption>
          <thead className={tableHead}>
            <tr>
              <th scope="col" className="px-4 py-2.5">Name</th>
              <th scope="col" className="w-[160px] px-4 py-2.5">Username</th>
              <th scope="col" className="w-[100px] px-4 py-2.5">Role</th>
              <th scope="col" className="w-[140px] px-4 py-2.5">Status</th>
              <th scope="col" className="w-[160px] px-4 py-2.5">Last sign in</th>
              <th scope="col" className="w-[260px] px-4 py-2.5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={cn("border-t border-border", !u.active && "text-slate")}>
                <td className="px-4 py-2.5 font-semibold">{u.name}</td>
                <td className="px-4 py-2.5">{u.username}</td>
                <td className="px-4 py-2.5">{u.role}</td>
                <td className="px-4 py-2.5">
                  <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", u.active && "text-completed")}>
                    {u.active ? <CircleCheck size={12} aria-hidden /> : <CircleSlash size={12} aria-hidden />}
                    {u.active ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate">{u.lastSignIn ? formatDateTime(u.lastSignIn) : "Never"}</td>
                <td className="px-4 py-2.5">
                  {/* Business rule: you can't deactivate or reset your own account here (use Profile) */}
                  {u.id === me.id ? (
                    <span className="block text-right text-xs text-slate">You</span>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <Button size="md" variant="secondary" className="h-8 px-2.5 text-[13px]" disabled={busyId === u.id} onClick={async () => {
                        setBusyId(u.id);
                        const result = await resetStaffPassword(u.id).catch(() => null);
                        setBusyId(null);
                        if (result?.ok) setReset({ user: u, password: result.password });
                        else toast({ kind: "error", message: result?.error ?? "We couldn't reach the server. Try again." });
                      }}>
                        Reset password<span className="sr-only"> for {u.name}</span>
                      </Button>
                      <Button
                        size="md"
                        variant={u.active ? "dangerOutline" : "secondary"}
                        className="h-8 px-2.5 text-[13px]"
                        disabled={busyId === u.id}
                        onClick={async () => {
                          setBusyId(u.id);
                          const saved = await setUserActive(u.id, !u.active);
                          setBusyId(null);
                          if (saved) toast({ message: `${u.name} ${u.active ? "deactivated. They can't sign in anymore." : "reactivated."}` });
                        }}
                      >
                        {u.active ? "Deactivate" : "Reactivate"}
                        <span className="sr-only"> {u.name}</span>
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddStaffModal open={adding} onClose={() => setAdding(false)} />
      <Modal
        open={Boolean(reset)}
        onClose={() => setReset(null)}
        title={`New password for ${reset?.user.name ?? ""}`}
        description="Give them this temporary password. It's shown only once, and they must change it when they sign in."
        footer={<Button size="md" onClick={() => setReset(null)}>Done</Button>}
      >
        {reset && <TempPassword value={reset.password} />}
      </Modal>
    </>
  );
}
