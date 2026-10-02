-- PrintServeX step 3: saving orders + the private bucket for uploaded files.
-- Run once in Supabase → SQL Editor → New query → paste ALL of this → Run.
-- Run 002_rls.sql first.

-- ===== 1. Reference numbers: PSX-YYYYMMDD-0001, numbered per day (Manila time) =====
-- "insert ... on conflict do update" adds 1 to today's counter in ONE step, so two orders
-- arriving at the same moment can never get the same number.
create or replace function public.next_order_ref() returns text
language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Manila')::date;
  n int;
begin
  insert into public.order_counters as c (day, last_number) values (today, 1)
  on conflict (day) do update set last_number = c.last_number + 1
  returning last_number into n;
  if n > 9999 then
    raise exception 'Daily order limit reached';
  end if;
  return 'PSX-' || to_char(today, 'YYYYMMDD') || '-' || lpad(n::text, 4, '0');
end $$;

-- ===== 2. Create an order with its files and first history line, all or nothing =====
-- Our server calls this AFTER it has checked the details and calculated the price itself.
-- If any part fails, nothing is saved (a function runs as one transaction).
create or replace function public.create_order(
  p_source text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_estimated_total numeric,
  p_items jsonb,
  p_created_by uuid,
  p_actor_label text
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_ref text;
  v_id bigint;
begin
  v_ref := public.next_order_ref();

  insert into public.orders (ref, source, customer_name, customer_phone, customer_email, estimated_total, created_by)
  values (v_ref, p_source, p_customer_name, p_customer_phone, nullif(p_customer_email, ''), p_estimated_total, p_created_by)
  returning id into v_id;

  insert into public.order_items (order_id, position, file_name, file_size_bytes, storage_path, size_name, paper_name,
                                  color, pages, copies, binding, lamination, rate, binding_price, lamination_price, line_total)
  select v_id, x.position, x.file_name, x.file_size_bytes, x.storage_path, x.size_name, x.paper_name,
         x.color, x.pages, x.copies, x.binding, x.lamination, x.rate, x.binding_price, x.lamination_price, x.line_total
  from jsonb_to_recordset(p_items) as x(
    position smallint, file_name text, file_size_bytes bigint, storage_path text, size_name text, paper_name text,
    color boolean, pages int, copies int, binding boolean, lamination boolean,
    rate numeric, binding_price numeric, lamination_price numeric, line_total numeric);

  insert into public.order_status_history (order_id, status, actor_id, actor_label, note)
  values (v_id, 'pending', p_created_by, p_actor_label, case when p_source = 'walk-in' then 'Walk-in' end);

  return v_ref;
end $$;

-- Only our server (service_role) may run these two. Supabase lets everyone run new
-- functions by default, so take that away first.
revoke execute on function public.next_order_ref() from public, anon, authenticated;
revoke execute on function public.create_order(text, text, text, text, numeric, jsonb, uuid, text) from public, anon, authenticated;
grant execute on function public.next_order_ref() to service_role;
grant execute on function public.create_order(text, text, text, text, numeric, jsonb, uuid, text) to service_role;

-- ===== 3. Private bucket for the customers' files =====
-- Not public: nobody can open a file with a plain link. The bucket itself also refuses
-- files over 25 MB and file types other than PDF, DOCX, JPG and PNG.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('order-files', 'order-files', false, 26214400, array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
]);

-- Customers get NO storage rule. They upload only through a one-time upload link that our
-- server creates for one exact file path. Staff may read the files (downloads, step 7).
create policy "staff read order files"
  on storage.objects for select to authenticated
  using (bucket_id = 'order-files' and public.is_staff());
