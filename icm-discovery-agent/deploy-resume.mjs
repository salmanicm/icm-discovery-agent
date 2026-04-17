#!/usr/bin/env node
/**
 * deploy-resume.mjs
 * Updates the iCM Discovery workflow with smart session resume.
 * - Fixes duplicate Google Drive folders (search before create)
 * - Saves partial transcripts to Drive on early exit
 * - Returns previous transcript on resume check
 * - Cleans up PARTIAL files on session complete
 */

const API_BASE = 'https://babarnawaz.app.n8n.cloud/api/v1';
const API_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGYwNjQ2ZC01MjA0LTRjYjgtOWNlZS1hMTZjMTBiZmRjNjkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWIwZTVjMDgtMjQ3NC00NzVhLThhMjEtYjFhMDFlMmZjMGE5IiwiaWF0IjoxNzczMzEzNzM0fQ.hHLXDFHfbMvNPs8GTZekHNpWm9dpT7H5n6vELq5A8yM';
const WF_ID    = 'iwi2iZ8mUFFNslnD';

const DRIVE_PARENT  = '1FgLI7kMbaIfmcq-Az5vEgzOTLkylAmGh';
const SHEET_ID      = '1Q1rfERybmeFSHpHHQ_FWZrWPHYYeqkH7LyZ21euNt0s';
const DRIVE_CRED    = { id: '7ZO1go4lJ59PzCIv', name: 'Google Drive account' };
const SHEETS_CRED   = { id: 'd3VzbfljgRj0nDRH', name: 'Salman MalikGoogle Sheets oAuth' };
const GMAIL_CRED    = { id: 'HmaWzN29ktdhWnSg', name: 'Salman Malik Gmail OAuth' };

/* ─── Helper: build a Drive search query for a folder by name ─── */
function driveSearchQuery(nameExpr) {
  return `={{ "name='" + ${nameExpr} + "' and mimeType='application/vnd.google-apps.folder' and '${DRIVE_PARENT}' in parents and trashed=false" }}`;
}

/* ─── Helper: HTTP Request node to search Google Drive ─── */
function makeSearchNode(id, name, pos, nameExpression) {
  return {
    parameters: {
      method: 'GET',
      url: 'https://www.googleapis.com/drive/v3/files',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleDriveOAuth2Api',
      sendQuery: true,
      queryParameters: {
        parameters: [
          { name: 'q', value: driveSearchQuery(nameExpression) },
          { name: 'fields', value: 'files(id,name)' },
        ],
      },
      options: {},
    },
    name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
    position: pos, id,
    credentials: { googleDriveOAuth2Api: DRIVE_CRED },
  };
}

