# PrintServeX web app

Next.js (App Router) + TypeScript + Tailwind CSS + Supabase.

## Run it

1. `npm install`
2. Create `.env.local` with your Supabase keys (never commit this file):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   ```
3. `npm run dev` and open http://localhost:3000

## Built so far

| Screen | URL |
| --- | --- |
| C1 Home (live price list from Supabase) | `/` |
| C2 New order (3 steps, live price, browser only for now) | `/order` |
| UI preview (temporary) | `/ui-preview`, `/staff/ui-preview` |

## Where things are

- `app/(customer)/(site)/` – customer pages with the normal header and footer
- `app/(customer)/order/` – the order form (own step header)
- `app/(staff)/staff/(portal)/` – staff pages with the navy sidebar
- `components/ui/` – reusable building blocks (Button, Input, Modal, …)
- `lib/price.ts` – all price calculations
- `lib/pricing-data.ts` – reads paper sizes, types and prices from Supabase (column names at the top)
