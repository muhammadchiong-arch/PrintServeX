import { getShop } from "@/lib/shop-data";

// Decorative desktop-only picture: a claim stub lying on printed pages.
// Built from plain shapes (no image file). Screen readers skip it (aria-hidden).

const STUB_ROWS: [string, string][] = [
  ["Ref", "PSX-20261001-0042"],
  ["Name", "JANFREY LOCSON"],
  ["Job", "A4 · B&W · 48 pp"],
  ["Add-on", "Binding"],
  ["Total", "₱189.00"],
];

// Barcode bar widths in px
const BARCODE = [2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 3, 1, 2];

function RegistrationMark({ className }: { className: string }) {
  return (
    <div className={`absolute size-[22px] ${className}`}>
      <span className="absolute left-2.5 top-0 h-[22px] w-px bg-navy" />
      <span className="absolute left-0 top-2.5 h-px w-[22px] bg-navy" />
      <span className="absolute left-1 top-1 size-3.5 rounded-full border border-navy" />
    </div>
  );
}

export async function ClaimStubArt() {
  const shop = await getShop();
  return (
    <div aria-hidden className="relative hidden h-[460px] overflow-hidden rounded-xl bg-[#f3f1ec] lg:block">
      <RegistrationMark className="left-5 top-5" />
      <RegistrationMark className="right-5 top-5" />
      <RegistrationMark className="bottom-5 left-5" />
      <RegistrationMark className="bottom-5 right-5" />

      {/* Color test strip, like the edge of a printed sheet */}
      <div className="absolute left-14 top-[22px] flex">
        {["bg-cyan", "bg-magenta", "bg-yellow", "bg-navy", "bg-slate", "bg-[#b9c6da]"].map((c) => (
          <span key={c} className={`size-[18px] ${c}`} />
        ))}
      </div>
      <span className="absolute right-14 top-6 font-mono text-[11px] tracking-[0.08em] text-slate">JOB 0042 · OCT 01 2026</span>

      {/* Two stacked printed pages */}
      <div className="absolute left-[110px] top-[92px] h-[310px] w-[300px] -rotate-6 bg-surface shadow-sm" />
      <div className="absolute left-[124px] top-[84px] flex h-[310px] w-[300px] -rotate-[2.5deg] flex-col gap-2 bg-surface p-7 shadow-sm">
        <span className="h-2 w-[70%] bg-border" />
        <span className="h-2 w-[90%] bg-border" />
        <span className="h-2 w-[84%] bg-border" />
        <span className="h-2 w-[60%] bg-border" />
      </div>

      {/* The claim stub */}
      <div className="absolute right-[72px] top-[70px] w-[270px] rotate-3 bg-surface font-mono text-[13px] leading-[18px] shadow-[0_2px_4px_rgb(15_30_61/0.08),0_14px_32px_rgb(15_30_61/0.14)]">
        <div className="flex flex-col gap-0.5 border-b-2 border-navy px-5 pb-3 pt-[18px]">
          <span className="font-heading text-[15px] font-semibold tracking-[0.02em]">PRINTSERVEX</span>
          <span className="text-[11px] text-slate">Claim stub · keep until pickup</span>
        </div>
        <div className="px-5 py-3">
          {STUB_ROWS.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-dashed border-[#cbd5e1] py-1.5">
              <span className="text-slate">{k}</span>
              <span className="font-semibold">{v}</span>
            </div>
          ))}
        </div>
        <div className="mx-2 border-t-2 border-dashed border-[#b9c6da]" />
        <div className="flex items-center justify-between px-5 pb-[18px] pt-3">
          <span className="text-[11px] text-slate">0042</span>
          <span className="flex h-7 gap-0.5">
            {BARCODE.map((w, i) => (
              <span key={i} className="bg-navy" style={{ width: w }} />
            ))}
          </span>
        </div>
        <div className="absolute -bottom-[34px] -right-12 -rotate-[8deg] border-[3px] border-ready bg-white/85 px-2.5 py-1 font-heading text-sm font-semibold tracking-[0.08em] text-ready">
          READY FOR PICKUP
        </div>
      </div>

      <span className="absolute bottom-6 left-14 font-mono text-[11px] uppercase tracking-[0.08em] text-slate">{shop.area}</span>
    </div>
  );
}
