import { notFound } from 'next/navigation';
import StartPage from '../../start/page';

type RoofingPartnerPageProps = {
  params: Promise<{ partner: string }>;
};

export default async function RoofingPartnerPage({ params }: RoofingPartnerPageProps) {
  const { partner } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(partner)) notFound();

  // A live partner campaign using the neutral reusable roofing template.
  return <StartPage plainTemplate />;
}
