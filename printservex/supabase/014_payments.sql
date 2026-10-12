-- 014: Payment step at checkout (Cash on Pickup or GCash). Run once in Supabase → SQL Editor, after 013.
-- - The customer (or staff, for a walk-in) chooses how to pay before reviewing the order.
-- - GCash is manual: the customer scans the shop's QR, pays, then types the GCash reference number
--   and (if the shop wants it) uploads the receipt. Staff check it in the GCash app and Confirm or Reject.
--   A receipt or a reference number is NEVER proof by itself: the order stays "Pending verification".
-- - Payment METHOD (how they want to pay) and payment STATUS (what really happened) are separate.
-- - Safe to run twice.

-- ===== 1. Payment settings (Settings → Payment, admin only) =====
alter table public.shop_settings add column if not exists cash_enabled boolean not null default true;
alter table public.shop_settings add column if not exists gcash_enabled boolean not null default false;
alter table public.shop_settings add column if not exists gcash_qr_path text;          -- file in the "shop-public" bucket
alter table public.shop_settings add column if not exists gcash_account_name text;     -- shown so customers can check who they pay
alter table public.shop_settings add column if not exists payment_instructions text;   -- optional extra note
alter table public.shop_settings add column if not exists receipt_required boolean not null default true;

-- The shop's GCash QR code is meant to be seen by every customer, so it lives in a PUBLIC bucket.
-- Customer receipts are NOT here: they stay in the private "order-files" bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-public', 'shop-public', true, 2097152, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

create or replace function public.admin_save_payment_settings(
  p_cash boolean, p_gcash boolean, p_qr_path text, p_account_name text, p_instructions text, p_receipt_required boolean
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_admin_name();
  v_qr text := nullif(trim(coalesce(p_qr_path, '')), '');
begin
  if p_cash is null or p_gcash is null or p_receipt_required is null then raise exception 'Choose the payment options'; end if;
  if not p_cash and not p_gcash then raise exception 'Keep at least one payment method on'; end if;
  if v_qr is not null and v_qr !~ '^gcash-qr-[0-9a-f-]{36}\.(png|jpg)$' then raise exception 'Upload the QR code again'; end if;
  if p_gcash and v_qr is null then raise exception 'Upload the shop''s GCash QR code before turning GCash on'; end if;
  if p_gcash and length(trim(coalesce(p_account_name, ''))) < 2 then raise exception 'Enter the GCash account name customers will see'; end if;

  update public.shop_settings set
    cash_enabled = p_cash,
    gcash_enabled = p_gcash,
    gcash_qr_path = v_qr,
    gcash_account_name = nullif(left(trim(coalesce(p_account_name, '')), 80), ''),
    payment_instructions = nullif(left(trim(coalesce(p_instructions, '')), 500), ''),
    receipt_required = p_receipt_required,
    updated_at = now()
  where id = 1;
  if not found then raise exception 'Shop info row is missing. Run 001_tables.sql.'; end if;

  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name, 'Payment settings changed',
          'Cash ' || case when p_cash then 'on' else 'off' end || ' · GCash ' || case when p_gcash then 'on' else 'off' end ||
          ' · receipt ' || case when p_receipt_required then 'required' else 'optional' end);
end $$;

-- ===== 2. Payment on each order =====
-- payment_method: chosen at checkout; when the order is completed it is set to how they really paid.
alter table public.orders add column if not exists payment_status text;
-- An older test version may already have a payment_status column with other values and rules.
-- Remove its old rules, then set every order from the real payment record: paid_at = paid at the counter.
do $$
declare v_con record;
begin
  for v_con in
    select conname from pg_constraint
    where conrelid = 'public.orders'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%payment_status%'
  loop
    execute format('alter table public.orders drop constraint %I', v_con.conname);
  end loop;
end $$;
update public.orders
   set payment_status = case when paid_at is not null then 'paid' else 'unpaid' end
 where payment_status is null or payment_status not in ('unpaid', 'pending_verification', 'paid', 'rejected');
