const N8N_API = 'https://babarnawaz.app.n8n.cloud/api/v1';
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGYwNjQ2ZC01MjA0LTRjYjgtOWNlZS1hMTZjMTBiZmRjNjkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWIwZTVjMDgtMjQ3NC00NzVhLThhMjEtYjFhMDFlMmZjMGE5IiwiaWF0IjoxNzczMzEzNzM0fQ.hHLXDFHfbMvNPs8GTZekHNpWm9dpT7H5n6vELq5A8yM';
const h = { 'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json' };
const SHEET_ID = '1Q1rfERybmeFSHpHpHHQ_FWZrWPHYYeqkH7LyZ21euNt0s';

import { writeFileSync } from 'fs';

async function main() {
  let out = '';
  function log(s) { out += s + '\n'; console.log(s); }

  // 1. Get credentials
  log('=== Credentials ===');
  const cr = await fetch(`${N8N_API}/credentials`, { headers: h });
  const creds = await cr.json();
  creds.data.forEach(c => log(`  ${c.id} | ${c.type} | ${c.name}`));

  // Find Google Sheets credential
  const sheetsCred = creds.data.find(c => c.type === 'googleSheetsOAuth2Api' || c.type === 'googleApi' || c.name.toLowerCase().includes('sheet') || c.name.toLowerCase().includes('google'));
  log(`\nSheets cred: ${sheetsCred ? sheetsCred.id + ' ' + sheetsCred.name : 'NOT FOUND'}`);

  // 2. Get existing workflow to see credentials used
  log('\n=== Existing Workflow Credentials ===');
  const wr = await fetch(`${N8N_API}/workflows/iwi2iZ8mUFFNslnD`, { headers: h });
  const wf = await wr.json();
  const sheetsNodes = wf.nodes.filter(n => n.type === 'n8n-nodes-base.googleSheets');
  sheetsNodes.forEach(n => {
    log(`  Node: ${n.name} | Cred: ${JSON.stringify(n.credentials)}`);
  });

  writeFileSync('n8n-creds.txt', out);
  log('\nDone!');
}

main().catch(e => console.error('Fatal:', e));
