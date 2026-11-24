-- Run this in the Supabase SQL editor if you already applied schema.sql.
-- It removes donor identity from donations (donations are now anonymous).

alter table public.donations drop column if exists donor_name;
alter table public.donations drop column if exists donor_email;
alter table public.donations drop column if exists message;
