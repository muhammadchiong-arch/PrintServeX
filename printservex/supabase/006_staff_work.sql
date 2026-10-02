-- PrintServeX steps 6 + 7: staff accounts and the staff pages' real work.
-- Run once in Supabase → SQL Editor → New query → paste ALL of this → Run.
-- Run 005_staff_login.sql first.
--
-- Every staff action below is ONE function, so the change, its history line and its
-- audit log line are saved together or not at all. Each function first checks that
-- the person calling it is active staff, and writes their name at that moment.

-- ===== 1. Temporary passwords must be changed at the first sign-in =====
alter table public.staff_profiles add column must_change_password boolean not null default false;

-- Stock moves keep the staff name at the time (like order history), because a normal
-- staff member can't read other people's accounts.
alter table public.inventory_moves add column actor_label text not null default '';

-- ===== 2. "Who is calling?" — the name of the signed-in active staff member, or an error =====
create or replace function public.current_staff_name() returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v_name text;
begin
  select full_name into v_name from public.staff_profiles where id = auth.uid() and is_active;
  if v_name is null then
    raise exception 'Only active staff can do this' using errcode = '42501';
  end if;
  return v_name;
end $$;

-- ===== 3. Orders =====
-- Pending → Processing → Ready for Pickup. (The trigger from step 2 also blocks wrong jumps.)
create or replace function public.staff_set_status(p_ref text, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_staff_name();
  v_order public.orders;
begin
  if p_status not in ('processing', 'ready') then
    raise exception 'Use cancel or complete for this status';
  end if;
  update public.orders set status = p_status where ref = p_ref returning * into v_order;
  if not found then raise exception 'Order % not found', p_ref; end if;

  insert into public.order_status_history (order_id, status, actor_id, actor_label)
  values (v_order.id, p_status, auth.uid(), v_name);
  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name, 'Status changed', p_ref || ' · ' ||
          case p_status when 'processing' then 'Pending → Processing' else 'Processing → Ready for Pickup' end);
end $$;

-- Business rule: cancel only from Pending or Processing, and always with a reason
create or replace function public.staff_cancel_order(p_ref text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_staff_name();
  v_reason text := trim(coalesce(p_reason, ''));
  v_id bigint;
begin
  if length(v_reason) < 3 then raise exception 'Give a reason for cancelling'; end if;
  update public.orders set status = 'cancelled', cancel_reason = v_reason where ref = p_ref returning id into v_id;
  if v_id is null then raise exception 'Order % not found', p_ref; end if;

  insert into public.order_status_history (order_id, status, actor_id, actor_label, note)
  values (v_id, 'cancelled', auth.uid(), v_name, v_reason);
  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name, 'Order cancelled', p_ref || ' · ' || v_reason);
end $$;

-- Business rule: completed only when payment is recorded at the counter.
-- The amount is taken from the order itself (final price, or else the estimate),
-- never from the browser.
create or replace function public.staff_complete_order(p_ref text, p_method text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_staff_name();
  v_order public.orders;
  v_amount numeric(10,2);
  v_note text;
begin
  if p_method not in ('cash', 'gcash') then raise exception 'Choose cash or GCash'; end if;
  select * into v_order from public.orders where ref = p_ref for update;
  if not found then raise exception 'Order % not found', p_ref; end if;

  v_amount := coalesce(v_order.final_amount, v_order.estimated_total);
  v_note := 'Paid ₱' || to_char(v_amount, 'FM999,999,990.00') || ' ' || case p_method when 'cash' then 'cash' else 'gcash' end;

  update public.orders
     set status = 'completed', payment_method = p_method, paid_amount = v_amount, paid_at = now(), paid_by = auth.uid()
   where id = v_order.id;
  insert into public.order_status_history (order_id, status, actor_id, actor_label, note)
  values (v_order.id, 'completed', auth.uid(), v_name, v_note);
  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name, 'Order completed', p_ref || ' · ' || v_note);
end $$;

-- Business rule: a final price different from the estimate needs a note for the customer
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

