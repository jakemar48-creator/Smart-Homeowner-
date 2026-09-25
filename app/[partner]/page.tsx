import { notFound } from 'next/navigation';
import StartPage from '../start/page';

type PartnerPageProps = {
  params: Promise<{ partner: string }>;
};

export default async function PartnerPage({ params }: PartnerPageProps) {
  const { partner } = await params;

  // Friendly campaign links such as /olympus render the shared funnel in
  // place, preserving the clean campaign URL in the visitor's address bar.
  if (!/^[a-z0-9-]{1,80}$/.test(partner)) notFound();

  return <StartPage />;
}
