import { writeFileSync } from 'fs';
const VAPI_KEY = '12b9bbd8-c4f5-4ff7-8157-ccf3feaf9cac';
const ASSISTANT_ID = 'db015b68-4aed-4f2b-b0dc-d9e614209ed6';
const h = { 'Authorization': `Bearer ${VAPI_KEY}`, 'Content-Type': 'application/json' };

const CORRECT_URLS = {
  'clear_data':              'https://babarnawaz.app.n8n.cloud/webhook/icm-session-clear',
  'save_progress':           'https://babarnawaz.app.n8n.cloud/webhook/icm-session-save',
  'resume_session':          'https://babarnawaz.app.n8n.cloud/webhook/icm-resume-check',
  'complete_conversation':   'https://babarnawaz.app.n8n.cloud/webhook/icm-session-complete',
};

let output = '';
function log(msg) { output += msg + '\n'; }

async function main() {
  // Get assistant
  const ar = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, { headers: h });
  const assistant = await ar.json();
  log('ASSISTANT: ' + assistant.name);
  log('Server URL: ' + (assistant.serverUrl || '(empty)'));

  // Get tools
  const tr = await fetch('https://api.vapi.ai/tool', { headers: h });
  const tools = await tr.json();
  log('\nTOOLS (' + tools.length + ' total):');

  for (const tool of tools) {
    const name = tool.function?.name || 'unknown';
    const currentUrl = tool.server?.url || '(none)';
    const expectedUrl = CORRECT_URLS[name];
    if (!expectedUrl) continue;

    const match = currentUrl === expectedUrl ? '✅' : '❌';
    log(`\n  ${match} ${name}`);
    log(`    ID: ${tool.id}`);
    log(`    Current URL:  ${currentUrl}`);
    log(`    Expected URL: ${expectedUrl}`);
    log(`    Description:  ${tool.function?.description || '(none)'}`);
    log(`    Parameters:   ${JSON.stringify(tool.function?.parameters?.properties ? Object.keys(tool.function.parameters.properties) : [])}`);
  }

  // Check assistant model tools
  log('\nASSISTANT MODEL TOOLS:');
  if (assistant.model?.tools?.length) {
    assistant.model.tools.forEach(t => {
      log('  - ' + (t.function?.name || t.type || 'unknown'));
    });
  } else {
    log('  (none bound directly - tools are likely in toolIds)');
  }
  
  if (assistant.toolIds?.length) {
    log('\nASSISTANT toolIds:');
    assistant.toolIds.forEach(id => log('  - ' + id));
  }

  writeFileSync('vapi-status.txt', output);
  console.log(output);
}

main().catch(e => console.error('Fatal:', e));
