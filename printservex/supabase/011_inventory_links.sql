-- 011: Inventory linked to printing. Run once in Supabase → SQL Editor, after 010.
-- - An inventory item can be linked to a paper (paper size + paper type) or a lamination film size.
-- - When staff start printing an order (Pending → Processing), the paper and lamination film it needs
--   are checked and taken out of stock in one step. If something is short, the order can't start.
-- - Items can be edited by staff and deleted by the admin.
-- - Track order: too many wrong tries for one reference number are refused for an hour.

-- ===== 1. Links from an inventory item to what it is used for =====
alter table public.inventory_items
  add column if not exists paper_size_id uuid references public.paper_sizes(id),
  add column if not exists paper_type_id uuid references public.paper_types(id),
  add column if not exists lamination_size text check (lamination_size in ('id','short','a4','legal'));

alter table public.inventory_items drop constraint if exists inventory_paper_link;
alter table public.inventory_items add constraint inventory_paper_link
  check ((paper_size_id is null) = (paper_type_id is null));            -- a paper needs both size and type
alter table public.inventory_items drop constraint if exists inventory_one_link;
alter table public.inventory_items add constraint inventory_one_link
  check (paper_size_id is null or lamination_size is null);             -- paper OR lamination film, not both

-- Only one item per paper and per lamination size, so the stock check always knows which one to use
create unique index if not exists inventory_items_paper_unique
  on public.inventory_items (paper_size_id, paper_type_id) where paper_size_id is not null;
create unique index if not exists inventory_items_lamination_unique
  on public.inventory_items (lamination_size) where lamination_size is not null;

-- Set when printing starts and the stock was taken, so it is never taken twice
alter table public.orders add column if not exists stock_deducted_at timestamptz;

-- ===== 2. What one order needs from inventory =====
-- Business rules (the same formula is in lib/inventory-needs.ts, so staff see what is checked here):
-- - Paper (Document lines): sheets = pages ÷ 2 if double-sided (rounded up) × copies.
-- - Lamination film: documents use the same number of sheets; Photo & ID lines use the quantity.
-- - Needs with no linked inventory item are "not tracked" and don't block printing.
create or replace function public.order_material_needs(p_order_id bigint)
returns table (item_id bigint, need int)
language sql stable security definer set search_path = '' as $$
  with lines as (
    select i.kind, i.pages, i.copies, i.quantity, i.lamination, i.details,
           case when i.kind = 'document' and i.pages is not null and i.copies is not null
                then (ceil(i.pages::numeric / case when i.details->>'sides' = 'double' then 2 else 1 end) * i.copies)::int
           end as sheets
    from public.order_items i
    where i.order_id = p_order_id
  ),
  needs as (
    select inv.id as item_id, l.sheets as need
    from lines l
    join public.inventory_items inv
      on inv.paper_size_id::text = l.details->>'sizeId' and inv.paper_type_id::text = l.details->>'typeId'
    where l.kind = 'document' and l.sheets is not null
    union all
    select inv.id, case when l.kind = 'document' then l.sheets else coalesce(l.quantity, 1) end
    from lines l
    join public.inventory_items inv on inv.lamination_size = l.details->>'laminationSize'
    where l.lamination
  )
  select n.item_id, sum(n.need)::int from needs n where n.need > 0 group by n.item_id;
$$;

