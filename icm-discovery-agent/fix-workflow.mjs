const h = {
  'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGYwNjQ2ZC01MjA0LTRjYjgtOWNlZS1hMTZjMTBiZmRjNjkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWIwZTVjMDgtMjQ3NC00NzVhLThhMjEtYjFhMDFlMmZjMGE5IiwiaWF0IjoxNzczMzEzNzM0fQ.hHLXDFHfbMvNPs8GTZekHNpWm9dpT7H5n6vELq5A8yM',
  'Content-Type': 'application/json'
};
const WF_ID = 'iwi2iZ8mUFFNslnD';
const SHEET_ID = '1Q1rfERybmeFSHpHHQ_FWZrWPHYYeqkH7LyZ21euNt0s';

async function main() {
  console.log('Fetching workflow...');
  const r = await fetch(`https://babarnawaz.app.n8n.cloud/api/v1/workflows/${WF_ID}`, { headers: h });
  const wf = await r.json();

  let fixes = 0;

  for (const node of wf.nodes) {

    // ── FIX 1: Email Respondent ──
    // The node receives data from Save Transcript File which outputs Drive metadata.
    // It needs to reference $('Prepare File Data') or $('Extract Payload') for the original data.
    if (node.name === 'Email Respondent') {
      node.parameters.sendTo = "={{ $('Prepare File Data').first().json.email }}";
      // Also fix the message template to reference the right data source
      node.parameters.message = node.parameters.message
        .replace(/\{\{\s*\$json\.firstName\s*\}\}/g, "{{ $('Prepare File Data').first().json.firstName }}")
        .replace(/\{\{\s*\$json\.customerName\s*\}\}/g, "{{ $('Prepare File Data').first().json.customerName }}");
      console.log('✅ Fix 1: Email Respondent — sendTo now references Prepare File Data');
      fixes++;
    }

    // ── FIX 2: Email SI Manager ──
    // Same issue — sendTo is hardcoded which is fine, but the subject/body reference $json
    // which comes from Save Transcript File, not the payload.
    if (node.name === 'Email SI Manager') {
      // Fix subject line
      node.parameters.subject = "=✅ Discovery Session Complete — {{ $('Prepare File Data').first().json.customerName }} — {{ $('Prepare File Data').first().json.department }} — {{ $('Prepare File Data').first().json.firstName }} {{ $('Prepare File Data').first().json.lastName }}";
      // Fix message body
      node.parameters.message = node.parameters.message
        .replace(/\{\{\s*\$json\.(\w+)\s*\}\}/g, "{{ $('Prepare File Data').first().json.$1 }}");
      console.log('✅ Fix 2: Email SI Manager — references now point to Prepare File Data');
      fixes++;
    }

    // ── FIX 3: Save to Sheet ──
    // sheetName mode should be "name" not "list" when using display name
    if (node.name === 'Save to Sheet') {
      node.parameters.sheetName = {
        __rl: true,
        value: 'Sheet1',
        mode: 'name'
      };
      console.log('✅ Fix 3: Save to Sheet — sheetName mode changed to "name"');
      fixes++;
    }

    // Also fix Delete From Sheet if it has the same issue
    if (node.name === 'Delete From Sheet') {
      if (node.parameters?.sheetName?.mode === 'list') {
        node.parameters.sheetName = {
          __rl: true,
          value: 'Sheet1',
          mode: 'name'
        };
        console.log('✅ Fix 3b: Delete From Sheet — sheetName mode changed to "name"');
        fixes++;
      }
    }

    // Also fix Lookup Session if it has the same issue
    if (node.name === 'Lookup Session') {
      if (node.parameters?.sheetName?.mode === 'list') {
        node.parameters.sheetName = {
          __rl: true,
          value: 'Sheet1',
          mode: 'name'
        };
        console.log('✅ Fix 3c: Lookup Session — sheetName mode changed to "name"');
        fixes++;
      }
    }
  }

  // Also fix the connection: Save Transcript File should pass data through,
  // but emails should get their data from Prepare File Data node
  // The connection is: Save Transcript File → [Email SI Manager, Email Respondent]
  // This is correct, but the nodes need to reference earlier data via expressions.
  // Already fixed above with $('Prepare File Data').first().json

  console.log(`\nApplying ${fixes} fixes...`);
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
  if (ud.id) {
    console.log('✅ Workflow updated');
  } else {
    console.log('❌ Failed:', JSON.stringify(ud).substring(0, 500));
    return;
  }

  await fetch(`https://babarnawaz.app.n8n.cloud/api/v1/workflows/${WF_ID}/activate`, {
    method: 'POST', headers: h, body: '{}'
  });
  console.log('✅ Activated\n');

  // ── TEST 1: Save ──
  console.log('=== TEST: Session Save ===');
  const sr = await fetch('https://babarnawaz.app.n8n.cloud/webhook/icm-session-save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'babar@icaremanager.com',
      customerName: 'TestOrg',
      sessionId: 'save-fix-' + Date.now(),
      session_key: 'babar@icaremanager.com_TestOrg',
      session_id: 'save-fix-' + Date.now(),
      last_completed_stage: 'departments',
      firstName: 'Babar',
      lastName: 'Test',
    }),
  });
  console.log('Save status:', sr.status, '| Body:', (await sr.text()).substring(0, 200));
  await new Promise(r => setTimeout(r, 5000));

  // ── TEST 2: Complete ──
  console.log('\n=== TEST: Session Complete ===');
  const cr = await fetch('https://babarnawaz.app.n8n.cloud/webhook/icm-session-complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: 'Agent: Welcome to iCareManager Discovery.\nCustomer: Thank you. We serve 200 individuals.',
      customerName: 'TestOrg',
      firstName: 'Babar',
      lastName: 'Test',
      email: 'babar@icaremanager.com',
      sessionId: 'complete-fix-' + Date.now(),
      call_duration_minutes: 5,
      departments_covered: 2,
      session_date: new Date().toISOString().split('T')[0],
    }),
  });
  console.log('Complete status:', cr.status, '| Body:', (await cr.text()).substring(0, 200));
  await new Promise(r => setTimeout(r, 12000));

  // Check all latest
  const er = await fetch(`https://babarnawaz.app.n8n.cloud/api/v1/executions?workflowId=${WF_ID}&limit=5`, { headers: h });
  const ed = await er.json();
  console.log('\nLatest executions:');
  ed.data.forEach(e => console.log(' ', e.id, '|', e.status));

  // Get details of the new ones
  for (const exec of ed.data.slice(0, 2)) {
    const dr = await fetch(`https://babarnawaz.app.n8n.cloud/api/v1/executions/${exec.id}?includeData=true`, { headers: h });
    const dd = await dr.json();
    console.log(`\nExecution ${exec.id} (${exec.status}):`);
    const runData = dd.data?.resultData?.runData;
    if (runData) {
      for (const [name, runs] of Object.entries(runData)) {
        for (const run of runs) {
          if (run.error) console.log(`  ❌ ${name}: ${run.error.message?.substring(0, 150)}`);
          else console.log(`  ✅ ${name}`);
        }
      }
    }
  }
}

main();
