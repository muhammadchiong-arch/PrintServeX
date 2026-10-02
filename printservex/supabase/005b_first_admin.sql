-- PrintServeX step 5b: make the FIRST admin (the shop owner). Do this only once.
-- Later staff accounts are made from the Users page (step 6).
--
-- A. Supabase → Authentication → Users → Add user → Create new user
--      Email:    the owner's email
--      Password: at least 8 characters
--      Tick "Auto Confirm User", then Create user.
-- B. Change the 3 values marked <-- below, then paste ALL of this in SQL Editor → Run.
--    It should say "1 row" was added. "0 rows" means the email doesn't match step A.
-- C. Sign in at /staff/login with the USERNAME below (not the email) and the password.

insert into public.staff_profiles (id, full_name, username, role)
select id,
       'Maricel Santos',   -- <-- full name
       'maricel.santos',   -- <-- username: small letters, numbers, dots; 3 to 30 characters
       'admin'
from auth.users
where email = 'owner@example.com';  -- <-- the same email as step A
