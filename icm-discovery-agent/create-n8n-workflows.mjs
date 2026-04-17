/**
 * Create 4 new n8n workflows for the SI Dashboard + Consent system
 * and update the existing Session Complete workflow.
 */

const N8N_URL = 'https://babarnawaz.app.n8n.cloud/api/v1';
const N8N_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGYwNjQ2ZC01MjA0LTRjYjgtOWNlZS1hMTZjMTBiZmRjNjkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWIwZTVjMDgtMjQ3NC00NzVhLThhMjEtYjFhMDFlMmZjMGE5IiwiaWF0IjoxNzczMzEzNzM0fQ.hHLXDFHfbMvNPs8GTZekHNpWm9dpT7H5n6vELq5A8yM';
const SHEET_ID = '1Q1rfERybmeFSHpHpHHQ_FWZrWPHYYeqkH7LyZ21euNt0s';

const headers = { 'X-N8N-API-KEY': N8N_KEY, 'Content-Type': 'application/json' };

// ============================================
// First, discover Google Sheets credential ID
// ============================================
async function getGoogleSheetsCredentialId() {
  // Get the existing workflow to find the credential reference
  const r = await fetch(`${N8N_URL}/workflows`, { headers });
  const data = await r.json();
  const existing = data.data?.find(w => w.name?.includes('iCM Discovery'));
  if (!existing) {
    console.log('Could not find existing iCM Discovery workflow');
    return null;
  }
  
  const wf = await fetch(`${N8N_URL}/workflows/${existing.id}`, { headers });
  const wfData = await wf.json();
  
  // Find a Google Sheets node to get its credential
  const sheetsNode = wfData.nodes?.find(n => n.type === 'n8n-nodes-base.googleSheets');
  if (sheetsNode?.credentials?.googleSheetsOAuth2Api) {
    console.log('Found Google Sheets credential:', JSON.stringify(sheetsNode.credentials.googleSheetsOAuth2Api));
    return sheetsNode.credentials.googleSheetsOAuth2Api;
  }
  console.log('No Google Sheets credential found in existing workflow');
  return null;
}

// ============================================
// Workflow 1: Consent Capture
// ============================================
function buildConsentWorkflow(sheetsCred) {
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
          jsCode: `// Extract consent data from POST body
const body = $input.first().json.body || $input.first().json;

// Handle both direct POST and Vapi tool-call format
let data = body;
if (body.message && body.message.toolCallList) {
  data = body.message.toolCallList[0].function.arguments;
}

// Get IP from headers
const headers = $input.first().json.headers || {};
const ip = headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown';

return [{
  json: {
    timestamp: data.timestamp || new Date().toISOString(),
    customerName: data.customerName || '',
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    email: data.email || '',
    sessionId: data.sessionId || '',
    consentVersion: data.consentVersion || 'iCM-Consent-v1.0-2026',
    ipAddress: typeof ip === 'string' ? ip.split(',')[0].trim() : 'unknown',
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
            mappingMode: 'defineBelow',
            value: {
              Timestamp:        '={{ $json.timestamp }}',
              'Customer Name':  '={{ $json.customerName }}',
              'First Name':     '={{ $json.firstName }}',
              'Last Name':      '={{ $json.lastName }}',
              Email:            '={{ $json.email }}',
              'Session ID':     '={{ $json.sessionId }}',
              'Consent Version':'={{ $json.consentVersion }}',
              'IP Address':     '={{ $json.ipAddress }}',
            },
          },
          options: {},
        },
        type: 'n8n-nodes-base.googleSheets',
        typeVersion: 4.5,
        position: [700, 300],
        name: 'Save to Consent Log',
        credentials: sheetsCred ? { googleSheetsOAuth2Api: sheetsCred } : undefined,
      },
      {
        parameters: {
          respondWith: 'json',
          responseBody: '={ "success": true }',
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
// Workflow 2: Add Customer
// ============================================
function buildAddCustomerWorkflow(sheetsCred) {
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
          jsCode: `// Extract customer data and generate link
const body = $input.first().json.body || $input.first().json;

const orgName = body.customerOrgName || '';
const pmName = body.pmName || '';
const pmEmail = body.pmEmail || '';
const siManagerEmail = body.siManagerEmail || '';

// Generate CamelCase link parameter
const linkParameter = orgName
  .replace(/[^a-zA-Z0-9\\s]/g, '')
  .split(/\\s+/)
  .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  .join('');

const fullLink = 'https://onboarding.icaremanager.com/discovery?customer=' + linkParameter;
const dateCreated = new Date().toISOString().split('T')[0];

return [{
  json: {
    customerName: orgName,
    linkParameter,
    fullLink,
    pmName,
    pmEmail,
    siManagerEmail,
    dateCreated,
    sessionsComplete: 0,
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
            mappingMode: 'defineBelow',
            value: {
              'Customer Name':     '={{ $json.customerName }}',
              'Link Parameter':    '={{ $json.linkParameter }}',
              'Full Link':         '={{ $json.fullLink }}',
              'PM Name':           '={{ $json.pmName }}',
              'PM Email':          '={{ $json.pmEmail }}',
              'SI Manager Email':  '={{ $json.siManagerEmail }}',
              'Date Created':      '={{ $json.dateCreated }}',
              'Sessions Complete': '={{ $json.sessionsComplete }}',
            },
          },
          options: {},
        },
        type: 'n8n-nodes-base.googleSheets',
        typeVersion: 4.5,
        position: [700, 300],
        name: 'Save to Customers',
        credentials: sheetsCred ? { googleSheetsOAuth2Api: sheetsCred } : undefined,
      },
      {
        parameters: {
          respondWith: 'json',
          responseBody: '={{ JSON.stringify({ success: true, linkParameter: $json.linkParameter, fullLink: $json.fullLink }) }}',
          options: {},
        },
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1.1,
        position: [920, 300],
        name: 'Respond with Link',
      },
    ],
    connections: {
      'Webhook — Add Customer': { main: [[{ node: 'Build Customer Data', type: 'main', index: 0 }]] },
      'Build Customer Data': { main: [[{ node: 'Save to Customers', type: 'main', index: 0 }]] },
      'Save to Customers': { main: [[{ node: 'Respond with Link', type: 'main', index: 0 }]] },
    },
    settings: { executionOrder: 'v1' },
  };
}

