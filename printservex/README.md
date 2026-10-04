# PrintServeX web app

> **⚠️ IMPORTANT:** Do not change the database structure (the `supabase/*.sql` files), sign-in settings,
> environment variables, file storage settings or the Vercel settings unless you understand them or have
> asked the project developer. A mistake there can stop the whole system. Daily work (orders, inventory,
> prices, staff accounts, shop info) is done in the **Staff portal**, not in the code.
> New to the project? Read **[TURNOVER.md](TURNOVER.md)** first.

## 1. What PrintServeX does

- **Customers** (no account needed) choose a service, upload their files, see the price right away, and get a
  reference number. They track the order with the reference number and the last 4 digits of their phone.
  They pay when they pick up: cash, or online payment (GCash, Maya or bank transfer) checked by staff at the counter.
- **Staff** see the orders, open the customer's file, start printing, mark it ready and record the payment.
  They also take walk-in orders and keep the inventory (paper, lamination film, supplies) up to date.
- **The admin (shop owner)** also sets prices, adds staff accounts, sees reports and changes shop info.

## 2. Technology

| Part | What it uses |
| --- | --- |
| Website (frontend and server code) | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS |
| Database, staff sign-in, file storage | Supabase (Postgres database, Auth, Storage bucket `order-files`) |
| Hosting | Vercel (deploys automatically from the GitHub `main` branch) |
| Icons | lucide-react |

The code is in the `printservex/` folder of the GitHub repository.

## 3. Run it on your computer

1. Install **Node.js 20 or newer** (nodejs.org, the LTS version) and **Git**.
2. Download the code: `git clone https://github.com/muhammadchiong-arch/printservex.git`, then `cd printservex/printservex`.
3. Install the packages: `npm install`
4. Create a file named `.env.local` next to `package.json` (see section 4). **Never** upload this file to GitHub.
5. The database must already be set up (section 5). It is shared with the live site.
6. Start it: `npm run dev`
7. Open http://localhost:3000 (customer site) or http://localhost:3000/staff (staff portal).

Before uploading changes, check them with `npm run lint` and `npm run build`.

