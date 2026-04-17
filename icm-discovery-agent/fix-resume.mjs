const h = {
  'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGYwNjQ2ZC01MjA0LTRjYjgtOWNlZS1hMTZjMTBiZmRjNjkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWIwZTVjMDgtMjQ3NC00NzVhLThhMjEtYjFhMDFlMmZjMGE5IiwiaWF0IjoxNzczMzEzNzM0fQ.hHLXDFHfbMvNPs8GTZekHNpWm9dpT7H5n6vELq5A8yM',
  'Content-Type': 'application/json'
};
const WF_ID = 'iwi2iZ8mUFFNslnD';

async function main() {
  const r = await fetch(`https://babarnawaz.app.n8n.cloud/api/v1/workflows/${WF_ID}`, { headers: h });
  const wf = await r.json();

  // Check Resume webhook method
  const resumeWebhook = wf.nodes.find(n => n.name === 'Webhook — Resume');
  if (resumeWebhook) {
    console.log('Resume Webhook current config:');
    console.log('  httpMethod:', resumeWebhook.parameters.httpMethod || '(default=GET)');
    console.log('  path:', resumeWebhook.parameters.path);
    console.log('  responseMode:', resumeWebhook.parameters.responseMode);
    
    // Vapi tools ALWAYS send POST, so we need to accept POST
    // But the frontend also uses GET for resume check
    // Fix: change to accept POST (Vapi is the primary caller)
    if (!resumeWebhook.parameters.httpMethod || resumeWebhook.parameters.httpMethod === 'GET') {
      console.log('\n  ⚠️  Method is GET, but Vapi tools send POST');
      console.log('  Changing to POST...');
      resumeWebhook.parameters.httpMethod = 'POST';
    }
  }

  // Also check the Extract Query node — it might be reading from query params 
  // instead of POST body for the resume flow
  const extractQuery = wf.nodes.find(n => n.name === 'Extract Query');
  if (extractQuery) {
    console.log('\nExtract Query current code:');
    console.log(extractQuery.parameters.jsCode);
    
    // Fix it to handle both POST body and query params
    extractQuery.parameters.jsCode = `// Handle both POST body (from Vapi tools) and GET query params
const input = $input.first().json;
// Vapi sends tool params in body.message.toolCallList[0].function.arguments 
// or directly as body params
const body = input.body || input;
const query = input.query || {};

// Try to get session_id from Vapi tool call format
let sessionId = '';
let email = '';
let customerName = '';

// Check if this is a Vapi tool call
if (body.message?.toolCallList?.[0]?.function?.arguments) {
  const args = body.message.toolCallList[0].function.arguments;
  sessionId = args.session_id || '';
  email = args.email || '';
  customerName = args.customer_name || args.customerName || '';
} else {
  // Direct POST or GET query params
  sessionId = body.session_id || body.sessionId || query.session_id || '';
  email = body.email || query.email || '';
  customerName = body.customerName || body.customer_name || query.customer || '';
}

return [{ json: { sessionId, email, customerName, sessionKey: email + '_' + customerName } }];`;
    console.log('\n✅ Fixed Extract Query to handle both Vapi tool calls and direct requests');
  }

  // Push
  console.log('\nPushing fix...');
  const ur = await fetch(`https://babarnawaz.app.n8n.cloud/api/v1/workflows/${WF_ID}`, {
    method: 'PUT',
    headers: h,
    body: JSON.stringify({
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: { executionOrder: 'v1' },
    }),
  });
  const ud = await ur.json();
  console.log(ud.id ? '✅ Workflow updated' : '❌ ' + JSON.stringify(ud).substring(0, 300));

  await fetch(`https://babarnawaz.app.n8n.cloud/api/v1/workflows/${WF_ID}/activate`, {
    method: 'POST', headers: h, body: '{}'
  });
  console.log('✅ Activated');
}

main();
