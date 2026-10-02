-- PrintServeX fix: an order can't be moved, cancelled or completed twice.
-- Run in Supabase → SQL Editor → New query → paste ALL of this → Run. Safe to run again.
--
-- Why: the status rule from 002_rls.sql only checks when the status CHANGES, so
-- "completed → completed" slipped through (a double-click, two staff at once, or a page
-- open for a while) and wrote a second history line and audit log entry.
-- Each function now locks the order ("for update"), checks its CURRENT status and stops
-- with a clear message if the step was already done.

create or replace function public.staff_set_status(p_ref text, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_staff_name();
  v_order public.orders;
begin
  if p_status not in ('processing', 'ready') then
    raise exception 'Use cancel or complete for this status';
  end if;
  select * into v_order from public.orders where ref = p_ref for update;
  if not found then raise exception 'Order % not found', p_ref; end if;
  if v_order.status = p_status then
    raise exception 'Order % is already %', p_ref, case p_status when 'processing' then 'Processing' else 'Ready for Pickup' end;
  end if;
  -- Business rule: Pending → Processing → Ready for Pickup, one step at a time
  if (p_status = 'processing' and v_order.status <> 'pending') or (p_status = 'ready' and v_order.status <> 'processing') then
    raise exception 'Order % can''t go to that step from its current status. Refresh the page.', p_ref;
  end if;

  update public.orders set status = p_status where id = v_order.id;
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
  v_order public.orders;
begin
  if length(v_reason) < 3 then raise exception 'Give a reason for cancelling'; end if;
  select * into v_order from public.orders where ref = p_ref for update;
  if not found then raise exception 'Order % not found', p_ref; end if;
  if v_order.status = 'cancelled' then raise exception 'Order % is already cancelled', p_ref; end if;
  if v_order.status not in ('pending', 'processing') then
    raise exception 'Order % can''t be cancelled once it is ready or completed', p_ref;
  end if;

  update public.orders set status = 'cancelled', cancel_reason = v_reason where id = v_order.id;
  insert into public.order_status_history (order_id, status, actor_id, actor_label, note)
  values (v_order.id, 'cancelled', auth.uid(), v_name, v_reason);
  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name, 'Order cancelled', p_ref || ' · ' || v_reason);
end $$;

-- Business rule: completed only from Ready for Pickup, when payment is recorded.
-- The amount comes from the order itself (final price, or else the estimate).
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
  if v_order.status = 'completed' then raise exception 'Payment for % is already recorded', p_ref; end if;
  if v_order.status <> 'ready' then raise exception 'Order % must be Ready for Pickup before payment', p_ref; end if;

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

-- "create or replace" keeps the permissions from 006, but set them again to be sure
revoke execute on function public.staff_set_status(text, text) from public, anon;
revoke execute on function public.staff_cancel_order(text, text) from public, anon;
revoke execute on function public.staff_complete_order(text, text) from public, anon;
grant execute on function public.staff_set_status(text, text) to authenticated;
grant execute on function public.staff_cancel_order(text, text) to authenticated;
grant execute on function public.staff_complete_order(text, text) to authenticated;
