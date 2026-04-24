const API = 'https://babarnawaz.app.n8n.cloud/api/v1';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGYwNjQ2ZC01MjA0LTRjYjgtOWNlZS1hMTZjMTBiZmRjNjkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWIwZTVjMDgtMjQ3NC00NzVhLThhMjEtYjFhMDFlMmZjMGE5IiwiaWF0IjoxNzczMzEzNzM0fQ.hHLXDFHfbMvNPs8GTZekHNpWm9dpT7H5n6vELq5A8yM';
const WF_ID = 'iwi2iZ8mUFFNslnD';

async function main() {
  const headers = { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json' };

  // 1. Get workflow
  console.log('1. Fetching workflow...');
  const resp = await fetch(`${API}/workflows/${WF_ID}`, { headers });
  const wf = await resp.json();

  // 2. Find the node
  const node = wf.nodes.find(n => n.name === 'Respond — Vapi Tool');
  if (!node) { console.error('NOT FOUND'); return; }
  console.log('2. Found node. Current respondWith:', node.parameters.respondWith);

  // 3. Build the VAPI response expression
  // n8n expression that returns: { results: [{ toolCallId: "...", result: "..." }] }
  const expr = '={{ JSON.stringify({ results: [{ toolCallId: $json.toolCallId || "unknown", result: "Progress saved" }] }) }}';

  // 4. Update node parameters
  node.parameters = {
    respondWith: 'text',
    responseBody: expr,
    options: {
      responseCode: 200,
      responseHeaders: {
        entries: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Access-Control-Allow-Origin', value: '*' }
        ]
      }
    }
  };
  console.log('3. Updated params to respondWith: text');

  // 5. Also need to fix the connection — "Is Vapi Tool Call?" output 0 goes to this node
  // But the data from "Is Vapi Tool Call?" doesn't carry toolCallId from Extract Save Data
  // We need to check what data flows through
  // The IF node passes through whatever it receives from Update Full / Update Stage Only
  // Those are Google Sheets nodes — they don't have toolCallId
  // So we need to reference Extract Save Data directly in the expression
  const expr2 = '={{ JSON.stringify({ results: [{ toolCallId: $("Extract Save Data").first().json.toolCallId || "unknown", result: "Progress saved" }] }) }}';
  node.parameters.responseBody = expr2;
  console.log('4. Using expression with $("Extract Save Data") reference');

  // 6. Push update
  console.log('5. Pushing to n8n...');
  const updateResp = await fetch(`${API}/workflows/${WF_ID}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: { executionOrder: wf.settings?.executionOrder || 'v1' },
    }),
  });

  if (!updateResp.ok) {
    const errText = await updateResp.text();
    console.error('Update failed:', updateResp.status, errText);
    return;
  }

  const result = await updateResp.json();
  
  // 7. Verify
  const verified = result.nodes.find(n => n.name === 'Respond — Vapi Tool');
  console.log('6. SUCCESS! respondWith:', verified?.parameters?.respondWith);
  console.log('   Active:', result.active);
}

main().catch(e => console.error('Fatal:', e.message));
