import { getSupabaseAdmin } from './supabase-admin';
import type { RoofingLeadStore } from './roofing-lead-handler';

type Database = ReturnType<typeof getSupabaseAdmin>;

export function createRoofingLeadStore(database: () => Database = getSupabaseAdmin): RoofingLeadStore {
  return {
    async create(payload, attribution) {
      const db = database();
      const partner = process.env.SMART_HOMEOWNER_CONTRACTOR_SLUG || 'smarthomeowners';
      const { data: contractor, error: contractorError } = await db.from('contractors')
        .select('id, name, slug').eq('slug', partner).eq('active', true).maybeSingle();
      if (contractorError || !contractor) throw new Error('Smart Homeowner contractor is not configured.');
      const { data: lead, error: leadError } = await db.from('leads').insert({
        partner: contractor.slug, contractor_id: contractor.id, zip_code: payload.zip_code,
        selected_services: ['Roofing'], answers: payload,
        contact: { first_name: payload.first_name, last_name: payload.last_name, phone: payload.phone,
          email: payload.email, street_address: payload.street_address, city: payload.city },
        attribution: { ...attribution, fbclid: payload.fbclid }, status: 'received', ghl_delivery_status: 'pending',
      }).select('id').single();
      if (leadError || !lead) throw new Error('Lead could not be saved.');
      const { data: delivery, error: deliveryError } = await db.from('lead_deliveries').insert({
        lead_id: lead.id, contractor_id: contractor.id, attempt_number: 1, status: 'pending',
      }).select('id').single();
      if (deliveryError || !delivery) throw new Error('Delivery record could not be saved.');
      return { leadId: lead.id, deliveryId: delivery.id, contractorId: contractor.id,
        contractorName: contractor.name, partner: contractor.slug };
    },
    async settle(record, result) {
      const db = database();
      const completedAt = new Date().toISOString();
      const { error: leadError } = await db.from('leads').update({
        status: result.ok ? 'delivered' : 'delivery_failed', ghl_delivery_status: result.ok ? 'succeeded' : 'failed',
        ghl_delivery_at: completedAt, ghl_response: { status: result.status, error: result.error },
      }).eq('id', record.leadId);
      const { error: deliveryError } = await db.from('lead_deliveries').update({
        status: result.ok ? 'succeeded' : 'failed', response_status: result.status,
        error_message: result.error || (!result.ok ? 'GHL rejected the delivery' : null), completed_at: completedAt,
      }).eq('id', record.deliveryId);
      if (leadError || deliveryError) throw new Error('Could not record delivery result.');
    },
  };
}
