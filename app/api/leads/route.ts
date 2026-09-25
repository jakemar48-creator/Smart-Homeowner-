import { NextResponse } from 'next/server';
import { z } from 'zod';
import { validatePartnerCoverage, useDemoRouting } from '../../../lib/routing';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import type { Attribution, GhlWebhookPayload, Service, WebhookPayload } from '../../../lib/types';

const serviceSchema = z.enum(['Roofing', 'Windows', 'Siding']);
const payloadSchema = z.object({
  homeowner: z.string().min(1), roof_condition: z.string().optional(), roof_age: z.string().optional(), timeline: z.string().min(1),
  first_name: z.string().trim().min(1), last_name: z.string().trim().min(1), phone: z.string().trim().min(10), email: z.string().email(),
  street_address: z.string().trim().min(1), city: z.string().trim().min(1), zip_code: z.string().regex(/^[0-9]{5}$/),
  window_intent: z.string().optional(), window_quantity: z.string().optional(), siding_condition: z.string().optional(), siding_scope: z.string().optional(), selected_services: z.string().min(1), fbclid: z.string().min(1),
});
const leadSchema = z.object({
  partner: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/),
  zipCode: z.string().regex(/^[0-9]{5}$/),
  services: z.array(serviceSchema).min(1).max(3),
  payload: payloadSchema,
  attribution: z.record(z.string(), z.string()).optional(),
});

async function deliverWebhook(webhookUrl: string, payload: GhlWebhookPayload) {
  const response = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10_000) });
  const responseText = (await response.text()).slice(0, 2_000);
  return { ok: response.ok, status: response.status, responseText };
}

export async function POST(request: Request) {
  const parsed = leadSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ message: 'Please complete all required details.' }, { status: 400 });
  const body = parsed.data;
  if (body.payload.zip_code !== body.zipCode) return NextResponse.json({ message: 'Your ZIP code could not be verified. Please try again.' }, { status: 400 });

  try {
    const coverage = await validatePartnerCoverage(body.partner, body.zipCode, body.services as Service[]);
    if (!coverage.valid || !coverage.contractor) return NextResponse.json({ message: coverage.reason ?? 'We could not verify availability.' }, { status: 422 });

    if (useDemoRouting()) {
      return NextResponse.json({ leadId: `SO-${Date.now().toString().slice(-7)}`, contractor: coverage.contractor.name, deliveryStatus: 'preview_not_sent' }, { status: 201 });
    }

    const supabase = getSupabaseAdmin();
    const attribution = (body.attribution ?? {}) as Attribution;
    const { data: lead, error: leadError } = await supabase.from('leads').insert({
      partner: body.partner, contractor_id: coverage.contractor.id, zip_code: body.zipCode, selected_services: body.services,
      answers: body.payload, contact: { first_name: body.payload.first_name, last_name: body.payload.last_name, phone: body.payload.phone, email: body.payload.email, street_address: body.payload.street_address, city: body.payload.city },
      attribution, status: 'received', ghl_delivery_status: 'pending',
    }).select('id').single();
    if (leadError || !lead) throw new Error('Lead could not be stored.');

    const { data: delivery } = await supabase.from('lead_deliveries').insert({ lead_id: lead.id, contractor_id: coverage.contractor.id, attempt_number: 1, status: 'pending' }).select('id').single();
    if (!coverage.contractor.ghlWebhookUrl) {
      await supabase.from('leads').update({ status: 'delivery_failed', ghl_delivery_status: 'failed', ghl_response: { error: 'No GHL webhook configured' } }).eq('id', lead.id);
      if (delivery) await supabase.from('lead_deliveries').update({ status: 'failed', error_message: 'No GHL webhook configured', completed_at: new Date().toISOString() }).eq('id', delivery.id);
      return NextResponse.json({ leadId: lead.id, contractor: coverage.contractor.name, deliveryStatus: 'failed' }, { status: 201 });
    }

    try {
      const webhookPayload: GhlWebhookPayload = {
        ...(body.payload as WebhookPayload),
        lead_id: lead.id,
        partner: body.partner,
        contractor: coverage.contractor.name,
        selected_service_names: body.services.join(', '),
        submitted_at: new Date().toISOString(),
        smart_homeowner: {
          lead_id: lead.id,
          partner: body.partner,
          contractor: coverage.contractor.name,
          selected_services: body.services as Service[],
          attribution,
        },
      };
      const deliveryResult = await deliverWebhook(coverage.contractor.ghlWebhookUrl, webhookPayload);
      const completedAt = new Date().toISOString();
      const responseInfo = { status: deliveryResult.status, body: deliveryResult.responseText };
      await supabase.from('leads').update({ status: deliveryResult.ok ? 'delivered' : 'delivery_failed', ghl_delivery_status: deliveryResult.ok ? 'succeeded' : 'failed', ghl_delivery_at: completedAt, ghl_response: responseInfo }).eq('id', lead.id);
      if (delivery) await supabase.from('lead_deliveries').update({ status: deliveryResult.ok ? 'succeeded' : 'failed', response_status: deliveryResult.status, response_body: deliveryResult.responseText, completed_at: completedAt }).eq('id', delivery.id);
      return NextResponse.json({ leadId: lead.id, contractor: coverage.contractor.name, deliveryStatus: deliveryResult.ok ? 'sent' : 'failed' }, { status: 201 });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Webhook delivery failed';
      const completedAt = new Date().toISOString();
      await supabase.from('leads').update({ status: 'delivery_failed', ghl_delivery_status: 'failed', ghl_response: { error: errorMessage } }).eq('id', lead.id);
      if (delivery) await supabase.from('lead_deliveries').update({ status: 'failed', error_message: errorMessage, completed_at: completedAt }).eq('id', delivery.id);
      return NextResponse.json({ leadId: lead.id, contractor: coverage.contractor.name, deliveryStatus: 'failed' }, { status: 201 });
    }
  } catch {
    return NextResponse.json({ message: 'We could not submit your request. Please try again.' }, { status: 503 });
  }
}
