import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../lib/roofing-lead-handler.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText.replace("from 'zod'", `from '${import.meta.resolve('zod')}'`);
const { createRoofingLeadHandler } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
process.env.SMART_HOMEOWNER_ROOFING_WEBHOOK_URL = 'https://webhook.example.test/lead';
const valid = { zipCode: '48326', services: ['Roofing'], payload: { homeowner: 'Yes, I own the property', roof_condition: 'Storm or wind damage', roof_age: '10–20 years', timeline: 'Within 30 days', first_name: 'Test', last_name: 'Person', phone: '2485550100', email: 'test@example.com', street_address: '123 Example St', city: 'Test', zip_code: '48326', selected_services: 'Roofing', fbclid: 'TEST123456' }, attribution: { utm_source: 'test' } };
function request(body = valid) { return new Request('http://localhost/api/roofing-leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
test('forwards exact contact and quiz values to supplied GHL webhook, preserves fbclid', async () => {
 let sent; const handler = createRoofingLeadHandler(async (url, init) => { sent = { url, data: JSON.parse(init.body) }; return new Response('{}'); });
 const result = await handler(request()); assert.equal(result.status, 201); assert.equal((await result.json()).deliveryStatus, 'sent');
 assert.equal(sent.url, 'https://webhook.example.test/lead');
 for (const [key,value] of Object.entries(valid.payload)) assert.equal(sent.data[key],value); assert.equal(sent.data.smart_homeowner.attribution.utm_source,'test');
});
test('rejected and unavailable webhooks fail without a success receipt', async () => {
 for (const transport of [async()=>new Response('',{status:500}), async()=>{throw new Error('network');}]) {
 const response=await createRoofingLeadHandler(transport)(request());assert.equal(response.status,502);assert.equal((await response.json()).leadId,undefined);
 }
});
test('malformed JSON, incomplete contacts, mismatched ZIP and non-roofing submissions are rejected without sending', async()=>{
 let calls=0;const handler=createRoofingLeadHandler(async()=>{calls++;return new Response('{}');});
 const malformed=new Request('http://localhost/api/roofing-leads',{method:'POST',body:'{'});assert.equal((await handler(malformed)).status,400);
 for(const body of [{...valid,payload:{...valid.payload,email:''}},{...valid,zipCode:'99999'},{...valid,services:['Siding']}]) assert.equal((await handler(request(body))).status,400);
 assert.equal(calls,0);
});
test('missing fbclid defaults to none', async()=>{
 let captured;const body=structuredClone(valid);delete body.payload.fbclid;
 await createRoofingLeadHandler(async(_,init)=>{captured=JSON.parse(init.body);return new Response('{}');})(request(body));assert.equal(captured.fbclid,'none');
});
test('generic route is live and thank-you Lead pixel is unconditional',async()=>{
 const page=await readFile(new URL('../app/roofing/page.tsx',import.meta.url),'utf8');assert.match(page,/basePreview liveRoofing/);
 const form=await readFile(new URL('../app/components/start-funnel.tsx',import.meta.url),'utf8');assert.match(form,/basePreview && !liveRoofing/);assert.match(form,/liveRoofing \? '\/api\/roofing-leads' : '\/api\/leads'/);
 assert(form.indexOf('if (!response.ok)') < form.lastIndexOf("window.sessionStorage.setItem('smart-homeowner-receipt'"));
 const thanks=await readFile(new URL('../app/thankyou/page.tsx',import.meta.url),'utf8');assert.match(thanks,/<MetaPixel event="Lead" \/>/);assert(!thanks.includes('receipt && !isPreview && <MetaPixel'));
});

test('missing webhook configuration fails closed without sending', async()=>{ const old=process.env.SMART_HOMEOWNER_ROOFING_WEBHOOK_URL;delete process.env.SMART_HOMEOWNER_ROOFING_WEBHOOK_URL;try { const result=await createRoofingLeadHandler(async()=>{throw new Error('must not send')})(request());assert.equal(result.status,503); } finally {process.env.SMART_HOMEOWNER_ROOFING_WEBHOOK_URL=old;} });

test('thank-you uses the requested simple message without a reference or partner panel', async()=>{const page=await readFile(new URL('../app/thankyou/page.tsx',import.meta.url),'utf8');assert(page.includes('We’ve received your request. A local team member will contact you shortly.'));assert(!page.includes('className="receipt"'));assert(!page.includes('Matched partner'));});
