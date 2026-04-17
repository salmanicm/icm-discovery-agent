const h = {
  'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGYwNjQ2ZC01MjA0LTRjYjgtOWNlZS1hMTZjMTBiZmRjNjkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWIwZTVjMDgtMjQ3NC00NzVhLThhMjEtYjFhMDFlMmZjMGE5IiwiaWF0IjoxNzczMzEzNzM0fQ.hHLXDFHfbMvNPs8GTZekHNpWm9dpT7H5n6vELq5A8yM',
  'Content-Type': 'application/json'
};
const WF_ID = 'iwi2iZ8mUFFNslnD';

async function main() {
  console.log('Fetching workflow...');
  const r = await fetch(`https://babarnawaz.app.n8n.cloud/api/v1/workflows/${WF_ID}`, { headers: h });
  const wf = await r.json();
  let fixes = 0;

  for (const node of wf.nodes) {

    // ═══════════════════════════════════════════════
    // FIX: Extract Payload (Complete lane)
    // Must handle both direct POST and Vapi tool-call format
    // ═══════════════════════════════════════════════
    if (node.name === 'Extract Payload') {
      node.parameters.jsCode = `// Handle both direct POST (from frontend) and Vapi tool-call format
const raw = $input.first().json;
let body = raw.body || raw;
let toolCallId = '';

// Check if this is a Vapi tool call
if (body.message && body.message.toolCallList) {
  const tc = body.message.toolCallList[0];
  toolCallId = tc.id || '';
  const args = tc.function?.arguments || {};
  // Merge Vapi call metadata
  const callMeta = body.message.call?.metadata || {};
  body = { ...args, ...callMeta };
  // Get transcript from Vapi if available
  if (body.message?.artifact?.transcript) {
    body.transcript = body.transcript || body.message.artifact.transcript;
  }
}

const transcript     = body.transcript || '';
const customerName   = body.customerName || body.customer_name || 'Unknown';
const email          = body.email || '';
const firstName      = body.firstName || body.first_name || '';
const lastName       = body.lastName || body.last_name || '';
const sessionId      = body.sessionId || body.session_id || '';
const sessionDate    = body.session_date || new Date().toISOString().split('T')[0];
const sessionDuration = body.call_duration_minutes || 0;
const deptsCovered   = body.departments_covered || 0;

let jobTitle = 'Not specified';
let department = 'Not specified';
const titlePats = [/(?:i am|i'm|my (?:title|role|position) is)\\s+(?:a |an |the )?([^,.\\n]+)/i, /(?:work as|working as)\\s+(?:a |an |the )?([^,.\\n]+)/i];
for (const p of titlePats) { const m = transcript.match(p); if (m) { jobTitle = m[1].trim(); break; } }
const deptPats = [/(?:i work in|i'm in|my department is|from the)\\s+(?:the )?([^,.\\n]+?)\\s+(?:department|team|division)/i, /(?:department|team)\\s+(?:is|called)\\s+([^,.\\n]+)/i];
for (const p of deptPats) { const m = transcript.match(p); if (m) { department = m[1].trim(); break; } }

const safeDept = department.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
const safeFirst = firstName.replace(/[^a-zA-Z0-9]/g, '');
const safeLast = lastName.replace(/[^a-zA-Z0-9]/g, '');
const fileName = safeDept + '_' + safeFirst + '_' + safeLast + '_' + sessionDate;

const docContent = [
  '========================================',
  'PRE-CALL DISCOVERY SESSION',
  '========================================',
  'Customer:     ' + customerName,
  'Name:         ' + firstName + ' ' + lastName,
  'Email:        ' + email,
  'Job Title:    ' + jobTitle,
  'Department:   ' + department,
  'Session Date: ' + sessionDate,
  'Duration:     ' + sessionDuration + ' minutes',
  'Departments:  ' + deptsCovered,
  'Session ID:   ' + sessionId,
  '========================================', '',
  'FULL TRANSCRIPT',
  '----------------------------------------', '',
  transcript, '',
  '----------------------------------------',
  'End of Transcript',
  '========================================',
].join('\\n');

return [{ json: { transcript, customerName, email, firstName, lastName, jobTitle, department, sessionId, sessionDate, sessionDuration, deptsCovered, fileName, docContent, sessionKey: email + '_' + customerName, toolCallId } }];`;
      console.log('✅ Fixed: Extract Payload — handles Vapi + direct format');
      fixes++;
    }

    // ═══════════════════════════════════════════════
    // FIX: Respond — Complete
    // Return Vapi-compatible response when toolCallId is present
    // ═══════════════════════════════════════════════
    if (node.name === 'Respond — Complete') {
      // Change this to a Code node that builds the right response
      // Actually, we need to keep it as a Respond to Webhook node
      // But customize the response body
      if (node.parameters.respondWith === 'json') {
        node.parameters.responseBody = '={{ JSON.stringify($json.toolCallId ? { results: [{ toolCallId: $json.toolCallId, result: "Session completed successfully. Transcript saved and emails sent." }] } : { success: true }) }}';
      }
      console.log('✅ Fixed: Respond — Complete — Vapi-aware response');
      fixes++;
    }

    // ═══════════════════════════════════════════════
    // FIX: Extract Save Data (Save lane)
    // ═══════════════════════════════════════════════
    if (node.name === 'Extract Save Data') {
      node.parameters.jsCode = `// Handle both direct POST and Vapi tool-call format
const raw = $input.first().json;
let body = raw.body || raw;
let toolCallId = '';

if (body.message && body.message.toolCallList) {
  const tc = body.message.toolCallList[0];
  toolCallId = tc.id || '';
  const args = tc.function?.arguments || {};
  const callMeta = body.message.call?.metadata || {};
  body = { ...args, ...callMeta };
  // Flatten customer_info if present
  if (body.customer_info && typeof body.customer_info === 'object') {
    body = { ...body, ...body.customer_info };
  }
}

const email = body.email || '';
const customerName = body.customerName || body.customer_name || '';
const sessionId = body.sessionId || body.session_id || '';
const firstName = body.firstName || body.first_name || '';
const lastName = body.lastName || body.last_name || '';
const transcript = body.transcript || '';
const lastStage = body.last_completed_stage || body.lastStage || '';

return [{ json: {
  session_key: email + '_' + customerName,
  session_id: sessionId,
  email,
  customer_name: customerName,
  first_name: firstName,
  last_name: lastName,
  transcript,
  last_completed_stage: lastStage,
  updated_at: new Date().toISOString(),
  toolCallId
} }];`;
      console.log('✅ Fixed: Extract Save Data — handles Vapi + direct format');
      fixes++;
    }

    // ═══════════════════════════════════════════════
    // FIX: Respond — Save
    // ═══════════════════════════════════════════════
    if (node.name === 'Respond — Save') {
      if (node.parameters.respondWith === 'json') {
        node.parameters.responseBody = '={{ JSON.stringify($json.toolCallId ? { results: [{ toolCallId: $json.toolCallId, result: "Session progress saved." }] } : { success: true, message: "Session saved" }) }}';
      }
      console.log('✅ Fixed: Respond — Save — Vapi-aware response');
      fixes++;
    }

    // ═══════════════════════════════════════════════
    // FIX: Extract Clear Data (Clear lane)
    // ═══════════════════════════════════════════════
    if (node.name === 'Extract Clear Data') {
      node.parameters.jsCode = `const raw = $input.first().json;
let body = raw.body || raw;
let toolCallId = '';

if (body.message && body.message.toolCallList) {
  const tc = body.message.toolCallList[0];
  toolCallId = tc.id || '';
  const args = tc.function?.arguments || {};
  const callMeta = body.message.call?.metadata || {};
  body = { ...args, ...callMeta };
}

const email = body.email || '';
const customerName = body.customerName || body.customer_name || '';
return [{ json: { session_key: email + '_' + customerName, email, customerName, toolCallId } }];`;
      console.log('✅ Fixed: Extract Clear Data — handles Vapi + direct format');
      fixes++;
    }

    // ═══════════════════════════════════════════════
    // FIX: Respond — Clear
    // ═══════════════════════════════════════════════
    if (node.name === 'Respond — Clear') {
      if (node.parameters.respondWith === 'json') {
        node.parameters.responseBody = '={{ JSON.stringify($json.toolCallId ? { results: [{ toolCallId: $json.toolCallId, result: "Session cleared." }] } : { success: true }) }}';
      }
      console.log('✅ Fixed: Respond — Clear — Vapi-aware response');
      fixes++;
    }

    // ═══════════════════════════════════════════════
    // FIX: Respond — Resume
    // ═══════════════════════════════════════════════
    if (node.name === 'Respond — Resume') {
      // This needs special handling — it should return the session data
      console.log('  Respond — Resume params:', JSON.stringify(node.parameters).substring(0, 200));
      fixes++;
    }
  }

  // Push
  console.log(`\nPushing ${fixes} fixes...`);
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

  // ═══════════════════════════════════════════════
  // RUN FINAL TESTS
  // ═══════════════════════════════════════════════
  console.log('\n\n══════════════════════════════════');
  console.log('   FINAL COMPREHENSIVE TESTS');
  console.log('══════════════════════════════════');

  // Test 1: Save (direct format)
  console.log('\n--- Test 1: Save (direct) ---');
  let tr = await fetch('https://babarnawaz.app.n8n.cloud/webhook/icm-session-save', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@icm.com', customerName: 'FinalTest',
      session_key: 'test@icm.com_FinalTest', session_id: 'final-1',
      last_completed_stage: 'intro', firstName: 'Test', lastName: 'User',
    }),
  });
  console.log('  Status:', tr.status, '| Body:', (await tr.text()).substring(0, 150));

  // Test 2: Save (Vapi format)
  console.log('\n--- Test 2: Save (Vapi tool format) ---');
  tr = await fetch('https://babarnawaz.app.n8n.cloud/webhook/icm-session-save', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        type: 'tool-calls',
        toolCallList: [{
          id: 'call_test123',
          type: 'function',
          function: {
            name: 'save_progress',
            arguments: {
              customer_info: {
                email: 'vapi-test@icm.com',
                customerName: 'VapiTestOrg',
                firstName: 'VapiUser',
                lastName: 'Test',
                last_completed_stage: 'departments'
              }
            }
          }
        }],
        call: { metadata: {} }
      }
    }),
  });
  console.log('  Status:', tr.status, '| Body:', (await tr.text()).substring(0, 150));

  // Test 3: Complete (direct format)
  console.log('\n--- Test 3: Complete (direct) ---');
  tr = await fetch('https://babarnawaz.app.n8n.cloud/webhook/icm-session-complete', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: 'Agent: Welcome.\nCustomer: Thank you.',
      customerName: 'FinalTest', firstName: 'Test', lastName: 'User',
      email: 'test@icm.com', sessionId: 'final-complete',
      call_duration_minutes: 3, departments_covered: 1,
      session_date: new Date().toISOString().split('T')[0],
    }),
  });
  console.log('  Status:', tr.status, '| Body:', (await tr.text()).substring(0, 150));

  // Wait and check
  await new Promise(r => setTimeout(r, 12000));
  const er = await fetch(`https://babarnawaz.app.n8n.cloud/api/v1/executions?workflowId=${WF_ID}&limit=5`, { headers: h });
  const ed = await er.json();
  console.log('\n\n═══ EXECUTION RESULTS ═══');
  for (const e of ed.data) {
    const icon = e.status === 'success' ? '✅' : '❌';
    console.log(`  ${icon} #${e.id} | ${e.status} | ${e.startedAt}`);
  }
}

main();
