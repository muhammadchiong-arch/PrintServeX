# PrintServeX web app

Next.js (App Router) + TypeScript + Tailwind CSS + Supabase.

## Run it

1. `npm install`
2. Create `.env.local` with your Supabase keys (never commit this file):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...   # secret, server only (Supabase → Project Settings → API Keys)
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

## Database setup (Supabase → SQL Editor, in this order, once each)

1. `supabase/001_tables.sql` – tables
2. `supabase/002_rls.sql` – security rules
3. `supabase/003_orders.sql` – order numbers, saving orders, file bucket
4. `supabase/005_staff_login.sql` – sign-in lock and last sign-in
5. `supabase/005b_first_admin.sql` – the shop owner's account (read the steps at the top first)

Also: Authentication → Sign In / Providers → turn OFF "Allow new users to sign up".
Staff accounts are only made by the owner, never by sign-up.

## What is real and what is sample data

- **Real (Supabase):** paper sizes, paper types and prices (home page, order form, walk-in, pricing page),
  customer orders and tracking, and staff sign-in (every `/staff` page needs an active staff account).
- **Sample data (staff pages):** orders, customers, inventory, other staff users and the audit log (`lib/sample/`).
  Staff pages share them through `components/staff/StaffStore.tsx`, so a change on one page shows on the others.
  Reloading the page resets them. Orders placed on `/order` are kept in the browser tab (sessionStorage).
- Next step: create the `orders`, `order_items`, `inventory`, `staff` tables and replace each action in
  `StaffStore.tsx` / `lib/customer-orders.ts` with a Supabase call.

## Where things are

- `app/(customer)/(site)/` – customer pages with the normal header and footer
- `app/(customer)/order/` – the order form (own step header)
- `app/(staff)/staff/(portal)/` – staff pages with the navy sidebar
- `components/ui/` – reusable building blocks (Button, Input, Modal, …)
- `lib/price.ts` – all price calculations
- `lib/pricing-data.ts` – reads paper sizes, types and prices from Supabase (column names at the top)
- `lib/orders.ts` – order types and business rules (next status, cancel rules, totals)
