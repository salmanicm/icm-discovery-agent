/**
 * Activate n8n workflows one at a time with timeout handling
 */
const N8N = 'https://babarnawaz.app.n8n.cloud/api/v1';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGYwNjQ2ZC01MjA0LTRjYjgtOWNlZS1hMTZjMTBiZmRjNjkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWIwZTVjMDgtMjQ3NC00NzVhLThhMjEtYjFhMDFlMmZjMGE5IiwiaWF0IjoxNzczMzEzNzM0fQ.hHLXDFHfbMvNPs8GTZekHNpWm9dpT7H5n6vELq5A8yM';
const h = { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json' };

const wfId = process.argv[2];
if (!wfId) { console.log('Usage: node activate-wf.mjs <workflow-id>'); process.exit(1); }

(async () => {
  console.log(`Fetching workflow ${wfId}...`);
  const r = await fetch(`${N8N}/workflows/${wfId}`, { headers: h });
  const wf = await r.json();
  console.log(`  Name: ${wf.name}, Active: ${wf.active}`);

  if (wf.active) { console.log('Already active!'); process.exit(0); }

  console.log('Activating...');
  const body = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings, active: true };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const u = await fetch(`${N8N}/workflows/${wfId}`, {
      method: 'PUT', headers: h, body: JSON.stringify(body), signal: controller.signal
    });
    clearTimeout(timeout);
    const res = await u.json();
    console.log(`  Result: ${res.active ? '✅ ACTIVE' : '❌ INACTIVE'} (status: ${u.status})`);
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') {
      console.log('  ⏱️ API timed out (30s) — may still be activating in background');
    } else {
      console.error('  ❌ Error:', e.message);
    }
  }
  process.exit(0);
})();
