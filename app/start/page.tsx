'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, ChevronRight, CircleAlert, Home, House, Mail, ShieldCheck, Wrench } from 'lucide-react';
import type { Service, WebhookPayload } from '../../lib/types';

type Answers = Record<string, string>;
type PartnerDetails = { valid: boolean; reason?: string; services?: Service[] };
type ApproximateLocation = { city: string | null };

const serviceDetails: Record<Service, { description: string; icon: typeof House; questions: { key: string; title: string; options: string[] }[] }> = {
  Roofing: { description: 'Roof repair, replacement, or damage assessment.', icon: House, questions: [
    { key: 'roof_condition', title: 'What’s going on with your roof?', options: ['It’s old or showing its age', 'There is a leak or water damage', 'Storm or wind damage', 'I need repairs'] },
    { key: 'roof_age', title: 'How old is your current roof?', options: ['0–10 years', '10–20 years', '20+ years', 'Not sure'] },
  ] },
  Windows: { description: 'Window replacement, installation, or repair.', icon: Home, questions: [
    { key: 'window_intent', title: 'What do you need help with?', options: ['Replacing existing windows', 'Installing new windows', 'Repairing existing windows', 'Not sure'] },
    { key: 'window_quantity', title: 'About how many windows need work?', options: ['1–4', '5–9', '10 or more', 'Whole house', 'Not sure'] },
  ] },
  Siding: { description: 'Siding repair, replacement, and installation.', icon: Wrench, questions: [
    { key: 'siding_condition', title: 'What’s going on with your siding?', options: ['It’s old or worn', 'It is damaged or missing', 'I want to replace all siding', 'Other / Not sure'] },
    { key: 'siding_scope', title: 'How much of the home needs siding work?', options: ['A small section', 'Multiple areas', 'Most or all of the home', 'Not sure'] },
  ] },
};

const commonQuestions = [
  { key: 'homeowner', title: 'Are you the property owner?', options: ['Yes, I own the property', 'No, I’m helping the owner'] },
  { key: 'timeline', title: 'When would you like to get started?', options: ['As soon as possible', 'Within 30 days', 'Within 1–3 months', 'I’m still researching'] },
];

function Brand() { return <div className="brand"><img src="/smart-homeowner-logo.png" alt="Smart Homeowner" /></div>; }

