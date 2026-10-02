-- PrintServeX step 2: security rules (Row Level Security).
-- Run in Supabase → SQL Editor → New query → paste ALL of this → Run.
-- Safe to run again: each rule is removed first, then made again.
--
-- Who is who:
--   anon          = anyone on the website (customers). Uses the public key.
--   authenticated = someone signed in. They count as staff only if is_staff() is true
--                   (an active row in staff_profiles). is_admin() = active + role 'admin'.
--   service_role  = our own server code only. It skips these rules, so the server must do
--                   its own checks (e.g. tracking needs ref + last 4 digits).
--
-- Business rule: customers NEVER read orders directly. Placing and tracking an order go
-- through our server, which only returns the one order that matches.

-- ===== 1. Options: paper sizes, paper types, prices (already have "public read active") =====
-- Staff also see archived options (S9 shows them); only admins add or change them.
-- No delete rules: options are archived, never deleted.
drop policy if exists "staff read all sizes" on public.paper_sizes;
create policy "staff read all sizes"  on public.paper_sizes for select to authenticated using (public.is_staff());
drop policy if exists "admin add sizes" on public.paper_sizes;
create policy "admin add sizes"       on public.paper_sizes for insert to authenticated with check (public.is_admin());
drop policy if exists "admin change sizes" on public.paper_sizes;
create policy "admin change sizes"    on public.paper_sizes for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "staff read all types" on public.paper_types;
create policy "staff read all types"  on public.paper_types for select to authenticated using (public.is_staff());
drop policy if exists "admin add types" on public.paper_types;
create policy "admin add types"       on public.paper_types for insert to authenticated with check (public.is_admin());
drop policy if exists "admin change types" on public.paper_types;
create policy "admin change types"    on public.paper_types for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "staff read all prices" on public.price_rules;
create policy "staff read all prices" on public.price_rules for select to authenticated using (public.is_staff());
drop policy if exists "admin add prices" on public.price_rules;
create policy "admin add prices"      on public.price_rules for insert to authenticated with check (public.is_admin());
drop policy if exists "admin change prices" on public.price_rules;
create policy "admin change prices"   on public.price_rules for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ===== 2. Add-ons and shop info: everyone reads, only admins change =====
drop policy if exists "public read active add-ons" on public.add_ons;
create policy "public read active add-ons" on public.add_ons for select to anon, authenticated using (is_active);
drop policy if exists "staff read all add-ons" on public.add_ons;
create policy "staff read all add-ons"     on public.add_ons for select to authenticated using (public.is_staff());
drop policy if exists "admin change add-ons" on public.add_ons;
create policy "admin change add-ons"       on public.add_ons for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read shop info" on public.shop_settings;
create policy "public read shop info" on public.shop_settings for select to anon, authenticated using (true);
drop policy if exists "admin change shop info" on public.shop_settings;
create policy "admin change shop info" on public.shop_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ===== 3. Staff accounts =====
-- Everyone signed in can read their own row (to know their name and role); admins read all.
-- Only admins change accounts. New accounts are created by our server (step 6),
-- because it also has to create the Supabase Auth login.
drop policy if exists "read own profile" on public.staff_profiles;
create policy "read own profile"     on public.staff_profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "admin change profiles" on public.staff_profiles;
create policy "admin change profiles" on public.staff_profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ===== 4. Orders: staff only. Customers (anon) get NO rule, so they can't read anything. =====
drop policy if exists "staff read orders" on public.orders;
create policy "staff read orders"   on public.orders for select to authenticated using (public.is_staff());
drop policy if exists "staff update orders" on public.orders;
create policy "staff update orders" on public.orders for update to authenticated using (public.is_staff()) with check (public.is_staff());
-- New orders are created only by our server (step 3), never directly from a browser.

-- Staff may change ONLY these columns. Reference number, customer details and the
-- estimated total can never be edited after the order is placed.
revoke update on public.orders from authenticated;
grant update (status, final_amount, final_note, cancel_reason, remarks,
              payment_method, paid_amount, paid_at, paid_by) on public.orders to authenticated;

-- Business rule enforced by the database itself:
-- Pending → Processing → Ready for Pickup → Completed, and Cancel only from Pending or Processing.
create or replace function public.check_order_status_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status and not (
       (old.status = 'pending'    and new.status in ('processing', 'cancelled'))
    or (old.status = 'processing' and new.status in ('ready', 'cancelled'))
    or (old.status = 'ready'      and new.status = 'completed')
  ) then
    raise exception 'Order % cannot go from % to %', old.ref, old.status, new.status;
  end if;
  return new;
end $$;

drop trigger if exists orders_status_rule on public.orders;
create trigger orders_status_rule
  before update on public.orders
  for each row execute function public.check_order_status_change();

drop policy if exists "staff read order files" on public.order_items;
create policy "staff read order files" on public.order_items for select to authenticated using (public.is_staff());

drop policy if exists "staff read status history" on public.order_status_history;
create policy "staff read status history" on public.order_status_history for select to authenticated using (public.is_staff());
-- Staff can add a history line only in their own name
drop policy if exists "staff add status history" on public.order_status_history;
create policy "staff add status history"  on public.order_status_history for insert to authenticated
  with check (public.is_staff() and actor_id = auth.uid());

-- order_counters: no rules at all. Only the order-numbering function (step 3) touches it.

-- ===== 5. Inventory: staff read. Stock changes go through a function (step 7) =====
-- so the quantity and the movement log always change together.
drop policy if exists "staff read inventory" on public.inventory_items;
create policy "staff read inventory" on public.inventory_items for select to authenticated using (public.is_staff());
drop policy if exists "staff read stock moves" on public.inventory_moves;
create policy "staff read stock moves" on public.inventory_moves for select to authenticated using (public.is_staff());

-- ===== 6. Audit log: add-only =====
-- Staff can read it (dashboard "recent activity") and add lines in their own name.
-- No update or delete rule, so nobody can edit or erase history.
drop policy if exists "staff read audit log" on public.audit_log;
create policy "staff read audit log" on public.audit_log for select to authenticated using (public.is_staff());
drop policy if exists "staff add audit log" on public.audit_log;
create policy "staff add audit log"  on public.audit_log for insert to authenticated
  with check (public.is_staff() and actor_id = auth.uid());

-- ===== 7. Extra safety: customers' key can't even try to touch private tables =====
revoke all on public.orders, public.order_items, public.order_status_history, public.order_counters,
              public.inventory_items, public.inventory_moves, public.staff_profiles, public.audit_log
  from anon;
