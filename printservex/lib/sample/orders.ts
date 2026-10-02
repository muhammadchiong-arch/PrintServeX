// SAMPLE DATA until orders are saved in Supabase.
// Names and amounts follow the design. Dates are around Oct 1, 2026.
import type { Order, OrderItem, StatusEvent } from "@/lib/orders";
import type { OrderStatus } from "@/lib/status";

// "Now" for the sample data, so ages like "2 h 17 m" stay meaningful
export const SAMPLE_NOW = "2026-10-01T11:42:00+08:00";

const t = (day: string, time: string) => `2026-${day}T${time}:00+08:00`;

// Short way to write one file: name, pages, copies, size, paper, color?, rate, add-ons
function item(
  fileName: string,
  pages: number,
  copies: number,
  size: string,
  paper: string,
  color: boolean,
  rate: number,
  extra: { binding?: boolean; lamination?: boolean; fileSize?: string } = {},
): OrderItem {
  return {
    fileName,
    fileSize: extra.fileSize ?? `${(0.1 + pages * 0.12).toFixed(1)} MB`,
    size,
    paper,
    color,
    pages,
    copies,
    binding: Boolean(extra.binding),
    lamination: Boolean(extra.lamination),
    rate,
  };
}

// Builds the status history up to the given status, with the times given
function history(steps: [OrderStatus, string, string, string?][]): StatusEvent[] {
  return steps.map(([status, at, by, note]) => ({ status, at, by, note }));
}

const A4 = "A4";
const BOND80 = "Bond 80gsm";

