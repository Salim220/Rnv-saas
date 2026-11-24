-- Run this in the Supabase SQL editor if you already applied schema.sql.
-- It removes PayPal/Dwolla, adds payout references, paid status and payout audit.

alter table public.profiles
  drop constraint if exists profiles_payout_method_check;
alter table public.profiles
  add constraint profiles_payout_method_check
  check (payout_method in ('none', 'bank'));

alter table public.donations
  drop constraint if exists donations_provider_check;
alter table public.donations
  add constraint donations_provider_check
  check (provider in ('demo', 'manual'));

alter table public.donations
  drop constraint if exists donations_status_check;
alter table public.donations
  add constraint donations_status_check
  check (status in ('pending', 'completed', 'paid', 'rejected', 'failed'));

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

alter table public.payout_accounts enable row level security;

drop policy if exists "owner reads payout reference" on public.payout_accounts;
create policy "owner reads payout reference" on public.payout_accounts for select using (auth.uid() = recipient_id);

drop policy if exists "prototype admin reads payout references" on public.payout_accounts;
create policy "prototype admin reads payout references" on public.payout_accounts for select using (true);

drop policy if exists "owner inserts payout reference" on public.payout_accounts;
create policy "owner inserts payout reference" on public.payout_accounts for insert with check (auth.uid() = recipient_id);

drop policy if exists "owner updates payout reference" on public.payout_accounts;
create policy "owner updates payout reference" on public.payout_accounts for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

alter table public.admin_actions
  drop constraint if exists admin_actions_action_check;
alter table public.admin_actions
  add constraint admin_actions_action_check
  check (action in ('approve', 'reject', 'mark_paid', 'view_profile', 'request_sensitive_data'));

-- Existing rows keep their meaning; only new requests use 'manual'.
update public.donations set provider = 'manual' where provider = 'paypal' or provider = 'dwolla';