## 4. Environment variables (`.env.local`, and Vercel → Settings → Environment Variables)

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-secret-key
CRON_SECRET=any-long-random-text
```

| Name | What it is | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | The address of the Supabase project (Supabase → Project Settings → API) | No |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The public key the website uses (same page) | No (safe in the browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | The secret key. Only the server uses it, to save orders and make staff accounts | **Yes: never share it or put it in GitHub** |
| `CRON_SECRET` | A password for the daily file cleanup. Only needed on Vercel | **Yes** |

The values are in Supabase and Vercel. They are never written in this repository.

## 5. Database setup (Supabase → SQL Editor, in this order, once each)

1. `supabase/001_tables.sql` – tables
2. `supabase/002_rls.sql` – security rules
3. `supabase/003_orders.sql` – order numbers, saving orders, file bucket
4. `supabase/005_staff_login.sql` – sign-in lock and last sign-in
5. `supabase/005b_first_admin.sql` – the shop owner's account (read the steps at the top first)
6. `supabase/006_staff_work.sql` – staff actions: order status, payments, final price, stock, temporary passwords
7. `supabase/007_pricing_shop.sql` – saving Pricing & options and Shop info (admin only)
8. `supabase/008_no_double_actions.sql` – an order can't be moved, cancelled or paid twice
9. `supabase/009_services.sql` – service catalog (7 categories, 44 services) and orders with several services.
   Run it BEFORE deploying the code that uses it: staff orders and tracking read its new columns.
10. `supabase/010_lamination_sizes.sql` – lamination prices by size (ID, Short, A4, Legal), changed by the admin
   in Pricing & options → Add-ons → Lamination. Until it is run, the app uses ID ₱15, Short ₱20, A4 ₱30, Legal ₱40.
11. `supabase/011_inventory_links.sql` – links inventory to printing: starting a print takes the paper and lamination
   film from stock, and is blocked when there isn't enough. Also: edit/delete items, and a limit on wrong
   Track-order tries. Until it is run, the site works but inventory is not checked.
12. `supabase/012_demo_inventory.sql` – **optional DEMO** inventory (Bond paper, photo and sticker paper, lamination
   films with sample numbers). For testing and the school demo only. Edit or delete the items afterwards.

After that, sign in as the owner and add the other staff on the Users page.

Also: Authentication → Sign In / Providers → turn OFF "Allow new users to sign up".
Staff accounts are only made by the owner, never by sign-up.

## 6. Who can do what

| | Customer (no account) | Staff | Admin (owner) |
| --- | --- | --- | --- |
| Place and track orders | ✓ | ✓ (walk-in) | ✓ |
| See orders, view and download customer files, change status, record payment, set final price | | ✓ | ✓ |
| Inventory: add, edit, stock in / stock out | | ✓ | ✓ |
| Delete an inventory item | | | ✓ |
| Pricing & options, Reports, Users, Settings (shop info, backups) | | | ✓ |

The rules are checked on the server and again in the database, not only by hiding buttons.

**Demo accounts:** none are stored in this repository. The owner account is made with `005b_first_admin.sql`.
For a demo, the admin adds a staff account on **Users → Add staff** (it gets a temporary password that must
be changed at first sign-in). Never write real passwords in the code, the README or chat messages.

## 7. Pages

| Screen | URL |
| --- | --- |
| C1 Home (live price list from Supabase) | `/` |
| C2 New order (4 steps: details → service → files & options → review, live price) | `/order` |
| C3 Confirmation | `/order/confirmation?ref=…` |
| C4 Track order / C5 Order status | `/track` (looks up real orders on the server) |
| Privacy notice / Terms | `/privacy`, `/terms` |
| S1 Staff login (Supabase Auth, locks after 5 wrong passwords) | `/staff/login` |
| S2 Dashboard | `/staff/dashboard` |
| S3 Orders / S4 Order detail | `/staff/orders`, `/staff/orders/PSX-20261001-0042` |
| S5 Walk-in order | `/staff/walk-in` |
| S6 Customers | `/staff/customers` |
| S7 Inventory / S8 Item detail | `/staff/inventory`, `/staff/inventory/12` (the item's number) |
| S9 Pricing & options (admin) | `/staff/pricing` |
| S10 Reports (admin) | `/staff/reports` |
| S11 Users (admin) | `/staff/users` |
| S12 Settings (admin) | `/staff/settings` |
| S13 Profile | `/staff/profile` |

## 8. Common tasks (all in the Staff portal)

- **Add an inventory item:** Inventory → Add item → name, unit, on hand, reorder level, and **Used for**
  (Paper for printing → paper size + type, or Lamination film → size). Save.
- **Restock:** Inventory → **Stock in** on the item → quantity and a note (e.g. the delivery receipt number).
- **Fix an item's name, unit, reorder level or link:** open the item → **Edit**. (Quantities only change with
  Stock in / Stock out, so every change is logged.)
- **Change prices:** (admin) Pricing & options → Price per page, Add-ons (lamination has one price per size),
  or Services.
- **View an order and its file:** Orders → open the order → **View file** (PDF and JPG/PNG open inside the
  site) or **Download** (DOCX files can only be downloaded).
- **Process an order:** check the **Materials** card → **Start processing** (takes the paper and film from
  stock) → print → **Mark ready for pickup** → when the customer pays, **Record payment & complete**.
- **Manage staff:** (admin) Users → Add staff / Reset password / Deactivate.

## 9. Troubleshooting

| Problem | What to do |
| --- | --- |
| "Missing NEXT_PUBLIC_SUPABASE_URL…" when starting | `.env.local` is missing or in the wrong folder. It must be next to `package.json`. Restart `npm run dev`. |
| Prices or orders don't load | Check Supabase is online (free projects pause after a week without use: open the Supabase dashboard and click Restore). |
| "Not enough stock to start printing" | Correct behaviour. Stock in the item if the paper really arrived, or cancel the order. |
| Materials says "Not tracked in inventory" | No inventory item is linked to that paper or film. Inventory → Edit the item → Used for. |
| "View file" stops loading | The link lasts 5 minutes. Close the viewer and open it again. |
| "This file was deleted. Files are kept for 30 days." | Files of closed orders are deleted 30 days after the order (privacy notice). |
| "Too many tries for this reference number" (Track order) | 10 wrong tries in an hour. Wait an hour, or the customer can call the shop. |
| A change works locally but not online | It must be pushed to GitHub and merged into `main`. Then Vercel deploys it (1–3 minutes). |

## 10. Daily file cleanup (Vercel)

`vercel.json` runs `/api/cleanup-files` every day at 3:00 AM Manila time. It deletes files of
closed orders older than 30 days (as the privacy notice promises), uploads that never became
an order, and old wrong Track-order tries. Add `CRON_SECRET` (any long random text) in
Vercel → Settings → Environment Variables; without it the cleanup never runs.

## 11. What is real

- **Customer side:** prices, placing orders with file uploads, tracking.
- **Staff portal:** sign-in, orders (status, cancel, payment, final price, remarks, file viewing and downloads),
  walk-in orders, customers, inventory (linked to printing), reports, users (add, reset password, deactivate),
  profile password and the audit log. Everything comes from Supabase. Data loads in the portal layout
  (`lib/staff-data.ts`), every change is a Server Action in `lib/staff-actions.ts`, and the portal reloads
  its data every minute.
- **Services:** customers pick services by category (`components/order/ServiceStep.tsx`). Each service has a
  kind (`lib/services.ts`) that decides its options, file types and price: Document Printing per page,
  Large-Format per sq ft, the rest per unit. Services without a price show "Price to be confirmed"; the
  owner sets prices on Pricing & options → Services.
- **Pricing & options and Shop info:** saved by the admin in Supabase (`lib/admin-actions.ts`).
  Customer pages are rebuilt right after a save. Add-on prices come from the `add_ons` and `lamination_sizes`
  tables, and each order keeps the prices it was placed with. `lib/shop.ts` only holds a fallback
  for when the database can't be reached.
- **Inventory and printing:** an item can be linked to a paper (size + type) or a lamination film size.
  **Start processing** checks and takes what the order needs in one database step
  (`staff_set_status` in `supabase/011_inventory_links.sql`); the same formula is shown to staff by
  `lib/inventory-needs.ts`. Paper = pages (÷ 2 if double-sided, rounded up) × copies; lamination film = the same
  sheets for documents, the quantity for Photo & ID. Cancelling never puts stock back (stock in by hand).

## 12. Known limitations

- DOCX files can't be previewed in the browser; staff download them.
- Payment is recorded by staff at the counter: cash, or online payment (GCash, Maya, bank transfer) that staff check
  on the customer's phone. Customers can't pay inside the website, and online payments aren't confirmed automatically.
- Only Document paper and lamination film are taken from stock automatically. Other supplies (ink, toner, photo
  and sticker paper for other services) are counted by hand with Stock in / Stock out.
- Lamination is charged per printed page, but film is used per sheet (double-sided pages share one sheet).
- Orders placed before `011_inventory_links.sql` don't know their paper ids, so they are not checked.
- The demo inventory (012) has sample numbers only.

## 13. Where things are

- `app/(customer)/(site)/` – customer pages with the normal header and footer
- `app/(customer)/order/` – the order form (own step header)
- `app/(staff)/staff/(portal)/` – staff pages with the navy sidebar
- `components/ui/` – reusable building blocks (Button, Input, Modal, …)
- `lib/price.ts` – all price calculations
- `lib/pricing-data.ts` – reads paper sizes, types, prices and add-ons from Supabase (column names at the top)
- `lib/inventory-needs.ts` – what an order needs from inventory (same formula as the database)
- `lib/shop-data.ts` / `components/ShopProvider.tsx` – shop details for server / browser code
- `lib/orders.ts` – order types and business rules (next status, cancel rules, totals)
- `supabase/` – the database setup files, run in order (section 5)
