import { getDemoPartner } from './demo-routing';
import { getPartnerServices as getDemoPartnerServices } from './demo-routing';
import { getSupabaseAdmin, hasSupabaseConfiguration } from './supabase-admin';
import type { Contractor, Service } from './types';

type PartnerResult = {
  valid: boolean;
  reason?: string;
  contractor?: Contractor;
};

type ContractorRow = {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  ghl_location_id: string | null;
  ghl_webhook_url: string | null;
  service_areas: Array<{ zip_code: string; service: Service; active: boolean }>;
};

type PartnerServicesResult = {
  valid: boolean;
  services: Service[];
  contractor?: Contractor;
};

function useDemoRouting() {
  return process.env.SMART_HOMEOWNER_DEMO_MODE === 'true' ||
    (process.env.NODE_ENV === 'development' && !hasSupabaseConfiguration());
}

export async function getPartner(partner: string): Promise<PartnerResult> {
  if (useDemoRouting()) return getDemoPartner(partner);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('contractors')
    .select('id, slug, name, active, ghl_location_id, ghl_webhook_url')
    .eq('slug', partner)
    .eq('active', true)
    .maybeSingle();

  if (error) throw new Error(`Could not load partner: ${error.message}`);
  if (!data) return { valid: false, reason: 'This campaign is not currently available.' };

  const row = data as unknown as ContractorRow;
  const contractor: Contractor = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    active: row.active,
    ghlLocationId: row.ghl_location_id ?? undefined,
    ghlWebhookUrl: row.ghl_webhook_url ?? undefined,
  };

  return { valid: true, contractor };
}

export async function getPartnerServices(partner: string): Promise<PartnerServicesResult> {
  if (useDemoRouting()) return getDemoPartnerServices(partner);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('contractors')
    .select('id, slug, name, active, ghl_location_id, ghl_webhook_url, service_areas!inner(service, active)')
    .eq('slug', partner)
    .eq('active', true)
    .eq('service_areas.active', true)
    .maybeSingle();

  if (error) throw new Error(`Could not load partner services: ${error.message}`);
  if (!data) return { valid: false, services: [] };

  const row = data as unknown as ContractorRow;
  const services = [...new Set(row.service_areas.map((area) => area.service))];
  const contractor: Contractor = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    active: row.active,
    ghlLocationId: row.ghl_location_id ?? undefined,
    ghlWebhookUrl: row.ghl_webhook_url ?? undefined,
  };

  return { valid: services.length > 0, contractor, services };
}

export { useDemoRouting };
