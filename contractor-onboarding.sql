-- Smart Homeowner contractor onboarding template.
-- 1. Replace the ALL-CAPS values.
-- 2. Add one row per ZIP + service below.
-- 3. Change active to true only after the GHL webhook is tested.

insert into public.contractors (
  slug,
  name,
  active,
  ghl_location_id,
  ghl_webhook_url
)
values (
  'CONTRACTOR-SLUG',
  'CONTRACTOR NAME',
  false,
  'GHL_LOCATION_ID',
  'GHL_INBOUND_WEBHOOK_URL'
)
returning id, slug, name, active;

-- Paste the ID returned above in place of CONTRACTOR_ID.
-- Copy a VALUES line for every combination the contractor covers.
insert into public.service_areas (contractor_id, zip_code, service, active)
values
  ('CONTRACTOR_ID', '12345', 'Roofing', true),
  ('CONTRACTOR_ID', '12345', 'Windows', true),
  ('CONTRACTOR_ID', '12345', 'Siding', true);

-- When the webhook and at least one coverage row have been verified:
-- update public.contractors set active = true, updated_at = now()
-- where slug = 'CONTRACTOR-SLUG';
