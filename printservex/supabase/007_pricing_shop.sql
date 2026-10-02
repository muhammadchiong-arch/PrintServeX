-- PrintServeX step 8: saving Pricing & options (S9) and Settings → Shop info (S12).
-- Run once in Supabase → SQL Editor → New query → paste ALL of this → Run.
-- Run 006_staff_work.sql first.
--
-- Only admins can run these. Each change and its audit log line are saved together.
-- Business rule: options are archived (is_active = false), never deleted, so old orders
-- keep their details. Orders copy their prices when placed, so a price change never
-- changes an existing order.

-- ===== 0. Everyone may read active add-ons and the shop info =====
-- (From 002_rls.sql. Made again here in case that part didn't run: without it the order
-- form shows no add-ons and the customer pages can't read the shop details.)
drop policy if exists "public read active add-ons" on public.add_ons;
drop policy if exists "staff read all add-ons" on public.add_ons;
drop policy if exists "public read shop info" on public.shop_settings;
create policy "public read active add-ons" on public.add_ons for select to anon, authenticated using (is_active);
create policy "staff read all add-ons" on public.add_ons for select to authenticated using (public.is_staff());
create policy "public read shop info" on public.shop_settings for select to anon, authenticated using (true);

-- ===== 1. Paper sizes can show their dimensions, e.g. "8.5 × 11 in" =====
alter table public.paper_sizes add column if not exists dimensions text;

-- ===== 2. "Is the caller an active admin?" — their name, or an error =====
create or replace function public.current_admin_name() returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v_name text;
begin
  select full_name into v_name from public.staff_profiles where id = auth.uid() and is_active and role = 'admin';
  if v_name is null then
    raise exception 'Only the shop owner (admin) can do this' using errcode = '42501';
  end if;
  return v_name;
end $$;

-- ===== 3. Price per page for one paper type =====
-- p_cells: [{"size_id": "...", "color": true, "price": 9.5}, ...]. "price": null = not offered.
create or replace function public.admin_save_prices(p_type_id uuid, p_cells jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_admin_name();
  v_type text;
  v_cell record;
  v_mode text;
  v_rule uuid;
  v_count int := 0;
begin
  select name into v_type from public.paper_types where id = p_type_id;
  if v_type is null then raise exception 'Paper type not found'; end if;

  for v_cell in select * from jsonb_to_recordset(p_cells) as x(size_id uuid, color boolean, price numeric) loop
    if v_cell.size_id is null or v_cell.color is null then raise exception 'Something is missing in the prices'; end if;
    if v_cell.price is not null and (v_cell.price < 0 or v_cell.price > 10000) then raise exception 'Prices must be ₱0 to ₱10,000'; end if;
    v_mode := case when v_cell.color then 'color' else 'bw' end;

    -- The current price for this size + paper + color (newest active one)
    select id into v_rule from public.price_rules
     where size_id = v_cell.size_id and paper_type_id = p_type_id and color_mode = v_mode and is_active
     order by created_at desc limit 1;

    if v_cell.price is null then
      update public.price_rules set is_active = false
       where size_id = v_cell.size_id and paper_type_id = p_type_id and color_mode = v_mode and is_active;
    elsif v_rule is not null then
      update public.price_rules set price_per_page = round(v_cell.price, 2) where id = v_rule;
    else
      -- Offered again: switch the old rule back on instead of adding a second one
      select id into v_rule from public.price_rules
       where size_id = v_cell.size_id and paper_type_id = p_type_id and color_mode = v_mode
       order by created_at desc limit 1;
      if v_rule is not null then
        update public.price_rules set price_per_page = round(v_cell.price, 2), is_active = true where id = v_rule;
      else
        insert into public.price_rules (size_id, paper_type_id, color_mode, price_per_page, is_active)
        values (v_cell.size_id, p_type_id, v_mode, round(v_cell.price, 2), true);
      end if;
    end if;
    v_count := v_count + 1;
  end loop;

  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name, 'Price changed', v_type || ' · ' || v_count || case when v_count = 1 then ' price' else ' prices' end || ' updated');
end $$;

-- ===== 4. Paper sizes and paper types: add, rename, archive / restore =====
-- p_kind: 'size' or 'type'. p_id null = add a new one.
create or replace function public.admin_save_option(p_kind text, p_id uuid, p_name text, p_dimensions text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_admin_name();
  v_option text := trim(coalesce(p_name, ''));
  v_dims text := nullif(trim(coalesce(p_dimensions, '')), '');
  v_id uuid;
begin
  if length(v_option) < 1 or length(v_option) > 60 then raise exception 'Enter a name (up to 60 characters)'; end if;

  if p_kind = 'size' then
    if exists (select 1 from public.paper_sizes where lower(name) = lower(v_option) and id is distinct from p_id) then
      raise exception 'There is already a size called %', v_option;
    end if;
    if p_id is null then
      insert into public.paper_sizes (name, dimensions, is_active) values (v_option, v_dims, true) returning id into v_id;
    else
      update public.paper_sizes set name = v_option, dimensions = v_dims where id = p_id returning id into v_id;
    end if;
  elsif p_kind = 'type' then
    if exists (select 1 from public.paper_types where lower(name) = lower(v_option) and id is distinct from p_id) then
      raise exception 'There is already a paper type called %', v_option;
    end if;
    if p_id is null then
      insert into public.paper_types (name, is_active) values (v_option, true) returning id into v_id;
    else
      update public.paper_types set name = v_option where id = p_id returning id into v_id;
    end if;
  else
    raise exception 'Unknown option';
  end if;
  if v_id is null then raise exception 'Option not found'; end if;

  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name, case when p_id is null then 'Option added' else 'Option edited' end, v_option);
  return v_id;
end $$;

create or replace function public.admin_set_option_active(p_kind text, p_id uuid, p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_admin_name();
  v_option text;
begin
  if p_kind = 'size' then
    update public.paper_sizes set is_active = p_active where id = p_id returning name into v_option;
  elsif p_kind = 'type' then
    update public.paper_types set is_active = p_active where id = p_id returning name into v_option;
  end if;
  if v_option is null then raise exception 'Option not found'; end if;

  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name, case when p_active then 'Option restored' else 'Option archived' end, v_option);
end $$;

-- ===== 5. Add-ons: only binding and lamination exist (the price math knows only these) =====
create or replace function public.admin_save_add_on(p_key text, p_label text, p_price numeric, p_unit text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_admin_name();
  v_old numeric;
begin
  if length(trim(coalesce(p_label, ''))) < 1 or length(trim(coalesce(p_unit, ''))) < 1 then raise exception 'Enter the name and unit'; end if;
  if p_price is null or p_price < 0 or p_price > 10000 then raise exception 'Prices must be ₱0 to ₱10,000'; end if;

  select price into v_old from public.add_ons where key = p_key;
  if v_old is null then raise exception 'Add-on not found'; end if;
  update public.add_ons set label = trim(p_label), price = round(p_price, 2), unit = trim(p_unit) where key = p_key;

  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name, 'Option edited', trim(p_label) || ' · ₱' || to_char(v_old, 'FM999,990.00') || ' → ₱' || to_char(round(p_price, 2), 'FM999,990.00'));
end $$;

create or replace function public.admin_set_add_on_active(p_key text, p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_admin_name();
  v_label text;
begin
  update public.add_ons set is_active = p_active where key = p_key returning label into v_label;
  if v_label is null then raise exception 'Add-on not found'; end if;
  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name, case when p_active then 'Option restored' else 'Option archived' end, v_label);
end $$;

-- ===== 6. Shop info (one row) =====
create or replace function public.admin_save_shop(
  p_name text, p_area text, p_address text, p_phone text, p_email text,
  p_hours text, p_hours_long text, p_usual_turnaround text, p_pickup_note text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_admin_name();
begin
  if length(trim(coalesce(p_name, ''))) < 2 or length(trim(coalesce(p_address, ''))) < 3
     or length(trim(coalesce(p_phone, ''))) < 7 or length(trim(coalesce(p_hours, ''))) < 3 then
    raise exception 'Fill in the shop name, address, contact number and opening hours';
  end if;

  update public.shop_settings set
    name = trim(p_name),
    area = trim(coalesce(p_area, '')),
    address = trim(p_address),
    phone = trim(p_phone),
    email = nullif(trim(coalesce(p_email, '')), ''),
    hours = trim(p_hours),
    hours_long = coalesce(nullif(trim(coalesce(p_hours_long, '')), ''), trim(p_hours)),
    usual_turnaround = trim(coalesce(p_usual_turnaround, '')),
    pickup_note = trim(coalesce(p_pickup_note, '')),
    updated_at = now()
  where id = 1;
  if not found then raise exception 'Shop info row is missing. Run 001_tables.sql.'; end if;

  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name, 'Shop info changed', trim(p_name));
end $$;

-- ===== 7. Who may run these: signed-in people (each function checks for an admin) =====
revoke execute on function public.current_admin_name() from public, anon;
revoke execute on function public.admin_save_prices(uuid, jsonb) from public, anon;
revoke execute on function public.admin_save_option(text, uuid, text, text) from public, anon;
revoke execute on function public.admin_set_option_active(text, uuid, boolean) from public, anon;
revoke execute on function public.admin_save_add_on(text, text, numeric, text) from public, anon;
revoke execute on function public.admin_set_add_on_active(text, boolean) from public, anon;
revoke execute on function public.admin_save_shop(text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.current_admin_name() to authenticated;
grant execute on function public.admin_save_prices(uuid, jsonb) to authenticated;
grant execute on function public.admin_save_option(text, uuid, text, text) to authenticated;
grant execute on function public.admin_set_option_active(text, uuid, boolean) to authenticated;
grant execute on function public.admin_save_add_on(text, text, numeric, text) to authenticated;
grant execute on function public.admin_set_add_on_active(text, boolean) to authenticated;
grant execute on function public.admin_save_shop(text, text, text, text, text, text, text, text, text) to authenticated;
