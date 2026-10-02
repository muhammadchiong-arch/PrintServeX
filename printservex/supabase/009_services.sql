-- PrintServeX step 9: service catalog (categories → services) and orders with several services.
-- Run in Supabase → SQL Editor → New query → paste ALL of this → Run. Safe to run again.
-- Run 008_no_double_actions.sql first.
--
-- Business rules:
-- - Every service starts WITHOUT a price (unit_price null = "Price to be confirmed by staff").
--   The owner sets prices on Pricing & options → Services. We never invent prices.
-- - Document Printing services use the existing per-page prices (price_rules + add_ons).
-- - "kind" decides which options the order form asks for and how the price is worked out.
-- - Order lines COPY the service name and category, so renaming or archiving a service
--   never changes an old order.

-- ===== 1. Categories =====
create table if not exists public.service_categories (
  key text primary key,
  name text not null,
  description text not null default '',
  icon text not null default 'printer',     -- a lucide icon name, picked in the order form
  sort smallint not null default 0,
  is_active boolean not null default true
);

-- ===== 2. Services =====
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,                 -- stable name for the seed below, e.g. 'id-photo-2x2'
  category_key text not null references public.service_categories(key),
  name text not null,
  description text not null default '',
  kind text not null check (kind in ('document','finishing','photo','design','large_format','custom','school_business')),
  unit_price numeric(10,2) check (unit_price >= 0),   -- null = price to be confirmed by staff
  unit_label text not null default 'per piece',       -- shown next to the price, e.g. 'per set'
  file_types text[] not null default '{}',            -- allowed extensions; subset of the bucket's
  file_rule text not null check (file_rule in ('required','optional','none')),
  defaults jsonb not null default '{}',               -- e.g. {"color": true} for Color Printing
  sort smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  -- Only types the order-files bucket accepts (003_orders.sql)
  constraint service_file_types check (file_types <@ array['pdf','docx','jpg','jpeg','png']),
  -- Document Printing is priced per page, so it has no unit price
  constraint document_no_unit_price check (kind <> 'document' or unit_price is null)
);
create index if not exists services_category on public.services (category_key, sort);

-- ===== 3. The catalog (no prices) =====
insert into public.service_categories (key, name, description, icon, sort) values
  ('document',        'Document Printing',          'Documents, papers, modules and more.',      'file-text',  1),
  ('finishing',       'Binding & Finishing',        'Binding and lamination for your pages.',    'book-open',  2),
  ('photo',           'Photo & ID Services',        'ID photos, passport photos and prints.',    'camera',     3),
  ('design',          'Design & Layout',            'We design or lay it out for you.',          'pen-tool',   4),
  ('large_format',    'Large-Format Printing',      'Tarpaulins, banners, posters and signs.',   'maximize',   5),
  ('custom',          'Customized Printing',        'Keychains, stickers, souvenirs and more.',  'gift',       6),
  ('school_business', 'School & Business Printing', 'Forms, certificates, receipts and IDs.',    'briefcase',  7)
on conflict (key) do nothing;

