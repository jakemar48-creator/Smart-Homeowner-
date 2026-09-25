'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

type Receipt = { leadId: string; contractor: string; services: string[] };

function Brand() { return <div className="brand"><img src="/smart-homeowner-logo.png" alt="Smart Homeowner" /></div>; }

export default function ThankYouPage() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    const stored = window.sessionStorage.getItem('smart-homeowner-receipt');
    if (!stored) return;
    try { setReceipt(JSON.parse(stored) as Receipt); } catch { window.sessionStorage.removeItem('smart-homeowner-receipt'); }
  }, []);

  return <main className="app-shell"><header><Brand /></header><section className="success" aria-live="polite"><span className="success-icon"><Check /></span><p className="eyebrow">REQUEST RECEIVED</p><h1>You’re on the list.</h1><p>We’ve received your request{receipt?.services?.length ? <> for <b>{receipt.services.join(', ')}</b></> : ''} help. A local team member will contact you shortly.</p>{receipt && <div className="receipt"><span>Reference</span><b>{receipt.leadId}</b><span>Matched partner</span><b>{receipt.contractor}</b></div>}</section></main>;
}
