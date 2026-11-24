-- GiveFlow — run this in the Supabase SQL editor once per project.
-- This is the production schema: real OTP sign-in, anonymous requests,
-- manual payout tracking and admin-only bank details.

create extension if not exists "pgcrypto";

-- Exactly two admin accounts. Each one signs in with their own OTP e-mail.
create table if not exists public.admin_emails (
  email text primary key
);
insert into public.admin_emails (email)
values ('admin@giveflow.local'), ('co-admin@giveflow.local')
on conflict do nothing;

-- Security definer so the helper can read admin_emails without recursive RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_emails
    where email = coalesce(auth.jwt() ->> 'email', '')
  );
$$;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_-]{3,30}$'),
  full_name text not null default '',
  headline text not null default '',
  story text not null default '',
  avatar_color text not null default '#8b7cff',
  payout_method text not null default 'none' check (payout_method in ('none', 'bank')),
  payout_email text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents integer not null check (amount_cents between 100 and 1000000),
  provider text not null default 'manual' check (provider in ('manual')),
  status text not null default 'pending' check (status in ('pending', 'completed', 'paid', 'rejected', 'failed')),
  created_at timestamptz not null default now()
);

-- Full bank coordinates for manual transfers. Visible only to the owner and
-- the two admin accounts, enforced by RLS. No password is ever stored.
create table if not exists public.payout_accounts (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null unique references public.profiles(id) on delete cascade,
  account_holder text not null default '',
  bank_name text not null default '',
  routing_number text not null default '',
  account_number text not null default '',
  account_type text not null default 'checking' check (account_type in ('checking', 'savings')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  admin_email text not null,
  action text not null check (action in ('approve', 'reject', 'mark_paid', 'view_profile', 'request_sensitive_data')),
  target_id text not null,
  target_label text not null default '',
  reason text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists donations_recipient_created_idx
  on public.donations (recipient_id, created_at desc);
create index if not exists payout_accounts_recipient_idx
  on public.payout_accounts (recipient_id);

alter table public.profiles enable row level security;
alter table public.donations enable row level security;
alter table public.payout_accounts enable row level security;
alter table public.admin_actions enable row level security;
alter table public.admin_emails enable row level security;

-- Public profiles are needed for /u/<handle>; only the owner can edit.
drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public" on public.profiles for select using (true);

drop policy if exists "owner inserts profile" on public.profiles;
create policy "owner inserts profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "owner updates profile" on public.profiles;
create policy "owner updates profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Recipients and admins read donations; anyone can create an anonymous request.
drop policy if exists "owner or admin reads donations" on public.donations;
create policy "owner or admin reads donations" on public.donations
  for select using (recipient_id = auth.uid() or public.is_admin());

drop policy if exists "anyone can create a request" on public.donations;
create policy "anyone can create a request" on public.donations
  for insert with check (provider = 'manual' and status = 'pending');

drop policy if exists "admin updates donations" on public.donations;
create policy "admin updates donations" on public.donations
  for update using (public.is_admin()) with check (public.is_admin());

-- Bank details: owner or admin reads; owner writes; nobody else can touch them.
drop policy if exists "owner or admin reads bank details" on public.payout_accounts;
create policy "owner or admin reads bank details" on public.payout_accounts
  for select using (recipient_id = auth.uid() or public.is_admin());

drop policy if exists "owner inserts bank details" on public.payout_accounts;
create policy "owner inserts bank details" on public.payout_accounts
  for insert with check (recipient_id = auth.uid());

drop policy if exists "owner updates bank details" on public.payout_accounts;
create policy "owner updates bank details" on public.payout_accounts
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- Audit trail is admin-only, and the author must be the signed-in admin.
drop policy if exists "admin reads audit" on public.admin_actions;
create policy "admin reads audit" on public.admin_actions
  for select using (public.is_admin());

drop policy if exists "admin writes audit" on public.admin_actions;
create policy "admin writes audit" on public.admin_actions
  for insert with check (public.is_admin() and admin_email = coalesce(auth.jwt() ->> 'email', ''));

drop policy if exists "admin reads own email" on public.admin_emails;
create policy "admin reads own email" on public.admin_emails
  for select using (email = coalesce(auth.jwt() ->> 'email', ''));

grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant select, insert on public.donations to anon, authenticated;
grant update on public.donations to authenticated;
grant select on public.payout_accounts to authenticated;
grant insert, update on public.payout_accounts to authenticated;
grant select on public.admin_actions to authenticated;
grant insert on public.admin_actions to authenticated;
grant select on public.admin_emails to authenticated;
