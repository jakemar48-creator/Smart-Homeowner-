import { z } from 'zod';

const payloadSchema = z.object({
  homeowner: z.string().trim().min(1),
  roof_condition: z.string().trim().min(1),
  roof_age: z.string().trim().min(1),
  timeline: z.string().trim().min(1),
  first_name: z.string().trim().min(1), last_name: z.string().trim().min(1),
  phone: z.string().trim().refine(value => value.replace(/\D/g, '').length >= 10),
  email: z.string().trim().email(), street_address: z.string().trim().min(1),
  city: z.string().trim().min(1), zip_code: z.string().regex(/^[0-9]{5}$/),
  selected_services: z.literal('Roofing'),
  fbclid: z.string().optional().transform(value => value || 'none'),
});
const requestSchema = z.object({
  zipCode: z.string().regex(/^[0-9]{5}$/),
  services: z.tuple([z.literal('Roofing')]),
  payload: payloadSchema,
  attribution: z.record(z.string(), z.string()).optional(),
});

// Inject the transport in tests; never send synthetic leads to the live webhook.
export function createRoofingLeadHandler(transport: typeof fetch = fetch) {
  return async function POST(request: Request) {
    let input: unknown;
    try { input = await request.json(); }
    catch { return Response.json({ message: 'Please send a valid request.' }, { status: 400 }); }
    const parsed = requestSchema.safeParse(input);
    if (!parsed.success || parsed.data.zipCode !== parsed.data.payload.zip_code) {
      return Response.json({ message: 'Please complete all required roofing and contact details.' }, { status: 400 });
    }
    const { payload, attribution = {} } = parsed.data;
    const webhookUrl = process.env.SMART_HOMEOWNER_ROOFING_WEBHOOK_URL;
    if (!webhookUrl) return Response.json({ message: 'Lead submission is not configured. Please contact us directly.' }, { status: 503 });
    const leadId = crypto.randomUUID();
    const outgoing = {
      ...payload,
      lead_id: leadId,
      partner: 'smart-homeowner',
      contractor: 'Smart Homeowner',
      selected_service_names: 'Roofing',
      submitted_at: new Date().toISOString(),
      smart_homeowner: { lead_id: leadId, partner: 'smart-homeowner', contractor: 'Smart Homeowner', selected_services: ['Roofing'], attribution },
    };
    try {
      const response = await transport(webhookUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(outgoing), signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error('Delivery rejected');
      return Response.json({ leadId, contractor: 'Smart Homeowner', deliveryStatus: 'sent' }, { status: 201 });
    } catch {
      return Response.json({ message: 'We could not send your request. Please try again.' }, { status: 502 });
    }
  };
}
