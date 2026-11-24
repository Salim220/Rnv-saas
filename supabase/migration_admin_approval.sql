-- Run this in the Supabase SQL editor if you already applied schema.sql.
-- Adds donation approval states and the admin audit trail.

alter table public.donations
  drop constraint if exists donations_status_check;

alter table public.donations
  add constraint donations_status_check
  check (status in ('pending', 'completed', 'rejected', 'failed'));

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  admin_email text not null,
  action text not null check (action in ('approve', 'reject', 'view_profile', 'request_sensitive_data')),
  target_id text not null,
  target_label text not null default '',
  reason text not null default '',
  created_at timestamptz not null default now()
);

alter table public.admin_actions enable row level security;

drop policy if exists "audit is readable" on public.admin_actions;
create policy "audit is readable" on public.admin_actions for select using (true);

drop policy if exists "audit can be written" on public.admin_actions;
create policy "audit can be written" on public.admin_actions for insert with check (true);

drop policy if exists "anyone can update donations" on public.donations;
create policy "anyone can update donations" on public.donations for update using (true) with check (true);