insert into public.services (key, category_key, name, kind, unit_label, file_types, file_rule, defaults, sort) values
  -- Document Printing: per page (existing price list)
  ('doc-regular',        'document', 'Regular Document', 'document', 'per page', array['pdf','docx'], 'required', '{}', 1),
  ('doc-thesis',         'document', 'Thesis',           'document', 'per page', array['pdf','docx'], 'required', '{}', 2),
  ('doc-research',       'document', 'Research Paper',   'document', 'per page', array['pdf','docx'], 'required', '{}', 3),
  ('doc-resume',         'document', 'Resume / CV',      'document', 'per page', array['pdf','docx'], 'required', '{}', 4),
  ('doc-handouts',       'document', 'Handouts',         'document', 'per page', array['pdf','docx'], 'required', '{}', 5),
  ('doc-modules',        'document', 'Modules',          'document', 'per page', array['pdf','docx'], 'required', '{}', 6),
  ('doc-color',          'document', 'Color Printing',   'document', 'per page', array['pdf','docx','jpg','jpeg','png'], 'required', '{"color": true}', 7),
  ('doc-bulk',           'document', 'Bulk Printing',    'document', 'per page', array['pdf','docx'], 'required', '{}', 8),
  -- Binding & Finishing (for pages you bring or upload)
  ('fin-spiral',         'finishing', 'Spiral Binding',  'finishing', 'per copy',  array['pdf','docx'], 'optional', '{}', 1),
  ('fin-comb',           'finishing', 'Comb Binding',    'finishing', 'per copy',  array['pdf','docx'], 'optional', '{}', 2),
  ('fin-thermal',        'finishing', 'Thermal Binding', 'finishing', 'per copy',  array['pdf','docx'], 'optional', '{}', 3),
  ('fin-hard',           'finishing', 'Hard Binding',    'finishing', 'per copy',  array['pdf','docx'], 'optional', '{}', 4),
  ('fin-lamination',     'finishing', 'Lamination',      'finishing', 'per sheet', array['pdf','docx','jpg','jpeg','png'], 'optional', '{}', 5),
  -- Photo & ID
  ('photo-id-1x1',       'photo', '1×1 ID Photo',     'photo', 'per set',   array['jpg','jpeg','png'], 'required', '{}', 1),
  ('photo-id-2x2',       'photo', '2×2 ID Photo',     'photo', 'per set',   array['jpg','jpeg','png'], 'required', '{}', 2),
  ('photo-passport',     'photo', 'Passport Photo',   'photo', 'per set',   array['jpg','jpeg','png'], 'required', '{}', 3),
  ('photo-print',        'photo', 'Photo Printing',   'photo', 'per print', array['jpg','jpeg','png'], 'required', '{}', 4),
  ('photo-id-layout',    'photo', 'ID Layout',        'photo', 'per layout', array['jpg','jpeg','png'], 'required', '{}', 5),
  -- Design & Layout (upload your own file, or ask us to design it)
  ('design-resume',      'design', 'Resume / CV',     'design', 'per design', array['pdf','docx','jpg','jpeg','png'], 'optional', '{}', 1),
  ('design-thesis',      'design', 'Thesis Layout',   'design', 'per design', array['pdf','docx','jpg','jpeg','png'], 'optional', '{}', 2),
  ('design-invitation',  'design', 'Invitation',      'design', 'per design', array['pdf','docx','jpg','jpeg','png'], 'optional', '{}', 3),
  ('design-poster',      'design', 'Poster',          'design', 'per design', array['pdf','docx','jpg','jpeg','png'], 'optional', '{}', 4),
  ('design-certificate', 'design', 'Certificate',     'design', 'per design', array['pdf','docx','jpg','jpeg','png'], 'optional', '{}', 5),
  ('design-bizcard',     'design', 'Business Card',   'design', 'per design', array['pdf','docx','jpg','jpeg','png'], 'optional', '{}', 6),
  ('design-flyer',       'design', 'Flyer',           'design', 'per design', array['pdf','docx','jpg','jpeg','png'], 'optional', '{}', 7),
  ('design-brochure',    'design', 'Brochure',        'design', 'per design', array['pdf','docx','jpg','jpeg','png'], 'optional', '{}', 8),
  -- Large-Format: priced per square foot
  ('large-tarpaulin',    'large_format', 'Tarpaulin',         'large_format', 'per sq ft', array['pdf','jpg','jpeg','png'], 'required', '{}', 1),
  ('large-banner',       'large_format', 'Banner',            'large_format', 'per sq ft', array['pdf','jpg','jpeg','png'], 'required', '{}', 2),
  ('large-poster',       'large_format', 'Poster',            'large_format', 'per sq ft', array['pdf','jpg','jpeg','png'], 'required', '{}', 3),
  ('large-sticker',      'large_format', 'Sticker',           'large_format', 'per sq ft', array['pdf','jpg','jpeg','png'], 'required', '{}', 4),
  ('large-signage',      'large_format', 'Signage',           'large_format', 'per sq ft', array['pdf','jpg','jpeg','png'], 'required', '{}', 5),
  ('large-enlargement',  'large_format', 'Photo Enlargement', 'large_format', 'per sq ft', array['jpg','jpeg','png'], 'required', '{}', 6),
  -- Customized
  ('custom-keychain',    'custom', 'Keychain',   'custom', 'per piece', array['pdf','jpg','jpeg','png'], 'optional', '{}', 1),
  ('custom-sticker',     'custom', 'Sticker',    'custom', 'per piece', array['pdf','jpg','jpeg','png'], 'optional', '{}', 2),
  ('custom-invitation',  'custom', 'Invitation', 'custom', 'per piece', array['pdf','jpg','jpeg','png'], 'optional', '{}', 3),
  ('custom-souvenir',    'custom', 'Souvenir',   'custom', 'per piece', array['pdf','jpg','jpeg','png'], 'optional', '{}', 4),
  ('custom-packaging',   'custom', 'Packaging',  'custom', 'per piece', array['pdf','jpg','jpeg','png'], 'optional', '{}', 5),
  -- School & Business
  ('sb-school-forms',    'school_business', 'School Forms',      'school_business', 'per piece', array['pdf','docx','jpg','jpeg','png'], 'optional', '{}', 1),
  ('sb-certificates',    'school_business', 'Certificates',      'school_business', 'per piece', array['pdf','docx','jpg','jpeg','png'], 'optional', '{}', 2),
  ('sb-business-forms',  'school_business', 'Business Forms',    'school_business', 'per piece', array['pdf','docx','jpg','jpeg','png'], 'optional', '{}', 3),
  ('sb-receipts',        'school_business', 'Official Receipts', 'school_business', 'per booklet', array['pdf','docx','jpg','jpeg','png'], 'optional', '{}', 4),
  ('sb-letterheads',     'school_business', 'Letterheads',       'school_business', 'per piece', array['pdf','docx','jpg','jpeg','png'], 'optional', '{}', 5),
  ('sb-bizcards',        'school_business', 'Business Cards',    'school_business', 'per piece', array['pdf','docx','jpg','jpeg','png'], 'optional', '{}', 6),
  ('sb-id-cards',        'school_business', 'ID Cards',          'school_business', 'per piece', array['pdf','docx','jpg','jpeg','png'], 'optional', '{}', 7)
