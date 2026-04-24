const API = 'https://babarnawaz.app.n8n.cloud/api/v1';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGYwNjQ2ZC01MjA0LTRjYjgtOWNlZS1hMTZjMTBiZmRjNjkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWIwZTVjMDgtMjQ3NC00NzVhLThhMjEtYjFhMDFlMmZjMGE5IiwiaWF0IjoxNzczMzEzNzM0fQ.hHLXDFHfbMvNPs8GTZekHNpWm9dpT7H5n6vELq5A8yM';
const WF_ID = 'iwi2iZ8mUFFNslnD';

async function main() {
  const headers = { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json' };

  // 1. Get workflow
  console.log('Fetching workflow...');
  const r = await fetch(`${API}/workflows/${WF_ID}`, { headers });
  const wf = await r.json();

  // 2. Find the problem nodes
  const updateFull = wf.nodes.find(n => n.name === 'Update Full');
  const updateStage = wf.nodes.find(n => n.name === 'Update Stage Only');

  if (updateFull) {
    console.log('\n=== Update Full ===');
    console.log(JSON.stringify(updateFull.parameters, null, 2));
  }

  if (updateStage) {
    console.log('\n=== Update Stage Only ===');
    console.log(JSON.stringify(updateStage.parameters, null, 2));
  }

  // 3. Also check Extract Save Data to see what fields it outputs
  const extract = wf.nodes.find(n => n.name === 'Extract Save Data');
  if (extract) {
    console.log('\n=== Extract Save Data (output fields) ===');
    // Look for return statement in jsCode
    const code = extract.parameters.jsCode;
    const resultMatch = code.match(/const result = \{([\s\S]*?)\};/);
    if (resultMatch) console.log('Result object:', resultMatch[0].substring(0, 500));
  }
}

main().catch(e => console.error('Fatal:', e.message));
