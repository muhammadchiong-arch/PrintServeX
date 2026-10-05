-- 013: Photo Printing sizes (Wallet, 3R, 4R, 5R, 6R, 8R, 8R+). Run once in Supabase → SQL Editor, after 011/012.
-- - Photo Printing asks the customer for a photo size. Each size has its own price, set by the admin in
--   Pricing & options → Services. Empty price = "Price to be confirmed" (no made-up prices).
-- - A photo size is NOT a paper size (A4, Short…): it's the size of the printed photo.
-- - An inventory item can be linked to a photo size (e.g. "Photo Paper 4R"). Starting the print takes
--   1 sheet per print, and is blocked when there isn't enough (same rule as 011).
-- - ID photos (1×1, 2×2, passport, ID layout) are not changed.
-- To add a size later (e.g. 10R): insert a row below. The website reads the list; no code change needed.

-- ===== 1. Photo sizes and their prices =====
create table if not exists public.photo_print_sizes (
  key text primary key check (key ~ '^[a-z0-9-]{1,20}$'),
  label text not null,                                   -- e.g. "4R"
  width_in numeric(5,2) not null check (width_in > 0),
  height_in numeric(5,2) not null check (height_in > 0),
  price numeric(10,2) check (price is null or (price >= 0 and price <= 10000)),  -- ₱ per print, null = to be confirmed
  sort smallint not null,
  is_active boolean not null default true
);
insert into public.photo_print_sizes (key, label, width_in, height_in, price, sort) values
  ('wallet', 'Wallet', 2, 3, null, 1),
  ('3r', '3R', 3.5, 5, null, 2),
  ('4r', '4R', 4, 6, null, 3),
  ('5r', '5R', 5, 7, null, 4),
  ('6r', '6R', 6, 8, null, 5),
  ('8r', '8R', 8, 10, null, 6),
  ('8r-plus', '8R+', 8, 12, null, 7)
on conflict (key) do nothing;

alter table public.photo_print_sizes enable row level security;
drop policy if exists "public read active photo sizes" on public.photo_print_sizes;
create policy "public read active photo sizes" on public.photo_print_sizes for select to anon, authenticated using (is_active);
drop policy if exists "staff read all photo sizes" on public.photo_print_sizes;
create policy "staff read all photo sizes" on public.photo_print_sizes for select to authenticated using (public.is_staff());
grant select on public.photo_print_sizes to anon, authenticated;

-- Photo Printing is the service that asks for a size (a flag in its existing "defaults")
update public.services set defaults = coalesce(defaults, '{}'::jsonb) || '{"printSizes": true}'::jsonb where key = 'photo-print';

-- Admin only: the price of one size (null = to be confirmed) and whether customers can choose it
create or replace function public.admin_save_photo_size(p_key text, p_price numeric, p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_admin_name();
  v_size public.photo_print_sizes;
  v_new numeric := round(p_price, 2);
  v_money text;
begin
  if p_active is null then raise exception 'Choose if the size is offered'; end if;
  if v_new is not null and (v_new < 0 or v_new > 10000) then raise exception 'Prices must be ₱0 to ₱10,000'; end if;
  select * into v_size from public.photo_print_sizes where key = p_key for update;
  if not found then raise exception 'Photo size not found'; end if;

  update public.photo_print_sizes set price = v_new, is_active = p_active where key = p_key;
  v_money := coalesce('₱' || to_char(v_size.price, 'FM999,990.00'), 'to confirm') || ' → ' || coalesce('₱' || to_char(v_new, 'FM999,990.00'), 'to confirm');
  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name,
          case when v_size.is_active <> p_active then case when p_active then 'Option restored' else 'Option archived' end else 'Option edited' end,
          'Photo Printing ' || v_size.label || ' · ' || v_money);
end $$;

-- ===== 2. Inventory: an item can be photo paper for one photo size =====
alter table public.inventory_items add column if not exists photo_size text references public.photo_print_sizes(key);
alter table public.inventory_items drop constraint if exists inventory_one_link;
alter table public.inventory_items add constraint inventory_one_link check (
  (case when paper_size_id is not null then 1 else 0 end) +
  (case when lamination_size is not null then 1 else 0 end) +
  (case when photo_size is not null then 1 else 0 end) <= 1   -- paper OR lamination film OR photo paper
);
create unique index if not exists inventory_items_photo_unique on public.inventory_items (photo_size) where photo_size is not null;

-- What one order needs from inventory (replaces the 011 version; adds photo paper).
-- Same formula as lib/inventory-needs.ts. Photo paper: 1 sheet per print (the quantity).
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
    union all
    select inv.id, coalesce(l.quantity, 1)
    from lines l
    join public.inventory_items inv on inv.photo_size = l.details->>'photoSize'
    where l.kind = 'photo'
  )
  select n.item_id, sum(n.need)::int from needs n where n.need > 0 group by n.item_id;