// ============================================
// Workflow 3: Get Customers
// ============================================
function buildGetCustomersWorkflow(sheetsCred) {
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
        credentials: sheetsCred ? { googleSheetsOAuth2Api: sheetsCred } : undefined,
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
// Workflow 4: Get Consent Log
// ============================================
function buildGetConsentLogWorkflow(sheetsCred) {
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
        credentials: sheetsCred ? { googleSheetsOAuth2Api: sheetsCred } : undefined,
      },
      {
        parameters: {
          jsCode: `// Optional filtering by customerName query parameter
const items = $input.all();
const webhookNode = $('Webhook — Get Consent Log').first();
const query = webhookNode?.json?.query || {};
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
// MAIN: Create all workflows
// ============================================
async function main() {
  console.log('Discovering Google Sheets credential...');
  const sheetsCred = await getGoogleSheetsCredentialId();
  console.log('Credential:', JSON.stringify(sheetsCred));

  const workflows = [
    buildConsentWorkflow(sheetsCred),
    buildAddCustomerWorkflow(sheetsCred),
    buildGetCustomersWorkflow(sheetsCred),
    buildGetConsentLogWorkflow(sheetsCred),
  ];

  for (const wf of workflows) {
    console.log(`\nCreating workflow: ${wf.name}`);
    
    const resp = await fetch(`${N8N_URL}/workflows`, {
      method: 'POST',
      headers,
      body: JSON.stringify(wf),
    });

    if (resp.ok) {
      const data = await resp.json();
      console.log(`  ✅ Created: ID=${data.id}`);

      // Activate the workflow
      const activateResp = await fetch(`${N8N_URL}/workflows/${data.id}/activate`, {
        method: 'POST',
        headers,
      });
      if (activateResp.ok) {
        console.log(`  ✅ Activated`);
      } else {
        // Try PATCH method
        const patchResp = await fetch(`${N8N_URL}/workflows/${data.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ active: true }),
        });
        console.log(`  ${patchResp.ok ? '✅' : '❌'} Activation via PATCH: ${patchResp.status}`);
      }
    } else {
      const err = await resp.text();
      console.log(`  ❌ Failed (${resp.status}): ${err.substring(0, 200)}`);
    }
  }

  console.log('\n=== Done! ===');
}

main().catch(e => console.error('Fatal:', e));