alter table public.orders alter column payment_status set default 'unpaid';
alter table public.orders alter column payment_status set not null;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('unpaid', 'pending_verification', 'paid', 'rejected'));
alter table public.orders add column if not exists payment_amount numeric(10,2) check (payment_amount >= 0); -- the total the customer was asked to pay online
alter table public.orders add column if not exists gcash_reference text;
alter table public.orders drop constraint if exists orders_gcash_reference_check;
-- Old test values: clean them the same way the website does (no spaces/dashes, capitals); drop ones that can't be used
update public.orders set gcash_reference = upper(regexp_replace(gcash_reference, '[\s-]+', '', 'g')) where gcash_reference is not null;
update public.orders set gcash_reference = null where gcash_reference !~ '^[A-Z0-9]{8,30}$';
update public.orders o set gcash_reference = null
 where gcash_reference is not null
   and exists (select 1 from public.orders d where d.gcash_reference = o.gcash_reference and d.id < o.id);
alter table public.orders add constraint orders_gcash_reference_check check (gcash_reference is null or gcash_reference ~ '^[A-Z0-9]{8,30}$');
alter table public.orders add column if not exists receipt_path text;
alter table public.orders add column if not exists payment_submitted_at timestamptz;
alter table public.orders add column if not exists payment_verified_by uuid references public.staff_profiles(id);
alter table public.orders add column if not exists payment_verified_at timestamptz;
alter table public.orders add column if not exists payment_verified_label text;  -- the staff name, shown on the order
alter table public.orders add column if not exists payment_reject_reason text;
alter table public.orders add column if not exists checkout_id uuid;   -- one per checkout: a double tap or retry never makes 2 orders
create unique index if not exists orders_checkout_id_unique on public.orders (checkout_id) where checkout_id is not null;
-- One GCash payment can't be used for two orders. A rejected one can be used again (a rejection always
-- has a reason, and keeps it even after the customer pays at pickup).
drop index if exists public.orders_gcash_reference_unique;
create unique index orders_gcash_reference_unique on public.orders (gcash_reference)
  where gcash_reference is not null and payment_reject_reason is null;

-- Orders paid before this update
update public.orders set payment_status = 'paid' where paid_at is not null and payment_status = 'unpaid';

