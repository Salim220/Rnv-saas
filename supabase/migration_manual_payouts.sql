-- Run this in the Supabase SQL editor if you already applied an older schema.
-- Final version: removes online payment providers, stores full bank coordinates
-- for manual transfers, adds the paid status and replaces the permissive RLS
-- with admin-only RLS.

create extension if not exists "pgcrypto";

-- Admin accounts and helper used by every restrictive policy below.
create table if not exists public.admin_emails (
  email text primary key
);
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

-- Donations: manual provider only, paid status allowed.
alter table public.donations
  drop constraint if exists donations_provider_check;
alter table public.donations
  add constraint donations_provider_check check (provider in ('manual'));

alter table public.donations
  drop constraint if exists donations_status_check;
alter table public.donations
  add constraint donations_status_check
  check (status in ('pending', 'completed', 'paid', 'rejected', 'failed'));

update public.donations
set provider = 'manual'
where provider = 'paypal' or provider = 'dwolla' or provider = 'demo';

-- Profiles: bank is the only payout method.
alter table public.profiles
  drop constraint if exists profiles_payout_method_check;
alter table public.profiles
  add constraint profiles_payout_method_check check (payout_method in ('none', 'bank'));
update public.profiles set payout_method = 'bank' where payout_method in ('paypal', 'dwolla');

-- Payout accounts: replace masked reference with full bank coordinates.
alter table public.payout_accounts add column if not exists routing_number text not null default '';
alter table public.payout_accounts add column if not exists account_number text not null default '';
alter table public.payout_accounts add column if not exists account_type text not null default 'checking';
alter table public.payout_accounts drop column if exists account_reference;

alter table public.payout_accounts
  drop constraint if exists payout_accounts_account_type_check;
alter table public.payout_accounts
  add constraint payout_accounts_account_type_check check (account_type in ('checking', 'savings'));

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payout_accounts_recipient_key') then
    alter table public.payout_accounts add constraint payout_accounts_recipient_key unique (recipient_id);
  end if;
end $$;

-- Audit trail: payout action allowed.
alter table public.admin_actions
  drop constraint if exists admin_actions_action_check;
alter table public.admin_actions
  add constraint admin_actions_action_check
  check (action in ('approve', 'reject', 'mark_paid', 'view_profile', 'request_sensitive_data'));

-- Drop every permissive prototype policy before creating restrictive ones.
drop policy if exists "donations are public" on public.donations;
drop policy if exists "anyone can donate" on public.donations;
drop policy if exists "anyone can update donations" on public.donations;
drop policy if exists "owner reads payout reference" on public.payout_accounts;
drop policy if exists "prototype admin reads payout references" on public.payout_accounts;
drop policy if exists "owner inserts payout reference" on public.payout_accounts;
drop policy if exists "owner updates payout reference" on public.payout_accounts;
drop policy if exists "audit is readable" on public.admin_actions;
drop policy if exists "audit can be written" on public.admin_actions;

drop policy if exists "owner or admin reads donations" on public.donations;
create policy "owner or admin reads donations" on public.donations
  for select using (recipient_id = auth.uid() or public.is_admin());

drop policy if exists "anyone can create a request" on public.donations;
create policy "anyone can create a request" on public.donations
  for insert with check (provider = 'manual' and status = 'pending');

drop policy if exists "admin updates donations" on public.donations;
create policy "admin updates donations" on public.donations
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "owner or admin reads bank details" on public.payout_accounts;
create policy "owner or admin reads bank details" on public.payout_accounts
  for select using (recipient_id = auth.uid() or public.is_admin());

drop policy if exists "owner inserts bank details" on public.payout_accounts;
create policy "owner inserts bank details" on public.payout_accounts
  for insert with check (recipient_id = auth.uid());

drop policy if exists "owner updates bank details" on public.payout_accounts;
create policy "owner updates bank details" on public.payout_accounts
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

drop policy if exists "admin reads audit" on public.admin_actions;
create policy "admin reads audit" on public.admin_actions
  for select using (public.is_admin());

drop policy if exists "admin writes audit" on public.admin_actions;
create policy "admin writes audit" on public.admin_actions
  for insert with check (public.is_admin() and lower(admin_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

alter table public.admin_emails enable row level security;
drop policy if exists "admin reads own email" on public.admin_emails;
create policy "admin reads own email" on public.admin_emails
  for select using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Private profiles: only the owner and the admins read the row (payout e-mail).
drop policy if exists "profiles are public" on public.profiles;
drop policy if exists "owner or admin reads profile" on public.profiles;
create policy "owner or admin reads profile" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create or replace view public.public_profiles as
  select id, handle, full_name, headline, story, avatar_color, created_at
  from public.profiles;

grant usage on schema public to anon, authenticated;
revoke select on public.profiles from anon;
grant select, insert, update on public.profiles to authenticated;
grant select on public.public_profiles to anon, authenticated;
grant select, insert on public.donations to anon, authenticated;
grant update on public.donations to authenticated;
grant select on public.payout_accounts to authenticated;
grant insert, update on public.payout_accounts to authenticated;
grant select on public.admin_actions to authenticated;
grant insert on public.admin_actions to authenticated;
grant select on public.admin_emails to authenticated;
