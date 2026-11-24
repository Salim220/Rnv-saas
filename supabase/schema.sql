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
  payout_method text not null default 'none' check (payout_method in ('none', 'paypal', 'dwolla')),
  payout_email text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  donor_name text not null default '',
  donor_email text not null default '',
  amount_cents integer not null check (amount_cents between 100 and 1000000),
  message text not null default '',
  provider text not null default 'demo' check (provider in ('demo', 'paypal', 'dwolla')),
  status text not null default 'completed' check (status in ('completed', 'pending', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists donations_recipient_created_idx
  on public.donations (recipient_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.donations enable row level security;

-- Profiles are public (needed for /u/<handle>) but only the owner can edit.
drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public" on public.profiles for select using (true);

drop policy if exists "owner inserts profile" on public.profiles;
create policy "owner inserts profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "owner updates profile" on public.profiles;
create policy "owner updates profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- A donor page shows the public donation history; anyone can create a donation
-- (prototype only — add rate limiting / a server before going to production).
drop policy if exists "donations are public" on public.donations;
create policy "donations are public" on public.donations for select using (true);

drop policy if exists "anyone can donate" on public.donations;
create policy "anyone can donate" on public.donations for insert with check (true);
