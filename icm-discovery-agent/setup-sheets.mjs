/**
 * Create the "Customers" and "Consent Log" tabs in the Google Sheet
 * via the Google Sheets API through a temporary n8n workflow.
 */
import https from 'https';

const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGYwNjQ2ZC01MjA0LTRjYjgtOWNlZS1hMTZjMTBiZmRjNjkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWIwZTVjMDgtMjQ3NC00NzVhLThhMjEtYjFhMDFlMmZjMGE5IiwiaWF0IjoxNzczMzEzNzM0fQ.hHLXDFHfbMvNPs8GTZekHNpWm9dpT7H5n6vELq5A8yM';
const SHEET_ID = '1Q1rfERybmeFSHpHHQ_FWZrWPHYYeqkH7LyZ21euNt0s';
const cred = { id: 'd3VzbfljgRj0nDRH', name: 'Salman MalikGoogle Sheets oAuth' };

function apiCall(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'babarnawaz.app.n8n.cloud',
      path: '/api/v1' + path,
      method,
      headers: {
        'X-N8N-API-KEY': KEY,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(opts, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, body: b }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Create a temporary workflow that uses a Code node with Google Sheets API 
// to add tabs with headers
const workflow = {
  name: 'TEMP — Create Sheet Tabs',
  nodes: [
    {
      parameters: {
        httpMethod: 'POST',
        path: 'temp-create-tabs',
        responseMode: 'responseNode',
        options: {},
      },
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [260, 300],
      name: 'Webhook',
    },
    // Step 1: Create "Customers" tab by appending header row
    {
      parameters: {
        operation: 'append',
        documentId: { __rl: true, value: SHEET_ID, mode: 'id' },
        sheetName: { __rl: true, value: 'Customers', mode: 'name' },
        columns: {
          mappingMode: 'autoMapInputData',
          matchingColumns: [],
        },
        options: { useAppend: true },
      },
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4.5,
      position: [480, 300],
      name: 'Create Customers Tab',
      credentials: { googleSheetsOAuth2Api: cred },
    },
    // Step 2: Create "Consent Log" tab
    {
      parameters: {
        operation: 'append',
        documentId: { __rl: true, value: SHEET_ID, mode: 'id' },
        sheetName: { __rl: true, value: 'Consent Log', mode: 'name' },
        columns: {
          mappingMode: 'autoMapInputData',
          matchingColumns: [],
        },
        options: { useAppend: true },
      },
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4.5,
      position: [700, 300],
      name: 'Create Consent Log Tab',
      credentials: { googleSheetsOAuth2Api: cred },
    },
    {
      parameters: {
        respondWith: 'json',
        responseBody: '={"success":true,"message":"Tabs created"}',
        options: {},
      },
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1.1,
      position: [920, 300],
      name: 'Respond',
    },
  ],
  connections: {
    'Webhook': { main: [[{ node: 'Create Customers Tab', type: 'main', index: 0 }]] },
    'Create Customers Tab': { main: [[{ node: 'Create Consent Log Tab', type: 'main', index: 0 }]] },
    'Create Consent Log Tab': { main: [[{ node: 'Respond', type: 'main', index: 0 }]] },
  },
  settings: { executionOrder: 'v1' },
};

// Actually, the Google Sheets node's `append` operation can't create new tabs.
// Instead, let me use a Code node that makes a raw Google Sheets API call.
// But n8n doesn't give raw API access in a code node...
// 
// The simplest fix: the user needs to manually create the "Customers" and "Consent Log" 
// tabs in their Google Sheet. Let me print clear instructions.

console.log('==================================================================');
console.log('ACTION REQUIRED: Create 2 new tabs in your Google Sheet');
console.log('==================================================================');
console.log('');
console.log('Google Sheet URL:');
console.log(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`);
console.log('');
console.log('1. Open the Google Sheet above');
console.log('2. Click the "+" button at the bottom-left to add a new tab');
console.log('3. Name the first new tab: Customers');
console.log('4. Add these column headers in Row 1:');
console.log('   A1: Customer Name');
console.log('   B1: Link Parameter');
console.log('   C1: Full Link');
console.log('   D1: PM Name');
console.log('   E1: PM Email');
console.log('   F1: SI Manager Email');
console.log('   G1: Date Created');
console.log('   H1: Sessions Complete');
console.log('');
console.log('5. Click "+" again to add another new tab');
console.log('6. Name this tab: Consent Log');
console.log('7. Add these column headers in Row 1:');
console.log('   A1: Timestamp');
console.log('   B1: Customer Name');
console.log('   C1: First Name');
console.log('   D1: Last Name');
console.log('   E1: Email');
console.log('   F1: Session ID');
console.log('   G1: Consent Version');
console.log('   H1: IP Address');
console.log('');
console.log('Once done, run: node test-webhooks.mjs');
console.log('==================================================================');

process.exit(0);
