import { NextResponse } from 'next/server';
import { z } from 'zod';
import { validatePartnerCoverage } from '../../../lib/routing';

const availabilitySchema = z.object({
  partner: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/),
  zipCode: z.string().regex(/^[0-9]{5}$/),
});

export async function POST(request: Request) {
  const parsed = availabilitySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ valid: false, reason: 'Enter a valid five-digit ZIP code and use the campaign link provided.' }, { status: 400 });

  try {
    const result = await validatePartnerCoverage(parsed.data.partner, parsed.data.zipCode);
    return NextResponse.json(result, { status: result.valid ? 200 : 404 });
  } catch {
    return NextResponse.json({ valid: false, reason: 'We could not check availability right now. Please try again.' }, { status: 503 });
  }
}
