const API = 'https://babarnawaz.app.n8n.cloud/api/v1';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGYwNjQ2ZC01MjA0LTRjYjgtOWNlZS1hMTZjMTBiZmRjNjkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWIwZTVjMDgtMjQ3NC00NzVhLThhMjEtYjFhMDFlMmZjMGE5IiwiaWF0IjoxNzczMzEzNzM0fQ.hHLXDFHfbMvNPs8GTZekHNpWm9dpT7H5n6vELq5A8yM';

async function main() {
  const headers = { 'X-N8N-API-KEY': KEY };

  // Get execution 3644 details
  console.log('Fetching execution 3644...');
  const r = await fetch(`${API}/executions/3644`, { headers });
  const d = await r.json();

  const rd = d.data?.resultData;
  if (!rd) {
    console.log('No resultData found');
    console.log('Keys:', Object.keys(d));
    return;
  }

  console.log('Status:', d.data?.status || d.status);
  console.log('Last node executed:', rd.lastNodeExecuted);

  if (rd.error) {
    console.log('\n=== WORKFLOW ERROR ===');
    console.log(JSON.stringify(rd.error, null, 2));
  }

  // Check each node for errors
  if (rd.runData) {
    for (const [nodeName, runs] of Object.entries(rd.runData)) {
      for (const run of runs) {
        if (run.error) {
          console.log(`\n=== NODE ERROR: ${nodeName} ===`);
          console.log(JSON.stringify(run.error, null, 2).substring(0, 800));
        }
      }
    }
  }
}

main().catch(e => console.error('Fatal:', e.message));