export default function StartPage({ basePreview = false }: { basePreview?: boolean }) {
  const router = useRouter();
  const [partner, setPartner] = useState('');
  const [partnerServices, setPartnerServices] = useState<Service[]>([]);
  const [locationCity, setLocationCity] = useState('');
  const [loadingCampaign, setLoadingCampaign] = useState(true);
  const [fbclid, setFbclid] = useState('none');
  const [step, setStep] = useState(0);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', email: '', street_address: '', city: '', zip_code: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pathPartner = window.location.pathname.split('/').filter(Boolean)[0];
    const campaignPartner = params.get('partner') ?? (pathPartner !== 'start' && pathPartner !== 'thankyou' ? pathPartner : '');
    setPartner(campaignPartner);
    setFbclid(params.get('fbclid') ?? 'none');

    if (basePreview) {
      void fetch('/api/location', { cache: 'no-store' })
        .then(async (response) => response.ok ? await response.json() as ApproximateLocation : { city: null })
        .then((location) => {
          if (location.city) {
            setLocationCity(location.city);
            setForm((current) => current.city ? current : { ...current, city: location.city ?? '' });
          }
        })
        .finally(() => {
          setPartnerServices(['Roofing']);
          setLoadingCampaign(false);
        });
      return;
    }

    if (!campaignPartner) {
      setLoadingCampaign(false);
      setError('This link is missing its campaign partner. Please use the link provided in the ad.');
      return;
    }

    void Promise.all([
      fetch(`/api/partner?partner=${encodeURIComponent(campaignPartner)}`).then(async (response) => ({ response, result: await response.json() as PartnerDetails })),
      fetch('/api/location', { cache: 'no-store' }).then(async (response) => response.ok ? await response.json() as ApproximateLocation : { city: null }),
    ]).then(([campaign, location]) => {
      if (!campaign.response.ok || !campaign.result.valid || !campaign.result.services?.length) {
        setError(campaign.result.reason ?? 'This campaign is not currently available.');
        return;
      }
      setPartnerServices(campaign.result.services);
      if (location.city) {
        setLocationCity(location.city);
        setForm((current) => current.city ? current : { ...current, city: location.city ?? '' });
      }
    }).catch(() => setError('We could not load this request right now. Please try again.'))
      .finally(() => setLoadingCampaign(false));
  }, []);

  useEffect(() => {
    if (partnerServices.length === 1 && selectedServices.length === 0) {
      setSelectedServices(partnerServices);
      setStep(1);
    }
  }, [partnerServices, selectedServices.length]);

  const selectedQuestions = selectedServices.flatMap((service) => serviceDetails[service].questions);
  const screens = ['services', ...selectedQuestions.map((question) => question.key), ...commonQuestions.map((question) => question.key), 'contact'];
  const current = screens[step] ?? 'services';
  const isOlympus = partner === 'olympus';
  const estimateCopy = isOlympus ? 'metal roof estimate' : 'roof estimate';
  const progress = Math.max(8, Math.round(((step + 1) / screens.length) * 100));
  const showIntro = loadingCampaign || current === 'services' || (selectedServices.length === 1 && step === 1);

  function chooseAnswer(key: string, value: string) {
    setAnswers((old) => ({ ...old, [key]: value }));
    window.setTimeout(() => setStep((old) => old + 1), 160);
  }

  function toggleService(service: Service) {
    setSelectedServices((old) => old.includes(service) ? old.filter((item) => item !== service) : [...old, service]);
  }

  function continueServices() {
    if (!selectedServices.length) return setError('Select at least one project to continue.');
    setError('');
    setStep(1);
  }

  function contactValue(field: keyof typeof form, value: string) {
    setForm((old) => ({ ...old, [field]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (Object.values(form).some((value) => !value.trim())) return setError('Please complete every contact field.');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Enter a valid email address.');
    if (form.phone.replace(/\D/g, '').length < 10) return setError('Enter a valid phone number.');
    if (!/^\d{5}$/.test(form.zip_code)) return setError('Enter a valid five-digit ZIP code.');

    if (basePreview) {
      window.sessionStorage.setItem('smart-homeowner-receipt', JSON.stringify({ leadId: 'SO-PREVIEW', contractor: 'Smart Homeowner', services: selectedServices, preview: true }));
      router.replace('/thankyou');
      return;
    }

    const payload: WebhookPayload = {
      homeowner: answers.homeowner, roof_condition: answers.roof_condition, roof_age: answers.roof_age, timeline: answers.timeline,
      first_name: form.first_name, last_name: form.last_name, phone: form.phone, email: form.email, street_address: form.street_address,
      city: form.city, zip_code: form.zip_code, selected_services: selectedServices.join(', '), window_intent: answers.window_intent,
      window_quantity: answers.window_quantity, siding_condition: answers.siding_condition, siding_scope: answers.siding_scope, fbclid,
    };
    const campaignParams = new URLSearchParams(window.location.search);
    const attribution = {
      ...Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'meta_campaign_id', 'meta_adset_id', 'meta_ad_id']
        .flatMap((key) => { const value = campaignParams.get(key); return value ? [[key, value]] : []; })),
      fbclid,
    };
    setSubmitting(true);
    try {
      const response = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partner, zipCode: form.zip_code, services: selectedServices, payload, attribution }) });
      const result = await response.json();
      if (!response.ok) return setError(result.message ?? 'We could not submit your request. Please try again.');
      window.sessionStorage.setItem('smart-homeowner-receipt', JSON.stringify({ leadId: result.leadId, contractor: result.contractor, services: selectedServices }));
      router.replace('/thankyou');
    } catch {
      setError('We could not submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const renderQuestion = (question: { key: string; title: string; options: string[] }) => <section className="screen question-screen"><h1>{question.title}</h1><div className="choices">{question.options.map((option) => <button type="button" className={answers[question.key] === option ? 'choice selected' : 'choice'} key={option} onClick={() => chooseAnswer(question.key, option)}><span>{option}</span><ChevronRight /></button>)}</div></section>;
  const locationLabel = locationCity ? `${locationCity} homeowners` : 'Homeowners';

  return <main className={`app-shell ${basePreview ? 'base-preview' : 'has-roof-background'}`}><header><Brand /><span className="secure"><ShieldCheck /> Secure request</span></header><div className="header-progress" role="progressbar" aria-label={`Request progress: ${progress}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ width: `${progress}%` }} /></div><main className="content">{showIntro && <section className="landing-copy"><p>{locationLabel}</p><h2>Claim your free {estimateCopy} in a few quick steps.</h2></section>}<div className="funnel-card project-flow" aria-live="polite">
    {loadingCampaign && <section className="screen loading-screen"><p>Loading your request…</p></section>}
    {!loadingCampaign && current === 'services' && partnerServices.length > 1 && <section className="screen"><h1>What can we help you with?</h1><div className="service-grid">{partnerServices.map((service) => { const Icon = serviceDetails[service].icon; const selected = selectedServices.includes(service); return <button type="button" className={selected ? 'service selected' : 'service'} key={service} onClick={() => toggleService(service)} aria-pressed={selected}><span className="service-icon"><Icon /></span><span><b>{service}</b><small>{serviceDetails[service].description}</small></span><span className="tick">{selected && <Check />}</span></button>; })}</div><button type="button" className="primary-action" onClick={continueServices}>Continue <ArrowRight /></button></section>}
    {!loadingCampaign && selectedQuestions.find((question) => question.key === current) && renderQuestion(selectedQuestions.find((question) => question.key === current)!)}
    {!loadingCampaign && commonQuestions.find((question) => question.key === current) && renderQuestion(commonQuestions.find((question) => question.key === current)!)}
    {!loadingCampaign && current === 'contact' && <section className="screen contact-screen"><h1>Where is the project located?</h1><p className="intro-copy">We’ll use this to confirm local coverage for your request.</p><form className="contact-form" onSubmit={submit}><div className="form-grid"><label>First name<input value={form.first_name} onChange={(event) => contactValue('first_name', event.target.value)} autoComplete="given-name" /></label><label>Last name<input value={form.last_name} onChange={(event) => contactValue('last_name', event.target.value)} autoComplete="family-name" /></label><label>Phone number<input value={form.phone} onChange={(event) => contactValue('phone', event.target.value)} type="tel" inputMode="tel" autoComplete="tel" /></label><label>Email address<input value={form.email} onChange={(event) => contactValue('email', event.target.value)} type="email" inputMode="email" autoComplete="email" /></label><label className="wide">Street address<input value={form.street_address} onChange={(event) => contactValue('street_address', event.target.value)} autoComplete="street-address" /></label><label>City<input value={form.city} onChange={(event) => contactValue('city', event.target.value)} autoComplete="address-level2" /></label><label>ZIP code<input value={form.zip_code} onChange={(event) => contactValue('zip_code', event.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" autoComplete="postal-code" /></label></div><button disabled={submitting} className="primary-action">{submitting ? 'Submitting…' : <>Submit my request <ArrowRight /></>}</button><p className="consent">By submitting, you agree that Smart Homeowner and its local service partner may contact you about this request by phone, text, or email. Consent is not a condition of purchase.</p></form></section>}
    {error && <p className="error" role="alert"><CircleAlert />{error}</p>}
  </div></main><footer><span><Mail /> Your details stay private</span></footer></main>;
}
