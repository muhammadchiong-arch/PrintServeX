-- PrintServeX step 5: staff sign-in (lock after 5 wrong passwords).
-- Run once in Supabase → SQL Editor → New query → paste ALL of this → Run.
-- Run 003_orders.sql first. Then make the first admin with 005b_first_admin.sql.

-- ===== 1. Remember wrong passwords and the last sign-in =====
alter table public.staff_profiles
  add column failed_logins smallint not null default 0,
  add column locked_until timestamptz,
  add column last_sign_in_at timestamptz;

-- Nobody signed in may change these three, not even an admin. Only our server does.
revoke update on public.staff_profiles from authenticated;
grant update (full_name, username, role, is_active) on public.staff_profiles to authenticated;

-- ===== 2. A wrong password: add 1, and lock for 15 minutes on the 5th =====
-- Done in ONE statement so two tries at the same moment are both counted.
-- Returns the time the lock ends, or null if the account is not locked.
create or replace function public.record_failed_login(p_id uuid) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  v_locked timestamptz;
begin
  update public.staff_profiles
     set failed_logins = case when failed_logins + 1 >= 5 then 0 else failed_logins + 1 end,
         locked_until  = case when failed_logins + 1 >= 5 then now() + interval '15 minutes' else locked_until end
   where id = p_id
  returning locked_until into v_locked;
  return case when v_locked > now() then v_locked end;
end $$;

-- ===== 3. A correct password: clear the count and save the time =====
create or replace function public.record_login_success(p_id uuid) returns void
language sql security definer set search_path = '' as $$
  update public.staff_profiles
     set failed_logins = 0, locked_until = null, last_sign_in_at = now()
   where id = p_id;
$$;

-- Only our server (service_role) may run these two.
revoke execute on function public.record_failed_login(uuid) from public, anon, authenticated;
revoke execute on function public.record_login_success(uuid) from public, anon, authenticated;
grant execute on function public.record_failed_login(uuid) to service_role;
grant execute on function public.record_login_success(uuid) to service_role;

-- Usernames are always saved in small letters, so "Maricel.Santos" and "maricel.santos"
-- can't both exist and sign-in doesn't care about capitals.
alter table public.staff_profiles
  add constraint username_lowercase check (username = lower(username) and username ~ '^[a-z0-9._]{3,30}$');
