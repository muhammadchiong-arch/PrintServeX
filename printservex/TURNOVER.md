# PrintServeX — Turnover guide

For the person taking over PrintServeX. You don't need to be a programmer for daily work: almost
everything is done in the **Staff portal** (`/staff`). The technical details are in [README.md](README.md).

## Where everything lives

```
Customer's phone / computer
        ↓
PrintServeX website   ← hosted on Vercel (built from GitHub, branch "main")
        ↓
Supabase              ← database (orders, prices, inventory, staff), staff sign-in, uploaded files
        ↓
Staff portal (/staff) ← staff open orders, view files, print, take payment, update inventory
```

| What | Where you manage it |
| --- | --- |
| The code | GitHub: `muhammadchiong-arch/printservex` (folder `printservex/`) |
| The live website | Vercel dashboard → the PrintServeX project |
| Database, staff sign-in, files | Supabase dashboard → the PrintServeX project |
| Secret keys | Vercel → Settings → Environment Variables (and your own `.env.local`). Never in GitHub. |

## A. Do NOT change these (unless you really know what you are doing)

- The database structure: the `supabase/*.sql` files and tables in the Supabase dashboard
- The environment variables (keys) in Vercel and `.env.local`
- Sign-in settings in Supabase → Authentication (keep "Allow new users to sign up" **OFF**)
- The `order-files` storage bucket (it must stay **private**)
- The Vercel project settings and the website address
- Never put a password or secret key in GitHub, a chat, or a document

If something looks wrong, write down what happened (screenshot, order number, time) and ask the developer.

## B. Safe to change (in the Staff portal)

| What | Where | Who |
| --- | --- | --- |
| Inventory items, stock in / stock out | Inventory | Staff and Admin |
| Prices per page, add-on prices (binding, lamination per size), service prices, Photo Printing price per size | Pricing & options | Admin |
| Paper sizes and paper types (archive instead of deleting) | Pricing & options | Admin |
| Shop name, address, phone, hours | Settings → Shop info | Admin |
| Staff accounts | Users | Admin |

New prices only apply to **new** orders. Existing orders keep the price they were placed with.

## C. How to add an inventory item

1. Inventory → **Add item**
2. **Item name** (e.g. "Bond Paper A4"), **Unit** (sheet, ream, piece…), **On hand** (how many you have now),
   **Reorder level** (at or below this number it shows **Low stock**)
3. **Used for**:
   - **Paper for printing** → choose the paper size and paper type. Starting a print of that paper takes it
     from stock automatically.
   - **Lamination film** → choose the size (ID, Short, A4, Legal). Lamination orders take it automatically.
   - **Photo paper** → choose the photo size (Wallet, 3R, 4R…). Photo Printing takes 1 sheet per print.
   - **Not linked** → for things you only count by hand (ink, toner, staples…).
4. **Add item**

To restock: open the item (or use the button in the list) → **Stock in** → quantity + note
(e.g. "Delivery, receipt 55812"). To record damaged or used supplies by hand: **Stock out**.

Stock states: **OK** · **Low stock** (at or below the reorder level) · **Out of stock** (0).

## D. How to process an order

1. **Orders** → open the order
2. **View file** to check the customer's file (PDF, JPG and PNG open inside the site; DOCX → **Download**)
3. Check the options: paper size, paper type, B&W or color, sides, copies, add-ons, notes
4. Check the **Materials** card: everything should say **In stock**
5. **Start processing**: this takes the paper and lamination film from inventory
6. Print the job, then **Mark ready for pickup** (the customer sees it on their tracking page)
7. When the customer pays at the counter: **Record payment & complete** (Cash, or Online payment: check the
   GCash / Maya / bank transfer confirmation on their phone first)

If the files show a different number of pages or something must change, set the **Final price** with a note
before completing. The customer sees the final price on their tracking page.

## E. When something is out of stock

The system **will not** let you start printing if the paper or film isn't in stock. You'll see a red message
like "Out of stock. Bond Paper A4 needs 20 sheet, has 0".

- **The paper really arrived but wasn't recorded:** Inventory → the item → **Stock in** the delivered
  quantity. Then go back to the order and **Start processing**.
- **There is really no paper:** tell the customer (call the number on the order). Either wait for the
  delivery, or **Cancel** the order with a reason (the customer sees the reason).
- **Don't** fake a Stock in just to get past the message. The numbers would be wrong for everyone.

Cancelling an order that was already being printed does **not** put the paper back. If the paper wasn't used,
Stock in it by hand.

## F. Backups

| What | How | How often |
| --- | --- | --- |
| Source code | It's on GitHub. Keep it pushed; you can also download a ZIP (GitHub → Code → Download ZIP). | After every change |
| Database data | Staff portal → **Settings → Backup & restore → Create backup** (Admin). Saves a file with orders, customers, staff, inventory and the audit log. Keep it in a private folder (not GitHub). | Every week |
| Database (full) | Supabase dashboard → Database → Backups (paid plans), or ask the developer for a full export. | Before big changes |
| Settings / keys | Keep a copy of the environment variable values in a password manager (not GitHub, not chat). | When they change |
| Customer files | They are deleted 30 days after the order (privacy notice). Download any file you must keep. | When needed |

## G. Hand-over checklist (do these yourself, with the developer watching)

1. Sign in as Staff
2. Open an order, **View file**, **Download** the file
3. Check the Materials card and the inventory
4. Add stock (Stock in)
5. Process an order: Start processing → Mark ready → Record payment & complete
6. Sign in as Admin and change a demo price (then change it back)
7. Create a demo order from the customer site and track it
8. Test an out-of-stock situation (set a demo paper to 0 with Stock out, try Start processing)

After each step, explain back what happened and why. If you can't explain it yet, do it once more.

## Known limitations

- DOCX files can't be previewed in the browser (download them).
- Customers can't pay inside the website. Online payments (GCash, Maya, bank transfer) are checked by staff at the
  counter and recorded as "Online payment".
- Only document paper, lamination film and photo paper (Photo Printing) are taken from stock automatically; other
  supplies are counted by hand.
- Photo Printing sizes start as "Price to be confirmed". Set each size's price in Pricing & options → Services.
- The demo inventory has sample numbers, not the shop's real stock.
