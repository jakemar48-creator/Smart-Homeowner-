import { redirect } from 'next/navigation';

// Preserve existing Olympus campaign links while standardising its public URL.
export default function OlympusRedirect() { redirect('/roofing/olympus'); }
