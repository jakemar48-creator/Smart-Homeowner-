'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronRight, CircleAlert, Home, House, Mail, MapPin, ShieldCheck, Wrench } from 'lucide-react';
import type { Service, WebhookPayload } from '../../lib/types';

type Answers = Record<string, string>;
type Availability = { valid: boolean; reason?: string; services?: Service[]; contractor?: { name: string } };

const serviceDetails: Record<Service, { description: string; icon: typeof House; questions: { key: string; title: string; options: string[] }[] }> = {
  Roofing: { description: 'Roof repair, replacement, or damage assessment.', icon: House, questions: [
    { key: 'roof_condition', title: "What's going on with your roof?", options: ['Roof is old / showing its age', 'Active leak or water damage', 'Storm or wind damage', 'Need repairs'] },
    { key: 'roof_age', title: 'How old is your current roof?', options: ['0–10 years', '10–20 years', '20+ years', 'Not sure'] },
  ] },
  Windows: { description: 'Window replacement, installation, or repair.', icon: Home, questions: [
    { key: 'window_intent', title: 'What are you looking to do with your windows?', options: ['Replace existing windows', 'Install new windows', 'Repair existing windows', 'Not sure'] },
    { key: 'window_quantity', title: 'About how many windows need work?', options: ['1–4', '5–9', '10 or more', 'Whole house', 'Not sure'] },
  ] },
  Siding: { description: 'Siding repair, replacement, and installation.', icon: Wrench, questions: [
    { key: 'siding_condition', title: "What's going on with your siding?", options: ['Old or worn siding', 'Damaged or missing siding', 'Looking to replace all siding', 'Other / Not sure'] },
    { key: 'siding_scope', title: 'How much of the home needs siding work?', options: ['A small section', 'Multiple areas', 'Most or all of the home', 'Not sure'] },
  ] },
};

const commonQuestions = [
  { key: 'homeowner', title: 'Are you the property owner?', options: ['Yes, i own the property', "No, I'm helping the owner"] },
  { key: 'timeline', title: 'When do you want it done?', options: ['ASAP', 'Within 30 days', '1–3 months', 'Just researching'] },
];

function Brand() { return <div className="brand"><img src="/smart-homeowner-logo.png" alt="Smart Homeowner" /></div>; }
function validZip(value: string) { return /^\d{5}$/.test(value); }