$$;

-- Link checks (replaces the 011 version; adds photo paper)
drop function if exists public.check_inventory_link(bigint, uuid, uuid, text);
create or replace function public.check_inventory_link(p_id bigint, p_size uuid, p_type uuid, p_lamination text, p_photo text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if (p_size is null) <> (p_type is null) then raise exception 'Choose both the paper size and the paper type'; end if;
  if (case when p_size is not null then 1 else 0 end) + (case when p_lamination is not null then 1 else 0 end)
     + (case when p_photo is not null then 1 else 0 end) > 1 then
    raise exception 'An item is a paper, a lamination film or a photo paper, not more than one';
  end if;
  if p_lamination is not null and p_lamination not in ('id','short','a4','legal') then raise exception 'Choose a lamination size'; end if;
  if p_size is not null and not exists (select 1 from public.paper_sizes where id = p_size) then raise exception 'Paper size not found'; end if;
  if p_type is not null and not exists (select 1 from public.paper_types where id = p_type) then raise exception 'Paper type not found'; end if;
  if p_photo is not null and not exists (select 1 from public.photo_print_sizes where key = p_photo) then raise exception 'Photo size not found'; end if;
  if p_size is not null and exists (select 1 from public.inventory_items
      where paper_size_id = p_size and paper_type_id = p_type and id is distinct from p_id) then
    raise exception 'Another item is already linked to that paper';
  end if;
  if p_lamination is not null and exists (select 1 from public.inventory_items
      where lamination_size = p_lamination and id is distinct from p_id) then
    raise exception 'Another item is already linked to that lamination film';
  end if;
  if p_photo is not null and exists (select 1 from public.inventory_items
      where photo_size = p_photo and id is distinct from p_id) then
    raise exception 'Another item is already linked to that photo size';
  end if;
end $$;

drop function if exists public.staff_add_item(text, text, int, int, uuid, uuid, text);
create or replace function public.staff_add_item(
  p_name text, p_unit text, p_qty int, p_reorder int,
  p_paper_size_id uuid default null, p_paper_type_id uuid default null, p_lamination_size text default null,
  p_photo_size text default null
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
  perform public.check_inventory_link(null, p_paper_size_id, p_paper_type_id, p_lamination_size, p_photo_size);

  insert into public.inventory_items (name, unit, qty, reorder_level, paper_size_id, paper_type_id, lamination_size, photo_size)
  values (trim(p_name), trim(p_unit), p_qty, p_reorder, p_paper_size_id, p_paper_type_id, p_lamination_size, p_photo_size)
  returning id into v_id;
  if p_qty > 0 then
    insert into public.inventory_moves (item_id, type, change, balance, note, actor_id, actor_label)
    values (v_id, 'in', p_qty, p_qty, 'Opening stock', auth.uid(), v_name);
  end if;
  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name, 'Item added', trim(p_name) || ' · ' || p_qty || ' ' || trim(p_unit));
  return v_id;
end $$;

drop function if exists public.staff_update_item(bigint, text, text, int, uuid, uuid, text);
create or replace function public.staff_update_item(
  p_id bigint, p_name text, p_unit text, p_reorder int,
  p_paper_size_id uuid default null, p_paper_type_id uuid default null, p_lamination_size text default null,
  p_photo_size text default null
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
  perform public.check_inventory_link(p_id, p_paper_size_id, p_paper_type_id, p_lamination_size, p_photo_size);

  update public.inventory_items
     set name = trim(p_name), unit = trim(p_unit), reorder_level = p_reorder,
         paper_size_id = p_paper_size_id, paper_type_id = p_paper_type_id, lamination_size = p_lamination_size,
         photo_size = p_photo_size
   where id = p_id;
  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name, 'Item edited', trim(p_name));
end $$;

-- ===== 3. Who may run these =====
revoke execute on function public.order_material_needs(bigint) from public, anon, authenticated;
revoke execute on function public.check_inventory_link(bigint, uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.admin_save_photo_size(text, numeric, boolean) from public, anon;
revoke execute on function public.staff_add_item(text, text, int, int, uuid, uuid, text, text) from public, anon;
revoke execute on function public.staff_update_item(bigint, text, text, int, uuid, uuid, text, text) from public, anon;
grant execute on function public.admin_save_photo_size(text, numeric, boolean) to authenticated;
grant execute on function public.staff_add_item(text, text, int, int, uuid, uuid, text, text) to authenticated;
grant execute on function public.staff_update_item(bigint, text, text, int, uuid, uuid, text, text) to authenticated;
