-- Fixes "permission denied for table trips": RLS policies only apply after
-- basic table-level grants pass, and this project's public-schema default
-- privileges didn't extend INSERT/SELECT/UPDATE/DELETE to `authenticated`
-- the way a fresh Supabase project normally does. RLS (from the previous
-- migration) still fully restricts each grant to the row's own user.

grant select, insert, update, delete on public.trips to authenticated;
