import { notFound, redirect } from 'next/navigation';

type PartnerPageProps = {
  params: Promise<{ partner: string }>;
};

export default async function PartnerPage({ params }: PartnerPageProps) {
  const { partner } = await params;

  // Friendly campaign links such as /olympus use the existing funnel and
  // preserve one source of truth for validation, routing, and lead delivery.
  if (!/^[a-z0-9-]{1,80}$/.test(partner)) notFound();

  redirect(`/start?partner=${encodeURIComponent(partner)}`);
}
