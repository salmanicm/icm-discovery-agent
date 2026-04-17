/**
 * Fix all 4 new n8n workflows
 * - Fix Google Sheets column mapping (use autoMapInputData)
 * - Fix Respond nodes (use JSON string directly)
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

// ============================================
// Fixed Workflow 1: Consent Capture
// ============================================
function fixedConsentWorkflow() {
  return {
    name: 'iCM Discovery — Consent Capture',
    nodes: [
      {
        parameters: {
          httpMethod: 'POST',
          path: 'icm-consent',
          responseMode: 'responseNode',
          options: {}
        },
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [260, 300],
        name: 'Webhook — Consent',
      },
      {
        parameters: {
          jsCode: `const body = $input.first().json.body || $input.first().json;
const headers = $input.first().json.headers || {};
const ip = headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown';

return [{
  json: {
    'Timestamp': body.timestamp || new Date().toISOString(),
    'Customer Name': body.customerName || '',
    'First Name': body.firstName || '',
    'Last Name': body.lastName || '',
    'Email': body.email || '',
    'Session ID': body.sessionId || '',
    'Consent Version': body.consentVersion || 'iCM-Consent-v1.0-2026',
    'IP Address': typeof ip === 'string' ? ip.split(',')[0].trim() : 'unknown',
  }
}];`
        },
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [480, 300],
        name: 'Extract Consent Data',
      },
      {
        parameters: {
          operation: 'append',
          documentId: { __rl: true, value: SHEET_ID, mode: 'id' },
          sheetName: { __rl: true, value: 'Consent Log', mode: 'name' },
          columns: {
            mappingMode: 'autoMapInputData',
            matchingColumns: [],
          },
          options: {},
        },
        type: 'n8n-nodes-base.googleSheets',
        typeVersion: 4.5,
        position: [700, 300],
        name: 'Save to Consent Log',
        credentials: { googleSheetsOAuth2Api: cred },
      },
      {
        parameters: {
          respondWith: 'json',
          responseBody: '={"success":true}',
          options: {},
        },
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1.1,
        position: [920, 300],
        name: 'Respond OK',
      },
    ],
    connections: {
      'Webhook — Consent': { main: [[{ node: 'Extract Consent Data', type: 'main', index: 0 }]] },
      'Extract Consent Data': { main: [[{ node: 'Save to Consent Log', type: 'main', index: 0 }]] },
      'Save to Consent Log': { main: [[{ node: 'Respond OK', type: 'main', index: 0 }]] },
    },
    settings: { executionOrder: 'v1' },
  };
}

// ============================================
// Fixed Workflow 2: Add Customer
// ============================================
function fixedAddCustomerWorkflow() {
  return {
    name: 'iCM Discovery — Add Customer',
    nodes: [
      {
        parameters: {
          httpMethod: 'POST',
          path: 'icm-add-customer',
          responseMode: 'responseNode',
          options: {}
        },
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [260, 300],
        name: 'Webhook — Add Customer',
      },
      {
        parameters: {
          jsCode: `const body = $input.first().json.body || $input.first().json;
const orgName = body.customerOrgName || '';
const pmName = body.pmName || '';
const pmEmail = body.pmEmail || '';
const siManagerEmail = body.siManagerEmail || '';

const linkParameter = orgName
  .replace(/[^a-zA-Z0-9\\s]/g, '')
  .split(/\\s+/)
  .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  .join('');

const fullLink = 'https://gleeful-daifuku-4f5fa6.netlify.app/?customer=' + linkParameter;
const dateCreated = new Date().toLocaleDateString('en-US');

return [{
  json: {
    'Customer Name': orgName,
    'Link Parameter': linkParameter,
    'Full Link': fullLink,
    'PM Name': pmName,
    'PM Email': pmEmail,
    'SI Manager Email': siManagerEmail,
    'Date Created': dateCreated,
    'Sessions Complete': 0,
    _linkParameter: linkParameter,
    _fullLink: fullLink,
  }
}];`
        },
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [480, 300],
        name: 'Build Customer Data',
      },
      {
        parameters: {
          operation: 'append',
          documentId: { __rl: true, value: SHEET_ID, mode: 'id' },
          sheetName: { __rl: true, value: 'Customers', mode: 'name' },
          columns: {
            mappingMode: 'autoMapInputData',
            matchingColumns: [],
          },
          options: {},
        },
        type: 'n8n-nodes-base.googleSheets',
        typeVersion: 4.5,
        position: [700, 300],
        name: 'Save to Customers',
        credentials: { googleSheetsOAuth2Api: cred },
      },
      {
        parameters: {
          jsCode: `const prev = $input.first().json;
return [{
  json: {
    success: true,
    linkParameter: prev['Link Parameter'] || prev._linkParameter || '',
    fullLink: prev['Full Link'] || prev._fullLink || '',
  }
}];`
        },
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [920, 300],
        name: 'Build Response',
      },
      {
        parameters: {
          respondWith: 'allIncomingItems',
          options: {},
        },
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1.1,
        position: [1140, 300],
        name: 'Respond with Link',
      },
    ],
    connections: {
      'Webhook — Add Customer': { main: [[{ node: 'Build Customer Data', type: 'main', index: 0 }]] },
      'Build Customer Data': { main: [[{ node: 'Save to Customers', type: 'main', index: 0 }]] },
      'Save to Customers': { main: [[{ node: 'Build Response', type: 'main', index: 0 }]] },
      'Build Response': { main: [[{ node: 'Respond with Link', type: 'main', index: 0 }]] },
    },
    settings: { executionOrder: 'v1' },
  };
}

// ============================================
// Fixed Workflow 3: Get Customers
// ============================================
function fixedGetCustomersWorkflow() {
  return {
    name: 'iCM Discovery — Get Customers',
    nodes: [
      {
        parameters: {
          httpMethod: 'GET',
          path: 'icm-get-customers',
          responseMode: 'responseNode',
          options: {}
        },
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [260, 300],
        name: 'Webhook — Get Customers',
      },
      {
        parameters: {
          operation: 'read',
          documentId: { __rl: true, value: SHEET_ID, mode: 'id' },
          sheetName: { __rl: true, value: 'Customers', mode: 'name' },
          options: {},
        },
        type: 'n8n-nodes-base.googleSheets',
        typeVersion: 4.5,
        position: [480, 300],
        name: 'Read Customers',
        credentials: { googleSheetsOAuth2Api: cred },
      },
      {
        parameters: {
          respondWith: 'allIncomingItems',
          options: {},
        },
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1.1,
        position: [700, 300],
        name: 'Respond All Customers',
      },
    ],
    connections: {
      'Webhook — Get Customers': { main: [[{ node: 'Read Customers', type: 'main', index: 0 }]] },
      'Read Customers': { main: [[{ node: 'Respond All Customers', type: 'main', index: 0 }]] },
    },
    settings: { executionOrder: 'v1' },
  };
}

// ============================================
// Fixed Workflow 4: Get Consent Log
// ============================================
function fixedGetConsentLogWorkflow() {
  return {
    name: 'iCM Discovery — Get Consent Log',
    nodes: [
      {
        parameters: {
          httpMethod: 'GET',
          path: 'icm-get-consent-log',
          responseMode: 'responseNode',
          options: {}
        },
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [260, 300],
        name: 'Webhook — Get Consent Log',
      },
      {
        parameters: {
          operation: 'read',
          documentId: { __rl: true, value: SHEET_ID, mode: 'id' },
          sheetName: { __rl: true, value: 'Consent Log', mode: 'name' },
          options: {},
        },
        type: 'n8n-nodes-base.googleSheets',
        typeVersion: 4.5,
        position: [480, 300],
        name: 'Read Consent Log',
        credentials: { googleSheetsOAuth2Api: cred },
      },
      {
        parameters: {
          jsCode: `const items = $input.all();
const webhookData = $('Webhook — Get Consent Log').first();
const query = webhookData?.json?.query || {};
const filterCustomer = query.customerName || '';

if (filterCustomer) {
  const filtered = items.filter(item =>
    (item.json['Customer Name'] || '').toLowerCase() === filterCustomer.toLowerCase()
  );
  return filtered.length > 0 ? filtered : [{ json: { message: 'No records found', data: [] } }];
}

return items;`
        },
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [700, 300],
        name: 'Filter by Customer',
      },
      {
        parameters: {
          respondWith: 'allIncomingItems',
          options: {},
        },
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1.1,
        position: [920, 300],
        name: 'Respond Consent Log',
      },
    ],
    connections: {
      'Webhook — Get Consent Log': { main: [[{ node: 'Read Consent Log', type: 'main', index: 0 }]] },
      'Read Consent Log': { main: [[{ node: 'Filter by Customer', type: 'main', index: 0 }]] },
      'Filter by Customer': { main: [[{ node: 'Respond Consent Log', type: 'main', index: 0 }]] },
    },
    settings: { executionOrder: 'v1' },
  };
}

// ============================================
// MAIN: Update all workflows
// ============================================
const updates = [
  { id: 'qt0tvH6QSDTcDoMM', build: fixedConsentWorkflow },
  { id: '4GYind17YHhUonCW', build: fixedAddCustomerWorkflow },
  { id: 'gKFnnmdYrsM8atNW', build: fixedGetCustomersWorkflow },
  { id: 'vAxSLqBvhKbXYkl9', build: fixedGetConsentLogWorkflow },
];

(async () => {
  for (const { id, build } of updates) {
    const wf = build();
    console.log(`Updating: ${wf.name} (${id})...`);
    
    // Deactivate first
    await apiCall('POST', `/workflows/${id}/deactivate`);
    
    // Update
    const body = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings };
    const res = await apiCall('PUT', `/workflows/${id}`, body);
    console.log(`  PUT: ${res.status === 200 ? '✅' : '❌ ' + res.status}`);
    
    // Reactivate
    const act = await apiCall('POST', `/workflows/${id}/activate`);
    console.log(`  Activate: ${act.body?.active ? '✅' : '❌'}`);
  }
  
  console.log('\nAll workflows updated!');
  process.exit(0);
})();