-- ===== 3. Start printing takes the stock (replaces the 008 version; the status rules are the same) =====
create or replace function public.staff_set_status(p_ref text, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_staff_name();
  v_order public.orders;
  v_need record;
  v_short text[] := '{}';
  v_left int;
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

  -- Business rule: printing can only start when the paper and lamination film it needs are in stock
  if p_status = 'processing' and v_order.stock_deducted_at is null then
    -- Lock the items (in id order, so two staff starting orders at once can't block each other)
    for v_need in
      select n.item_id, n.need, inv.name, inv.unit, inv.qty
      from public.order_material_needs(v_order.id) n
      join public.inventory_items inv on inv.id = n.item_id
      order by n.item_id
      for update of inv
    loop
      if v_need.qty < v_need.need then
        v_short := v_short || (v_need.name || ' needs ' || v_need.need || ' ' || v_need.unit || ', has ' || v_need.qty);
      end if;
    end loop;
    if array_length(v_short, 1) > 0 then
      raise exception 'Not enough stock to start printing: %. Stock in first, or cancel the order.', array_to_string(v_short, '; ');
    end if;

    for v_need in select n.item_id, n.need from public.order_material_needs(v_order.id) n order by n.item_id loop
      update public.inventory_items set qty = qty - v_need.need where id = v_need.item_id returning qty into v_left;
      insert into public.inventory_moves (item_id, type, change, balance, note, actor_id, actor_label)
      values (v_need.item_id, 'out', -v_need.need, v_left, 'Used for ' || p_ref, auth.uid(), v_name);
    end loop;
    update public.orders set stock_deducted_at = now() where id = v_order.id;
  end if;

  update public.orders set status = p_status where id = v_order.id;
  insert into public.order_status_history (order_id, status, actor_id, actor_label)
  values (v_order.id, p_status, auth.uid(), v_name);
  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name, 'Status changed', p_ref || ' · ' ||
          case p_status when 'processing' then 'Pending → Processing' else 'Processing → Ready for Pickup' end);
end $$;

-- ===== 4. Add, edit and delete inventory items =====
-- Checks that a link is valid and not used by another item (nicer messages than the unique index)
create or replace function public.check_inventory_link(p_id bigint, p_size uuid, p_type uuid, p_lamination text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if (p_size is null) <> (p_type is null) then raise exception 'Choose both the paper size and the paper type'; end if;
  if p_size is not null and p_lamination is not null then raise exception 'An item is either a paper or a lamination film'; end if;
  if p_lamination is not null and p_lamination not in ('id','short','a4','legal') then raise exception 'Choose a lamination size'; end if;
  if p_size is not null and not exists (select 1 from public.paper_sizes where id = p_size) then raise exception 'Paper size not found'; end if;
  if p_type is not null and not exists (select 1 from public.paper_types where id = p_type) then raise exception 'Paper type not found'; end if;
  if p_size is not null and exists (select 1 from public.inventory_items
      where paper_size_id = p_size and paper_type_id = p_type and id is distinct from p_id) then
    raise exception 'Another item is already linked to that paper';
  end if;
  if p_lamination is not null and exists (select 1 from public.inventory_items
      where lamination_size = p_lamination and id is distinct from p_id) then
    raise exception 'Another item is already linked to that lamination film';
  end if;
end $$;

drop function if exists public.staff_add_item(text, text, int, int);
create or replace function public.staff_add_item(
  p_name text, p_unit text, p_qty int, p_reorder int,
  p_paper_size_id uuid default null, p_paper_type_id uuid default null, p_lamination_size text default null
) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_staff_name();
  v_id bigint;
begin
  if length(trim(coalesce(p_name, ''))) < 2 or length(trim(coalesce(p_unit, ''))) < 1 then raise exception 'Enter the item name and unit'; end if;
  if p_qty is null or p_qty < 0 or p_qty > 1000000 or p_reorder is null or p_reorder < 0 or p_reorder > 1000000 then
    raise exception 'Quantities must be 0 or more';
  end if;
  if exists (select 1 from public.inventory_items where lower(name) = lower(trim(p_name))) then
    raise exception 'There is already an item called %', trim(p_name);
  end if;
  perform public.check_inventory_link(null, p_paper_size_id, p_paper_type_id, p_lamination_size);

  insert into public.inventory_items (name, unit, qty, reorder_level, paper_size_id, paper_type_id, lamination_size)
  values (trim(p_name), trim(p_unit), p_qty, p_reorder, p_paper_size_id, p_paper_type_id, p_lamination_size)
  returning id into v_id;
  if p_qty > 0 then
    insert into public.inventory_moves (item_id, type, change, balance, note, actor_id, actor_label)
    values (v_id, 'in', p_qty, p_qty, 'Opening stock', auth.uid(), v_name);
  end if;
  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name, 'Item added', trim(p_name) || ' · ' || p_qty || ' ' || trim(p_unit));
  return v_id;
end $$;

-- Name, unit, reorder level and link. The quantity only changes with Stock in / Stock out (so it is logged).
create or replace function public.staff_update_item(
  p_id bigint, p_name text, p_unit text, p_reorder int,
  p_paper_size_id uuid, p_paper_type_id uuid, p_lamination_size text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_staff_name();
begin
  if length(trim(coalesce(p_name, ''))) < 2 or length(trim(coalesce(p_unit, ''))) < 1 then raise exception 'Enter the item name and unit'; end if;
  if p_reorder is null or p_reorder < 0 or p_reorder > 1000000 then raise exception 'Quantities must be 0 or more'; end if;
  if not exists (select 1 from public.inventory_items where id = p_id) then raise exception 'Item not found'; end if;
  if exists (select 1 from public.inventory_items where lower(name) = lower(trim(p_name)) and id <> p_id) then
    raise exception 'There is already an item called %', trim(p_name);
  end if;
  perform public.check_inventory_link(p_id, p_paper_size_id, p_paper_type_id, p_lamination_size);

  update public.inventory_items
     set name = trim(p_name), unit = trim(p_unit), reorder_level = p_reorder,
         paper_size_id = p_paper_size_id, paper_type_id = p_paper_type_id, lamination_size = p_lamination_size
   where id = p_id;
  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name, 'Item edited', trim(p_name));
end $$;

-- Admin only. Deletes the item and its movement log (mainly to remove demo items).
create or replace function public.admin_delete_item(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_admin_name();
  v_item text;
begin
  select name into v_item from public.inventory_items where id = p_id for update;
  if v_item is null then raise exception 'Item not found'; end if;
  delete from public.inventory_moves where item_id = p_id;
  delete from public.inventory_items where id = p_id;
  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name, 'Item deleted', v_item);
end $$;

-- ===== 5. Track order: count wrong tries (only the server writes here, with the service role) =====
create table if not exists public.track_attempts (
  id bigint generated always as identity primary key,
  ref text not null,
  at timestamptz not null default now()
);
create index if not exists track_attempts_ref_at on public.track_attempts (ref, at desc);
alter table public.track_attempts enable row level security;   -- no policies: the public API can't read or write it
revoke all on public.track_attempts from anon, authenticated;

-- ===== 6. Who may run these =====
revoke execute on function public.order_material_needs(bigint) from public, anon, authenticated;
revoke execute on function public.check_inventory_link(bigint, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.staff_set_status(text, text) from public, anon;
revoke execute on function public.staff_add_item(text, text, int, int, uuid, uuid, text) from public, anon;
revoke execute on function public.staff_update_item(bigint, text, text, int, uuid, uuid, text) from public, anon;
revoke execute on function public.admin_delete_item(bigint) from public, anon;
grant execute on function public.staff_set_status(text, text) to authenticated;
grant execute on function public.staff_add_item(text, text, int, int, uuid, uuid, text) to authenticated;
grant execute on function public.staff_update_item(bigint, text, text, int, uuid, uuid, text) to authenticated;
grant execute on function public.admin_delete_item(bigint) to authenticated;
