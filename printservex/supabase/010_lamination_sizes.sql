-- 010: Lamination prices by size (ID, Short, A4, Legal). Run once in Supabase → SQL Editor, after 009.
-- The admin changes these prices in Pricing & options → Add-ons → Lamination.
-- Lamination itself stays one add-on in add_ons (its name and whether it is offered).
-- Until this file is run, the app uses ID ₱15, Short ₱20, A4 ₱30, Legal ₱40.

-- ===== 1. One price per lamination size =====
create table if not exists public.lamination_sizes (
  key text primary key check (key in ('id','short','a4','legal')),  -- the four sizes the app knows
  price numeric(10,2) not null check (price >= 0 and price <= 10000),
  sort smallint not null
);
insert into public.lamination_sizes (key, price, sort) values
  ('id', 15, 1), ('short', 20, 2), ('a4', 30, 3), ('legal', 40, 4)
on conflict (key) do nothing;

-- add_ons keeps the "from" price of lamination (the cheapest size), so both tables agree
update public.add_ons set price = (select min(price) from public.lamination_sizes), unit = 'per sheet' where key = 'lamination';

-- ===== 2. Everyone reads the prices; only the admin function changes them =====
alter table public.lamination_sizes enable row level security;
drop policy if exists "public read lamination sizes" on public.lamination_sizes;
create policy "public read lamination sizes" on public.lamination_sizes for select to anon, authenticated using (true);
grant select on public.lamination_sizes to anon, authenticated;

-- ===== 3. Admin saves all four prices at once =====
-- p_prices = {"id": 15, "short": 20, "a4": 30, "legal": 40}
create or replace function public.admin_save_lamination_sizes(p_prices jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_admin_name();
  v_key text;
  v_price numeric;
  v_old numeric;
  v_changes text[] := '{}';
begin
  foreach v_key in array array['id','short','a4','legal'] loop
    if jsonb_typeof(p_prices -> v_key) is distinct from 'number' then raise exception 'Enter a price for every lamination size'; end if;
    v_price := round((p_prices ->> v_key)::numeric, 2);
    if v_price < 0 or v_price > 10000 then raise exception 'Prices must be ₱0 to ₱10,000'; end if;

    select price into v_old from public.lamination_sizes where key = v_key;
    if v_old is null then raise exception 'Run supabase/010_lamination_sizes.sql first'; end if;
    if v_old <> v_price then
      update public.lamination_sizes set price = v_price where key = v_key;
      v_changes := v_changes || (case v_key when 'id' then 'ID' when 'short' then 'Short' when 'a4' then 'A4' else 'Legal' end
                   || ' ₱' || to_char(v_old, 'FM999,990.00') || ' → ₱' || to_char(v_price, 'FM999,990.00'));
    end if;
  end loop;

  update public.add_ons set price = (select min(price) from public.lamination_sizes) where key = 'lamination';

  if array_length(v_changes, 1) > 0 then
    insert into public.audit_log (actor_id, actor_label, action, details)
    values (auth.uid(), v_name, 'Option edited', 'Lamination · ' || array_to_string(v_changes, ', '));
  end if;
end $$;

revoke execute on function public.admin_save_lamination_sizes(jsonb) from public, anon;
grant execute on function public.admin_save_lamination_sizes(jsonb) to authenticated;