-- Staff-only notes. Not in the audit log (they change often and are visible on the order).
create or replace function public.staff_set_remarks(p_ref text, p_remarks text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.current_staff_name();
  update public.orders set remarks = nullif(left(trim(coalesce(p_remarks, '')), 2000), '') where ref = p_ref;
  if not found then raise exception 'Order % not found', p_ref; end if;
end $$;

-- ===== 4. Inventory: the quantity and the movement log always change together =====
create or replace function public.staff_move_stock(p_item_id bigint, p_type text, p_qty int, p_note text) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_staff_name();
  v_item public.inventory_items;
  v_change int;
begin
  if p_type not in ('in', 'out') then raise exception 'Choose stock in or stock out'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 100000 then raise exception 'Enter a whole number, 1 or more'; end if;
  -- "for update" holds the row, so two staff changing stock at once can't lose a change
  select * into v_item from public.inventory_items where id = p_item_id for update;
  if not found then raise exception 'Item not found'; end if;

  v_change := case when p_type = 'in' then p_qty else -p_qty end;
  if v_item.qty + v_change < 0 then
    raise exception 'Only % % on hand', v_item.qty, v_item.unit;
  end if;

  update public.inventory_items set qty = qty + v_change where id = p_item_id;
  insert into public.inventory_moves (item_id, type, change, balance, note, actor_id, actor_label)
  values (p_item_id, p_type, v_change, v_item.qty + v_change, left(trim(coalesce(p_note, '')), 300), auth.uid(), v_name);
  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name, case when p_type = 'in' then 'Stock in' else 'Stock out' end,
          v_item.name || ' · ' || case when v_change > 0 then '+' else '−' end || abs(v_change) || ' ' || v_item.unit);
  return v_item.qty + v_change;
end $$;

create or replace function public.staff_add_item(p_name text, p_unit text, p_qty int, p_reorder int) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_staff_name();
  v_id bigint;
begin
  if length(trim(coalesce(p_name, ''))) < 2 or length(trim(coalesce(p_unit, ''))) < 1 then raise exception 'Enter the item name and unit'; end if;
  if p_qty is null or p_qty < 0 or p_reorder is null or p_reorder < 0 then raise exception 'Quantities must be 0 or more'; end if;

  insert into public.inventory_items (name, unit, qty, reorder_level)
  values (trim(p_name), trim(p_unit), p_qty, p_reorder)
  returning id into v_id;
  if p_qty > 0 then
    insert into public.inventory_moves (item_id, type, change, balance, note, actor_id, actor_label)
    values (v_id, 'in', p_qty, p_qty, 'Opening stock', auth.uid(), v_name);
  end if;
  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name, 'Item added', trim(p_name) || ' · ' || p_qty || ' ' || trim(p_unit));
  return v_id;
end $$;

-- ===== 5. Who may run these: signed-in people only (each function checks for active staff) =====
revoke execute on function public.current_staff_name() from public, anon;
revoke execute on function public.staff_set_status(text, text) from public, anon;
revoke execute on function public.staff_cancel_order(text, text) from public, anon;
revoke execute on function public.staff_complete_order(text, text) from public, anon;
revoke execute on function public.staff_set_final_price(text, numeric, text) from public, anon;
revoke execute on function public.staff_set_remarks(text, text) from public, anon;
revoke execute on function public.staff_move_stock(bigint, text, int, text) from public, anon;
revoke execute on function public.staff_add_item(text, text, int, int) from public, anon;
grant execute on function public.current_staff_name() to authenticated;
grant execute on function public.staff_set_status(text, text) to authenticated;
grant execute on function public.staff_cancel_order(text, text) to authenticated;
grant execute on function public.staff_complete_order(text, text) to authenticated;
grant execute on function public.staff_set_final_price(text, numeric, text) to authenticated;
grant execute on function public.staff_set_remarks(text, text) to authenticated;
grant execute on function public.staff_move_stock(bigint, text, int, text) to authenticated;
grant execute on function public.staff_add_item(text, text, int, int) to authenticated;
