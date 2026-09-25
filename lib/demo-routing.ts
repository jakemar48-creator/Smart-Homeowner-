import type { Contractor, Service, ServiceArea } from './types';

// Development-only mirror of the configured live partners. Production uses Supabase.
export const demoContractors: Contractor[] = [
  { id: 'ctr_roof_depot', slug: 'roof-depot', name: 'The Roof Depot', active: true },
  { id: 'ctr_platinum', slug: 'platinum', name: 'Platinum Exteriors', active: true },
  { id: 'ctr_vesel', slug: 'vesel', name: 'Vesel Home Services', active: true },
  { id: 'ctr_gikas', slug: 'gikas', name: 'Gikas Roofing', active: true },
  { id: 'ctr_olympus', slug: 'olympus', name: 'Olympus Home Services', active: true },
];

export const demoServiceAreas: ServiceArea[] = [
  ...([
    '48009', '48025', '48065', '48083', '48084', '48085', '48098',
    '48301', '48302', '48304', '48359', '48360', '48362', '48367', '48370', '48371',
    '48423', '48438', '48446', '48746',
  ]).map((zipCode) => ({ contractorId: 'ctr_roof_depot', zipCode, service: 'Roofing' as Service, active: true })),
  ...(['Roofing', 'Windows', 'Siding'] as Service[]).map((service) => ({ contractorId: 'ctr_platinum', zipCode: '48326', service, active: true })),
  ...(['Roofing', 'Windows'] as Service[]).map((service) => ({ contractorId: 'ctr_platinum', zipCode: '48327', service, active: true })),
  ...(['Roofing', 'Siding'] as Service[]).map((service) => ({ contractorId: 'ctr_vesel', zipCode: '53154', service, active: true })),
  { contractorId: 'ctr_gikas', zipCode: '07430', service: 'Roofing', active: true },
  // Test coverage only. Production coverage is managed in Supabase.
  { contractorId: 'ctr_olympus', zipCode: '92504', service: 'Roofing', active: true },
];

export function validatePartnerCoverage(partner: string, zipCode: string, services?: Service[]) {
  const contractor = demoContractors.find((item) => item.slug === partner && item.active);
  if (!contractor) return { valid: false, reason: 'This campaign is not currently available.', services: [] as Service[] };
  const available = demoServiceAreas.filter((area) => area.contractorId === contractor.id && area.zipCode === zipCode && area.active).map((area) => area.service);
  if (!available.length) return { valid: false, reason: `${contractor.name} does not currently serve this ZIP code.`, services: [] as Service[] };
  if (services?.some((service) => !available.includes(service))) return { valid: false, reason: `${contractor.name} is not currently available for every service you selected in this ZIP code.`, services: available };
  return { valid: true, contractor, services: [...new Set(available)] };
}