-- ===== 3. Creating an order (replaces the 009 version; adds the payment) =====
drop function if exists public.create_order(text, text, text, text, numeric, jsonb, uuid, text);
create or replace function public.create_order(
  p_source text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_estimated_total numeric,
  p_items jsonb,
  p_created_by uuid,
  p_actor_label text,
  p_checkout_id uuid default null,
  p_payment_method text default null,
  p_gcash_reference text default null,
  p_receipt_path text default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_ref text;
  v_id bigint;
  v_quote boolean := exists (select 1 from jsonb_array_elements(p_items) e where e->>'line_total' is null);
  v_constraint text;
begin
  -- Same checkout sent again (double tap, retry after a lost connection): give back the first order
  if p_checkout_id is not null then
    select ref into v_ref from public.orders where checkout_id = p_checkout_id;
    if found then return v_ref; end if;
  end if;

  if p_payment_method is not null and p_payment_method not in ('cash', 'gcash') then raise exception 'Choose how to pay'; end if;
  if p_payment_method = 'gcash' then
    if v_quote then raise exception 'GCash is only for orders with a final price'; end if;
    if p_gcash_reference is null then raise exception 'Enter the GCash reference number'; end if;
  elsif p_gcash_reference is not null or p_receipt_path is not null then
    raise exception 'A GCash reference is only for GCash payments';
  end if;

  v_ref := public.next_order_ref();
  begin
    insert into public.orders (ref, source, customer_name, customer_phone, customer_email, estimated_total, created_by, needs_quote,
                               checkout_id, payment_method, payment_status, payment_amount, gcash_reference, receipt_path, payment_submitted_at)
    values (v_ref, p_source, p_customer_name, p_customer_phone, nullif(p_customer_email, ''), p_estimated_total, p_created_by, v_quote,
            p_checkout_id, p_payment_method,
            case when p_payment_method = 'gcash' then 'pending_verification' else 'unpaid' end,
            case when p_payment_method = 'gcash' then p_estimated_total end,
            p_gcash_reference, p_receipt_path,
            case when p_payment_method = 'gcash' then now() end)
    returning id into v_id;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'orders_checkout_id_unique' then
      select ref into v_ref from public.orders where checkout_id = p_checkout_id;
      return v_ref;   -- the same checkout won a race a moment ago
    elsif v_constraint = 'orders_gcash_reference_unique' then
      raise exception 'This GCash reference number was already used for another order';
    end if;
    raise;
  end;

  insert into public.order_items (order_id, position, service_id, service_name, category_name, kind, quantity, details,
                                  file_name, file_size_bytes, storage_path, size_name, paper_name,
                                  color, pages, copies, binding, lamination, rate, binding_price, lamination_price, line_total)
  select v_id, x.position, x.service_id, x.service_name, x.category_name, x.kind, x.quantity, coalesce(x.details, '{}'),
         x.file_name, x.file_size_bytes, x.storage_path, x.size_name, x.paper_name,
         x.color, x.pages, x.copies, coalesce(x.binding, false), coalesce(x.lamination, false), x.rate,
         coalesce(x.binding_price, 0), coalesce(x.lamination_price, 0), x.line_total
  from jsonb_to_recordset(p_items) as x(
    position smallint, service_id uuid, service_name text, category_name text, kind text, quantity int, details jsonb,
    file_name text, file_size_bytes bigint, storage_path text, size_name text, paper_name text,
    color boolean, pages int, copies int, binding boolean, lamination boolean,
    rate numeric, binding_price numeric, lamination_price numeric, line_total numeric);

  insert into public.order_status_history (order_id, status, actor_id, actor_label, note)
  values (v_id, 'pending', p_created_by, p_actor_label, case when p_source = 'walk-in' then 'Walk-in' end);

  return v_ref;
end $$;

-- ===== 4. Staff check a GCash payment: Confirm (paid) or Reject (customer pays at pickup) =====
create or replace function public.staff_verify_payment(p_ref text, p_approve boolean, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_staff_name();
  v_order public.orders;
  v_reason text := left(trim(coalesce(p_reason, '')), 300);
begin
  if p_approve is null then raise exception 'Choose Confirm or Reject'; end if;
  select * into v_order from public.orders where ref = p_ref for update;
  if not found then raise exception 'Order % not found', p_ref; end if;
  if v_order.payment_status <> 'pending_verification' then raise exception 'The payment for % was already checked', p_ref; end if;
  if v_order.status = 'cancelled' then raise exception 'This order is cancelled'; end if;
  if not p_approve and v_reason = '' then raise exception 'Enter a reason so the customer knows what to do'; end if;

  update public.orders
     set payment_status = case when p_approve then 'paid' else 'rejected' end,
         payment_verified_by = auth.uid(),
         payment_verified_at = now(),
         payment_verified_label = v_name,
         payment_reject_reason = case when p_approve then null else v_reason end
   where id = v_order.id;
  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name, case when p_approve then 'Online payment confirmed' else 'Online payment rejected' end,
          p_ref || ' · ₱' || to_char(v_order.payment_amount, 'FM999,999,990.00') || ' · ref ' || v_order.gcash_reference ||
          case when p_approve then '' else ' · ' || v_reason end);
end $$;

-- ===== 5. Completing (replaces the 008 version) =====
-- Business rule: a GCash payment waiting to be checked must be Confirmed or Rejected first.
-- If it was confirmed, nothing more is collected at pickup.
create or replace function public.staff_complete_order(p_ref text, p_method text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_staff_name();
  v_order public.orders;
  v_amount numeric(10,2);
  v_method text := p_method;
  v_note text;
begin
  select * into v_order from public.orders where ref = p_ref for update;
  if not found then raise exception 'Order % not found', p_ref; end if;
  if v_order.status = 'completed' then raise exception 'Payment for % is already recorded', p_ref; end if;
  if v_order.status <> 'ready' then raise exception 'Order % must be Ready for Pickup before payment', p_ref; end if;
  if v_order.payment_status = 'pending_verification' then
    raise exception 'Confirm or reject the online payment for % first', p_ref;
  end if;

  if v_order.payment_status = 'paid' and v_order.payment_amount is not null then
    -- Already paid by GCash and confirmed by staff
    v_method := 'gcash';
    v_amount := v_order.payment_amount;
    v_note := 'Paid ₱' || to_char(v_amount, 'FM999,999,990.00') || ' gcash (confirmed before pickup)';
  else
    if v_method not in ('cash', 'gcash') then raise exception 'Choose cash or GCash'; end if;
    v_amount := coalesce(v_order.final_amount, v_order.estimated_total);
    v_note := 'Paid ₱' || to_char(v_amount, 'FM999,999,990.00') || ' ' || v_method;
  end if;

  update public.orders
     set status = 'completed', payment_method = v_method, payment_status = 'paid',
         paid_amount = v_amount, paid_at = now(), paid_by = auth.uid()
   where id = v_order.id;
  insert into public.order_status_history (order_id, status, actor_id, actor_label, note)
  values (v_order.id, 'completed', auth.uid(), v_name, v_note);
  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name, 'Order completed', p_ref || ' · ' || v_note);
end $$;

-- ===== 6. Final price (replaces the 006 version) =====
-- Business rule: once a GCash payment is sent, the price can't change (the customer paid that amount).
-- Reject the payment first if the price really has to change; the customer then pays at pickup.
create or replace function public.staff_set_final_price(p_ref text, p_amount numeric, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_staff_name();
  v_order public.orders;
  v_note text := trim(coalesce(p_note, ''));
begin
  select * into v_order from public.orders where ref = p_ref for update;
  if not found then raise exception 'Order % not found', p_ref; end if;
  if v_order.status in ('completed', 'cancelled') then raise exception 'This order is closed'; end if;
  if v_order.payment_status in ('pending_verification', 'paid') and v_order.payment_amount is not null then
    raise exception 'This order was paid online, so its price can''t change. Reject the online payment first.';
  end if;
  if p_amount is null or p_amount < 0 or p_amount > 1000000 then raise exception 'Enter a valid price'; end if;
  if round(p_amount, 2) <> v_order.estimated_total and v_note = '' then
    raise exception 'Add a note that explains the price change';
  end if;

  update public.orders set final_amount = round(p_amount, 2), final_note = nullif(v_note, '') where id = v_order.id;
  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name, 'Final price edited', p_ref || ' · ₱' ||
          to_char(coalesce(v_order.final_amount, v_order.estimated_total), 'FM999,999,990.00') || ' → ₱' ||
          to_char(round(p_amount, 2), 'FM999,999,990.00'));
end $$;

-- ===== 7. Security: staff change orders ONLY through the functions above =====
-- Before this, a signed-in staff account could write paid_amount / paid_by straight from the browser.
-- Every screen already uses the functions (security definer), so nothing in the app needs this.
revoke update on public.orders from authenticated;
revoke update (status, final_amount, final_note, cancel_reason, remarks,
               payment_method, paid_amount, paid_at, paid_by) on public.orders from authenticated;

-- ===== 8. Who may run these =====
revoke execute on function public.create_order(text, text, text, text, numeric, jsonb, uuid, text, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.create_order(text, text, text, text, numeric, jsonb, uuid, text, uuid, text, text, text) to service_role;
revoke execute on function public.admin_save_payment_settings(boolean, boolean, text, text, text, boolean) from public, anon;
revoke execute on function public.staff_verify_payment(text, boolean, text) from public, anon;
revoke execute on function public.staff_complete_order(text, text) from public, anon;
revoke execute on function public.staff_set_final_price(text, numeric, text) from public, anon;
grant execute on function public.admin_save_payment_settings(boolean, boolean, text, text, text, boolean) to authenticated;
grant execute on function public.staff_verify_payment(text, boolean, text) to authenticated;
grant execute on function public.staff_complete_order(text, text) to authenticated;
grant execute on function public.staff_set_final_price(text, numeric, text) to authenticated;
