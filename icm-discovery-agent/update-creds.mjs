/**
 * Update credentials for new n8n workflows one at a time
 */
const N8N = 'https://babarnawaz.app.n8n.cloud/api/v1';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGYwNjQ2ZC01MjA0LTRjYjgtOWNlZS1hMTZjMTBiZmRjNjkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWIwZTVjMDgtMjQ3NC00NzVhLThhMjEtYjFhMDFlMmZjMGE5IiwiaWF0IjoxNzczMzEzNzM0fQ.hHLXDFHfbMvNPs8GTZekHNpWm9dpT7H5n6vELq5A8yM';
const h = { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json' };
const cred = { id: 'd3VzbfljgRj0nDRH', name: 'Salman MalikGoogle Sheets oAuth' };

// Workflow IDs to update (skip qt0tvH6QSDTcDoMM - already done)
const workflows = [
  { id: '4GYind17YHhUonCW', name: 'Add Customer' },
  { id: 'gKFnnmdYrsM8atNW', name: 'Get Customers' },
  { id: 'vAxSLqBvhKbXYkl9', name: 'Get Consent Log' },
];

async function updateOne(wid, label) {
  console.log(`Updating ${label} (${wid})...`);
  const r = await fetch(`${N8N}/workflows/${wid}`, { headers: h });
  if (!r.ok) { console.log(`  ❌ GET failed: ${r.status}`); return; }
  const wf = await r.json();

  for (const n of wf.nodes) {
    if (n.type === 'n8n-nodes-base.googleSheets') {
      n.credentials = { googleSheetsOAuth2Api: cred };
    }
  }

  const body = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings };
  const u = await fetch(`${N8N}/workflows/${wid}`, { method: 'PUT', headers: h, body: JSON.stringify(body) });
  console.log(`  ${u.status === 200 ? '✅' : '❌'} PUT status: ${u.status}`);
}

(async () => {
  for (const wf of workflows) {
    await updateOne(wf.id, wf.name);
  }
  console.log('\nAll done!');
  process.exit(0);
})();