on conflict (key) do nothing;

-- ===== 4. Order lines can be any service =====
alter table public.order_items
  add column if not exists service_id uuid references public.services(id),
  add column if not exists service_name text,
  add column if not exists category_name text,
  add column if not exists kind text,
  add column if not exists quantity int,
  add column if not exists details jsonb not null default '{}';

-- Print and file columns only apply to Document Printing (and to lines with a file)
alter table public.order_items
  alter column file_name drop not null,
  alter column file_size_bytes drop not null,
  alter column size_name drop not null,
  alter column paper_name drop not null,
  alter column color drop not null,
  alter column pages drop not null,
  alter column copies drop not null,
  alter column rate drop not null,
  alter column line_total drop not null;   -- null = price to be confirmed by staff

-- Orders made before this step were all document printing
update public.order_items
   set kind = 'document', service_name = 'Regular Document', category_name = 'Document Printing',
       service_id = (select id from public.services where key = 'doc-regular'), quantity = copies
 where kind is null;

alter table public.order_items drop constraint if exists order_item_kind;
alter table public.order_items add constraint order_item_kind
  check (kind in ('document','finishing','photo','design','large_format','custom','school_business'));
alter table public.order_items drop constraint if exists document_line_complete;
alter table public.order_items add constraint document_line_complete
  check (kind <> 'document' or (file_name is not null and size_name is not null and paper_name is not null
         and color is not null and pages is not null and copies is not null and rate is not null and line_total is not null));
alter table public.order_items drop constraint if exists quantity_range;
alter table public.order_items add constraint quantity_range check (quantity between 1 and 1000);
alter table public.order_items alter column kind set not null;
alter table public.order_items alter column service_name set not null;
alter table public.order_items alter column quantity set not null;

-- true = at least one line is priced by staff, so the estimate is incomplete
alter table public.orders add column if not exists needs_quote boolean not null default false;

-- ===== 5. Saving an order: same function as 003, now with services =====
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

  insert into public.orders (ref, source, customer_name, customer_phone, customer_email, estimated_total, created_by, needs_quote)
  values (v_ref, p_source, p_customer_name, p_customer_phone, nullif(p_customer_email, ''), p_estimated_total, p_created_by,
          exists (select 1 from jsonb_array_elements(p_items) e where e->>'line_total' is null))
  returning id into v_id;

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

revoke execute on function public.create_order(text, text, text, text, numeric, jsonb, uuid, text) from public, anon, authenticated;
grant execute on function public.create_order(text, text, text, text, numeric, jsonb, uuid, text) to service_role;

-- ===== 6. Who can see / change the catalog =====
alter table public.service_categories enable row level security;
alter table public.services enable row level security;

drop policy if exists "public read active categories" on public.service_categories;
create policy "public read active categories" on public.service_categories for select to anon, authenticated using (is_active);
drop policy if exists "staff read all categories" on public.service_categories;
create policy "staff read all categories" on public.service_categories for select to authenticated using (public.is_staff());
drop policy if exists "public read active services" on public.services;
create policy "public read active services" on public.services for select to anon, authenticated using (is_active);
drop policy if exists "staff read all services" on public.services;
create policy "staff read all services" on public.services for select to authenticated using (public.is_staff());

-- Admins change a service's price and whether it's offered. One function = change + audit line.
create or replace function public.admin_save_service(p_id uuid, p_unit_price numeric, p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := public.current_admin_name();
  v_service public.services;
begin
  select * into v_service from public.services where id = p_id for update;
  if not found then raise exception 'Service not found'; end if;
  if v_service.kind = 'document' and p_unit_price is not null then
    raise exception 'Document Printing uses the price per page table';
  end if;
  if p_unit_price is not null and (p_unit_price < 0 or p_unit_price > 100000) then
    raise exception 'Prices must be ₱0 to ₱100,000';
  end if;

  update public.services set unit_price = round(p_unit_price, 2), is_active = p_active where id = p_id;
  insert into public.audit_log (actor_id, actor_label, action, details)
  values (auth.uid(), v_name,
          case when v_service.is_active <> p_active then case when p_active then 'Option restored' else 'Option archived' end
               else 'Price changed' end,
          v_service.name || ' · ' || coalesce('₱' || to_char(round(p_unit_price, 2), 'FM999,990.00') || ' ' || v_service.unit_label, 'price to be confirmed'));
end $$;

revoke execute on function public.admin_save_service(uuid, numeric, boolean) from public, anon;
grant execute on function public.admin_save_service(uuid, numeric, boolean) to authenticated;
