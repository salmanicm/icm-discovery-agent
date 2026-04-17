/**
 * Deploy a single merged iCM Discovery workflow with 4 webhook triggers
 */

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGYwNjQ2ZC01MjA0LTRjYjgtOWNlZS1hMTZjMTBiZmRjNjkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWIwZTVjMDgtMjQ3NC00NzVhLThhMjEtYjFhMDFlMmZjMGE5IiwiaWF0IjoxNzczMzEzNzM0fQ.hHLXDFHfbMvNPs8GTZekHNpWm9dpT7H5n6vELq5A8yM';
const BASE = 'https://babarnawaz.app.n8n.cloud/api/v1';
const headers = { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' };

const GOOGLE_DRIVE_CRED  = { googleDriveOAuth2Api: { id: '7ZO1go4lJ59PzCIv', name: 'Google Drive account' } };
const GMAIL_CRED         = { gmailOAuth2: { id: 'HmaWzN29ktdhWnSg', name: 'Salman Malik Gmail OAuth' } };
const GOOGLE_SHEETS_CRED = { googleSheetsOAuth2Api: { id: 'd3VzbfljgRj0nDRH', name: 'Salman MalikGoogle Sheets oAuth' } };

// Y positions for 4 lanes
const Y_COMPLETE = 0;
const Y_RESUME   = 600;
const Y_SAVE     = 1000;
const Y_CLEAR    = 1400;

const mergedWorkflow = {
  name: 'iCM Discovery — All Webhooks',
  nodes: [

    // ═══════════════════════════════════════════════════
    // LANE 1 — SESSION COMPLETE (top)
    // ═══════════════════════════════════════════════════
    {
      parameters: { httpMethod: 'POST', path: 'icm-session-complete', responseMode: 'responseNode', options: {} },
      name: 'Webhook — Complete',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [250, Y_COMPLETE],
    },
    {
      parameters: {
        jsCode: `const body = $input.first().json.body || $input.first().json;
const transcript     = body.transcript || '';
const customerName   = body.customerName || body.customer_name || 'Unknown';
const email          = body.email || '';
const firstName      = body.firstName || '';
const lastName       = body.lastName || '';
const sessionId      = body.sessionId || '';
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

return [{ json: { transcript, customerName, email, firstName, lastName, jobTitle, department, sessionId, sessionDate, sessionDuration, deptsCovered, fileName, docContent, sessionKey: email + '_' + customerName } }];`
      },
      name: 'Extract Payload',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [500, Y_COMPLETE],
    },
    {
      parameters: {
        operation: 'search',
        folderId: { __rl: true, value: 'root', mode: 'list' },
        queryString: "=mimeType='application/vnd.google-apps.folder' and name='{{ $json.customerName }}' and trashed=false",
        options: { fields: ['id', 'name'] },
      },
      name: 'Check Customer Folder',
      type: 'n8n-nodes-base.googleDrive',
      typeVersion: 3,
      position: [740, Y_COMPLETE],
      credentials: GOOGLE_DRIVE_CRED,
    },
    {
      parameters: {
        jsCode: `const searchResults = $input.first().json;
const prev = $('Extract Payload').first().json;
let folderId = '';
if (searchResults && searchResults.id) { folderId = searchResults.id; }
return [{ json: { ...prev, customerFolderExists: !!folderId, customerFolderId: folderId } }];`
      },
      name: 'Check Folder Result',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [960, Y_COMPLETE],
    },
    {
      parameters: {
        conditions: {
          options: { version: 2 },
          combinator: 'and',
          conditions: [{ leftValue: '={{ $json.customerFolderExists }}', rightValue: true, operator: { type: 'boolean', operation: 'false' } }]
        }
      },
      name: 'Folder Exists?',
      type: 'n8n-nodes-base.if',
      typeVersion: 2.2,
      position: [1180, Y_COMPLETE],
    },
    {
      parameters: {
        name: '={{ $json.customerName }}',
        driveId: { __rl: true, value: 'myDrive', mode: 'list' },
        folderId: { __rl: true, value: 'root', mode: 'list' },
        options: {},
      },
      name: 'Create Customer Folder',
      type: 'n8n-nodes-base.googleDrive',
      typeVersion: 3,
      position: [1400, Y_COMPLETE - 100],
      credentials: GOOGLE_DRIVE_CRED,
    },
    {
      parameters: {
        jsCode: `const prev = $('Check Folder Result').first().json;
const folderCreated = $input.first().json;
const folderId = prev.customerFolderId || folderCreated.id;
return [{ json: { ...prev, customerFolderId: folderId } }];`
      },
      name: 'Merge Folder ID',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1620, Y_COMPLETE],
    },
    {
      parameters: {
        name: '={{ $json.fileName }}.txt',
        driveId: { __rl: true, value: 'myDrive', mode: 'list' },
        folderId: { __rl: true, value: '={{ $json.customerFolderId }}', mode: 'id' },
        content: '={{ $json.docContent }}',
        options: {},
      },
      name: 'Save Transcript File',
      type: 'n8n-nodes-base.googleDrive',
      typeVersion: 3,
      position: [1840, Y_COMPLETE],
      credentials: GOOGLE_DRIVE_CRED,
    },
    {
      parameters: {
        sendTo: 'salman@crcaregroup.com',
        subject: '=✅ Discovery Session Complete — {{ $json.customerName }} — {{ $json.department }} — {{ $json.firstName }} {{ $json.lastName }}',
        message: `=<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:24px;border-radius:12px 12px 0 0"><h2 style="color:white;margin:0">✅ Discovery Session Complete</h2></div><div style="background:#f8f9fa;padding:24px;border:1px solid #e9ecef"><table style="width:100%;border-collapse:collapse"><tr><td style="padding:8px 0;font-weight:bold">Customer:</td><td>{{ $json.customerName }}</td></tr><tr><td style="padding:8px 0;font-weight:bold">Name:</td><td>{{ $json.firstName }} {{ $json.lastName }}</td></tr><tr><td style="padding:8px 0;font-weight:bold">Email:</td><td>{{ $json.email }}</td></tr><tr><td style="padding:8px 0;font-weight:bold">Job Title:</td><td>{{ $json.jobTitle }}</td></tr><tr><td style="padding:8px 0;font-weight:bold">Department:</td><td>{{ $json.department }}</td></tr><tr><td style="padding:8px 0;font-weight:bold">Date:</td><td>{{ $json.sessionDate }}</td></tr><tr><td style="padding:8px 0;font-weight:bold">Duration:</td><td>{{ $json.sessionDuration }} min</td></tr></table></div><div style="background:white;padding:24px;border:1px solid #e9ecef;border-top:none;border-radius:0 0 12px 12px"><p>The discovery transcript has been saved to Google Drive.</p><a href="https://drive.google.com/file/d/{{ $('Save Transcript File').first().json.id }}/view" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">📄 View Transcript</a></div></div>`,
        options: {},
      },
      name: 'Email SI Manager',
      type: 'n8n-nodes-base.gmail',
      typeVersion: 2.1,
      position: [2080, Y_COMPLETE - 100],
      credentials: GMAIL_CRED,
    },
    {
      parameters: {
        sendTo: '={{ $json.email }}',
        subject: 'Thank You for Completing Your iCareManager Discovery Session',
        message: `=<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:linear-gradient(135deg,#E5521A 0%,#F97316 100%);padding:24px;border-radius:12px 12px 0 0"><h2 style="color:white;margin:0">Thank You, {{ $json.firstName }}!</h2></div><div style="background:white;padding:32px;border:1px solid #e9ecef;border-radius:0 0 12px 12px"><p style="font-size:15px;color:#333;line-height:1.7">Thank you for taking the time to complete your iCareManager discovery session.</p><p style="font-size:15px;color:#333;line-height:1.7">Your responses have been saved and our implementation team will review them carefully. We'll be in touch with you very soon to discuss next steps for your {{ $json.customerName }} implementation.</p><p style="font-size:15px;color:#333;line-height:1.7">If you have any questions in the meantime, reach us at <a href="mailto:support@icaremanager.com">support@icaremanager.com</a>.</p><p style="font-size:14px;color:#666;margin-top:24px;border-top:1px solid #eee;padding-top:16px">— The iCareManager Implementation Team</p></div></div>`,
        options: {},
      },
      name: 'Email Respondent',
      type: 'n8n-nodes-base.gmail',
      typeVersion: 2.1,
      position: [2080, Y_COMPLETE + 100],
      credentials: GMAIL_CRED,
    },
    {
      parameters: {
        operation: 'delete',
        sheetId: { __rl: true, value: '', mode: 'id' },
        filtersUI: { values: [{ lookupColumn: 'session_key', lookupValue: '={{ $json.sessionKey }}' }] },
        options: {},
      },
      name: 'Clear Session Record',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4.5,
      position: [2320, Y_COMPLETE],
      credentials: GOOGLE_SHEETS_CRED,
      continueOnFail: true,
    },
    {
      parameters: { options: {} },
      name: 'Respond — Complete',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1,
      position: [2540, Y_COMPLETE],
    },

    // ═══════════════════════════════════════════════════
    // LANE 2 — RESUME CHECK
    // ═══════════════════════════════════════════════════
    {
      parameters: { httpMethod: 'GET', path: 'icm-resume-check', responseMode: 'responseNode', options: {} },
      name: 'Webhook — Resume',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [250, Y_RESUME],
    },
    {
      parameters: {
        jsCode: `const query = $input.first().json.query || {};
const email = query.email || '';
const customer = query.customer || '';
return [{ json: { email, customer, sessionKey: email + '_' + customer } }];`
      },
      name: 'Extract Query',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [500, Y_RESUME],
    },
    {
      parameters: {
        operation: 'read',
        sheetId: { __rl: true, value: '', mode: 'id' },
        filtersUI: { values: [{ lookupColumn: 'session_key', lookupValue: '={{ $json.sessionKey }}' }] },
        options: {},
      },
      name: 'Lookup Session',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4.5,
      position: [740, Y_RESUME],
      credentials: GOOGLE_SHEETS_CRED,
      continueOnFail: true,
    },
    {
      parameters: {
        jsCode: `const row = $input.first()?.json;
if (row && row.session_key) {
  return [{ json: { hasSession: true, sessionId: row.session_id || '', lastCompletedStage: row.last_completed_stage || '', firstName: row.first_name || '' } }];
}
return [{ json: { hasSession: false } }];`
      },
      name: 'Format Resume Response',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [960, Y_RESUME],
    },
    {
      parameters: {
        respondWith: 'json',
        responseBody: '={{ JSON.stringify($json) }}',
        options: { responseHeaders: { entries: [{ name: 'Access-Control-Allow-Origin', value: '*' }] } },
      },
      name: 'Respond — Resume',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1,
      position: [1180, Y_RESUME],
    },

    // ═══════════════════════════════════════════════════
    // LANE 3 — SESSION SAVE
    // ═══════════════════════════════════════════════════
    {
      parameters: { httpMethod: 'POST', path: 'icm-session-save', responseMode: 'responseNode', options: {} },
      name: 'Webhook — Save',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [250, Y_SAVE],
    },
    {
      parameters: {
        jsCode: `const body = $input.first().json.body || $input.first().json;
return [{ json: {
  session_key: (body.email || '') + '_' + (body.customerName || ''),
  session_id: body.sessionId || '',
  email: body.email || '',
  customer_name: body.customerName || '',
  first_name: body.firstName || '',
  last_name: body.lastName || '',
  last_completed_stage: body.lastCompletedStage || '',
  transcript: (body.transcript || '').substring(0, 50000),
  timestamp: new Date().toISOString(),
} }];`
      },
      name: 'Extract Save Data',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [500, Y_SAVE],
    },
    {
      parameters: {
        operation: 'appendOrUpdate',
        sheetId: { __rl: true, value: '', mode: 'id' },
        columns: {
          mappingMode: 'defineBelow',
          value: {
            session_key: '={{ $json.session_key }}',
            session_id: '={{ $json.session_id }}',
            email: '={{ $json.email }}',
            customer_name: '={{ $json.customer_name }}',
            first_name: '={{ $json.first_name }}',
            last_name: '={{ $json.last_name }}',
            last_completed_stage: '={{ $json.last_completed_stage }}',
            transcript: '={{ $json.transcript }}',
            timestamp: '={{ $json.timestamp }}',
          },
          matchingColumns: ['session_key'],
        },
        options: {},
      },
      name: 'Save to Sheet',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4.5,
      position: [740, Y_SAVE],
      credentials: GOOGLE_SHEETS_CRED,
    },
    {
      parameters: {
        respondWith: 'json',
        responseBody: '={"success": true, "message": "Session saved"}',
        options: { responseHeaders: { entries: [{ name: 'Access-Control-Allow-Origin', value: '*' }] } },
      },
      name: 'Respond — Save',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1,
      position: [960, Y_SAVE],
    },

    // ═══════════════════════════════════════════════════
    // LANE 4 — SESSION CLEAR
    // ═══════════════════════════════════════════════════
    {
      parameters: { httpMethod: 'POST', path: 'icm-session-clear', responseMode: 'responseNode', options: {} },
      name: 'Webhook — Clear',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [250, Y_CLEAR],
    },
    {
      parameters: {
        jsCode: `const body = $input.first().json.body || $input.first().json;
return [{ json: { sessionKey: (body.email || '') + '_' + (body.customerName || '') } }];`
      },
      name: 'Extract Clear Data',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [500, Y_CLEAR],
    },
    {
      parameters: {
        operation: 'delete',
        sheetId: { __rl: true, value: '', mode: 'id' },
        filtersUI: { values: [{ lookupColumn: 'session_key', lookupValue: '={{ $json.sessionKey }}' }] },
        options: {},
      },
      name: 'Delete From Sheet',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4.5,
      position: [740, Y_CLEAR],
      credentials: GOOGLE_SHEETS_CRED,
      continueOnFail: true,
    },
    {
      parameters: {
        respondWith: 'json',
        responseBody: '={"success": true, "message": "Session cleared"}',
        options: { responseHeaders: { entries: [{ name: 'Access-Control-Allow-Origin', value: '*' }] } },
      },
      name: 'Respond — Clear',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1,
      position: [960, Y_CLEAR],
    },
  ],

  connections: {
    // Lane 1 — Complete
    'Webhook — Complete':     { main: [[{ node: 'Extract Payload',      type: 'main', index: 0 }]] },
    'Extract Payload':        { main: [[{ node: 'Check Customer Folder', type: 'main', index: 0 }]] },
    'Check Customer Folder':  { main: [[{ node: 'Check Folder Result',   type: 'main', index: 0 }]] },
    'Check Folder Result':    { main: [[{ node: 'Folder Exists?',        type: 'main', index: 0 }]] },
    'Folder Exists?':         { main: [
      [{ node: 'Create Customer Folder', type: 'main', index: 0 }],
      [{ node: 'Merge Folder ID',        type: 'main', index: 0 }],
    ]},
    'Create Customer Folder': { main: [[{ node: 'Merge Folder ID',       type: 'main', index: 0 }]] },
    'Merge Folder ID':        { main: [[{ node: 'Save Transcript File',  type: 'main', index: 0 }]] },
    'Save Transcript File':   { main: [[
      { node: 'Email SI Manager',   type: 'main', index: 0 },
      { node: 'Email Respondent',   type: 'main', index: 0 },
    ]] },
    'Email SI Manager':       { main: [[{ node: 'Clear Session Record',  type: 'main', index: 0 }]] },
    'Clear Session Record':   { main: [[{ node: 'Respond — Complete',    type: 'main', index: 0 }]] },

    // Lane 2 — Resume
    'Webhook — Resume':        { main: [[{ node: 'Extract Query',          type: 'main', index: 0 }]] },
    'Extract Query':           { main: [[{ node: 'Lookup Session',         type: 'main', index: 0 }]] },
    'Lookup Session':          { main: [[{ node: 'Format Resume Response', type: 'main', index: 0 }]] },
    'Format Resume Response':  { main: [[{ node: 'Respond — Resume',      type: 'main', index: 0 }]] },

    // Lane 3 — Save
    'Webhook — Save':      { main: [[{ node: 'Extract Save Data', type: 'main', index: 0 }]] },
    'Extract Save Data':   { main: [[{ node: 'Save to Sheet',     type: 'main', index: 0 }]] },
    'Save to Sheet':       { main: [[{ node: 'Respond — Save',    type: 'main', index: 0 }]] },

    // Lane 4 — Clear
    'Webhook — Clear':     { main: [[{ node: 'Extract Clear Data', type: 'main', index: 0 }]] },
    'Extract Clear Data':  { main: [[{ node: 'Delete From Sheet',  type: 'main', index: 0 }]] },
    'Delete From Sheet':   { main: [[{ node: 'Respond — Clear',    type: 'main', index: 0 }]] },
  },

  settings: { executionOrder: 'v1' },
};

