-- GiveFlow — run this in the Supabase SQL editor (once per project).
-- It creates the tables, row-level security policies and demo pages.

create extension if not exists "pgcrypto";

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
  provider text not null default 'manual' check (provider in ('demo', 'manual')),
  status text not null default 'pending' check (status in ('pending', 'completed', 'paid', 'rejected', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.payout_accounts (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  account_holder text not null default '',
  bank_name text not null default '',
  account_reference text not null default '',
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

-- Profiles are public (needed for /u/<handle>) but only the owner can edit.
drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public" on public.profiles for select using (true);

drop policy if exists "owner inserts profile" on public.profiles;
create policy "owner inserts profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "owner updates profile" on public.profiles;
create policy "owner updates profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- A donor page shows the public donation history; anyone can create a request
-- (prototype only — add rate limiting / a server before going to production).
drop policy if exists "donations are public" on public.donations;
create policy "donations are public" on public.donations for select using (true);

drop policy if exists "anyone can donate" on public.donations;
create policy "anyone can donate" on public.donations for insert with check (true);

-- Prototype-only: status changes and audit writes. Lock these down server-side
-- with an admin-only role before production.
drop policy if exists "anyone can update donations" on public.donations;
create policy "anyone can update donations" on public.donations for update using (true) with check (true);

-- Masked payout references: owner manages their own record; prototype admin
-- console reads all. No full account number or password is ever stored here.
drop policy if exists "owner reads payout reference" on public.payout_accounts;
create policy "owner reads payout reference" on public.payout_accounts for select using (auth.uid() = recipient_id);

drop policy if exists "prototype admin reads payout references" on public.payout_accounts;
create policy "prototype admin reads payout references" on public.payout_accounts for select using (true);

drop policy if exists "owner inserts payout reference" on public.payout_accounts;
create policy "owner inserts payout reference" on public.payout_accounts for insert with check (auth.uid() = recipient_id);

drop policy if exists "owner updates payout reference" on public.payout_accounts;
create policy "owner updates payout reference" on public.payout_accounts for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

drop policy if exists "audit is readable" on public.admin_actions;
create policy "audit is readable" on public.admin_actions for select using (true);

drop policy if exists "audit can be written" on public.admin_actions;
create policy "audit can be written" on public.admin_actions for insert with check (true);
