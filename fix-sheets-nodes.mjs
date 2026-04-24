const API = 'https://babarnawaz.app.n8n.cloud/api/v1';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGYwNjQ2ZC01MjA0LTRjYjgtOWNlZS1hMTZjMTBiZmRjNjkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWIwZTVjMDgtMjQ3NC00NzVhLThhMjEtYjFhMDFlMmZjMGE5IiwiaWF0IjoxNzczMzEzNzM0fQ.hHLXDFHfbMvNPs8GTZekHNpWm9dpT7H5n6vELq5A8yM';
const WF_ID = 'iwi2iZ8mUFFNslnD';

async function main() {
  const headers = { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json' };

  // 1. Get workflow
  console.log('Fetching workflow...');
  const r = await fetch(`${API}/workflows/${WF_ID}`, { headers });
  const wf = await r.json();

  // 2. Fix "Update Full" — switch to autoMapInputData
  const updateFull = wf.nodes.find(n => n.name === 'Update Full');
  if (updateFull) {
    console.log('Fixing Update Full...');
    updateFull.parameters.columns = {
      mappingMode: 'autoMapInputData',
      value: {},
      matchingColumns: ['session_key'],
      schema: []  // clear cached schema
    };
    console.log('  -> Set to autoMapInputData with matching on session_key');
  }

  // 3. Fix "Update Stage Only" — switch to autoMapInputData
  const updateStage = wf.nodes.find(n => n.name === 'Update Stage Only');
  if (updateStage) {
    console.log('Fixing Update Stage Only...');
    updateStage.parameters.columns = {
      mappingMode: 'autoMapInputData',
      value: {},
      matchingColumns: ['session_key'],
      schema: []  // clear cached schema
    };
    console.log('  -> Set to autoMapInputData with matching on session_key');
  }

  // 4. Push update
  console.log('Pushing update...');
  const updateResp = await fetch(`${API}/workflows/${WF_ID}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: { executionOrder: 'v1' },
    }),
  });

  if (!updateResp.ok) {
    const err = await updateResp.text();
    console.error('Update failed:', updateResp.status, err);
    return;
  }

  const result = await updateResp.json();
  console.log('SUCCESS! Active:', result.active);

  // Verify
  const vFull = result.nodes.find(n => n.name === 'Update Full');
  const vStage = result.nodes.find(n => n.name === 'Update Stage Only');
  console.log('Update Full mode:', vFull?.parameters?.columns?.mappingMode);
  console.log('Update Stage Only mode:', vStage?.parameters?.columns?.mappingMode);
}

main().catch(e => console.error('Fatal:', e.message));
