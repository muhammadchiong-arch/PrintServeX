-- PrintServeX step 1: new tables.
-- Run once in Supabase → SQL Editor → New query → paste ALL of this → Run.
-- It only creates new tables. paper_sizes, paper_types and price_rules are not changed.

-- ===== Staff accounts (linked to Supabase Auth users) =====
create table public.staff_profiles (
  id uuid primary key references auth.users(id),
  full_name text not null check (length(trim(full_name)) >= 2),
  username text not null unique,
  role text not null default 'staff' check (role in ('admin','staff')),
  is_active boolean not null default true,          -- deactivate, never delete
  created_at timestamptz not null default now()
);

-- Helpers for the security rules: "is the signed-in person active staff / an admin?"
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_profiles where id = auth.uid() and is_active);
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_profiles where id = auth.uid() and is_active and role = 'admin');
$$;

-- ===== Add-ons and shop info =====
create table public.add_ons (
  key text primary key check (key in ('binding','lamination')),  -- the price math knows only these two
  label text not null,
  price numeric(10,2) not null check (price >= 0),
  unit text not null,
  is_active boolean not null default true
);
insert into public.add_ons (key, label, price, unit) values
  ('binding', 'Binding', 45, 'per set'),
  ('lamination', 'Lamination', 25, 'per sheet');

-- Exactly one row
create table public.shop_settings (
  id smallint primary key default 1 check (id = 1),
  name text not null, area text not null, address text not null, phone text not null,
  email text, hours text not null, hours_long text not null,
  usual_turnaround text not null, pickup_note text not null,
  updated_at timestamptz not null default now()
);
insert into public.shop_settings (name, area, address, phone, email, hours, hours_long, usual_turnaround, pickup_note)
values ('PrintServeX', 'Sta. Cruz, Manila', '214 Rizal Ave.', '0917 305 8841', 'hello@printservex.ph',
        'Mon to Sat, 8:00 AM to 7:00 PM', 'Monday to Saturday, 8:00 AM to 7:00 PM', 'within 2 hours',
        'Bring your reference number. Counter 2, open until 7:00 PM.');

-- ===== Orders =====
create table public.orders (
  id bigint generated always as identity primary key,
  ref text not null unique check (ref ~ '^PSX-\d{8}-\d{4}$'),
  source text not null check (source in ('online','walk-in')),
  customer_name text not null,
  customer_phone text not null check (customer_phone ~ '^09\d{9}$'),
  customer_email text,
  status text not null default 'pending'
    check (status in ('pending','processing','ready','completed','cancelled')),
  estimated_total numeric(10,2) not null check (estimated_total >= 0),  -- calculated by the server
  final_amount numeric(10,2) check (final_amount >= 0),                 -- set by staff
  final_note text,
  cancel_reason text,
  remarks text,                                                         -- staff only
  payment_method text check (payment_method in ('cash','gcash')),       -- paid at the counter
  paid_amount numeric(10,2),
  paid_at timestamptz,
  paid_by uuid references public.staff_profiles(id),
  created_by uuid references public.staff_profiles(id),                 -- null = online order
  created_at timestamptz not null default now(),
  constraint cancelled_needs_reason check (status <> 'cancelled' or cancel_reason is not null),
  constraint completed_needs_payment check (status <> 'completed' or paid_at is not null)
);
create index on public.orders (status, created_at desc);
create index on public.orders (customer_phone);

-- One row per file. Names and prices are COPIED in, so later price changes
-- or archived options never change an old order.
create table public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id),
  position smallint not null,
  file_name text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  storage_path text,                       -- filled in when file uploads are added
  size_name text not null,
  paper_name text not null,
  color boolean not null,
  pages int not null check (pages between 1 and 2000),
  copies int not null check (copies between 1 and 99),
  binding boolean not null default false,
  lamination boolean not null default false,
  rate numeric(10,2) not null,             -- ₱ per page at order time
  binding_price numeric(10,2) not null default 0,
  lamination_price numeric(10,2) not null default 0,
  line_total numeric(10,2) not null,
  unique (order_id, position)
);

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id),
  status text not null check (status in ('pending','processing','ready','completed','cancelled')),
  note text,
  actor_id uuid references public.staff_profiles(id),
  actor_label text not null,               -- staff name at the time, or 'Online order'
  at timestamptz not null default now()
);
create index on public.order_status_history (order_id, at);

-- Business rule: reference numbers restart at 0001 every day (Manila time).
-- One row per day keeps numbering safe even if two orders arrive at the same second.
create table public.order_counters (
  day date primary key,
  last_number int not null
);

-- ===== Inventory =====
create table public.inventory_items (
  id bigint generated always as identity primary key,
  name text not null unique,
  unit text not null,
  qty int not null default 0 check (qty >= 0),               -- stock can't go below zero
  reorder_level int not null default 0 check (reorder_level >= 0),
  created_at timestamptz not null default now()
);
create table public.inventory_moves (
  id bigint generated always as identity primary key,
  item_id bigint not null references public.inventory_items(id),
  type text not null check (type in ('in','out','adjust')),
  change int not null check (change <> 0),
  balance int not null check (balance >= 0),                 -- quantity after this move
  note text not null default '',
  actor_id uuid references public.staff_profiles(id),
  at timestamptz not null default now()
);
create index on public.inventory_moves (item_id, at desc);

-- ===== Audit log: add-only, never edited =====
create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid references public.staff_profiles(id),
  actor_label text not null,               -- name at the time, or 'System'
  action text not null,
  details text not null default ''
);
create index on public.audit_log (at desc);

-- ===== Lock every new table right away =====
-- RLS on with no rules yet = nobody can read or write through the public key.
-- The rules (who can see what) come in step 2.
alter table public.staff_profiles       enable row level security;
alter table public.add_ons              enable row level security;
alter table public.shop_settings        enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.order_status_history enable row level security;
alter table public.order_counters       enable row level security;
alter table public.inventory_items      enable row level security;
alter table public.inventory_moves      enable row level security;
alter table public.audit_log            enable row level security;