async function main() {
  /* ── 1. Fetch current workflow ────────────────────────── */
  console.log('1. Fetching current workflow...');
  const getResp = await fetch(`${API_BASE}/workflows/${WF_ID}`, {
    headers: { 'X-N8N-API-KEY': API_KEY },
  });
  if (!getResp.ok) throw new Error(`Fetch failed: ${getResp.status}`);
  const wf = await getResp.json();
  console.log(`   Found: "${wf.name}" with ${wf.nodes.length} nodes`);

  /* ── 2. Modify "Format Resume Response" — include transcript ── */
  console.log('2. Updating Format Resume Response...');
  const fmtNode = wf.nodes.find(n => n.name === 'Format Resume Response');
  if (!fmtNode) throw new Error('Node "Format Resume Response" not found');
  fmtNode.parameters.jsCode = `const row = $input.first()?.json;
if (row && row.session_key) {
  return [{ json: {
    hasSession: true,
    sessionId: row.session_id || '',
    lastCompletedStage: row.last_completed_stage || '',
    firstName: row.first_name || '',
    previousTranscript: row.transcript || ''
  } }];
}
return [{ json: { hasSession: false } }];`;

  /* ── 3. Modify "Extract Payload" — COMPLETE_ prefix ────── */
  console.log('3. Updating Extract Payload filename prefix...');
  const extractNode = wf.nodes.find(n => n.name === 'Extract Payload');
  if (!extractNode) throw new Error('Node "Extract Payload" not found');
  extractNode.parameters.jsCode = extractNode.parameters.jsCode.replace(
    "const fileName = safeDept + '_' + safeFirst + '_' + safeLast + '_' + sessionDate;",
    "const fileName = 'COMPLETE_' + safeDept + '_' + safeFirst + '_' + safeLast + '_' + sessionDate;"
  );

  /* ── 4. Add search-before-create to Complete flow ──────── */
  console.log('4. Adding folder search to Complete flow...');

  // Move existing nodes right to make space
  const completeNodes = ['Create Customer Folder', 'Prepare File Data',
    'Save Transcript File', 'Email SI Manager', 'Email Respondent',
    'Clear Session Record', 'Respond — Complete'];
  completeNodes.forEach(name => {
    const n = wf.nodes.find(x => x.name === name);
    if (n) n.position[0] += 700; // shift right
  });

  // NEW: Search Folder node
  wf.nodes.push(makeSearchNode(
    'search-folder-complete', 'Search Folder — Complete',
    [740, 0], "$('Extract Payload').first().json.customerName"
  ));

  // NEW: Process Search Result — Complete
  wf.nodes.push({
    parameters: {
      jsCode: `const payload = $('Extract Payload').first().json;
const searchResult = $input.first().json;
const files = searchResult.files || [];
if (files.length > 0) {
  return [{ json: { ...payload, customerFolderId: files[0].id, folderFound: true } }];
}
return [{ json: { ...payload, folderFound: false } }];`,
    },
    name: 'Process Search — Complete',
    type: 'n8n-nodes-base.code', typeVersion: 2,
    position: [960, 0], id: 'process-search-complete',
  });

  // NEW: IF Folder Found
  wf.nodes.push({
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [{
          id: 'folder-check',
          leftValue: '={{ $json.folderFound }}',
          rightValue: true,
          operator: { type: 'boolean', operation: 'true' },
        }],
        combinator: 'and',
      },
      options: {},
    },
    name: 'Folder Found? — Complete',
    type: 'n8n-nodes-base.if', typeVersion: 2,
    position: [1180, 0], id: 'if-folder-complete',
  });

  // Modify "Prepare File Data" to handle both branches
  const prepNode = wf.nodes.find(n => n.name === 'Prepare File Data');
  prepNode.parameters.jsCode = `const input = $input.first().json;
const payload = $('Extract Payload').first().json;
const customerFolderId = input.customerFolderId || input.id;
return [{ json: { ...payload, customerFolderId } }];`;

  // NEW: List Partial Files (for cleanup)
  wf.nodes.push({
    parameters: {
      method: 'GET',
      url: 'https://www.googleapis.com/drive/v3/files',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleDriveOAuth2Api',
      sendQuery: true,
      queryParameters: {
        parameters: [
          {
            name: 'q',
            value: `={{ "name contains 'PARTIAL_' and '" + $('Prepare File Data').first().json.customerFolderId + "' in parents and trashed=false" }}`,
          },
          { name: 'fields', value: 'files(id,name)' },
        ],
      },
      options: {},
    },
    name: 'List Partial Files',
    type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
    position: [2960, 200], id: 'list-partials',
    credentials: { googleDriveOAuth2Api: DRIVE_CRED },
  });

  // NEW: Split & Delete Partials
  wf.nodes.push({
    parameters: {
      jsCode: `const files = $input.first().json.files || [];
if (files.length === 0) return [];
return files.map(f => ({ json: { fileId: f.id, fileName: f.name } }));`,
    },
    name: 'Split Partial IDs',
    type: 'n8n-nodes-base.code', typeVersion: 2,
    position: [3180, 200], id: 'split-partials',
  });

  wf.nodes.push({
    parameters: {
      method: 'DELETE',
      url: '={{ "https://www.googleapis.com/drive/v3/files/" + $json.fileId }}',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googleDriveOAuth2Api',
      options: {},
    },
    name: 'Delete Partial Files',
    type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2,
    position: [3400, 200], id: 'delete-partials',
    credentials: { googleDriveOAuth2Api: DRIVE_CRED },
    continueOnFail: true,
  });

  /* ── 5. Add Drive save to Save/Partial flow ────────────── */
  console.log('5. Adding Drive save to Partial/Save flow...');

  // Move Respond — Save further right
  const respondSave = wf.nodes.find(n => n.name === 'Respond — Save');
  if (respondSave) respondSave.position = [2800, 480];

  // NEW: Search Folder — Save
  wf.nodes.push(makeSearchNode(
    'search-folder-save', 'Search Folder — Save',
    [980, 480], "$('Extract Save Data').first().json.customer_name"
  ));

  // NEW: Process Search — Save
  wf.nodes.push({
    parameters: {
      jsCode: `const saveData = $('Extract Save Data').first().json;
const searchResult = $input.first().json;
const files = searchResult.files || [];
if (files.length > 0) {
  return [{ json: { ...saveData, customerFolderId: files[0].id, folderFound: true } }];
}
return [{ json: { ...saveData, folderFound: false } }];`,
    },
    name: 'Process Search — Save',
    type: 'n8n-nodes-base.code', typeVersion: 2,
    position: [1200, 480], id: 'process-search-save',
  });

  // NEW: IF Folder Found — Save
  wf.nodes.push({
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [{
          id: 'folder-check-save',
          leftValue: '={{ $json.folderFound }}',
          rightValue: true,
          operator: { type: 'boolean', operation: 'true' },
        }],
        combinator: 'and',
      },
      options: {},
    },
    name: 'Folder Found? — Save',
    type: 'n8n-nodes-base.if', typeVersion: 2,
    position: [1420, 480], id: 'if-folder-save',
  });

  // NEW: Create Folder — Save
  wf.nodes.push({
    parameters: {
      resource: 'folder',
      name: '={{ $json.customer_name }}',
      driveId: { __rl: true, value: 'myDrive', mode: 'list' },
      folderId: { __rl: true, value: DRIVE_PARENT, mode: 'id' },
      options: {},
    },
    name: 'Create Folder — Save',
    type: 'n8n-nodes-base.googleDrive', typeVersion: 3,
    position: [1640, 580], id: 'create-folder-save',
    credentials: { googleDriveOAuth2Api: DRIVE_CRED },
  });

  // NEW: Prepare Partial Data
  wf.nodes.push({
    parameters: {
      jsCode: `const input = $input.first().json;
const saveData = $('Extract Save Data').first().json;
const folderId = input.customerFolderId || input.id;
const now = new Date().toISOString().split('T')[0];
const safeFirst = (saveData.first_name || '').replace(/[^a-zA-Z0-9]/g, '');
const safeLast = (saveData.last_name || '').replace(/[^a-zA-Z0-9]/g, '');
const fileName = 'PARTIAL_' + safeFirst + '_' + safeLast + '_' + now;

const docContent = [
  '========================================',
  '[PARTIAL SESSION — NOT COMPLETE]',
  '========================================',
  'Customer:     ' + saveData.customer_name,
  'Name:         ' + saveData.first_name + ' ' + saveData.last_name,
  'Email:        ' + saveData.email,
  'Last Stage:   ' + (saveData.last_completed_stage || 'Unknown'),
  'Saved At:     ' + new Date().toISOString(),
  '========================================', '',
  'TRANSCRIPT SO FAR',
  '----------------------------------------', '',
  saveData.transcript || '[No transcript captured]', '',
  '----------------------------------------',
  'End of Partial Transcript',
  '========================================',
].join('\\n');

return [{ json: { folderId, fileName, docContent, toolCallId: saveData.toolCallId || '' } }];`,
    },
    name: 'Prepare Partial Data',
    type: 'n8n-nodes-base.code', typeVersion: 2,
    position: [1860, 480], id: 'prepare-partial-data',
  });

  // NEW: Save Partial Transcript (Google Drive)
  wf.nodes.push({
    parameters: {
      operation: 'createFromText',
      content: '={{ $json.docContent }}',
      name: '={{ $json.fileName }}.txt',
      driveId: { __rl: true, value: 'myDrive', mode: 'list' },
      folderId: { __rl: true, value: '={{ $json.folderId }}', mode: 'id' },
      options: {},
    },
    name: 'Save Partial Transcript',
    type: 'n8n-nodes-base.googleDrive', typeVersion: 3,
    position: [2100, 480], id: 'save-partial-transcript',
    credentials: { googleDriveOAuth2Api: DRIVE_CRED },
  });

  // NEW: Respond After Save (respond with Vapi-compatible format)
  wf.nodes.push({
    parameters: {
      jsCode: `const saveData = $('Extract Save Data').first().json;
const toolCallId = saveData.toolCallId || '';
if (toolCallId) {
  return [{ json: { results: [{ toolCallId, result: 'Session progress and transcript saved to Drive.' }] } }];
}
return [{ json: { success: true, message: 'Session and transcript saved' } }];`,
    },
    name: 'Format Save Response',
    type: 'n8n-nodes-base.code', typeVersion: 2,
    position: [2400, 480], id: 'format-save-response',
  });

  /* ── 6. Update ALL connections ─────────────────────────── */
  console.log('6. Rebuilding connections...');

  wf.connections = {
    /* ── COMPLETE FLOW ─────────────────────────────────── */
    'Webhook — Complete': { main: [[{ node: 'Extract Payload', type: 'main', index: 0 }]] },
    'Extract Payload':    { main: [[{ node: 'Search Folder — Complete', type: 'main', index: 0 }]] },
    'Search Folder — Complete': { main: [[{ node: 'Process Search — Complete', type: 'main', index: 0 }]] },
    'Process Search — Complete': { main: [[{ node: 'Folder Found? — Complete', type: 'main', index: 0 }]] },
    'Folder Found? — Complete': {
      main: [
        [{ node: 'Prepare File Data', type: 'main', index: 0 }],   // output 0: true (folder found)
        [{ node: 'Create Customer Folder', type: 'main', index: 0 }], // output 1: false (create)
      ],
    },
    'Create Customer Folder': { main: [[{ node: 'Prepare File Data', type: 'main', index: 0 }]] },
    'Prepare File Data':      { main: [[{ node: 'Save Transcript File', type: 'main', index: 0 }]] },
    'Save Transcript File': {
      main: [[
        { node: 'Email SI Manager', type: 'main', index: 0 },
        { node: 'Email Respondent', type: 'main', index: 0 },
        { node: 'List Partial Files', type: 'main', index: 0 },
      ]],
    },
    'Email SI Manager':     { main: [[{ node: 'Clear Session Record', type: 'main', index: 0 }]] },
    'Clear Session Record': { main: [[{ node: 'Respond — Complete', type: 'main', index: 0 }]] },
    'List Partial Files':   { main: [[{ node: 'Split Partial IDs', type: 'main', index: 0 }]] },
    'Split Partial IDs':    { main: [[{ node: 'Delete Partial Files', type: 'main', index: 0 }]] },

    /* ── RESUME FLOW ───────────────────────────────────── */
    'Webhook — Resume':       { main: [[{ node: 'Extract Query', type: 'main', index: 0 }]] },
    'Extract Query':          { main: [[{ node: 'Lookup Session', type: 'main', index: 0 }]] },
    'Lookup Session':         { main: [[{ node: 'Format Resume Response', type: 'main', index: 0 }]] },
    'Format Resume Response': { main: [[{ node: 'Respond — Resume', type: 'main', index: 0 }]] },

    /* ── SAVE FLOW (now with Drive save) ───────────────── */
    'Webhook — Save':     { main: [[{ node: 'Extract Save Data', type: 'main', index: 0 }]] },
    'Extract Save Data':  { main: [[{ node: 'Save to Sheet', type: 'main', index: 0 }]] },
    'Save to Sheet':      { main: [[{ node: 'Search Folder — Save', type: 'main', index: 0 }]] },
    'Search Folder — Save':    { main: [[{ node: 'Process Search — Save', type: 'main', index: 0 }]] },
    'Process Search — Save':   { main: [[{ node: 'Folder Found? — Save', type: 'main', index: 0 }]] },
    'Folder Found? — Save': {
      main: [
        [{ node: 'Prepare Partial Data', type: 'main', index: 0 }],     // output 0: true (found)
        [{ node: 'Create Folder — Save', type: 'main', index: 0 }],     // output 1: false (create)
      ],
    },
    'Create Folder — Save':    { main: [[{ node: 'Prepare Partial Data', type: 'main', index: 0 }]] },
    'Prepare Partial Data':    { main: [[{ node: 'Save Partial Transcript', type: 'main', index: 0 }]] },
    'Save Partial Transcript': { main: [[{ node: 'Format Save Response', type: 'main', index: 0 }]] },
    'Format Save Response':    { main: [[{ node: 'Respond — Save', type: 'main', index: 0 }]] },

    /* ── CLEAR FLOW (unchanged) ────────────────────────── */
    'Webhook — Clear':    { main: [[{ node: 'Extract Clear Data', type: 'main', index: 0 }]] },
    'Extract Clear Data': { main: [[{ node: 'Delete From Sheet', type: 'main', index: 0 }]] },
    'Delete From Sheet':  { main: [[{ node: 'Respond — Clear', type: 'main', index: 0 }]] },
  };

  /* ── 7. Deploy ─────────────────────────────────────────── */
  console.log('7. Deploying updated workflow...');
  // Only include allowed settings fields
  const cleanSettings = {
    executionOrder: wf.settings?.executionOrder || 'v1',
  };
  const putBody = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: cleanSettings,
  };

  const putResp = await fetch(`${API_BASE}/workflows/${WF_ID}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(putBody),
  });

  if (!putResp.ok) {
    const err = await putResp.text();
    throw new Error(`Deploy failed (${putResp.status}): ${err}`);
  }

  const result = await putResp.json();
  console.log(`\n✅ Workflow "${result.name}" deployed successfully!`);
  console.log(`   Nodes: ${result.nodes.length}`);
  console.log(`   Active: ${result.active}`);

  /* ── 8. Activate if not active ─────────────────────────── */
  if (!result.active) {
    console.log('8. Activating workflow...');
    const actResp = await fetch(`${API_BASE}/workflows/${WF_ID}/activate`, {
      method: 'POST',
      headers: { 'X-N8N-API-KEY': API_KEY },
    });
    console.log(`   Activation: ${actResp.status}`);
  }

  console.log('\n🎯 Summary of changes:');
  console.log('  ✅ Resume check now returns previousTranscript');
  console.log('  ✅ Complete flow: search folder before create (no duplicates)');
  console.log('  ✅ Complete flow: COMPLETE_ prefix on transcript files');
  console.log('  ✅ Complete flow: auto-deletes PARTIAL_ files');
  console.log('  ✅ Save flow: saves PARTIAL transcript to Google Drive');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