// ═══════════════════════════════════════════════════════
// DEPLOY
// ═══════════════════════════════════════════════════════
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Deploying merged iCM Discovery workflow');
  console.log('═══════════════════════════════════════════\n');

  // First delete the 4 separate workflows
  const oldIds = ['D1yeGJwU8m6NUEiN', '4wrmKPrpBqtXGkiT', 'b7bfrPoiFk2x9K59', 'Avbm70xh2ThPYrOF'];
  for (const id of oldIds) {
    try {
      const r = await fetch(`${BASE}/workflows/${id}`, { method: 'DELETE', headers });
      console.log(`  🗑️  Deleted old workflow ${id}: ${r.status}`);
    } catch (e) {
      console.log(`  ⚠️  Could not delete ${id}: ${e.message}`);
    }
  }

  // Deploy merged workflow
  console.log('\n📦 Creating merged workflow...');
  const resp = await fetch(`${BASE}/workflows`, {
    method: 'POST',
    headers,
    body: JSON.stringify(mergedWorkflow),
  });
  const data = await resp.json();

  if (data.id) {
    console.log(`✅ Created: ID=${data.id}`);
    console.log(`🔗 Open: https://babarnawaz.app.n8n.cloud/workflow/${data.id}`);
    console.log('');
    console.log('4 webhook paths (all in one workflow):');
    console.log('  POST /webhook/icm-session-complete');
    console.log('  GET  /webhook/icm-resume-check');
    console.log('  POST /webhook/icm-session-save');
    console.log('  POST /webhook/icm-session-clear');
    console.log('');
    console.log('⚠️  Set the Google Sheet ID in these 4 nodes, then activate:');
    console.log('    - Clear Session Record');
    console.log('    - Lookup Session');
    console.log('    - Save to Sheet');
    console.log('    - Delete From Sheet');
  } else {
    console.log('❌ Error:', JSON.stringify(data));
  }
}

main();
