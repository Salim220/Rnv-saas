-- Run this in the Supabase SQL editor on a project that already applied an
-- earlier schema.sql / migration. It is safe to run more than once.
--
-- 1. Aligns public.admin_emails with the e-mails gated in src/lib/admin.ts.
--    Without this the admin UI lets the owner in but every RLS check fails.
-- 2. Stops exposing the payout contact e-mail on the public profile row by
--    moving anonymous reads to the public_profiles view.

insert into public.admin_emails (email)
values ('ouorousalim2@gmail.com'), ('co-admin@giveflow.local')
on conflict do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "profiles are public" on public.profiles;
drop policy if exists "owner or admin reads profile" on public.profiles;
create policy "owner or admin reads profile" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "admin writes audit" on public.admin_actions;
create policy "admin writes audit" on public.admin_actions
  for insert with check (public.is_admin() and lower(admin_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create or replace view public.public_profiles as
  select id, handle, full_name, headline, story, avatar_color, created_at
  from public.profiles;

revoke select on public.profiles from anon;
grant select, insert, update on public.profiles to authenticated;
grant select on public.public_profiles to anon, authenticated;
