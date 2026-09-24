-- Smart Homeowner production schema.
-- Apply in Supabase SQL Editor or as a Supabase migration before setting
-- SMART_HOMEOWNER_DEMO_MODE=false.

create extension if not exists pgcrypto;

do $$ begin
  create type public.service_name as enum ('Roofing', 'Windows', 'Siding');
exception when duplicate_object then null;
end $$;

create table if not exists public.contractors (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  active boolean not null default true,
  ghl_location_id text,
  -- Server-only data. Never expose this column through a browser query.
  ghl_webhook_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_areas (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  zip_code text not null check (zip_code ~ '^[0-9]{5}$'),
  service public.service_name not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (contractor_id, zip_code, service)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  partner text not null,
  contractor_id uuid not null references public.contractors(id),
  zip_code text not null check (zip_code ~ '^[0-9]{5}$'),
  selected_services public.service_name[] not null check (cardinality(selected_services) between 1 and 3),
  answers jsonb not null default '{}'::jsonb,
  contact jsonb not null default '{}'::jsonb,
  attribution jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in ('received', 'delivered', 'delivery_failed')),
  ghl_delivery_status text not null default 'pending' check (ghl_delivery_status in ('pending', 'succeeded', 'failed')),
  ghl_delivery_at timestamptz,
  ghl_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_deliveries (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  contractor_id uuid not null references public.contractors(id),
  attempt_number integer not null check (attempt_number > 0),
  status text not null check (status in ('pending', 'succeeded', 'failed')),
  response_status integer,
  response_body text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (lead_id, attempt_number)
);

create index if not exists service_areas_lookup on public.service_areas (zip_code, contractor_id, service) where active;
create index if not exists leads_partner_created_at on public.leads (partner, created_at desc);
create index if not exists lead_deliveries_retry_queue on public.lead_deliveries (status, created_at) where status = 'failed';

-- A public lead funnel must never query these tables directly. The only caller is
-- the server with the Supabase service-role key, which bypasses RLS by design.
alter table public.contractors enable row level security;
alter table public.service_areas enable row level security;
alter table public.leads enable row level security;
alter table public.lead_deliveries enable row level security;
revoke all on public.contractors, public.service_areas, public.leads, public.lead_deliveries from anon, authenticated;

-- Example onboarding data. Replace the webhook URL before activating a contractor.
-- insert into public.contractors (slug, name, ghl_location_id, ghl_webhook_url)
-- values ('platinum', 'Platinum Exteriors', 'YOUR_GHL_LOCATION_ID', 'YOUR_GHL_INBOUND_WEBHOOK_URL');
-- insert into public.service_areas (contractor_id, zip_code, service)
-- select id, '48326', service::public.service_name
-- from public.contractors cross join unnest(array['Roofing','Windows','Siding']) as service
-- where slug = 'platinum';
