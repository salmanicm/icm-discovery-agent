const h = {
  'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGYwNjQ2ZC01MjA0LTRjYjgtOWNlZS1hMTZjMTBiZmRjNjkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWIwZTVjMDgtMjQ3NC00NzVhLThhMjEtYjFhMDFlMmZjMGE5IiwiaWF0IjoxNzczMzEzNzM0fQ.hHLXDFHfbMvNPs8GTZekHNpWm9dpT7H5n6vELq5A8yM',
  'Content-Type': 'application/json'
};
const WF = 'iwi2iZ8mUFFNslnD';
const targets = ['Clear Session Record', 'Lookup Session', 'Save to Sheet', 'Delete From Sheet'];

async function run() {
  const r = await fetch('https://babarnawaz.app.n8n.cloud/api/v1/workflows/' + WF, { headers: h });
  const wf = await r.json();

  for (const n of wf.nodes) {
    if (targets.includes(n.name)) {
      n.parameters.sheetName = { __rl: true, value: 'Sheet1', mode: 'name' };
      console.log('Fixed:', n.name, '→ Sheet1');
    }
  }

  const ur = await fetch('https://babarnawaz.app.n8n.cloud/api/v1/workflows/' + WF, {
    method: 'PUT',
    headers: h,
    body: JSON.stringify({
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: { executionOrder: 'v1' }
    })
  });
  const ud = await ur.json();
  console.log('Updated:', !!ud.id);

  const ar = await fetch('https://babarnawaz.app.n8n.cloud/api/v1/workflows/' + WF + '/activate', {
    method: 'POST', headers: h, body: '{}'
  });
  const ad = await ar.json();
  console.log('Active:', ad.active);
}

run().catch(e => console.error(e));