export default function StartPage() {
  const [partner, setPartner] = useState('');
  const [fbclid, setFbclid] = useState('none');
  const [step, setStep] = useState(0);
  const [zipCode, setZipCode] = useState('');
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [checking, setChecking] = useState(false);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', email: '', street_address: '', city: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ leadId: string; contractor: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPartner(params.get('partner') ?? '');
    setFbclid(params.get('fbclid') ?? 'none');
  }, []);

  const selectedQuestions = selectedServices.flatMap((service) => serviceDetails[service].questions);
  const screens = ['zip', 'services', ...selectedQuestions.map((question) => question.key), ...commonQuestions.map((question) => question.key), 'contact'];
  const current = screens[step] ?? 'zip';
  const isZipStep = current === 'zip';
  const isOlympus = partner === 'olympus';
  const progress = Math.max(7, Math.round(((step + 1) / screens.length) * 100));
  const availableServices = availability?.services ?? [];

  async function checkZip(event: React.FormEvent) {
    event.preventDefault(); setError(''); setAvailability(null);
    if (!partner) { setError('This link is missing its campaign partner. Please use the link provided in the ad.'); return; }
    if (!validZip(zipCode)) { setError('Enter a valid five-digit ZIP code.'); return; }
    setChecking(true);
    try {
      const response = await fetch('/api/availability', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partner, zipCode }) });
      const result = await response.json() as Availability;
      if (!response.ok || !result.valid) { setAvailability(result); setError(result.reason ?? 'We could not check availability right now.'); return; }
      setAvailability(result); setStep(1);
    } catch { setError('We could not check availability. Please try again.'); } finally { setChecking(false); }
  }

  function chooseAnswer(key: string, value: string) { setAnswers((old) => ({ ...old, [key]: value })); window.setTimeout(() => setStep((old) => old + 1), 160); }
  function toggleService(service: Service) { setSelectedServices((old) => old.includes(service) ? old.filter((item) => item !== service) : [...old, service]); }
  function continueServices() { if (!selectedServices.length) return setError('Select at least one service to continue.'); setError(''); setStep(2); }
  function contactValue(field: keyof typeof form, value: string) { setForm((old) => ({ ...old, [field]: value })); }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    if (Object.values(form).some((value) => !value.trim())) return setError('Please complete every contact field.');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Enter a valid email address.');
    if (form.phone.replace(/\D/g, '').length < 10) return setError('Enter a valid phone number.');
    const payload: WebhookPayload = { homeowner: answers.homeowner, roof_condition: answers.roof_condition, roof_age: answers.roof_age, timeline: answers.timeline, ...form, zip_code: zipCode, selected_services: selectedServices.join(', '), window_intent: answers.window_intent, window_quantity: answers.window_quantity, siding_condition: answers.siding_condition, siding_scope: answers.siding_scope, fbclid };
    const campaignParams = new URLSearchParams(window.location.search);
    const attribution = { ...Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'meta_campaign_id', 'meta_adset_id', 'meta_ad_id']
      .flatMap((key) => { const value = campaignParams.get(key); return value ? [[key, value]] : []; })), fbclid };
    setSubmitting(true);
    try {
      const response = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partner, zipCode, services: selectedServices, payload, attribution }) });
      const result = await response.json();
      if (!response.ok) return setError(result.message ?? 'We could not submit your request. Please try again.');
      setSuccess(result);
    } catch { setError('We could not submit your request. Please try again.'); } finally { setSubmitting(false); }
  }

  if (success) return <main className="app-shell"><header><Brand /></header><section className="success" aria-live="polite"><span className="success-icon"><Check /></span><p className="eyebrow">REQUEST RECEIVED</p><h1>You’re on the list.</h1><p>We’ve received your request for <b>{selectedServices.join(', ')}</b> help. A local team member will contact you shortly.</p><div className="receipt"><span>Reference</span><b>{success.leadId}</b><span>Matched partner</span><b>{success.contractor}</b></div></section></main>;

  const renderQuestion = (question: { key: string; title: string; options: string[] }) => <section className="screen"><p className="eyebrow">A few quick details</p><h1>{question.title}</h1><p className="intro-copy">Choose the answer that best fits your project.</p><div className="choices">{question.options.map((option) => <button type="button" className={answers[question.key] === option ? 'choice selected' : 'choice'} key={option} onClick={() => chooseAnswer(question.key, option)}><span>{option}</span><ChevronRight /></button>)}</div></section>;

  return <main className={`app-shell${isZipStep ? ' has-roof-background' : ''}`}><header><Brand /><span className="secure"><ShieldCheck /> Secure request</span></header><main className="content">{isZipStep && <section className="landing-copy"><p>{isOlympus ? 'METAL ROOFING HELP, MADE SIMPLE' : 'LOCAL ROOFING HELP, MADE SIMPLE'}</p><h2>{isOlympus ? 'Your metal roof project starts here.' : 'Your roof project starts here.'}</h2><span>{isOlympus ? 'Check local availability for a metal roof consultation.' : 'Check local availability before you spend time filling out a request.'}</span></section>}<section className="progress" aria-label={`Progress: ${progress}%`}><div><span>YOUR HOME PROJECT</span><b>STEP {step + 1}</b></div><i><i style={{ width: `${progress}%` }} /></i></section><div className={`funnel-card${isZipStep ? ' zip-step' : ''}`} aria-live="polite">
    {current === 'zip' && <section className="screen"><h1>{isOlympus ? 'Find the right metal roofing team for your home.' : 'Find the right team for your home.'}</h1><p className="intro-copy">Enter your ZIP code to check availability in your area.</p><form onSubmit={checkZip} className="zip-form compact-zip-form"><div className="zip-input-row"><MapPin /><input id="zip" aria-label="ZIP code" value={zipCode} onChange={(event) => setZipCode(event.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" autoComplete="postal-code" placeholder="e.g. 48326" /></div><button disabled={checking}>{checking ? 'Checking…' : <>Check availability <ArrowRight /></>}</button></form><p className="compact-reassurance">Free <span>•</span> No obligation</p></section>}
    {current === 'services' && <section className="screen"><p className="eyebrow">AVAILABLE IN YOUR AREA</p><h1>{isOlympus ? 'Are you interested in a metal roof?' : 'What can we help you with?'}</h1><p className="intro-copy">Select all that apply. We’ll only ask questions relevant to your choices.</p><div className="service-grid">{availableServices.map((service) => { const Icon = serviceDetails[service].icon; const isSelected = selectedServices.includes(service); const olympusMetalRoofing = isOlympus && service === 'Roofing'; return <button type="button" className={isSelected ? 'service selected' : 'service'} key={service} onClick={() => toggleService(service)} aria-pressed={isSelected}><span className="service-icon"><Icon /></span><span><b>{olympusMetalRoofing ? 'Metal roofing' : service}</b><small>{olympusMetalRoofing ? 'Metal roof installation and replacement.' : serviceDetails[service].description}</small></span><span className="tick">{isSelected && <Check />}</span></button>; })}</div><button type="button" className="primary-action" onClick={continueServices}>Continue <ArrowRight /></button></section>}
    {selectedQuestions.find((question) => question.key === current) && renderQuestion(selectedQuestions.find((question) => question.key === current)!)}
    {commonQuestions.find((question) => question.key === current) && renderQuestion(commonQuestions.find((question) => question.key === current)!)}
    {current === 'contact' && <section className="screen"><p className="eyebrow">LAST STEP</p><h1>Where should we send your request?</h1><p className="intro-copy">A local team can contact you about your home project.</p><form className="contact-form" onSubmit={submit}><div className="form-grid"><label>First name<input value={form.first_name} onChange={(event) => contactValue('first_name', event.target.value)} autoComplete="given-name" /></label><label>Last name<input value={form.last_name} onChange={(event) => contactValue('last_name', event.target.value)} autoComplete="family-name" /></label><label>Phone number<input value={form.phone} onChange={(event) => contactValue('phone', event.target.value)} type="tel" inputMode="tel" autoComplete="tel" /></label><label>Email address<input value={form.email} onChange={(event) => contactValue('email', event.target.value)} type="email" inputMode="email" autoComplete="email" /></label><label className="wide">Street address<input value={form.street_address} onChange={(event) => contactValue('street_address', event.target.value)} autoComplete="street-address" /></label><label>City<input value={form.city} onChange={(event) => contactValue('city', event.target.value)} autoComplete="address-level2" /></label><label>ZIP code<input value={zipCode} readOnly aria-readonly="true" /></label></div><button disabled={submitting} className="primary-action">{submitting ? 'Submitting…' : <>Submit my request <ArrowRight /></>}</button><p className="consent">By submitting, you agree that Smart Homeowner and its local service partner may contact you about this request by phone, text, or email. Consent is not a condition of purchase.</p></form></section>}
    {error && <p className="error" role="alert"><CircleAlert />{error}</p>}
    {step > 0 && <button type="button" className="back" onClick={() => { setError(''); setStep((old) => old - 1); }}><ArrowLeft /> Back</button>}
  </div></main><footer><span><Mail /> Your details stay private</span></footer></main>;
}