export const SAMPLE_ORDERS: Order[] = [
  {
    ref: "PSX-20261001-0048",
    source: "online",
    customer: { name: "Angelica Reyes", phone: "09182237740" },
    items: [item("Reaction-Paper.pdf", 4, 2, A4, BOND80, false, 2), item("Poster-Draft.png", 1, 1, A4, BOND80, true, 8, { fileSize: "4.8 MB" })],
    status: "pending",
    createdAt: t("10-01", "11:31"),
    history: history([["pending", t("10-01", "11:31"), "Online order"]]),
  },
  {
    ref: "PSX-20261001-0047",
    source: "online",
    customer: { name: "Paolo Mendoza", phone: "09351479068" },
    items: [item("Barangay-Clearance-Form.pdf", 3, 2, "Short", "Bond 70gsm", false, 2)],
    status: "pending",
    createdAt: t("10-01", "11:08"),
    history: history([["pending", t("10-01", "11:08"), "Online order"]]),
  },
  {
    ref: "PSX-20261001-0046",
    source: "online",
    customer: { name: "Jasmine Tolentino", phone: "09177905512", email: "jas.tolentino@gmail.com" },
    items: [
      item("Capstone-Final.pdf", 62, 1, A4, BOND80, false, 2, { binding: true }),
      item("Capstone-Charts.pdf", 8, 1, A4, BOND80, true, 8),
      item("Cover.png", 1, 2, A4, BOND80, true, 8, { lamination: true }),
      item("Certificate.pdf", 1, 1, A4, BOND80, true, 8),
    ],
    status: "processing",
    createdAt: t("10-01", "10:52"),
    history: history([
      ["pending", t("10-01", "10:52"), "Online order"],
      ["processing", t("10-01", "11:05"), "Rhea Ocampo"],
    ]),
  },
  {
    ref: "PSX-20261001-0044",
    source: "walk-in",
    customer: { name: "Mark Anthony Ramos", phone: "09196627014" },
    items: [item("NBI-Requirements.pdf", 1, 1, A4, BOND80, false, 2, { lamination: true })],
    status: "processing",
    createdAt: t("10-01", "10:20"),
    history: history([
      ["pending", t("10-01", "10:20"), "Maricel Santos", "Walk-in"],
      ["processing", t("10-01", "10:22"), "Maricel Santos"],
    ]),
  },
  {
    ref: "PSX-20261001-0042",
    source: "online",
    customer: { name: "Juan Dela Cruz", phone: "09174821953", email: "juan.dc@gmail.com" },
    items: [
      item("Thesis-Ch1-2.pdf", 48, 1, A4, BOND80, false, 2, { binding: true, fileSize: "3.1 MB" }),
      item("Ch3-Methodology.pdf", 6, 1, A4, BOND80, true, 8, { fileSize: "1.2 MB" }),
    ],
    status: "ready",
    createdAt: t("10-01", "09:14"),
    final: { amount: 181, note: "4 blank pages not printed." },
    remarks: "Customer asked to bind Ch1-2 only.",
    history: history([
      ["pending", t("10-01", "09:14"), "Online order"],
      ["processing", t("10-01", "10:02"), "Maricel Santos"],
      ["ready", t("10-01", "11:37"), "Maricel Santos"],
    ]),
  },
  {
    ref: "PSX-20261001-0040",
    source: "online",
    customer: { name: "Ramon Santiago", phone: "09208815546" },
    items: [item("Business-Plan.pdf", 21, 1, A4, BOND80, false, 2, { binding: true }), item("Logo.jpg", 1, 1, A4, BOND80, true, 8.5)],
    status: "pending",
    createdAt: t("10-01", "10:44"),
    history: history([["pending", t("10-01", "10:44"), "Online order"]]),
  },
  {
    ref: "PSX-20261001-0039",
    source: "online",
    customer: { name: "Ma. Kristine Villanueva", phone: "09158604421" },
    items: [item("Lesson-Plan-Week5.docx", 18, 1, "Short", "Bond 70gsm", false, 2)],
    status: "ready",
    createdAt: t("10-01", "08:52"),
    history: history([
      ["pending", t("10-01", "08:52"), "Online order"],
      ["processing", t("10-01", "09:20"), "Rhea Ocampo"],
      ["ready", t("10-01", "09:48"), "Rhea Ocampo"],
    ]),
  },
  {
    ref: "PSX-20261001-0036",
    source: "online",
    customer: { name: "Shiela Mae Domingo", phone: "09276630918" },
    items: [item("Enrollment-Form.pdf", 3, 3, "Short", "Bond 70gsm", false, 2)],
    status: "pending",
    createdAt: t("10-01", "10:16"),
    history: history([["pending", t("10-01", "10:16"), "Online order"]]),
  },
  {
    ref: "PSX-20261001-0034",
    source: "online",
    customer: { name: "Gabriel Navarro", phone: "09452203781", email: "gab.navarro@yahoo.com" },
    items: [item("Feasibility-Study.pdf", 115, 1, "Long", "Bond 70gsm", false, 2.5, { binding: true }), item("Appendix-Photos.pdf", 2, 1, A4, BOND80, true, 8)],
    status: "pending",
    createdAt: t("10-01", "09:50"),
    history: history([["pending", t("10-01", "09:50"), "Online order"]]),
  },
  {
    ref: "PSX-20261001-0031",
    source: "online",
    customer: { name: "Lorna Pascual", phone: "09993318825" },
    items: [item("Church-Program.pdf", 2, 15, "Short", "Bond 70gsm", false, 2), item("Raffle-Tickets.pdf", 1, 3, A4, BOND80, true, 8)],
    status: "pending",
    createdAt: t("10-01", "09:25"),
    history: history([["pending", t("10-01", "09:25"), "Online order"]]),
  },
  {
    ref: "PSX-20261001-0029",
    source: "online",
    customer: { name: "Trisha Lim", phone: "09064417730" },
    items: [item("Board-Exam-Reviewer.pdf", 40, 1, A4, BOND80, false, 2)],
    status: "cancelled",
    createdAt: t("10-01", "08:31"),
    cancelReason: "Files are password protected and the customer did not answer our call.",
    history: history([
      ["pending", t("10-01", "08:31"), "Online order"],
      ["cancelled", t("10-01", "10:48"), "Maricel Santos", "Files are password protected and the customer did not answer our call."],
    ]),
  },
  {
    ref: "PSX-20261001-0028",
    source: "walk-in",
    customer: { name: "Noel Villareal", phone: "09286613094" },
    items: [item("Resume-Villareal.pdf", 2, 3, A4, BOND80, false, 2), item("Portfolio-Cover.pdf", 1, 3, A4, BOND80, true, 8)],
    status: "completed",
    createdAt: t("10-01", "10:58"),
    payment: { method: "cash", amount: 36, at: t("10-01", "11:40"), by: "Rhea Ocampo" },
    history: history([
      ["pending", t("10-01", "10:58"), "Rhea Ocampo", "Walk-in"],
      ["processing", t("10-01", "11:00"), "Rhea Ocampo"],
      ["ready", t("10-01", "11:31"), "Rhea Ocampo"],
      ["completed", t("10-01", "11:40"), "Rhea Ocampo", "Paid ₱36.00 cash"],
    ]),
  },
  {
    ref: "PSX-20260930-0117",
    source: "online",
    customer: { name: "Rodel Bautista", phone: "09275510396", email: "rodel.b@yahoo.com" },
    items: [
      item("Thesis-Full-Copy.pdf", 96, 2, A4, BOND80, false, 2, { binding: true }),
      item("Thesis-Charts.pdf", 6, 2, A4, BOND80, true, 8),
    ],
    status: "completed",
    createdAt: t("09-30", "08:12"),
    payment: { method: "gcash", amount: 570, at: t("09-30", "16:07"), by: "Dennis Cruz" },
    history: history([
      ["pending", t("09-30", "08:12"), "Online order"],
      ["processing", t("09-30", "09:15"), "Rhea Ocampo"],
      ["ready", t("09-30", "13:40"), "Rhea Ocampo"],
      ["completed", t("09-30", "16:07"), "Dennis Cruz", "Paid ₱570.00 GCash"],
    ]),
  },
  {
    ref: "PSX-20260930-0112",
    source: "online",
    customer: { name: "Carmela Aquino", phone: "09063182275", email: "carmela.aquino@gmail.com" },
    items: [item("Seminar-Handouts.pdf", 8, 6, A4, BOND80, false, 2)],
    status: "completed",
    createdAt: t("09-30", "11:20"),
    payment: { method: "cash", amount: 96, at: t("09-30", "14:45"), by: "Dennis Cruz" },
    history: history([
      ["pending", t("09-30", "11:20"), "Online order"],
      ["processing", t("09-30", "11:52"), "Dennis Cruz"],
      ["ready", t("09-30", "12:30"), "Dennis Cruz"],
      ["completed", t("09-30", "14:45"), "Dennis Cruz", "Paid ₱96.00 cash"],
    ]),
  },
  {
    ref: "PSX-20260930-0108",
    source: "walk-in",
    customer: { name: "Joshua Castillo", phone: "09167748120" },
    items: [item("Birth-Certificate-Copy.pdf", 1, 4, "Short", "Bond 70gsm", false, 2)],
    status: "completed",
    createdAt: t("09-30", "13:10"),
    payment: { method: "cash", amount: 8, at: t("09-30", "13:19"), by: "Rhea Ocampo" },
    history: history([
      ["pending", t("09-30", "13:10"), "Rhea Ocampo", "Walk-in"],
      ["processing", t("09-30", "13:11"), "Rhea Ocampo"],
      ["ready", t("09-30", "13:16"), "Rhea Ocampo"],
      ["completed", t("09-30", "13:19"), "Rhea Ocampo", "Paid ₱8.00 cash"],
    ]),
  },
  {
    ref: "PSX-20260930-0101",
    source: "online",
    customer: { name: "Kimberly Garcia", phone: "09391125587" },
    items: [item("Tarpaulin-Layout.png", 1, 6, A4, "Photo glossy 180gsm", true, 25, { fileSize: "8.6 MB" })],
    status: "completed",
    createdAt: t("09-30", "08:40"),
    payment: { method: "gcash", amount: 150, at: t("09-30", "10:03"), by: "Dennis Cruz" },
    history: history([
      ["pending", t("09-30", "08:40"), "Online order"],
      ["processing", t("09-30", "08:58"), "Dennis Cruz"],
      ["ready", t("09-30", "09:41"), "Dennis Cruz"],
      ["completed", t("09-30", "10:03"), "Dennis Cruz", "Paid ₱150.00 GCash"],
    ]),
  },
  {
    ref: "PSX-20260926-0052",
    source: "walk-in",
    customer: { name: "Lorenzo Fajardo", phone: "09286143307" },
    items: [item("Resume-Fajardo.pdf", 2, 4, A4, BOND80, false, 2), item("ID-Photo-2x2.jpg", 1, 3, A4, "Photo glossy 180gsm", true, 25, { lamination: true })],
    status: "completed",
    createdAt: t("09-26", "15:02"),
    payment: { method: "cash", amount: 166, at: t("09-26", "15:30"), by: "Maricel Santos" },
    history: history([
      ["pending", t("09-26", "15:02"), "Maricel Santos", "Walk-in"],
      ["processing", t("09-26", "15:04"), "Maricel Santos"],
      ["ready", t("09-26", "15:25"), "Maricel Santos"],
      ["completed", t("09-26", "15:30"), "Maricel Santos", "Paid ₱166.00 cash"],
    ]),
  },
  {
    ref: "PSX-20260918-0073",
    source: "online",
    customer: { name: "Juan Dela Cruz", phone: "09174821953", email: "juan.dc@gmail.com" },
    items: [item("Research-Survey.pdf", 4, 12, A4, BOND80, false, 2)],
    status: "completed",
    createdAt: t("09-18", "10:12"),
    payment: { method: "cash", amount: 96, at: t("09-18", "15:22"), by: "Rhea Ocampo" },
    history: history([
      ["pending", t("09-18", "10:12"), "Online order"],
      ["processing", t("09-18", "10:40"), "Rhea Ocampo"],
      ["ready", t("09-18", "11:30"), "Rhea Ocampo"],
      ["completed", t("09-18", "15:22"), "Rhea Ocampo", "Paid ₱96.00 cash"],
    ]),
  },
];
