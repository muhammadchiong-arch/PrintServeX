# PrintServeX web app

Next.js (App Router) + TypeScript + Tailwind CSS + Supabase.

## Run it

1. `npm install`
2. Create `.env.local` with your Supabase keys (never commit this file):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...   # secret, server only (Supabase → Project Settings → API Keys)
   CRON_SECRET=...                 # only needed on Vercel, for the daily file cleanup
   ```
3. `npm run dev` and open http://localhost:3000

## Screens

| Screen | URL |
| --- | --- |
| C1 Home (live price list from Supabase) | `/` |
| C2 New order (3 steps, live price) | `/order` |
| C3 Confirmation | `/order/confirmation?ref=…` |
| C4 Track order / C5 Order status | `/track` (looks up real orders on the server) |
| S1 Staff login (Supabase Auth, locks after 5 wrong passwords) | `/staff/login` |
| S2 Dashboard | `/staff/dashboard` |
| S3 Orders / S4 Order detail | `/staff/orders`, `/staff/orders/PSX-20261001-0042` |
| S5 Walk-in order | `/staff/walk-in` |
| S6 Customers | `/staff/customers` |
| S7 Inventory / S8 Item detail | `/staff/inventory`, `/staff/inventory/bond-a4-80` |
| S9 Pricing & options | `/staff/pricing` |
| S10 Reports | `/staff/reports` |
| S11 Users | `/staff/users` |
| S12 Settings | `/staff/settings` |
| S13 Profile | `/staff/profile` |

## Daily file cleanup (Vercel)

`vercel.json` runs `/api/cleanup-files` every day at 3:00 AM Manila time. It deletes files of
closed orders older than 30 days (as the privacy notice promises) and uploads that never became
an order. Add `CRON_SECRET` (any long random text) in Vercel → Settings → Environment Variables;
without it the cleanup never runs.

## Database setup (Supabase → SQL Editor, in this order, once each)

1. `supabase/001_tables.sql` – tables
2. `supabase/002_rls.sql` – security rules
3. `supabase/003_orders.sql` – order numbers, saving orders, file bucket
4. `supabase/005_staff_login.sql` – sign-in lock and last sign-in
5. `supabase/005b_first_admin.sql` – the shop owner's account (read the steps at the top first)
6. `supabase/006_staff_work.sql` – staff actions: order status, payments, final price, stock, temporary passwords
7. `supabase/007_pricing_shop.sql` – saving Pricing & options and Shop info (admin only)
8. `supabase/008_no_double_actions.sql` – an order can't be moved, cancelled or paid twice

After that, sign in as the owner and add the other staff on the Users page.

Also: Authentication → Sign In / Providers → turn OFF "Allow new users to sign up".
Staff accounts are only made by the owner, never by sign-up.

## What is real

- **Customer side:** prices, placing orders with file uploads, tracking.
- **Staff portal:** sign-in, orders (status, cancel, payment, final price, remarks, file downloads),
  walk-in orders, customers, inventory, reports, users (add, reset password, deactivate),
  profile password and the audit log. No sample data: everything comes from Supabase and
  starts empty. Data loads in the portal layout (`lib/staff-data.ts`), every change is a
  Server Action in `lib/staff-actions.ts`, and the portal reloads its data every minute.
- **Pricing & options and Shop info:** saved by the admin in Supabase (`lib/admin-actions.ts`).
  Customer pages are rebuilt right after a save. Add-on prices come from the `add_ons` table,
  and each order keeps the prices it was placed with. `lib/shop.ts` only holds a fallback
  for when the database can't be reached.

## Where things are

- `app/(customer)/(site)/` – customer pages with the normal header and footer
- `app/(customer)/order/` – the order form (own step header)
- `app/(staff)/staff/(portal)/` – staff pages with the navy sidebar
- `components/ui/` – reusable building blocks (Button, Input, Modal, …)
- `lib/price.ts` – all price calculations
- `lib/pricing-data.ts` – reads paper sizes, types, prices and add-ons from Supabase (column names at the top)
- `lib/shop-data.ts` / `components/ShopProvider.tsx` – shop details for server / browser code
- `lib/orders.ts` – order types and business rules (next status, cancel rules, totals)
