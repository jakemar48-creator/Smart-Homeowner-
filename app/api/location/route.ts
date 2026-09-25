import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function readCity(value: string | null) {
  if (!value) return null;
  try {
    const city = decodeURIComponent(value).replace(/[^a-zA-Z .'-]/g, '').trim();
    return city || null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  // Vercel supplies this as an approximate city derived from the visitor's IP.
  // We intentionally return only the city, never the IP address or coordinates.
  const city = readCity(request.headers.get('x-vercel-ip-city'));
  return NextResponse.json(
    { city },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
