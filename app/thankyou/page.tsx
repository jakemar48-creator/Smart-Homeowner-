'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import MetaPixel from '../components/meta-pixel';
import OlympusGoogleTagManager from '../components/olympus-google-tag-manager';

type Receipt = { leadId: string; contractor: string; services: string[]; preview?: boolean; partner?: string };

function Brand() { return <div className="brand"><img src="/smart-homeowner-logo.png" alt="Smart Homeowner" /></div>; }

export default function ThankYouPage() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    const stored = window.sessionStorage.getItem('smart-homeowner-receipt');
    if (!stored) return;
    try { setReceipt(JSON.parse(stored) as Receipt); } catch { window.sessionStorage.removeItem('smart-homeowner-receipt'); }
  }, []);

  // Lead is a thank-you page-load event, including direct visits without a receipt.
  const isPreview = receipt?.preview === true;
  return <>{receipt?.partner === 'olympus' && <OlympusGoogleTagManager />}<MetaPixel event="Lead" /><main className="app-shell"><header><Brand /></header><section className="success" aria-live="polite"><span className="success-icon"><Check /></span><p className="eyebrow">{isPreview ? 'FUNNEL PREVIEW' : 'REQUEST RECEIVED'}</p><h1>{isPreview ? 'Preview complete.' : 'You’re on the list.'}</h1><p>{isPreview ? 'This base Smart Homeowner version is for layout review only. It does not send a lead to a contractor.' : 'We’ve received your request. A local team member will contact you shortly.'}</p></section></main></>;
}
