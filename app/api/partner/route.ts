import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPartnerServices } from '../../../lib/routing';

const partnerSchema = z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/);

export async function GET(request: Request) {
  const partner = partnerSchema.safeParse(new URL(request.url).searchParams.get('partner'));
  if (!partner.success) return NextResponse.json({ valid: false, reason: 'This campaign link is invalid.' }, { status: 400 });

  try {
    const result = await getPartnerServices(partner.data);
    if (!result.valid) return NextResponse.json({ valid: false, reason: 'This campaign is not currently available.' }, { status: 404 });
    return NextResponse.json({ valid: true, services: result.services, contractor: result.contractor });
  } catch (error) {
    console.error('Smart Homeowner partner lookup failed:', error);
    return NextResponse.json({ valid: false, reason: 'We could not load this request right now. Please try again.' }, { status: 503 });
  }
}
