-- 012 (OPTIONAL): DEMO inventory for testing and the school demo. Run after 011.
-- These are SAMPLE numbers, not the shop's real stock. Edit or delete them in Staff → Inventory
-- (deleting needs the Admin). Running this file twice adds nothing: items that exist are skipped.
--
-- Bond paper items are linked to your paper sizes (Short, A4, Long, Legal: whichever exist) and to the
-- first paper type whose name starts with "Bond". Lamination films are linked to the 4 lamination sizes.
-- Photo Paper and Sticker Paper are added without a link (link them in Inventory → Edit if needed).

do $$
declare
  v_bond uuid := (select id from public.paper_types where name ilike 'bond%' order by created_at limit 1);
  v_size record;
  v_item record;
  v_id bigint;
begin
  -- Bond paper, one item per paper size the shop has
  for v_size in select id, name from public.paper_sizes where name in ('Short', 'A4', 'Long', 'Legal') order by created_at loop
    insert into public.inventory_items (name, unit, qty, reorder_level, paper_size_id, paper_type_id)
    select 'Bond Paper ' || v_size.name, 'sheet', case v_size.name when 'A4' then 500 when 'Short' then 300 else 250 end, 50,
           case when v_bond is not null then v_size.id end, v_bond
    where not exists (select 1 from public.inventory_items where name = 'Bond Paper ' || v_size.name)
      and not exists (select 1 from public.inventory_items where paper_size_id = v_size.id and paper_type_id = v_bond)
    returning id into v_id;
    if v_id is not null then
      insert into public.inventory_moves (item_id, type, change, balance, note, actor_label)
      select v_id, 'in', qty, qty, 'Demo opening stock', 'Demo data' from public.inventory_items where id = v_id;
      v_id := null;
    end if;
  end loop;

  -- Other paper and lamination film
  for v_item in
    select * from (values
      ('Photo Paper', 'sheet', 100, 20, null),
      ('Sticker Paper', 'sheet', 50, 10, null),
      ('Lamination Film ID', 'piece', 100, 20, 'id'),
      ('Lamination Film Short', 'piece', 100, 20, 'short'),
      ('Lamination Film A4', 'piece', 100, 20, 'a4'),
      ('Lamination Film Legal', 'piece', 100, 20, 'legal')
    ) as t(name, unit, qty, reorder, lam)
  loop
    insert into public.inventory_items (name, unit, qty, reorder_level, lamination_size)
    select v_item.name, v_item.unit, v_item.qty, v_item.reorder, v_item.lam
    where not exists (select 1 from public.inventory_items where name = v_item.name)
      and (v_item.lam is null or not exists (select 1 from public.inventory_items where lamination_size = v_item.lam))
    returning id into v_id;
    if v_id is not null then
      insert into public.inventory_moves (item_id, type, change, balance, note, actor_label)
      values (v_id, 'in', v_item.qty, v_item.qty, 'Demo opening stock', 'Demo data');
      v_id := null;
    end if;
  end loop;
end $$;
